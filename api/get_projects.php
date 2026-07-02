<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include 'connection.php'; // Pastikan file ini ADA di folder api

$sql = "SELECT * FROM projects ORDER BY created_at DESC";
$result = mysqli_query($conn, $sql);

$projects = [];

if ($result) {
    while($row = mysqli_fetch_assoc($result)) {
        $projects[] = $row;
    }
}

echo json_encode($projects);
?>