<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';
include_once 'project_revision_schema.php';
ensureProjectRevisionSchema($conn);

// Menyamakan zona waktu
date_default_timezone_set('Asia/Jakarta');

// Filter laporan: bulanan (rincian harian), tahunan (rincian bulanan), atau periode khusus.
$mode = isset($_GET['mode']) ? strtolower(trim($_GET['mode'])) : 'yearly';
$allowed_modes = ['monthly', 'yearly', 'custom'];
if (!in_array($mode, $allowed_modes, true)) {
    $mode = 'yearly';
}

$tahun = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
if ($tahun < 2000 || $tahun > 2100) {
    $tahun = (int)date('Y');
}
$bulan = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');
if ($bulan < 1 || $bulan > 12) {
    $bulan = (int)date('m');
}

$parseDate = static function ($value, $fallback) {
    $date = DateTime::createFromFormat('Y-m-d', (string)$value);
    return $date && $date->format('Y-m-d') === $value ? $value : $fallback;
};

if ($mode === 'monthly') {
    $start_date = sprintf('%04d-%02d-01', $tahun, $bulan);
    $end_date = date('Y-m-t', strtotime($start_date));
    $group_format = '%Y-%m-%d';
    $label_format = '%d %b %Y';
} elseif ($mode === 'custom') {
    $default_start = date('Y-m-01');
    $default_end = date('Y-m-d');
    $start_date = $parseDate($_GET['start_date'] ?? '', $default_start);
    $end_date = $parseDate($_GET['end_date'] ?? '', $default_end);
    if ($start_date > $end_date) {
        [$start_date, $end_date] = [$end_date, $start_date];
    }
    $days = (int)((strtotime($end_date) - strtotime($start_date)) / 86400);
    $group_format = $days > 62 ? '%Y-%m' : '%Y-%m-%d';
    $label_format = $days > 62 ? '%b %Y' : '%d %b %Y';
} else {
    $start_date = sprintf('%04d-01-01', $tahun);
    $end_date = sprintf('%04d-12-31', $tahun);
    $group_format = '%Y-%m';
    $label_format = '%b %Y';
}

$response = [
    "monthly_stats" => [],
    "category_distribution" => [],
    "completed_projects" => []
];

/**
 * 1. QUERY UNTUK BAR CHART & TABEL (DIFILTER PER TAHUN)
 */
$sql_monthly = "SELECT 
                    DATE_FORMAT(tanggal, '$label_format') as bulan,
                    SUM(CASE WHEN LOWER(jenis) = 'masuk' THEN jumlah ELSE 0 END) as income,
                    SUM(CASE WHEN LOWER(jenis) = 'keluar' THEN jumlah ELSE 0 END) as expense,
                    DATE_FORMAT(tanggal, '$group_format') as periode_urut
                FROM transactions 
                WHERE tanggal >= ? AND tanggal < DATE_ADD(?, INTERVAL 1 DAY)
                GROUP BY periode_urut, bulan
                ORDER BY periode_urut ASC";

$stmt_monthly = $conn->prepare($sql_monthly);
$stmt_monthly->bind_param('ss', $start_date, $end_date);
$stmt_monthly->execute();
$res_monthly = $stmt_monthly->get_result();

if ($res_monthly) {
    while($row = $res_monthly->fetch_assoc()) {
        $income = (float)$row['income'];
        $expense = (float)$row['expense'];
        $response["monthly_stats"][] = [
            "bulan" => $row['bulan'],
            "income" => $income,
            "expense" => $expense,
            "balance_change" => $income - $expense
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
                 AND tanggal >= ? AND tanggal < DATE_ADD(?, INTERVAL 1 DAY)
                 GROUP BY name 
                 HAVING value > 0
                 ORDER BY value DESC";

$stmt_category = $conn->prepare($sql_category);
$stmt_category->bind_param('ss', $start_date, $end_date);
$stmt_category->execute();
$res_category = $stmt_category->get_result();

if ($res_category) {
    while($row = $res_category->fetch_assoc()) {
        $response["category_distribution"][] = [
            "name" => $row['name'],
            "value" => (float)$row['value']
        ];
    }
}

// Laba/rugi baru diakui ketika proyek berstatus selesai. Nilainya dihitung
// dari seluruh arus kas proyek, lalu masuk periode berdasarkan tanggal selesai.
$sql_completed = "SELECT p.id, p.nama_proyek, p.tanggal_selesai,
                         COALESCE(SUM(CASE WHEN LOWER(t.jenis) = 'masuk' THEN t.jumlah ELSE 0 END), 0) AS income,
                         COALESCE(SUM(CASE WHEN LOWER(t.jenis) = 'keluar' THEN t.jumlah ELSE 0 END), 0) AS expense
                  FROM projects p
                  LEFT JOIN transactions t ON t.project_id = p.id
                  WHERE LOWER(p.status) = 'selesai'
                    AND p.tanggal_selesai >= ? AND p.tanggal_selesai < DATE_ADD(?, INTERVAL 1 DAY)
                  GROUP BY p.id, p.nama_proyek, p.tanggal_selesai
                  ORDER BY p.tanggal_selesai DESC, p.id DESC";
$stmt_completed = $conn->prepare($sql_completed);
$stmt_completed->bind_param('ss', $start_date, $end_date);
$stmt_completed->execute();
$res_completed = $stmt_completed->get_result();
while ($row = $res_completed->fetch_assoc()) {
    $income = (float)$row['income'];
    $expense = (float)$row['expense'];
    $response['completed_projects'][] = [
        'id' => (int)$row['id'],
        'nama_proyek' => $row['nama_proyek'],
        'tanggal_selesai' => $row['tanggal_selesai'],
        'income' => $income,
        'expense' => $expense,
        'profit' => $income - $expense,
    ];
}

$response['period'] = [
    'mode' => $mode,
    'start_date' => $start_date,
    'end_date' => $end_date
];

// Kirim hasil akhir ke React
echo json_encode($response);
