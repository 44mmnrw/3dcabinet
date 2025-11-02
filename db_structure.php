<?php
$config = include 'config.php';

try {
    $dsn = "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);

    foreach ($tables as $table) {
        echo "Table: $table\n";
        $columns = $pdo->query('SHOW COLUMNS FROM ' . $table)->fetchAll(PDO::FETCH_ASSOC);
        foreach ($columns as $column) {
            echo '  ' . $column['Field'] . ' - ' . $column['Type'] . ' - ' . $column['Null'] . ' - ' . $column['Key'] . ' - ' . ($column['Default'] ?? 'NULL') . ' - ' . $column['Extra'] . "\n";
        }
        echo "\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
    exit;
}
