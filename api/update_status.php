<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';

// Handling request OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['id']) && !empty($data['status'])) {
    $id = $data['id'];
    $status = $data['status'];

    // --- GUNAKAN PREPARED STATEMENT ---
    $sql = "UPDATE projects SET status = ? WHERE id = ?";
    
    $stmt = $conn->prepare($sql);
    
    // "s" untuk status (string), "i" untuk id (integer)
    $stmt->bind_param("si", $status, $id);

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Status proyek berhasil diperbarui menjadi: $status"
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Gagal memperbarui status: " . $stmt->error
        ]);
    }

    $stmt->close();
} else {
    echo json_encode([
        "success" => false,
        "message" => "ID atau Status tidak boleh kosong"
    ]);
}
?>