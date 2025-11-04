<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="3Cabinet — онлайн-конфигуратор серверного шкафа" />
    <title>3Cabinet — Конфигуратор</title>

    <link rel="preload" href="fonts/InterVariable.woff2" as="font" type="font/woff2">
    <link rel="preload" href="fonts/InterVariable-Italic.woff2" as="font" type="font/woff2">

    <link rel="stylesheet" href="css/reset.css">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body class="body">    
    <!-- SVG спрайт -->
    <div hidden aria-hidden="true">
        <?php include __DIR__ . '/assets/sprite/sprite.svg'; ?>
    </div>

    <!-- HEADER (подключение) -->
    <?php include __DIR__ . '/includes/header.php'; ?>

    <!-- MAIN CONTENT -->
    <?php include __DIR__ . '/includes/main.php'; ?>

    <!-- FOOTER (подключение) -->
    <?php include __DIR__ . '/includes/footer.php'; ?>
                
    <!-- JavaScript -->
    <script src="js/selection.js"></script>
    <script src="js/progress-animation.js"></script>
</body>
</html>