<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Gunakan koneksi yang konsisten
include 'connection.php'; 

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

if (!empty($_POST['project_id']) && isset($_POST['jumlah'])) {
    
    // 1. Tangkap data dari $_POST
    $project_id        = $_POST['project_id'];
    $jenis             = $_POST['jenis']; 
    $kategori          = $_POST['kategori'];
    $jumlah            = $_POST['jumlah'];
    $total_tagihan     = isset($_POST['total_tagihan']) ? $_POST['total_tagihan'] : 0;
    $vendor            = isset($_POST['vendor']) ? $_POST['vendor'] : '';
    $status_pembayaran = isset($_POST['status_pembayaran']) ? $_POST['status_pembayaran'] : 'Lunas';
    $pic               = isset($_POST['pic']) ? $_POST['pic'] : '';
    $keterangan        = isset($_POST['keterangan']) ? $_POST['keterangan'] : '';
    $tanggal           = date('Y-m-d H:i:s'); 
    $bukti_nama        = null;

    // 2. Logika Upload File
    if (isset($_FILES['bukti']) && $_FILES['bukti']['error'] == 0) {
        $target_dir = "uploads/";
        if (!is_dir($target_dir)) {
            mkdir($target_dir, 0777, true);
        }

        $file_extension = pathinfo($_FILES["bukti"]["name"], PATHINFO_EXTENSION);
        // Nama file unik biar gak ketumpuk
        $bukti_nama = "proof_" . time() . "_" . uniqid() . "." . $file_extension;
        $target_file = $target_dir . $bukti_nama;

        move_uploaded_file($_FILES["bukti"]["tmp_name"], $target_file);
    }

    // 3. Simpan ke tabel TRANSACTIONS
    $sql = "INSERT INTO transactions 
            (project_id, jenis, kategori, jumlah, total_tagihan, vendor, status_pembayaran, pic, keterangan, tanggal, bukti) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("isssissssss", 
        $project_id, 
        $jenis, 
        $kategori, 
        $jumlah, 
        $total_tagihan, 
        $vendor, 
        $status_pembayaran, 
        $pic, 
        $keterangan, 
        $tanggal, 
        $bukti_nama
    );

    if ($stmt->execute()) {
        $new_transaction_id = $stmt->insert_id; // Ambil ID transaksi barusan

        // 4. LOGIKA SINKRONISASI: Simpan juga ke tabel TRANSACTION_PROOFS
        // Agar muncul saat tombol "BUKTI" (Stack) diklik di React
        if ($bukti_nama) {
            $sqlProof = "INSERT INTO transaction_proofs (transaction_id, file_path) VALUES (?, ?)";
            $stmtProof = $conn->prepare($sqlProof);
            $stmtProof->bind_param("is", $new_transaction_id, $bukti_nama);
            $stmtProof->execute();
            $stmtProof->close();
        }

        echo json_encode([
            "success" => true, 
            "message" => "Transaksi & Bukti VA System berhasil diverifikasi!"
        ]);
    } else {
        echo json_encode([
            "success" => false, 
            "message" => "Gagal simpan transaksi: " . $stmt->error
        ]);
    }

    $stmt->close();

} else {
    echo json_encode([
        "success" => false, 
        "message" => "Gagal: Data tidak lengkap."
    ]);
}
?>