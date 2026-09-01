<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
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

$conn->begin_transaction();

try {
    ensurePayrollColumns($conn);
    ensureTransactionColumns($conn);

    $data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $id = isset($data['id']) ? (int)$data['id'] : 0;
    $status = trim((string)($data['status'] ?? ''));
    $updated_by = trim((string)($data['updated_by'] ?? 'Pengguna tidak diketahui'));
    $allowed = ['Dibayar', 'Ditunda', 'Dibatalkan'];

    if ($id < 1 || !in_array($status, $allowed, true)) {
        throw new Exception('ID atau status payroll tidak valid.');
    }

    $payrollStmt = $conn->prepare('SELECT project_id, nama_karyawan, jabatan, total_diterima, bulan_gaji, tahun_gaji, status_pembayaran FROM payroll WHERE id = ?');
    $payrollStmt->bind_param('i', $id);
    $payrollStmt->execute();
    $payroll = $payrollStmt->get_result()->fetch_assoc();
    $payrollStmt->close();

    if (!$payroll) {
        throw new Exception('Data payroll tidak ditemukan.');
    }

    $updated_by = substr($updated_by ?: 'Pengguna tidak diketahui', 0, 150);
    $stmt = $conn->prepare('UPDATE payroll SET status_pembayaran = ?, last_updated_by = ?, last_updated_at = NOW() WHERE id = ?');
    $stmt->bind_param('ssi', $status, $updated_by, $id);
    if (!$stmt->execute()) {
        throw new Exception('Gagal memperbarui status payroll: ' . $stmt->error);
    }
    $stmt->close();

    $keterangan = buildPayrollDescription($payroll['nama_karyawan'], $payroll['jabatan'], (int)$payroll['bulan_gaji'], (int)$payroll['tahun_gaji']);

    if ($status === 'Dibatalkan') {
        $deleteTx = $conn->prepare("DELETE FROM transactions WHERE project_id = ? AND LOWER(jenis) = 'keluar' AND LOWER(kategori) = 'upah' AND ABS(jumlah - ?) < 0.01 AND keterangan = ?");
        $deleteTx->bind_param("ids", $payroll['project_id'], (float)$payroll['total_diterima'], $keterangan);
        $deleteTx->execute();
        $deleteTx->close();
    } else {
        $existsTx = $conn->prepare("SELECT id FROM transactions WHERE project_id = ? AND LOWER(jenis) = 'keluar' AND LOWER(kategori) = 'upah' AND ABS(jumlah - ?) < 0.01 AND keterangan = ? LIMIT 1");
        $existsTx->bind_param("ids", $payroll['project_id'], (float)$payroll['total_diterima'], $keterangan);
        $existsTx->execute();
        $existing = $existsTx->get_result()->fetch_assoc();
        $existsTx->close();

        if ($existing) {
            $updateTx = $conn->prepare("UPDATE transactions SET status_pembayaran = ?, vendor = 'Payroll', pic = 'Sistem', source_type = 'payroll', source_id = ?, last_updated_at = NOW() WHERE id = ?");
            $updateTx->bind_param("sii", $status, $id, $existing['id']);
            $updateTx->execute();
            $updateTx->close();
        } else {
            $insertTx = $conn->prepare("INSERT INTO transactions (project_id, jenis, kategori, jumlah, total_tagihan, vendor, status_pembayaran, pic, keterangan, tanggal, bukti, source_type, source_id, last_updated_at)
                                         VALUES (?, 'Keluar', 'Upah', ?, ?, 'Payroll', ?, 'Sistem', ?, ?, NULL, 'payroll', ?, NOW())");
            $tanggal = date('Y-m-d');
            $insertTx->bind_param("iddsisii", $payroll['project_id'], (float)$payroll['total_diterima'], (float)$payroll['total_diterima'], $status, $keterangan, $tanggal, $id);
            $insertTx->execute();
            $insertTx->close();
        }
    }

    $conn->commit();
    echo json_encode(['status' => 'success', 'message' => 'Status payroll berhasil diperbarui dan saldo utama tersinkronisasi.']);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>
