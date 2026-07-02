<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
include 'db.php'; // Pastikan koneksi DB-mu bener (db.php atau connection.php)

// 1. Validasi ID Transaksi
if (isset($_GET['transaction_id']) && !empty($_GET['transaction_id'])) {
    
    $transaction_id = $_GET['transaction_id'];

    // 2. Query Data
    $sql = "SELECT * FROM transaction_proofs WHERE transaction_id = ? ORDER BY id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $transaction_id);
    
    if ($stmt->execute()) {
        $result = $stmt->get_result();
        $data = [];

        while($row = $result->fetch_assoc()) {
            $row['id'] = (int)$row['id'];
            $row['transaction_id'] = (int)$row['transaction_id'];
            $data[] = $row;
        }

        // Selalu kirim array (meskipun kosong)
        echo json_encode($data);
    } else {
        echo json_encode([]);
    }
    $stmt->close();

} else {
    // JANGAN kirim 400 kalau mau React-mu aman. Kirim array kosong aja.
    echo json_encode([]);
}
?>