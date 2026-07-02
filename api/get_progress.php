<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
include 'db.php';

// 1. Validasi apakah project_id ada di URL
if (isset($_GET['project_id']) && !empty($_GET['project_id'])) {
    
    $id = $_GET['project_id'];

    // 2. Ambil data progress berdasarkan project_id
    $sql = "SELECT * FROM project_progress WHERE project_id = ? ORDER BY created_at DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $data = [];

    while($row = $result->fetch_assoc()) {
        // Casting ke integer agar JSON-nya bersih (angka bukan string)
        $row['id'] = (int)$row['id'];
        $row['project_id'] = (int)$row['project_id'];
        
        // PENTING: Jika di tabel database kamu nama kolomnya adalah 'foto_path', 
        // kodingan React kita tadi sudah benar manggil foto.foto_path.
        $data[] = $row;
    }

    // Mengirim hasil akhir berupa array []
    echo json_encode($data);

    $stmt->close();

} else {
    // Jika project_id tidak ada, kirim array kosong agar React tidak crash saat .map()
    echo json_encode([]); 
}
?>