<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Metode tidak didukung"]);
    exit;
}

function normalized_key($key) {
    $key = strtolower(trim((string)$key));
    return preg_replace('/[^a-z0-9]+/', '', $key);
}

function normalized_row($row) {
    $result = [];
    foreach ((array)$row as $key => $value) {
        $result[normalized_key($key)] = $value;
    }
    return $result;
}

function first_value($row, $keys, $default = '') {
    foreach ($keys as $key) {
        $normalized = normalized_key($key);
        if (array_key_exists($normalized, $row) && $row[$normalized] !== '') return $row[$normalized];
    }
    return $default;
}

function money_value($value) {
    if (is_int($value) || is_float($value)) return (float)$value;
    $value = trim((string)$value);
    if ($value === '') return 0;
    $value = preg_replace('/[^0-9,.-]/', '', $value);
    if (strpos($value, ',') !== false && strpos($value, '.') !== false) {
        $value = strrpos($value, ',') > strrpos($value, '.')
            ? str_replace(',', '.', str_replace('.', '', $value))
            : str_replace(',', '', $value);
    } elseif (substr_count($value, '.') > 1 || preg_match('/\.\d{3}$/', $value)) {
        $value = str_replace('.', '', $value);
    } else {
        $value = str_replace(',', '.', $value);
    }
    return is_numeric($value) ? (float)$value : 0;
}

$payload = json_decode(file_get_contents('php://input'), true);
$projectId = isset($payload['project_id']) ? (int)$payload['project_id'] : 0;
$rows = isset($payload['rows']) && is_array($payload['rows']) ? $payload['rows'] : [];
$changedBy = !empty($payload['changed_by']) ? trim($payload['changed_by']) : 'Excel Import';
$dryRun = !empty($payload['dry_run']);

if ($projectId <= 0 || !$rows) {
    http_response_code(422);
    echo json_encode(["success" => false, "message" => "Project ID dan baris Excel wajib diisi"]);
    exit;
}

$projectStmt = $conn->prepare("SELECT id FROM projects WHERE id = ?");
$projectStmt->bind_param("i", $projectId);
$projectStmt->execute();
if (!$projectStmt->get_result()->fetch_assoc()) {
    http_response_code(404);
    echo json_encode(["success" => false, "message" => "Proyek tidak ditemukan"]);
    exit;
}
$projectStmt->close();

$insert = $conn->prepare("INSERT INTO transactions (project_id, jenis, kategori, jumlah, total_tagihan, vendor, status_pembayaran, pic, keterangan, tanggal, bukti) VALUES (?, 'Keluar', ?, ?, ?, ?, 'Lunas', ?, ?, ?, NULL)");
$imported = 0;
$skipped = [];
$conn->begin_transaction();

try {
    foreach ($rows as $index => $rawRow) {
        $row = normalized_row($rawRow);
        $rowNumber = $index + 2;
        $hasWageColumns = first_value($row, ['beras & air', 'beras air', 'lemburan', 'upah']) !== '';
        $hasMaterialColumns = first_value($row, ['qty', 'quantity', 'volume', 'satuan', 'harga satuan', 'harga unit']) !== '';
        $materialName = first_value($row, ['nama material', 'material', 'nama barang', 'uraian material', 'uraian pekerjaan', 'deskripsi', 'item']);
        $personName = first_value($row, ['nama pekerja', 'nama tukang', 'nama']);
        $explicitCategory = strtolower((string)first_value($row, ['kategori', 'category', 'jenis biaya']));

        if (strpos($explicitCategory, 'subcon') !== false || strpos($explicitCategory, 'subkon') !== false) {
            $category = 'Subcon';
        } elseif ($hasWageColumns || strpos($explicitCategory, 'upah') !== false || strpos($explicitCategory, 'gaji') !== false) {
            $category = 'Upah';
        } elseif ($materialName !== '' || $hasMaterialColumns || strpos($explicitCategory, 'material') !== false || strpos($explicitCategory, 'logistik') !== false) {
            $category = 'Material';
        } else {
            $skipped[] = ["row" => $rowNumber, "reason" => "Kategori atau nama item tidak dikenali"];
            continue;
        }

        if ($category === 'Upah') {
            $description = $personName ?: first_value($row, ['uraian', 'keterangan'], 'Tenaga kerja');
            $amount = money_value(first_value($row, ['grand total', 'jumlah', 'total bayar', 'total']));
            if ($amount <= 0) {
                $amount = money_value(first_value($row, ['pokok', 'gaji pokok', 'total']))
                    + money_value(first_value($row, ['beras & air', 'beras air']))
                    + money_value(first_value($row, ['lemburan', 'lembur']));
            }
        } else {
            $description = $materialName ?: first_value($row, ['nama', 'uraian', 'keterangan'], $category);
            $amount = money_value(first_value($row, ['grand total', 'jumlah harga', 'total harga', 'subtotal', 'total', 'jumlah']));
            if ($amount <= 0) {
                $quantity = money_value(first_value($row, ['volume', 'qty', 'quantity', 'jumlah barang'], 1));
                $unitPrice = money_value(first_value($row, ['harga satuan', 'harga unit', 'unit price', 'harga']));
                $amount = $quantity * $unitPrice;
            }
        }

        if ($description === '' || $amount <= 0) {
            $skipped[] = ["row" => $rowNumber, "reason" => "Nama item atau nominal tidak valid"];
            continue;
        }

        $vendor = (string)first_value($row, ['vendor', 'supplier', 'toko', 'penyedia'], $description);
        $notes = (string)first_value($row, ['keterangan', 'catatan', 'note'], $description);
        $dateValue = first_value($row, ['tanggal', 'date']);
        if (is_numeric($dateValue) && (float)$dateValue > 20000) {
            $timestamp = (int)(((float)$dateValue - 25569) * 86400);
        } else {
            $timestamp = $dateValue ? strtotime((string)$dateValue) : false;
        }
        $date = $timestamp ? date('Y-m-d H:i:s', $timestamp) : date('Y-m-d H:i:s');
        $totalBill = $amount;
        $insert->bind_param("isddssss", $projectId, $category, $amount, $totalBill, $vendor, $changedBy, $notes, $date);
        $insert->execute();
        $imported++;
    }

    if ($imported === 0) throw new Exception('Tidak ada baris valid yang dapat diimpor');
    if ($dryRun) {
        $conn->rollback();
    } else {
        $conn->commit();
    }
    echo json_encode(["success" => true, "message" => $dryRun ? "$imported baris valid" : "$imported baris berhasil diimpor", "imported" => $imported, "skipped" => $skipped, "dry_run" => $dryRun]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(422);
    echo json_encode(["success" => false, "message" => $e->getMessage(), "skipped" => $skipped]);
}

$insert->close();
?>
