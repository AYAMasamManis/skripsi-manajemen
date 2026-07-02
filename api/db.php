<?php
// Header CORS Lengkap
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Jangan paksa JSON di sini agar upload file (multipart) lancar
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

$host = "localhost";
$user = "root";
$pass = ""; 
$dbname = "db_manajemen_proyek"; 

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Pakai variabel $conn agar sinkron dengan semua file API-mu
    $conn = new mysqli($host, $user, $pass, $dbname);
    $conn->set_charset("utf8mb4");
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Koneksi Gagal: " . $e->getMessage()
    ]);
    exit;
}
?>