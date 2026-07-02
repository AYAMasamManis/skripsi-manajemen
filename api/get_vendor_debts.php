<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Pastikan nama file koneksi ini benar (apakah db.php atau connection.php?)
include 'connection.php'; 

/**
 * Query untuk menarik data hutang vendor.
 * WAJIB menyertakan t.project_id agar Link di React tidak 'undefined'.
 */
$sql = "SELECT 
            t.project_id, 
            t.vendor, 
            p.nama_proyek, 
            t.total_tagihan, 
            t.jumlah as dibayar,
            (t.total_tagihan - t.jumlah) as sisa_hutang,
            t.tanggal
        FROM transactions t
        JOIN projects p ON t.project_id = p.id
        WHERE LOWER(t.jenis) = 'keluar' 
        AND (t.total_tagihan - t.jumlah) > 0
        ORDER BY t.tanggal DESC"; // Diurutkan dari yang terbaru agar informatif

try {
    $result = $conn->query($sql);
    $debts = [];

    if ($result && $result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            // Memastikan angka dikirim sebagai tipe numerik (float)
            // agar tidak muncul angka 0 atau NaN di React
            $row['project_id'] = (int)$row['project_id'];
            $row['total_tagihan'] = (float)$row['total_tagihan'];
            $row['dibayar'] = (float)$row['dibayar'];
            $row['sisa_hutang'] = (float)$row['sisa_hutang'];
            
            $debts[] = $row;
        }
    }

    // Mengirim hasil akhir dalam format JSON
    echo json_encode($debts);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Gagal mengambil data hutang vendor: " . $e->getMessage()
    ]);
}
?>