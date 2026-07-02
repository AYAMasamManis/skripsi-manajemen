<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
include 'connection.php';

// Handling request OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['id'])) {
    $id = $data['id'];

    // 1. Ambil nama file bukti menggunakan Prepared Statement
    $stmt_get = $conn->prepare("SELECT bukti FROM transactions WHERE id = ?");
    $stmt_get->bind_param("i", $id);
    $stmt_get->execute();
    $result = $stmt_get->get_result();
    $row = $result->fetch_assoc();

    if ($row) {
        // Hapus file fisik jika ada
        if (!empty($row['bukti'])) {
            $file_path = "uploads/" . $row['bukti'];
            if (file_exists($file_path)) {
                unlink($file_path); 
            }
        }

        // 2. Hapus data dari database menggunakan Prepared Statement
        $stmt_del = $conn->prepare("DELETE FROM transactions WHERE id = ?");
        $stmt_del->bind_param("i", $id);
        
        if ($stmt_del->execute()) {
            echo json_encode(["success" => true, "message" => "Transaksi berhasil dihapus!"]);
        } else {
            echo json_encode(["success" => false, "message" => "Gagal menghapus database: " . $stmt_del->error]);
        }
        $stmt_del->close();
    } else {
        echo json_encode(["success" => false, "message" => "Data transaksi tidak ditemukan"]);
    }
    $stmt_get->close();
} else {
    echo json_encode(["success" => false, "message" => "ID tidak valid"]);
}
?>