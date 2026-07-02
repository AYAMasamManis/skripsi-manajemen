<?php
// Header CORS (Penting agar React bisa mengakses API ini)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

$host = "localhost";
$user = "root";
$pass = "";
$db   = "db_manajemen_proyek";

// Mengaktifkan laporan error MySQLi untuk mempermudah debugging saat skripsi
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    // Membuat koneksi
    $conn = new mysqli($host, $user, $pass, $db);
    
    // Set charset ke utf8mb4 (Standar database modern)
    $conn->set_charset("utf8mb4");

} catch (Exception $e) {
    // Jika koneksi gagal, berikan respon JSON yang profesional
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database VA System sedang maintenance atau koneksi gagal."
    ]);
    exit;
}
?>