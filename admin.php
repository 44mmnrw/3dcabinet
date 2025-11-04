<?php
session_start();
// Проверка авторизации (пока отключено)
// if (!isset($_SESSION['admin'])) { header('Location: login.php'); exit; }

error_reporting(E_ALL);
ini_set('display_errors', 1);
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>3Cabinet — Админка</title>
    <link rel="stylesheet" href="css/reset.css">
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/admin.css">
</head>
<body class="body admin-layout">
    <?php include __DIR__ . '/assets/sprite/sprite.svg'; ?>
    <?php include __DIR__ . '/includes/main/admin-dashboard.php'; ?>
    
    <script src="js/modules/utils.js"></script>
    <script src="js/admin.js"></script>
</body>
</html>