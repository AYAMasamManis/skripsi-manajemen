<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json"); // Tambahkan ini agar sinkron dengan fetch di React

include 'connection.php';
include_once 'project_revision_schema.php';
ensureProjectRevisionSchema($conn);

// Handling request OPTIONS (CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

// Mengambil data yang dikirim oleh React (format JSON)
$data = json_decode(file_get_contents("php://input"), true);

if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Format data proyek tidak valid."]);
    exit;
}

if (!empty(trim((string)($data['nama_proyek'] ?? ''))) && !empty(trim((string)($data['klien'] ?? '')))) {
    
    // 1. Tangkap data
    $nama_proyek = $data['nama_proyek'];
    $klien       = $data['klien'];
    $budget      = isset($data['budget_total']) ? filter_var($data['budget_total'], FILTER_VALIDATE_FLOAT) : 0;
    if ($budget === false || $budget < 0) {
        http_response_code(422);
        echo json_encode(["status" => "error", "message" => "Nilai kontrak harus berupa angka nol atau lebih."]);
        exit;
    }
    $status      = "Perencanaan"; // Default status
    $tanggal_mulai = !empty($data['tanggal_mulai']) ? $data['tanggal_mulai'] : null;
    $tanggal_target = !empty($data['tanggal_target']) ? $data['tanggal_target'] : null;

    // 2. --- GUNAKAN PREPARED STATEMENT ---
    // Menggunakan tanda tanya (?) sebagai placeholder
    $sql = "INSERT INTO projects (nama_proyek, klien, budget_total, status, tanggal_mulai, tanggal_target) VALUES (?, ?, ?, ?, ?, ?)";
    
    $stmt = $conn->prepare($sql);

    // 3. Bind Parameter
    // s = string, d = double/angka. 
    // Urutan: nama_proyek (s), klien (s), budget_total (d), status (s)
    $stmt->bind_param("ssdsss", $nama_proyek, $klien, $budget, $status, $tanggal_mulai, $tanggal_target);

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
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Gagal menambahkan proyek: " . $stmt->error]);
    }

    $stmt->close();
} else {
    http_response_code(422);
    echo json_encode(["status" => "error", "message" => "Nama proyek dan klien wajib diisi."]);
}
?>
