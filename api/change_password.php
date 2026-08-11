<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    exit;
}

include "db_config.php";

$data = json_decode(file_get_contents("php://input"), true);
$id = isset($data['id']) ? (int)$data['id'] : 0;
$currentPassword = trim($data['current_password'] ?? '');
$newPassword = trim($data['new_password'] ?? '');

if ($id <= 0 || $currentPassword === '' || $newPassword === '') {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Semua kolom kata sandi wajib diisi."]);
    exit;
}

if (strlen($newPassword) < 8) {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Kata sandi baru minimal 8 karakter."]);
    exit;
}

$stmt = $conn->prepare("SELECT password FROM users WHERE id = ? LIMIT 1");
$stmt->bind_param("i", $id);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$user || !hash_equals((string)$user['password'], md5($currentPassword))) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Kata sandi saat ini tidak sesuai."]);
    exit;
}

$newPasswordHash = md5($newPassword);
$stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
$stmt->bind_param("si", $newPasswordHash, $id);

if ($stmt->execute()) {
    echo json_encode(["status" => "success", "message" => "Kata sandi berhasil diperbarui."]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Kata sandi gagal diperbarui."]);
}

$stmt->close();
$conn->close();

