<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Конфигуратор серверного шкафа 3Cabinet - виртуальное проектирование размещения оборудования">
    <title>Веб-приложение для виртуального шкафа</title>

    <!-- Подключение CSS -->
    <link rel="stylesheet" href="css/styles.css">
    
</head>
<body>
    <!-- Вставка спрайта — можно и через include на сервере -->
  <div style="display:none">
    <?php include 'assets/sprite/sprite.svg'; ?>
  </div>
    <!-- ================================================
         Header
         ================================================ -->
    <header class="header">
        <div class="header-left">
           <h1>🖥️ Веб-приложение для виртуального шкафа</h1>
           <p>Новый проект</p>
        </div>
        <div class="header-center">
        </div>
        <div class="header-right">
            <button class="button-header">
                <svg class="icon" width="24" height="24"><use href="#icon-save"></use></svg>
                Кнопка</button>
            <button class="button-header">
                
                Кнопка</button>
            <button class="button-header">
                
                Кнопка</button>
            <button class="button-header">
                
                Кнопка</button>
        </div>    
    </header>
    <!-- ================================================
         Main Container
         ================================================ -->
    <main class="container">
        <!-- ================================================
             Left Panel: Cabinet Info & Equipment Catalog
             ================================================ -->
        <aside class="panel-left">
            <!-- Cabinet Information -->
            <div class="cabinet-info">
                <h2 class="panel-title">📋 Информация о шкафе</h2>
                <div id="cabinet-info"></div>
            </div>

            <!-- Equipment Catalog -->
            <div class="equipment-catalog">
                <h2 class="panel-title">🔧 Каталог оборудования</h2>
                <div id="equipment-grid" class="equipment-grid"></div>
            </div>
        </aside>

        <!-- ================================================
             Center Panel: Cabinet Visualization
             ================================================ -->
        <section class="panel-center">
            <h2 class="panel-title">🏢 Визуализация шкафа</h2>
            <p style="color: var(--color-text-muted); margin-bottom: 1rem; font-size: 0.9rem;">
                Перетащите оборудование из каталога в нужную позицию шкафа
            </p>
            <div class="cabinet-container">
                <div id="cabinet-3d-container" class="cabinet-3d" aria-label="3D cabinet viewport"></div>
            </div>
        </section>

        <!-- ================================================
             Right Panel: Parameters
             ================================================ -->
        <aside class="panel-right">
            <h2 class="panel-title">📊 Итоговые параметры</h2>
            <div id="parameters" class="parameters-grid"></div>
        </aside>
    </main>

    <!-- ================================================
         Scripts
         ================================================ -->
    <!-- Данные оборудования -->
    <script src="js/data.js"></script>
    
    <!-- Основное приложение -->
    <script type="module" src="js/app.js"></script>
</body>
</html>
