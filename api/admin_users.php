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
$adminId = isset($data['admin_id']) ? (int)$data['admin_id'] : 0;
$adminPassword = trim($data['admin_password'] ?? '');
$action = $data['action'] ?? '';

if ($adminId <= 0 || $adminPassword === '') {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Verifikasi admin wajib diisi."]);
    exit;
}

$stmt = $conn->prepare("SELECT id, role, password FROM users WHERE id = ? LIMIT 1");
$stmt->bind_param("i", $adminId);
$stmt->execute();
$admin = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$admin || strtolower((string)$admin['role']) !== 'admin' || !hash_equals((string)$admin['password'], md5($adminPassword))) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Verifikasi admin gagal."]);
    exit;
}

if ($action === 'list') {
    $result = $conn->query("SELECT id, username, nama_lengkap, role FROM users ORDER BY nama_lengkap ASC, username ASC");
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int)$row['id'];
        $users[] = $row;
    }
    echo json_encode(["status" => "success", "users" => $users]);
    exit;
}

if ($action === 'reset_password') {
    $userId = isset($data['user_id']) ? (int)$data['user_id'] : 0;
    $newPassword = trim($data['new_password'] ?? '');

    if ($userId <= 0 || strlen($newPassword) < 8) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "Pilih akun dan gunakan kata sandi minimal 8 karakter."]);
        exit;
    }

    $newPasswordHash = md5($newPassword);
    $stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
    $stmt->bind_param("si", $newPasswordHash, $userId);
    $stmt->execute();
    $changed = $stmt->affected_rows;
    $stmt->close();

    if ($changed > 0) {
        echo json_encode(["status" => "success", "message" => "Kata sandi pengguna berhasil direset."]);
    } else {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Akun tidak ditemukan atau kata sandinya tidak berubah."]);
    }
    exit;
}

if ($action === 'create_employee') {
    $username = strtolower(trim($data['username'] ?? ''));
    $fullName = trim($data['nama_lengkap'] ?? '');
    $newPassword = trim($data['new_password'] ?? '');
    if (!preg_match('/^[a-z0-9._-]{3,50}$/', $username) || $fullName === '' || strlen($newPassword) < 8) {
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => 'Username minimal 3 karakter, nama wajib diisi, dan kata sandi minimal 8 karakter.']);
        exit;
    }
    $exists = $conn->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $exists->bind_param('s', $username);
    $exists->execute();
    if ($exists->get_result()->fetch_assoc()) {
        http_response_code(409);
        echo json_encode(['status' => 'error', 'message' => 'Username sudah digunakan.']);
        exit;
    }
    $hash = md5($newPassword);
    $role = 'karyawan';
    $stmt = $conn->prepare('INSERT INTO users (username, password, nama_lengkap, role) VALUES (?, ?, ?, ?)');
    $stmt->bind_param('ssss', $username, $hash, $fullName, $role);
    $stmt->execute();
    echo json_encode(['status' => 'success', 'message' => 'Akun karyawan berhasil dibuat.', 'id' => $conn->insert_id]);
    exit;
}

http_response_code(400);
echo json_encode(["status" => "error", "message" => "Aksi tidak dikenali."]);
