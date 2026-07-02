<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json; charset=UTF-8");
include 'db.php';

// Menyiapkan array penampung data
$data = [];

/**
 * QUERY UNTUK LIST PAYROLL
 * PERBAIKAN: Menambahkan kolom bulan_gaji dan tahun_gaji ke dalam SELECT
 */
$sql = "SELECT 
            payroll.id,
            payroll.project_id,
            payroll.nama_karyawan, 
            payroll.jabatan, 
            payroll.hari_kerja, 
            payroll.gaji_perhari, 
            payroll.kasbon, 
            payroll.total_diterima, 
            payroll.tanggal_bayar,
            payroll.bulan_gaji,  /* <--- TAMBAHKAN INI */
            payroll.tahun_gaji,  /* <--- TAMBAHKAN INI */
            projects.nama_proyek 
        FROM payroll 
        LEFT JOIN projects ON payroll.project_id = projects.id 
        ORDER BY payroll.id DESC";

try {
    $result = $conn->query($sql);

    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            // Memastikan angka dikirim sebagai tipe data numerik
            $row['id'] = (int)$row['id'];
            $row['hari_kerja'] = (int)$row['hari_kerja'];
            $row['gaji_perhari'] = (float)$row['gaji_perhari'];
            $row['kasbon'] = (float)$row['kasbon'];
            $row['total_diterima'] = (float)$row['total_diterima'];
            
            // Casting bulan dan tahun ke integer agar React membacanya dengan benar
            $row['bulan_gaji'] = $row['bulan_gaji'] !== null ? (int)$row['bulan_gaji'] : null;
            $row['tahun_gaji'] = $row['tahun_gaji'] !== null ? (int)$row['tahun_gaji'] : null;
            
            // Jika nama proyek NULL (karena proyek dihapus), berikan keterangan default
            if (is_null($row['nama_proyek'])) {
                $row['nama_proyek'] = "Proyek Tidak Ditemukan/Dihapus";
            }
            
            $data[] = $row;
        }
    }

    // Mengirim hasil akhir
    echo json_encode($data);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Gagal mengambil data payroll: " . $e->getMessage()
    ]);
}
?>