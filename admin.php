<?php

// Подключаем файл конфигурации
$config = include 'config.php';

// Подключаем отладчик только если включен в конфиге
if (isset($config['debug']) && $config['debug'] === true) {
    require_once 'debug.php';
}

session_start();

// Простая проверка авторизации
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: admin.php');
    exit;
}

if (!isset($_SESSION['admin_logged_in'])) {
    $error = '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $password = $_POST['password'] ?? '';
        // Пример хардкод пароля - admin123
        if ($password === 'admin123') {
            $_SESSION['admin_logged_in'] = true;
            header('Location: admin.php');
            exit;
        } else {
            $error = 'Неверный пароль';
        }
    }
    ?>
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8" />
        <title>Вход в админку</title>
    </head>
    <body>
        <h1>Вход в административную часть</h1>
        <?php if ($error): ?>
            <p style="color:red;"><?=htmlspecialchars($error)?></p>
        <?php endif; ?>
        <form method="post">
            <label>Пароль: <input type="password" name="password" required></label>
            <button type="submit">Войти</button>
        </form>
    </body>
    </html>
    <?php
    exit;
}

// Если авторизован - подключаемся к БД и выполняем действия
$dsn = "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4";
$pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

// Функция для транслитерации русских букв в латиницу
function transliterate($string) {
    $converter = [
        'а'=>'a','б'=>'b','в'=>'v','г'=>'g','д'=>'d','е'=>'e','ё'=>'e','ж'=>'zh','з'=>'z','и'=>'i','й'=>'y','к'=>'k',
        'л'=>'l','м'=>'m','н'=>'n','о'=>'o','п'=>'p','р'=>'r','с'=>'s','т'=>'t','у'=>'u','ф'=>'f','х'=>'h','ц'=>'c',
        'ч'=>'ch','ш'=>'sh','щ'=>'sch','ь'=>'','ы'=>'y','ъ'=>'','э'=>'e','ю'=>'yu','я'=>'ya',
        'А'=>'A','Б'=>'B','В'=>'V','Г'=>'G','Д'=>'D','Е'=>'E','Ё'=>'E','Ж'=>'Zh','З'=>'Z','И'=>'I','Й'=>'Y','К'=>'K',
        'Л'=>'L','М'=>'M','Н'=>'N','О'=>'O','П'=>'P','Р'=>'R','С'=>'S','Т'=>'T','У'=>'U','Ф'=>'F','Х'=>'H','Ц'=>'C',
        'Ч'=>'Ch','Ш'=>'Sh','Щ'=>'Sch','Ь'=>'','Ы'=>'Y','Ъ'=>'','Э'=>'E','Ю'=>'Yu','Я'=>'Ya',
    ];
    $string = strtr($string, $converter);
    $string = preg_replace('/[^a-zA-Z0-9]+/', '-', $string);
    $string = strtolower(trim($string, '-'));
    return $string;
}

$action = $_GET['action'] ?? '';
?>

<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8" />
    <title>Административная часть</title>
    <style>
        button {
            margin: 0.5rem;
            padding: 0.5rem 1rem;
            font-size: 1rem;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 1rem;
        }
        th, td {
            border: 1px solid #ccc;
            padding: 0.5rem;
            text-align: left;
        }
    </style>
</head>
<body>
    <h1>Административная часть</h1>
    <p><a href="admin.php?logout=1">Выйти из админки</a></p>
    <button onclick="location.href='admin.php?action=list_equipment'">Оборудование</button>
    <button onclick="location.href='admin.php?action=list_categories'">Категории</button>
    <button onclick="location.href='admin.php?action=list_manufacturers'">Производители</button>

