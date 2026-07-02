<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
include 'db.php';

// Ambil data ID dari React (format JSON)
$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['id'])) {
    $id = $data['id'];

    // 1. Ambil nama filenya dulu menggunakan Prepared Statement
    $stmt_get = $conn->prepare("SELECT file_path FROM transaction_proofs WHERE id = ?");
    $stmt_get->bind_param("i", $id);
    $stmt_get->execute();
    $res = $stmt_get->get_result();
    $row = $res->fetch_assoc();

    if ($row) {
        $filename = $row['file_path'];
        $target_file = "uploads/" . $filename;

        // 2. Hapus file fisik dari folder (Logika tetap sama)
        if (!empty($filename) && file_exists($target_file)) {
            unlink($target_file);
        }

        // 3. Hapus data dari database menggunakan Prepared Statement
        $stmt_del = $conn->prepare("DELETE FROM transaction_proofs WHERE id = ?");
        $stmt_del->bind_param("i", $id);
        
        if ($stmt_del->execute()) {
            echo json_encode(["status" => "success", "message" => "Bukti terhapus dari server dan database"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Gagal hapus data di database"]);
        }
        $stmt_del->close();
    } else {
        echo json_encode(["status" => "error", "message" => "Data tidak ditemukan"]);
    }
    $stmt_get->close();
} else {
    echo json_encode(["status" => "error", "message" => "ID tidak dikirim"]);
}
?>