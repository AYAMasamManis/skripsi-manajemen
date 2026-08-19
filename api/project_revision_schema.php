<?php

function ensureProjectRevisionSchema(mysqli $conn): void
{
    $projectColumns = [
        'tanggal_mulai' => "DATE NULL",
        'tanggal_target' => "DATE NULL",
        'tanggal_selesai' => "DATE NULL",
        'progress_percent' => "DECIMAL(5,2) NOT NULL DEFAULT 0",
    ];

    foreach ($projectColumns as $name => $definition) {
        $result = $conn->query("SHOW COLUMNS FROM projects LIKE '" . $conn->real_escape_string($name) . "'");
        if ($result && $result->num_rows === 0) {
            $conn->query("ALTER TABLE projects ADD COLUMN `$name` $definition");
        }
    }

    // Proyek lama yang sudah selesai tetap ikut laporan pada tanggal pencatatannya.
    $conn->query("UPDATE projects SET tanggal_selesai = DATE(created_at), progress_percent = 100 WHERE LOWER(status) = 'selesai' AND tanggal_selesai IS NULL");
}
