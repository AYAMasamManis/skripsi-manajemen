<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

include 'connection.php';

function ensurePayrollColumns(mysqli $conn): void
{
    $columns = [
        'status_pembayaran' => "VARCHAR(20) NOT NULL DEFAULT 'Dibayar'",
        'last_updated_by' => "VARCHAR(150) NULL",
        'last_updated_at' => "DATETIME NULL"
    ];

    foreach ($columns as $column => $definition) {
        $result = $conn->query("SHOW COLUMNS FROM payroll LIKE '" . $conn->real_escape_string($column) . "'");
        if ($result && $result->num_rows === 0) {
            $conn->query("ALTER TABLE payroll ADD COLUMN `" . $column . "` " . $definition);
        }
    }
}

function ensureTransactionColumns(mysqli $conn): void
{
    $columns = [
        'status_pembayaran' => "VARCHAR(30) NULL DEFAULT 'Dibayar'",
        'last_updated_by' => "VARCHAR(150) NULL",
        'last_updated_at' => "DATETIME NULL",
        'source_type' => "VARCHAR(30) NULL DEFAULT 'payroll'",
        'source_id' => "INT NULL"
    ];

    foreach ($columns as $column => $definition) {
        $result = $conn->query("SHOW COLUMNS FROM transactions LIKE '" . $conn->real_escape_string($column) . "'");
        if ($result && $result->num_rows === 0) {
            $conn->query("ALTER TABLE transactions ADD COLUMN `" . $column . "` " . $definition);
        }
    }
}

function buildPayrollDescription(string $nama, string $jabatan, int $bulan, int $tahun): string
{
    return "Gaji Karyawan: {$nama} ({$jabatan}) Periode {$bulan}/{$tahun}";
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Metode tidak didukung"]);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data) || empty($data)) {
    $data = $_POST;
}

if (!is_array($data) || empty($data)) {
    $rawText = trim((string)$rawInput);
    if ($rawText !== '') {
        parse_str($rawText, $data);
    }
}

if (!is_array($data) || empty($data)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Request body tidak valid"]);
    exit;
}

$conn->begin_transaction();

try {
    ensurePayrollColumns($conn);
    ensureTransactionColumns($conn);

    $project_id = isset($data['project_id']) ? (int)$data['project_id'] : 0;
    $nama       = trim((string)($data['nama_karyawan'] ?? ''));
    $jabatan    = trim((string)($data['jabatan'] ?? ''));
    $hari       = (int)($data['hari_kerja'] ?? 0);
    $gaji       = (float)($data['gaji_perhari'] ?? 0);
    $kasbon     = (float)($data['kasbon'] ?? 0);
    $bulan_gaji = (int)($data['bulan_gaji'] ?? date('m'));
    $tahun_gaji = (int)($data['tahun_gaji'] ?? date('Y'));

    if ($project_id <= 0 || $nama === '' || $jabatan === '' || $hari <= 0 || $gaji <= 0) {
        throw new Exception('Data payroll tidak lengkap: proyek, nama, jabatan, hari kerja, dan gaji wajib diisi.');
    }

    $total_diterima = ($hari * $gaji) - $kasbon;
    $tanggal_bayar  = date('Y-m-d');
    $status_payroll = 'Dibayar';
    $keterangan     = buildPayrollDescription($nama, $jabatan, $bulan_gaji, $tahun_gaji);

    $updated_by = 'Sistem';
    $sql_payroll = "INSERT INTO payroll (project_id, nama_karyawan, jabatan, hari_kerja, gaji_perhari, kasbon, total_diterima, tanggal_bayar, bulan_gaji, tahun_gaji, status_pembayaran, last_updated_by, last_updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";

    $stmt1 = $conn->prepare($sql_payroll);
    $stmt1->bind_param("issidddsiiiss", $project_id, $nama, $jabatan, $hari, $gaji, $kasbon, $total_diterima, $tanggal_bayar, $bulan_gaji, $tahun_gaji, $status_payroll, $updated_by);

    if (!$stmt1->execute()) {
        throw new Exception('Gagal simpan payroll: ' . $stmt1->error);
    }

    $payroll_id = $stmt1->insert_id;
    $stmt1->close();

    $existing_txn = $conn->prepare("SELECT id FROM transactions WHERE project_id = ? AND LOWER(jenis) = 'keluar' AND LOWER(kategori) = 'upah' AND ABS(jumlah - ?) < 0.01 AND keterangan = ? LIMIT 1");
    $existing_txn->bind_param("ids", $project_id, $total_diterima, $keterangan);
    $existing_txn->execute();
    $existing_result = $existing_txn->get_result();
    $existing_row = $existing_result->fetch_assoc();
    $existing_txn->close();

    if ($existing_row) {
        $updateTx = $conn->prepare("UPDATE transactions SET total_tagihan = ?, vendor = 'Payroll', status_pembayaran = ?, pic = 'Sistem', source_type = 'payroll', source_id = ?, last_updated_at = NOW() WHERE id = ?");
        $updateTx->bind_param("dsii", $total_diterima, $status_payroll, $payroll_id, $existing_row['id']);
        if (!$updateTx->execute()) {
            throw new Exception('Gagal sinkronisasi transaksi saldo utama: ' . $updateTx->error);
        }
        $updateTx->close();
    } else {
        $sql_transaksi = "INSERT INTO transactions (project_id, jenis, kategori, jumlah, total_tagihan, vendor, status_pembayaran, pic, keterangan, tanggal, bukti, source_type, source_id, last_updated_at)
                          VALUES (?, 'Keluar', 'Upah', ?, ?, 'Payroll', ?, 'Sistem', ?, ?, NULL, 'payroll', ?, NOW())";

        $stmt2 = $conn->prepare($sql_transaksi);
        $stmt2->bind_param("iddsssi", $project_id, $total_diterima, $total_diterima, $status_payroll, $keterangan, $tanggal_bayar, $payroll_id);

        if (!$stmt2->execute()) {
            throw new Exception('Gagal menambahkan transaksi ke saldo utama: ' . $stmt2->error);
        }
        $stmt2->close();
    }

    $conn->commit();
    echo json_encode(["status" => "success", "message" => "Gaji tersimpan & saldo utama terpotong otomatis"]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
