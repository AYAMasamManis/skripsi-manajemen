<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';

$id = $_GET['id'] ?? '';

// Ambil HANYA 1 proyek yang dibutuhkan
$sql = "SELECT * FROM projects WHERE id = '$id'";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    echo json_encode($result->fetch_assoc());
} else {
    echo json_encode(null);
}
?>