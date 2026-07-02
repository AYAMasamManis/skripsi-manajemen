<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");
include 'db.php'; 

$data = json_decode(file_get_contents("php://input"));

if ($data) {
    // 1. Tangkap data & Casting
    $project_id = isset($data->project_id) ? $data->project_id : 0;
    $nama       = isset($data->nama_karyawan) ? $data->nama_karyawan : '';
    $jabatan    = isset($data->jabatan) ? $data->jabatan : '';
    $hari       = (int)(isset($data->hari_kerja) ? $data->hari_kerja : 0);
    $gaji       = (float)(isset($data->gaji_perhari) ? $data->gaji_perhari : 0);
    $kasbon     = (float)(isset($data->kasbon) ? $data->kasbon : 0);
    
    // 2. TANGKAP PERIODE
    $bulan_gaji = (int)(isset($data->bulan_gaji) ? $data->bulan_gaji : date('m'));
    $tahun_gaji = (int)(isset($data->tahun_gaji) ? $data->tahun_gaji : date('Y'));
    
    $total_diterima = ($hari * $gaji) - $kasbon;
    $tanggal_bayar  = date('Y-m-d');
    $jenis_keluar   = 'keluar'; 

    // --- PROSES 1: SIMPAN KE PAYROLL ---
    $sql_payroll = "INSERT INTO payroll (project_id, nama_karyawan, jabatan, hari_kerja, gaji_perhari, kasbon, total_diterima, tanggal_bayar, bulan_gaji, tahun_gaji) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    
    $stmt1 = $conn->prepare($sql_payroll);
    $stmt1->bind_param("issidddsii", $project_id, $nama, $jabatan, $hari, $gaji, $kasbon, $total_diterima, $tanggal_bayar, $bulan_gaji, $tahun_gaji);

    if ($stmt1->execute()) {
        
        // --- PROSES 2: SINKRON KE TRANSAKSI (Sangat Penting untuk Saldo) ---
        $keterangan = "Gaji Karyawan: $nama ($jabatan) Periode " . $bulan_gaji . "/" . $tahun_gaji;
        
        // Sesuaikan dengan kolom tabel transactions kamu. Jika ada kolom tambahan, tambahkan di sini.
        $sql_transaksi = "INSERT INTO transactions (project_id, jenis, jumlah, keterangan, tanggal) 
                          VALUES (?, ?, ?, ?, ?)";
        
        $stmt2 = $conn->prepare($sql_transaksi);
        $stmt2->bind_param("isdss", $project_id, $jenis_keluar, $total_diterima, $keterangan, $tanggal_bayar);
        
        if($stmt2->execute()) {
            echo json_encode(["status" => "success", "message" => "Gaji tersimpan & Saldo terpotong"]);
        } else {
            // Jika masuk sini, berarti data payroll aman, tapi transaksi gagal (saldo nggak kurang)
            echo json_encode(["status" => "partial_error", "message" => "Payroll tersimpan tapi transaksi saldo gagal: " . $stmt2->error]);
        }
        $stmt2->close();

    } else {
        echo json_encode(["status" => "error", "message" => "Gagal simpan payroll: " . $stmt1->error]);
    }
    $stmt1->close();
}
?>