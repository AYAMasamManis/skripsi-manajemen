<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';

$id = isset($_GET['id']) ? $_GET['id'] : '';

if (empty($id)) {
    echo json_encode(["error" => "ID tidak ditemukan"]);
    exit;
}

// Kolom p.tanggal dihapus karena tidak ada di database kamu
$sql = "SELECT 
            p.id, 
            p.nama_karyawan, 
            p.jabatan, 
            p.hari_kerja, 
            p.gaji_perhari, 
            p.kasbon, 
            p.total_diterima, 
            pj.nama_proyek 
        FROM payroll p
        LEFT JOIN projects pj ON p.project_id = pj.id
        WHERE p.id = '$id'";

$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    
    $data = [
        "id" => $row['id'],
        "nama_karyawan" => $row['nama_karyawan'],
        "jabatan" => $row['jabatan'],
        "hari_kerja" => (int)$row['hari_kerja'],
        "gaji_perhari" => (float)$row['gaji_perhari'],
        "kasbon" => (float)$row['kasbon'],
        "total_diterima" => (float)$row['total_diterima'],
        "nama_proyek" => $row['nama_proyek'] ?? 'Internal / Umum',
        "tanggal" => date('d F Y') // Kita pakai tanggal hari ini saja sebagai default
    ];
    
    echo json_encode($data);
} else {
    echo json_encode(null);
}
?>