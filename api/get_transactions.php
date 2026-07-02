<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';

// Menghindari cache agar data keuangan selalu yang terbaru
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");

// Cek parameter
$project_id = isset($_GET['project_id']) ? $_GET['project_id'] : null;
$global = isset($_GET['global']) ? filter_var($_GET['global'], FILTER_VALIDATE_BOOLEAN) : false;

$transactions = [];

try {
    if ($global === true) {
        // 1. AMBIL SEMUA TRANSAKSI (Dashboard Home) - Tanpa parameter input
        $sql = "SELECT * FROM transactions ORDER BY tanggal DESC, id DESC";
        $result = $conn->query($sql);
    } else if ($project_id) {
        // 2. AMBIL PER PROYEK (Detail Proyek) - PAKAI PREPARED STATEMENT
        $sql = "SELECT * FROM transactions WHERE project_id = ? ORDER BY tanggal DESC, id DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $project_id);
        $stmt->execute();
        $result = $stmt->get_result();
    } else {
        // 3. Fallback jika parameter tidak jelas
        $sql = "SELECT * FROM transactions ORDER BY tanggal DESC";
        $result = $conn->query($sql);
    }

    if ($result) {
        while($row = $result->fetch_assoc()) {
            // Memastikan data numerik dikirim dengan tipe yang benar
            $row['id'] = (int)$row['id'];
            $row['project_id'] = (int)$row['project_id'];
            $row['jumlah'] = (float)$row['jumlah']; 
            $transactions[] = $row;
        }
    }

    echo json_encode($transactions);

    if (isset($stmt)) { $stmt->close(); }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Gagal memuat data transaksi: " . $e->getMessage()
    ]);
}
?>