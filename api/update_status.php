<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';
include_once 'project_revision_schema.php';
ensureProjectRevisionSchema($conn);

// Handling request OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['id']) && !empty($data['status'])) {
    $id = $data['id'];
    $status = $data['status'];

    // --- GUNAKAN PREPARED STATEMENT ---
    $sql = "UPDATE projects SET status = ?, tanggal_selesai = CASE WHEN ? = 'Selesai' THEN COALESCE(tanggal_selesai, CURDATE()) ELSE NULL END, progress_percent = CASE WHEN ? = 'Selesai' THEN 100 ELSE progress_percent END WHERE id = ?";
    
    $stmt = $conn->prepare($sql);
    
    // "s" untuk status (string), "i" untuk id (integer)
    $stmt->bind_param("sssi", $status, $status, $status, $id);

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
