<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
include 'connection.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Metode tidak didukung"]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?: $_POST;
if (!isset($data['id'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ID payroll tidak valid"]);
    exit;
}

$id = (int)$data['id'];
$conn->begin_transaction();

try {
    $stmt_get = $conn->prepare("SELECT project_id, nama_karyawan, jabatan, total_diterima, bulan_gaji, tahun_gaji FROM payroll WHERE id = ?");
    $stmt_get->bind_param("i", $id);
    $stmt_get->execute();
    $payroll = $stmt_get->get_result()->fetch_assoc();
    $stmt_get->close();

    if (!$payroll) {
        throw new Exception('Data payroll tidak ditemukan.');
    }

    $keterangan = "Gaji Karyawan: {$payroll['nama_karyawan']} ({$payroll['jabatan']}) Periode {$payroll['bulan_gaji']}/{$payroll['tahun_gaji']}";

    $delete_txn = $conn->prepare("DELETE FROM transactions WHERE project_id = ? AND LOWER(jenis) = 'keluar' AND LOWER(kategori) = 'upah' AND ABS(jumlah - ?) < 0.01 AND keterangan = ?");
    $delete_txn->bind_param("ids", $payroll['project_id'], (float)$payroll['total_diterima'], $keterangan);
    $delete_txn->execute();
    $delete_txn->close();

    $delete_payroll = $conn->prepare("DELETE FROM payroll WHERE id = ?");
    $delete_payroll->bind_param("i", $id);
    if (!$delete_payroll->execute()) {
        throw new Exception('Gagal menghapus data payroll: ' . $delete_payroll->error);
    }
    $delete_payroll->close();

    $conn->commit();
    echo json_encode(["status" => "success", "message" => "Data gaji dihapus dan saldo utama telah dikembalikan."]);
} catch (Exception $e) {
    $conn->rollback();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
