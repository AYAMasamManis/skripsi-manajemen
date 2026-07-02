<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json"); // Memastikan respon selalu JSON
include 'connection.php';

// Handling request OPTIONS untuk CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

// Mendapatkan data ID dari request (format JSON dari React)
$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['id'])) {
    $id = $data['id'];

    // --- GUNAKAN PREPARED STATEMENT ---
    // Logika CASCADE tetap berjalan di level Database (MySQL)
    $sql = "DELETE FROM projects WHERE id = ?";
    
    $stmt = $conn->prepare($sql);
    
    // "i" berarti integer (karena ID biasanya angka)
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        // Jika di database sudah diatur ON DELETE CASCADE, 
        // maka otomatis data di tabel transactions, progress, dll akan ikut terhapus
        echo json_encode(["message" => "Proyek berhasil dihapus!"]);
    } else {
        echo json_encode(["message" => "Gagal menghapus: " . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["message" => "ID tidak ditemukan atau kosong"]);
}
?>