<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json; charset=UTF-8");
include 'db.php';
include_once 'project_revision_schema.php';
ensureProjectRevisionSchema($conn);

// Mendapatkan data JSON dari React
$data = json_decode(file_get_contents("php://input"));

if ($data && isset($data->id)) {
    $id = $data->id;
    $nama = $data->nama_proyek;
    $klien = $data->klien;
    $budget = (float)$data->budget_total;
    $status = $data->status;
    $tanggalMulai = !empty($data->tanggal_mulai) ? $data->tanggal_mulai : null;
    $tanggalTarget = !empty($data->tanggal_target) ? $data->tanggal_target : null;
    $tanggalSelesai = !empty($data->tanggal_selesai) ? $data->tanggal_selesai : null;
    $progressPercent = isset($data->progress_percent) ? max(0, min(100, (float)$data->progress_percent)) : 0;
    if (strtolower($status) === 'selesai') {
        $tanggalSelesai = $tanggalSelesai ?: date('Y-m-d');
        $progressPercent = 100;
    } else {
        $tanggalSelesai = null;
    }
    $changedBy = isset($data->changed_by) && trim($data->changed_by) !== '' ? trim($data->changed_by) : 'Bos';

    $current = $conn->prepare("SELECT budget_total FROM projects WHERE id = ?");
    $current->bind_param("i", $id);
    $current->execute();
    $currentBudget = $current->get_result()->fetch_assoc();
    $current->close();

    if (!$currentBudget) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Proyek tidak ditemukan"]);
        exit;
    }

    // --- GUNAKAN PREPARED STATEMENT ---
    $sql = "UPDATE projects SET 
            nama_proyek = ?, 
            klien = ?, 
            budget_total = ?, 
            status = ?,
            tanggal_mulai = ?,
            tanggal_target = ?,
            tanggal_selesai = ?,
            progress_percent = ?
            WHERE id = ?";

    $stmt = $conn->prepare($sql);

    // s = string, d = double (untuk budget), i = integer (untuk id)
    // Urutan: nama (s), klien (s), budget (d), status (s), id (i)
    $stmt->bind_param("ssdssssdi", $nama, $klien, $budget, $status, $tanggalMulai, $tanggalTarget, $tanggalSelesai, $progressPercent, $id);

    if ($stmt->execute()) {
        $oldBudget = (float)$currentBudget['budget_total'];
        if (abs($oldBudget - $budget) > 0.001) {
            $conn->query("CREATE TABLE IF NOT EXISTS project_budget_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                old_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
                new_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
                changed_by VARCHAR(100) NOT NULL,
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_project_budget_history_project (project_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            $history = $conn->prepare("INSERT INTO project_budget_history (project_id, old_budget, new_budget, changed_by) VALUES (?, ?, ?, ?)");
            $history->bind_param("idds", $id, $oldBudget, $budget, $changedBy);
            $history->execute();
            $history->close();
        }
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
