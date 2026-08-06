<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include 'db.php';

$projectId = isset($_GET['project_id']) ? (int)$_GET['project_id'] : 0;
if ($projectId <= 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Project ID wajib diisi"]);
    exit;
}

$conn->query("CREATE TABLE IF NOT EXISTS project_budget_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    old_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
    new_budget DECIMAL(15,2) NOT NULL DEFAULT 0,
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_project_budget_history_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$countStmt = $conn->prepare("SELECT COUNT(*) AS total FROM project_budget_history WHERE project_id = ?");
$countStmt->bind_param("i", $projectId);
$countStmt->execute();
$historyCount = (int)$countStmt->get_result()->fetch_assoc()['total'];
$countStmt->close();

if ($historyCount === 0) {
    $initialStmt = $conn->prepare("INSERT INTO project_budget_history (project_id, old_budget, new_budget, changed_by) SELECT id, 0, budget_total, 'System' FROM projects WHERE id = ?");
    $initialStmt->bind_param("i", $projectId);
    $initialStmt->execute();
    $initialStmt->close();
}

$stmt = $conn->prepare("SELECT id, project_id, old_budget, new_budget, changed_by, changed_at FROM project_budget_history WHERE project_id = ? ORDER BY changed_at DESC, id DESC");
$stmt->bind_param("i", $projectId);
$stmt->execute();
$result = $stmt->get_result();
$history = [];
while ($row = $result->fetch_assoc()) {
    $history[] = $row;
}
$stmt->close();

echo json_encode($history);
?>
