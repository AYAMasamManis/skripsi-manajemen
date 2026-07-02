<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Menangani request preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// Panggil file koneksi (Pastikan namanya db.php)
include "db.php";

$data = json_decode(file_get_contents("php://input"));

// Jika cuma diakses via browser biasa
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(["status" => "ready", "message" => "API Login Siap Digunakan"]);
    exit;
}

if ($data && isset($data->username) && isset($data->password)) {
    $username = trim($data->username);
    $password = trim($data->password);

    // MD5 sesuai dengan settingan Laragon kamu sebelumnya
    $hashed_password = md5($password);

    $stmt = $conn->prepare("SELECT id, username, nama_lengkap, password FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        if ($hashed_password === $user['password']) {
            unset($user['password']); // Hapus password dari response demi keamanan
            echo json_encode([
                "success" => true,
                "message" => "Login Berhasil!",
                "user" => $user
            ]);
        } else {
            echo json_encode(["success" => false, "message" => "Password salah!"]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Username tidak ditemukan!"]);
    }
    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Data login tidak lengkap!"]);
}

$conn->close();
?>