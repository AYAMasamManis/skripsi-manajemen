<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
include 'db.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 1. Validasi ID Transaksi
    if (!isset($_POST['transaction_id']) || empty($_POST['transaction_id'])) {
        echo json_encode(["status" => "error", "message" => "ID Transaksi tidak ditemukan"]);
        exit;
    }

    $transaction_id = $_POST['transaction_id'];
    
    // 2. Logika Upload File
    if (isset($_FILES['bukti']) && $_FILES['bukti']['error'] === 0) {
        $file = $_FILES['bukti'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        // --- TAMBAHAN KEAMANAN: Validasi Ekstensi File ---
        $allowed_extensions = ['jpg', 'jpeg', 'png', 'pdf'];
        if (!in_array($ext, $allowed_extensions)) {
            echo json_encode(["status" => "error", "message" => "Format file tidak didukung (Hanya JPG, PNG, PDF)"]);
            exit;
        }

        // Penamaan file unik
        $filename = "proof_" . time() . "_" . uniqid() . "." . $ext;
        $target = "uploads/" . $filename;

        if (move_uploaded_file($file['tmp_name'], $target)) {
            
            // 3. --- GUNAKAN PREPARED STATEMENT ---
            $sql = "INSERT INTO transaction_proofs (transaction_id, file_path) VALUES (?, ?)";
            $stmt = $conn->prepare($sql);
            
            // i = integer (untuk ID), s = string (untuk nama file)
            $stmt->bind_param("is", $transaction_id, $filename);

            if ($stmt->execute()) {
                echo json_encode(["status" => "success", "message" => "Bukti berhasil ditambahkan"]);
            } else {
                echo json_encode(["status" => "error", "message" => "Gagal Database: " . $stmt->error]);
            }
            $stmt->close();

        } else {
            echo json_encode(["status" => "error", "message" => "Gagal upload file ke server"]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Tidak ada file atau file rusak"]);
    }
}
?>