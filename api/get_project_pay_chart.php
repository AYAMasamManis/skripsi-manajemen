<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Cache-Control: no-cache, no-store, must-revalidate");
include 'connection.php';

try {
    $sql = "SELECT
                p.id AS project_id,
                p.nama_proyek,
                COALESCE(SUM(CASE WHEN t.rumpun = 'Material' THEN t.jumlah ELSE 0 END), 0) AS material,
                COALESCE(SUM(CASE WHEN t.rumpun = 'Upah' THEN t.jumlah ELSE 0 END), 0) AS upah,
                COALESCE(SUM(CASE WHEN t.rumpun = 'Subcon' THEN t.jumlah ELSE 0 END), 0) AS subcon
            FROM projects p
            LEFT JOIN (
                SELECT project_id, jumlah,
                    CASE
                        WHEN LOWER(TRIM(kategori)) REGEXP 'subcon|subkon|vendor|borongan|pemasangan' THEN 'Subcon'
                        WHEN LOWER(TRIM(kategori)) REGEXP 'upah|gaji|payroll|tukang|pekerja' THEN 'Upah'
                        WHEN LOWER(TRIM(kategori)) REGEXP 'material|logistik|bata|semen|pasir|beton|besi|kayu|kusen|keramik|lantai|atap|plafon|pipa|listrik|dinding' THEN 'Material'
                        ELSE NULL
                    END AS rumpun
                FROM transactions
                WHERE LOWER(TRIM(jenis)) IN ('keluar', 'expense')
            ) t ON t.project_id = p.id AND t.rumpun IS NOT NULL
            GROUP BY p.id, p.nama_proyek
            ORDER BY p.created_at DESC, p.id DESC";

    $result = $conn->query($sql);
    $rows = [];
    while ($row = $result->fetch_assoc()) {
        $material = (float)$row['material'];
        $upah = (float)$row['upah'];
        $subcon = (float)$row['subcon'];
        $rows[] = [
            "project_id" => (int)$row['project_id'],
            "nama_proyek" => $row['nama_proyek'],
            "material" => $material,
            "upah" => $upah,
            "subcon" => $subcon,
            "total" => $material + $upah + $subcon
        ];
    }
    echo json_encode($rows);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Gagal memuat pay chart: " . $e->getMessage()]);
}
?>