<?php
switch ($action) {
    case 'add_equipment':
        // Обработка добавления оборудования для старой структуры БД
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $name = $_POST['equipment_name'] ?? '';
            $model = $_POST['model'] ?? '';
            $manufacturer = $_POST['manufacturer_id'] ?? '';
            $category = $_POST['category_id'] ?? '';
            $is_active = isset($_POST['is_active']) ? 1 : 0;
            if ($name && $manufacturer && $category) {
                $query = 'INSERT INTO equipment (equipment_name, model, manufacturer, category_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())';
                $params = [$name, $model, $manufacturer, $category, $is_active];
                if (function_exists('debugSQL')) {
                    debugSQL($query, $params);
                }
                $stmt = $pdo->prepare($query);
                $stmt->execute($params);
                echo '<p style="color:green;">Оборудование добавлено успешно.</p>';
                echo '<p><a href="admin.php?action=list_equipment">Вернуться к списку оборудования</a></p>';
            } else {
                echo '<p style="color:red;">Все обязательные поля должны быть заполнены.</p>';
            }
        }
        break;

    case 'list_equipment':
        // Получаем список оборудования из БД с текущими полями manufacturer и category (старая структура)
        $query = '
            SELECT e.*, m.manufacturer_name, c.category_name 
            FROM equipment e
            LEFT JOIN manufacturers m ON e.manufacturer = m.manufacturer_id
            LEFT JOIN equipment_categories c ON e.category_id = c.category_id
            ORDER BY e.equipment_id DESC
        ';
        if (function_exists('debugSQL')) {
            debugSQL($query);
        }
        $equipment = $pdo->query($query)->fetchAll();
        
        echo '<h2>Список оборудования</h2>';
        echo '<button onclick="location.href=\'admin.php?action=add_equipment_form\'">Добавить оборудование</button>';
        echo '<table>';
        echo '<thead><tr>
            <th>ID</th>
            <th>Название</th>
            <th>Модель</th>
            <th>Производитель</th>
            <th>Категория</th>
            <th>Активен</th>
        </tr></thead>';
        echo '<tbody>';
        foreach ($equipment as $item) {
            echo '<tr>';
            echo '<td>' . htmlspecialchars($item['equipment_id']) . '</td>';
            echo '<td>' . htmlspecialchars($item['equipment_name']) . '</td>';
            echo '<td>' . htmlspecialchars($item['model']) . '</td>';
            echo '<td>' . htmlspecialchars($item['manufacturer_name']) . '</td>';
            echo '<td>' . htmlspecialchars($item['category_name']) . '</td>';
            echo '<td>' . ($item['is_active'] ? 'Да' : 'Нет') . '</td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
        break;

    case 'add_equipment_form':
        // Форма добавления нового оборудования
        ?>
        <h2>Добавить новое оборудование</h2>
        <form method="post" action="admin.php?action=add_equipment">
            <p><label>Название оборудования: <input type="text" name="equipment_name" required></label></p>
            <p><label>Модель: <input type="text" name="model"></label></p>
            <p><label>Производитель: 
                <select name="manufacturer_id">
                    <?php
                    $manufacturers = $pdo->query('SELECT manufacturer_id, manufacturer_name FROM manufacturers WHERE is_active = 1 ORDER BY manufacturer_name')->fetchAll();
                    foreach ($manufacturers as $man) {
                        echo '<option value="'.htmlspecialchars($man['manufacturer_id']).'">'.htmlspecialchars($man['manufacturer_name']).'</option>';
                    }
                    ?>
                </select>
            </label></p>
            <p><label>Категория: 
                <select name="category_id">
                    <?php
                    $categories = $pdo->query('SELECT category_id, category_name FROM equipment_categories WHERE is_active = 1 ORDER BY category_name')->fetchAll();
                    foreach ($categories as $cat) {
                        echo '<option value="'.htmlspecialchars($cat['category_id']).'">'.htmlspecialchars($cat['category_name']).'</option>';
                    }
                    ?>
                </select>
            </label></p>
            <p><label><input type="checkbox" name="is_active" checked> Активно</label></p>
            <p><button type="submit">Добавить</button></p>
        </form>
        <p><a href="admin.php?action=list_equipment">Отмена</a></p>
        <?php
        break;

    case 'list_categories':
        // Обработка добавления категории
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $name = $_POST['category_name'] ?? '';
            $is_active = isset($_POST['is_active']) ? 1 : 0;
            if ($name) {
                $code = transliterate($name);
                $stmt = $pdo->prepare('INSERT INTO equipment_categories (category_name, category_code, is_active, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())');
                $stmt->execute([$name, $code, $is_active]);
                echo '<p style="color:green;">Категория добавлена успешно.</p>';
            } else {
                echo '<p style="color:red;">Название категории обязательно для заполнения.</p>';
            }
        }

        // Вывод списка категорий оборудования
        $categories = $pdo->query('SELECT * FROM equipment_categories ORDER BY category_id DESC')->fetchAll();
        echo '<h2>Список категорий оборудования</h2>';
        echo '<button onclick="location.href=\'admin.php?action=add_category_form\'">Добавить категорию</button>';
        echo '<table>';
        echo '<thead><tr><th>ID</th><th>Название категории</th><th>Код категории</th><th>Активна</th></tr></thead>';
        echo '<tbody>';
        foreach ($categories as $cat) {
            echo '<tr>';
            echo '<td>'.htmlspecialchars($cat['category_id']).'</td>';
            echo '<td>'.htmlspecialchars($cat['category_name']).'</td>';
            echo '<td>'.htmlspecialchars($cat['category_code']).'</td>';
            echo '<td>'.($cat['is_active'] ? 'Да' : 'Нет').'</td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
        break;

    case 'list_manufacturers':
        // Обработка добавления производителя
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $name = $_POST['manufacturer_name'] ?? '';
            $is_active = isset($_POST['is_active']) ? 1 : 0;
            if ($name) {
                $stmt = $pdo->prepare('INSERT INTO manufacturers (manufacturer_name, is_active, created_at) VALUES (?, ?, NOW())');
                $stmt->execute([$name, $is_active]);
                echo '<p style="color:green;">Производитель добавлен успешно.</p>';
            } else {
                echo '<p style="color:red;">Название производителя обязательно для заполнения.</p>';
            }
        }

        // Вывод списка производителей
        $manufacturers = $pdo->query('SELECT * FROM manufacturers ORDER BY manufacturer_id DESC')->fetchAll();
        echo '<h2>Список производителей</h2>';
        echo '<button onclick="location.href=\'admin.php?action=add_manufacturer_form\'">Добавить производителя</button>';
        echo '<table>';
        echo '<thead><tr><th>ID</th><th>Название производителя</th><th>Активен</th></tr></thead>';
        echo '<tbody>';
        foreach ($manufacturers as $man) {
            echo '<tr>';
            echo '<td>'.htmlspecialchars($man['manufacturer_id']).'</td>';
            echo '<td>'.htmlspecialchars($man['manufacturer_name']).'</td>';
            echo '<td>'.($man['is_active'] ? 'Да' : 'Нет').'</td>';
            echo '</tr>';
        }
        echo '</tbody></table>';
        break;

    case 'add_manufacturer_form':
        ?>
        <h2>Добавить нового производителя</h2>
        <form method="post" action="admin.php?action=list_manufacturers">
            <p><label>Название производителя: <input type="text" name="manufacturer_name" required></label></p>
            <p><label><input type="checkbox" name="is_active" checked> Активен</label></p>
            <p><button type="submit">Добавить</button></p>
        </form>
        <p><a href="admin.php?action=list_manufacturers">Отмена</a></p>
        <?php
        break;

    case 'add_category_form':
        ?>
        <h2>Добавить новую категорию</h2>
        <form method="post" action="admin.php?action=list_categories">
            <p><label>Название категории: <input type="text" name="category_name" required></label></p>
            <p><label><input type="checkbox" name="is_active" checked> Активна</label></p>
            <p><button type="submit">Добавить</button></p>
        </form>
        <p><a href="admin.php?action=list_categories">Отмена</a></p>
        <?php
        break;

    default:
        echo '<p>Выберите действие из меню выше.</p>';
}
?>
</body>
</html>