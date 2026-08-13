<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$id = isset($data['id']) ? (int)$data['id'] : 0;
$status = trim($data['status'] ?? '');
$allowed = ['Lunas', 'Belum Lunas', 'Sebagian', 'Dibatalkan'];

if ($id < 1 || !in_array($status, $allowed, true)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'ID atau status transaksi tidak valid.']);
    exit;
}

$stmt = $conn->prepare('UPDATE transactions SET status_pembayaran = ? WHERE id = ?');
$stmt->bind_param('si', $status, $id);
$stmt->execute();

echo json_encode(['status' => 'success', 'message' => 'Status transaksi berhasil diperbarui tanpa menghapus riwayat.']);
