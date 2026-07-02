<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';

$response = [
    "total_projects" => 0,
    "active_projects" => 0,
    "total_balance" => 0,
    "total_debt" => 0
];

try {
    // 1. Hitung Total Proyek & Proyek Aktif
    $sql_proj = "SELECT 
                    COUNT(*) as total, 
                    SUM(CASE WHEN status != 'Selesai' THEN 1 ELSE 0 END) as active 
                 FROM projects";
    $res_proj = $conn->query($sql_proj);
    $data_proj = $res_proj->fetch_assoc();
    $response["total_projects"] = (int)$data_proj['total'];
    $response["active_projects"] = (int)$data_proj['active'];

    // 2. Hitung Total Saldo (Uang Masuk - Uang Keluar)
    // Gunakan LOWER(jenis) agar sinkron dengan file yang kita buat sebelumnya
    $sql_balance = "SELECT 
                        SUM(CASE WHEN LOWER(jenis) = 'masuk' THEN jumlah ELSE 0 END) - 
                        SUM(CASE WHEN LOWER(jenis) = 'keluar' THEN jumlah ELSE 0 END) as balance 
                    FROM transactions";
    $res_balance = $conn->query($sql_balance);
    $data_balance = $res_balance->fetch_assoc();
    $response["total_balance"] = (float)$data_balance['balance'];

    // 3. Hitung Total Hutang Vendor (Total Tagihan - Yang Sudah Dibayar)
    $sql_debt = "SELECT SUM(total_tagihan - jumlah) as total_hutang 
                 FROM transactions 
                 WHERE LOWER(jenis) = 'keluar' AND total_tagihan > jumlah";
    $res_debt = $conn->query($sql_debt);
    $data_debt = $res_debt->fetch_assoc();
    $response["total_debt"] = (float)$data_debt['total_hutang'];

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Gagal menghitung statistik: " . $e->getMessage()
    ]);
}
?>