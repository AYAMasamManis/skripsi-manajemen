<?php
http_response_code(405);
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
echo json_encode(["status" => "error", "message" => "Riwayat payroll tidak dapat dihapus. Gunakan pembaruan status."]);
exit;
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: *");
header("Content-Type: application/json");
include 'db.php';

$data = json_decode(file_get_contents("php://input"));

if($data && isset($data->id)) {
    $id = $data->id;

    // 1. Ambil info dulu untuk referensi penghapusan di tabel transaksi
    $stmt_get = $conn->prepare("SELECT nama_karyawan, jabatan, total_diterima FROM payroll WHERE id = ?");
    $stmt_get->bind_param("i", $id);
    $stmt_get->execute();
    $result = $stmt_get->get_result();
    $info = $result->fetch_assoc();

    if ($info) {
        $nama = $info['nama_karyawan'];
        $jabatan = $info['jabatan'];
        $jumlah = $info['total_diterima'];
        
        // PERBAIKAN: Gunakan wildcard % di depan dan belakang nama
        // Ini akan menangkap "Gaji: Nama", "Gaji Karyawan: Nama", dsb.
        $search_ket = "%" . $nama . "%"; 

        // 2. Hapus di tabel payroll
        $stmt_pay = $conn->prepare("DELETE FROM payroll WHERE id = ?");
        $stmt_pay->bind_param("i", $id);
        
        if($stmt_pay->execute()) {
            
            // 3. Hapus juga di tabel transactions agar SALDO BALIK
            $jenis = 'keluar'; 
            $stmt_trans = $conn->prepare("DELETE FROM transactions WHERE keterangan LIKE ? AND jumlah = ? AND jenis = ?");
            $stmt_trans->bind_param("sds", $search_ket, $jumlah, $jenis);
            $stmt_trans->execute();
            
            echo json_encode(["status" => "success", "message" => "Data gaji terhapus & saldo telah disinkronkan"]);
            
            $stmt_trans->close();
        } else {
            echo json_encode(["status" => "error", "message" => "Gagal menghapus data"]);
        }
        $stmt_pay->close();
    } else {
        echo json_encode(["status" => "error", "message" => "Data tidak ditemukan"]);
    }
    $stmt_get->close();
} else {
    echo json_encode(["status" => "error", "message" => "ID tidak valid"]);
}
?>
