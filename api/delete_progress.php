<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");
include 'db.php';

$data = json_decode(file_get_contents("php://input"));

if (isset($data->id)) {
    $id = $data->id;

    // 1. Cari nama file-nya dulu di DB menggunakan Prepared Statement
    $stmt_get = $conn->prepare("SELECT foto_path FROM project_progress WHERE id = ?");
    $stmt_get->bind_param("i", $id);
    $stmt_get->execute();
    $result = $stmt_get->get_result();
    
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $file_path = "uploads/" . $row['foto_path'];

        // 2. Hapus file fisik dari folder (Tetap sama)
        if (!empty($row['foto_path']) && file_exists($file_path)) {
            unlink($file_path);
        }

        // 3. Hapus data dari Database menggunakan Prepared Statement
        $stmt_del = $conn->prepare("DELETE FROM project_progress WHERE id = ?");
        $stmt_del->bind_param("i", $id);
        
        if ($stmt_del->execute()) {
            echo json_encode(["status" => "success", "message" => "Progress dan file berhasil dihapus"]);
        } else {
            echo json_encode(["status" => "error", "message" => "Gagal menghapus data di database"]);
        }
        $stmt_del->close();
    } else {
        echo json_encode(["status" => "error", "message" => "Data tidak ditemukan"]);
    }
    $stmt_get->close();
} else {
    echo json_encode(["status" => "error", "message" => "ID tidak disertakan"]);
}
?>