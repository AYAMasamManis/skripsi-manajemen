<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;

include 'connection.php';
include_once 'project_revision_schema.php';
ensureProjectRevisionSchema($conn);

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int)($data['id'] ?? 0);
$progress = max(0, min(100, (float)($data['progress_percent'] ?? 0)));
$start = !empty($data['tanggal_mulai']) ? $data['tanggal_mulai'] : null;
$target = !empty($data['tanggal_target']) ? $data['tanggal_target'] : null;

if ($id <= 0 || ($start && $target && $target < $start)) {
    http_response_code(422);
    echo json_encode(['status' => 'error', 'message' => 'Data monitoring tidak valid.']);
    exit;
}

$stmt = $conn->prepare("UPDATE projects SET progress_percent = ?, tanggal_mulai = ?, tanggal_target = ? WHERE id = ?");
$stmt->bind_param('dssi', $progress, $start, $target, $id);
$stmt->execute();
echo json_encode(['status' => 'success', 'message' => 'Monitoring proyek berhasil diperbarui.']);
