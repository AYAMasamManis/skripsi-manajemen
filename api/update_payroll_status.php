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
$allowed = ['Dibayar', 'Ditunda', 'Dibatalkan'];

if ($id < 1 || !in_array($status, $allowed, true)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'ID atau status payroll tidak valid.']);
    exit;
}

$stmt = $conn->prepare('UPDATE payroll SET status_pembayaran = ? WHERE id = ?');
$stmt->bind_param('si', $status, $id);
$stmt->execute();

echo json_encode(['status' => 'success', 'message' => 'Status payroll berhasil diperbarui tanpa menghapus riwayat.']);
