<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

include "db_config.php";

// Menangani request OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['id']) && isset($data['username']) && isset($data['nama_lengkap'])) {
    
    $id = $data['id'];
    $username = trim($data['username']);
    $nama = trim($data['nama_lengkap']);
    $password = isset($data['password']) ? $data['password'] : '';

    if (!empty($password)) {
        // OPSYEN 1: Update dengan Password Baru
        $passwordMD5 = md5(trim($password)); 
        $sql = "UPDATE users SET username = ?, nama_lengkap = ?, password = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssi", $username, $nama, $passwordMD5, $id);
    } else {
        // OPSYEN 2: Update tanpa ganti Password
        $sql = "UPDATE users SET username = ?, nama_lengkap = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ssi", $username, $nama, $id);
    }

    if ($stmt->execute()) {
        echo json_encode([
            "status" => "success", 
            "message" => "Profil VA System berhasil diperbarui"
        ]);
    } else {
        echo json_encode([
            "status" => "error", 
            "message" => "Gagal memperbarui database: " . $stmt->error
        ]);
    }
    
    $stmt->close();
} else {
    echo json_encode([
        "status" => "error", 
        "message" => "Data transmisi tidak lengkap"
    ]);
}

$conn->close();
?>