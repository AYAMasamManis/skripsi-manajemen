<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json"); // Tambahkan ini agar sinkron dengan fetch di React

include 'connection.php';

// Handling request OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

// Mengambil data yang dikirim oleh React (format JSON)
$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['nama_proyek']) && !empty($data['klien'])) {
    
    // 1. Tangkap data
    $nama_proyek = $data['nama_proyek'];
    $klien       = $data['klien'];
    $budget      = isset($data['budget_total']) ? $data['budget_total'] : 0;
    $status      = "Perencanaan"; // Default status

    // 2. --- GUNAKAN PREPARED STATEMENT ---
    // Menggunakan tanda tanya (?) sebagai placeholder
    $sql = "INSERT INTO projects (nama_proyek, klien, budget_total, status) VALUES (?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);

    // 3. Bind Parameter
    // s = string, d = double/angka. 
    // Urutan: nama_proyek (s), klien (s), budget_total (d), status (s)
    $stmt->bind_param("ssds", $nama_proyek, $klien, $budget, $status);

    // 4. Eksekusi
    if ($stmt->execute()) {
        echo json_encode(["message" => "Proyek berhasil ditambahkan"]);
    } else {
        echo json_encode(["message" => "Gagal menambahkan: " . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["message" => "Data tidak lengkap"]);
}
?>