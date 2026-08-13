<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
include 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$status_column = $conn->query("SHOW COLUMNS FROM payroll LIKE 'status_pembayaran'");
if ($status_column && $status_column->num_rows === 0) {
    $conn->query("ALTER TABLE payroll ADD COLUMN status_pembayaran VARCHAR(20) NOT NULL DEFAULT 'Dibayar'");
}
$data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$id = isset($data['id']) ? (int)$data['id'] : 0;
$status = trim($data['status'] ?? '');
$updated_by = trim($data['updated_by'] ?? 'Pengguna tidak diketahui');
$allowed = ['Dibayar', 'Ditunda', 'Dibatalkan'];

$updated_by_column = $conn->query("SHOW COLUMNS FROM payroll LIKE 'last_updated_by'");
if ($updated_by_column && $updated_by_column->num_rows === 0) {
    $conn->query("ALTER TABLE payroll ADD COLUMN last_updated_by VARCHAR(150) NULL");
}
$updated_at_column = $conn->query("SHOW COLUMNS FROM payroll LIKE 'last_updated_at'");
if ($updated_at_column && $updated_at_column->num_rows === 0) {
    $conn->query("ALTER TABLE payroll ADD COLUMN last_updated_at DATETIME NULL");
}

if ($id < 1 || !in_array($status, $allowed, true)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'ID atau status payroll tidak valid.']);
    exit;
}

$updated_by = substr($updated_by ?: 'Pengguna tidak diketahui', 0, 150);
$stmt = $conn->prepare('UPDATE payroll SET status_pembayaran = ?, last_updated_by = ?, last_updated_at = NOW() WHERE id = ?');
$stmt->bind_param('ssi', $status, $updated_by, $id);
$stmt->execute();

echo json_encode(['status' => 'success', 'message' => 'Status payroll berhasil diperbarui tanpa menghapus riwayat.']);
