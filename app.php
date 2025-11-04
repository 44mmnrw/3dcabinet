<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>3Cabinet — Конфигуратор</title>
    <link rel="stylesheet" href="css/reset.css">
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="css/app.css">
</head>
<body class="body">
    <?php include __DIR__ . '/assets/sprite/sprite.svg'; ?>
    <?php include __DIR__ . '/includes/header.php'; ?>
    <?php include __DIR__ . '/includes/main/configurator.php'; ?>
    <?php include __DIR__ . '/includes/footer.php'; ?>
    
    <script src="js/libs/three.min.js"></script>
    <script type="module" src="js/app.js"></script>
</body>
</html>
