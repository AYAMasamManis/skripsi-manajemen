<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';

// Menyamakan zona waktu
date_default_timezone_set('Asia/Jakarta');

// MENERIMA FILTER TAHUN (Default ke tahun sekarang jika tidak ada kiriman)
$tahun = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
if ($tahun < 2000 || $tahun > 2100) {
    $tahun = (int)date('Y');
}

$response = [
    "monthly_stats" => [],
    "category_distribution" => []
];

/**
 * 1. QUERY UNTUK BAR CHART & TABEL (DIFILTER PER TAHUN)
 */
$sql_monthly = "SELECT 
                    DATE_FORMAT(tanggal, '%M') as bulan,
                    SUM(CASE WHEN LOWER(jenis) = 'masuk' THEN jumlah ELSE 0 END) as income,
                    SUM(CASE WHEN LOWER(jenis) = 'keluar' THEN jumlah ELSE 0 END) as expense,
                    MONTH(tanggal) as bulan_angka
                FROM transactions 
                WHERE YEAR(tanggal) = '$tahun'
                GROUP BY bulan_angka, bulan
                ORDER BY bulan_angka ASC";

$res_monthly = $conn->query($sql_monthly);

if ($res_monthly) {
    while($row = $res_monthly->fetch_assoc()) {
        $income = (float)$row['income'];
        $expense = (float)$row['expense'];
        $response["monthly_stats"][] = [
            "bulan" => $row['bulan'] . " " . $tahun,
            "income" => $income,
            "expense" => $expense,
            "profit" => $income - $expense
        ];
    }
}

/**
 * 2. QUERY UNTUK PIE CHART (DIFILTER PER TAHUN)
 */
$sql_category = "SELECT 
                    CASE 
                        WHEN kategori LIKE '%BATA%' OR kategori LIKE '%DINDING%' THEN 'PEKERJAAN DINDING'
                        WHEN kategori LIKE '%LANTAI%' OR kategori LIKE '%KERAMIK%' THEN 'PEKERJAAN LANTAI'
                        WHEN kategori LIKE '%ATAP%' OR kategori LIKE '%PLAFON%' THEN 'PEKERJAAN ATAP'
                        WHEN UPPER(COALESCE(kategori, '')) LIKE '%UPAH%'
                          OR UPPER(COALESCE(kategori, '')) LIKE '%GAJI%'
                          OR UPPER(COALESCE(kategori, '')) LIKE '%PAYROLL%'
                          OR UPPER(COALESCE(keterangan, '')) LIKE '%GAJI KARYAWAN%'
                          OR UPPER(COALESCE(keterangan, '')) LIKE '%PAYROLL%'
                        THEN 'UPAH KARYAWAN'
                        WHEN kategori LIKE '%LISTRIK%' OR kategori LIKE '%PIPA%' THEN 'MEP (LISTRIK & AIR)'
                        WHEN kategori LIKE '%KAYU%' OR kategori LIKE '%KUSEN%' THEN 'KUSEN & PINTU'
                        WHEN kategori LIKE '%SEMEN%' OR kategori LIKE '%PASIR%' OR kategori LIKE '%BETON%' THEN 'MATERIAL UTAMA'
                        WHEN kategori IS NULL OR kategori = '' THEN 'LAIN-LAIN / UMUM'
                        ELSE UPPER(kategori)
                    END as name, 
                    SUM(jumlah) as value 
                 FROM transactions 
                 WHERE LOWER(jenis) = 'keluar' 
                 AND YEAR(tanggal) = '$tahun'
                 GROUP BY name 
                 HAVING value > 0
                 ORDER BY value DESC";

$res_category = $conn->query($sql_category);

if ($res_category) {
    while($row = $res_category->fetch_assoc()) {
        $response["category_distribution"][] = [
            "name" => $row['name'],
            "value" => (float)$row['value']
        ];
    }
}

// Kirim hasil akhir ke React
echo json_encode($response);
