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
        $project_id = $conn->insert_id;
        $conn->query("CREATE TABLE IF NOT EXISTS project_budget_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            project_id INT NOT NULL,
            old_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
            new_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
            changed_by VARCHAR(100) NOT NULL,
            changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_project_budget_history_project (project_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        $changedBy = !empty($data['changed_by']) ? trim($data['changed_by']) : 'System';
        $history = $conn->prepare("INSERT INTO project_budget_history (project_id, old_budget, new_budget, changed_by) VALUES (?, 0, ?, ?)");
        $history->bind_param("ids", $project_id, $budget, $changedBy);
        $history->execute();
        $history->close();
        echo json_encode(["status" => "success", "message" => "Proyek berhasil ditambahkan", "id" => $project_id]);
    } else {
        echo json_encode(["message" => "Gagal menambahkan: " . $stmt->error]);
    }

    $stmt->close();
} else {
    echo json_encode(["message" => "Data tidak lengkap"]);
}
?>
