<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';
include_once 'project_revision_schema.php';
ensureProjectRevisionSchema($conn);

$response = [
    "total_projects" => 0,
    "active_projects" => 0,
    "total_balance" => 0,
    "total_debt" => 0,
    "total_income" => 0,
    "total_expense" => 0,
    "completed_profit" => 0
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
                        COALESCE(SUM(CASE WHEN LOWER(jenis) = 'masuk' THEN jumlah ELSE 0 END), 0) AS income,
                        COALESCE(SUM(CASE WHEN LOWER(jenis) = 'keluar' THEN jumlah ELSE 0 END), 0) AS expense
                    FROM transactions";
    $res_balance = $conn->query($sql_balance);
    $data_balance = $res_balance->fetch_assoc();
    $response["total_income"] = (float)$data_balance['income'];
    $response["total_expense"] = (float)$data_balance['expense'];
    $response["total_balance"] = $response["total_income"] - $response["total_expense"];

    $sql_profit = "SELECT COALESCE(SUM(x.income - x.expense), 0) AS completed_profit
                   FROM (
                       SELECT p.id,
                              COALESCE(SUM(CASE WHEN LOWER(t.jenis) = 'masuk' THEN t.jumlah ELSE 0 END), 0) AS income,
                              COALESCE(SUM(CASE WHEN LOWER(t.jenis) = 'keluar' THEN t.jumlah ELSE 0 END), 0) AS expense
                       FROM projects p
                       LEFT JOIN transactions t ON t.project_id = p.id
                       WHERE LOWER(p.status) = 'selesai'
                       GROUP BY p.id
                   ) x";
    $response["completed_profit"] = (float)$conn->query($sql_profit)->fetch_assoc()['completed_profit'];

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
