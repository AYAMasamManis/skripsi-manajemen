<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json; charset=UTF-8");
include 'db.php';

// Mendapatkan data JSON dari React
$data = json_decode(file_get_contents("php://input"));

if ($data && isset($data->id)) {
    $id = $data->id;
    $nama = $data->nama_proyek;
    $klien = $data->klien;
    $budget = (float)$data->budget_total;
    $status = $data->status;

    // --- GUNAKAN PREPARED STATEMENT ---
    $sql = "UPDATE projects SET 
            nama_proyek = ?, 
            klien = ?, 
            budget_total = ?, 
            status = ? 
            WHERE id = ?";

    $stmt = $conn->prepare($sql);

    // s = string, d = double (untuk budget), i = integer (untuk id)
    // Urutan: nama (s), klien (s), budget (d), status (s), id (i)
    $stmt->bind_param("ssdsi", $nama, $klien, $budget, $status, $id);

    if ($stmt->execute()) {
        echo json_encode([
            "status" => "success",
            "message" => "Data proyek VA Construction berhasil diperbarui"
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
        "message" => "Data tidak lengkap atau ID tidak ditemukan"
    ]);
}
?>