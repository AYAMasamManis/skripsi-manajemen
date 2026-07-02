<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json; charset=UTF-8");
include 'db.php'; // Pastikan koneksi DB bener

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

if (isset($_FILES['foto']) && $_FILES['foto']['error'] === 0) {
    
    $project_id = isset($_POST['project_id']) ? $_POST['project_id'] : null;
    $keterangan = isset($_POST['keterangan']) ? $_POST['keterangan'] : '';
    
    $file_name = $_FILES['foto']['name'];
    $file_tmp = $_FILES['foto']['tmp_name'];
    $ext = strtolower(pathinfo($file_name, PATHINFO_EXTENSION));
    $allowed = ['jpg', 'jpeg', 'png'];
    
    if (in_array($ext, $allowed)) {
        $new_name = "VA_PROG_" . time() . "_" . uniqid() . "." . $ext;
        $target_path = "uploads/" . $new_name;
        
        if (move_uploaded_file($file_tmp, $target_path)) {
            
            // DISINI FIX-NYA: Kita hapus user_id karena tabelmu gak punya kolom itu
            $sql = "INSERT INTO project_progress (project_id, foto_path, keterangan) VALUES (?, ?, ?)";
            $stmt = $conn->prepare($sql);
            
            // Jadi "iss" (integer, string, string)
            $stmt->bind_param("iss", $project_id, $new_name, $keterangan);
            
            if ($stmt->execute()) {
                echo json_encode([
                    "status" => "success", 
                    "message" => "Foto progres berhasil diunggah"
                ]);
            } else {
                unlink($target_path);
                echo json_encode(["status" => "error", "message" => "Database Error: " . $stmt->error]);
            }
            $stmt->close();
        } else {
            echo json_encode(["status" => "error", "message" => "Gagal pindah ke folder uploads"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Format file harus JPG/PNG"]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "File tidak terbaca atau rusak"]);
}
?>