<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

// Pastikan ID ada
if (!isset($_POST['id']) || empty($_POST['id'])) {
    echo json_encode(["message" => "ID Transaksi tidak ditemukan"]);
    exit;
}

$id = $_POST['id'];
$jenis = $_POST['jenis'];
$kategori = $_POST['kategori'];
$jumlah = $_POST['jumlah'];
$updated_by = substr(trim($_POST['updated_by'] ?? 'Pengguna tidak diketahui'), 0, 150);

$updated_by_column = $conn->query("SHOW COLUMNS FROM transactions LIKE 'last_updated_by'");
if ($updated_by_column && $updated_by_column->num_rows === 0) {
    $conn->query("ALTER TABLE transactions ADD COLUMN last_updated_by VARCHAR(150) NULL");
}
$updated_at_column = $conn->query("SHOW COLUMNS FROM transactions LIKE 'last_updated_at'");
if ($updated_at_column && $updated_at_column->num_rows === 0) {
    $conn->query("ALTER TABLE transactions ADD COLUMN last_updated_at DATETIME NULL");
}

// Cek apakah ada upload bukti baru
if (isset($_FILES['bukti']) && $_FILES['bukti']['error'] == 0) {
    
    // 1. Ambil nama file lama untuk dihapus dari server (opsional tapi bagus untuk storage)
    $stmt_old = $conn->prepare("SELECT bukti FROM transactions WHERE id = ?");
    $stmt_old->bind_param("i", $id);
    $stmt_old->execute();
    $res_old = $stmt_old->get_result();
    if ($row_old = $res_old->fetch_assoc()) {
        $old_path = "uploads/" . $row_old['bukti'];
        if (!empty($row_old['bukti']) && file_exists($old_path)) {
            unlink($old_path); // Hapus file lama agar tidak jadi sampah
        }
    }
    $stmt_old->close();

    // 2. Proses upload file baru
    $target_dir = "uploads/";
    $file_extension = pathinfo($_FILES["bukti"]["name"], PATHINFO_EXTENSION);
    $bukti_nama = time() . "_" . $id . "." . $file_extension;
    move_uploaded_file($_FILES["bukti"]["tmp_name"], $target_dir . $bukti_nama);
    
    // 3. Update dengan gambar baru (Prepared Statement)
    $sql = "UPDATE transactions SET jenis=?, kategori=?, jumlah=?, bukti=?, last_updated_by=?, last_updated_at=NOW() WHERE id=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssdssi", $jenis, $kategori, $jumlah, $bukti_nama, $updated_by, $id);

} else {
    // Update tanpa mengubah gambar (Prepared Statement)
    $sql = "UPDATE transactions SET jenis=?, kategori=?, jumlah=?, last_updated_by=?, last_updated_at=NOW() WHERE id=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssdsi", $jenis, $kategori, $jumlah, $updated_by, $id);
}

// Eksekusi
if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Data transaksi VA Construction berhasil diperbarui!"]);
} else {
    echo json_encode(["success" => false, "message" => "Gagal edit: " . $stmt->error]);
}

$stmt->close();
?>
