<?php
/**
 * Файл с функциями для отладки
 */

// Включаем показ всех ошибок
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

/**
 * Функция для красивого вывода переменной
 */
function debug($var, $die = false) {
    echo '<pre style="background: #f8f8f8; border: 1px solid #ccc; padding: 10px; margin: 10px; border-radius: 5px;">';
    var_dump($var);
    echo '</pre>';
    if ($die) die;
}

/**
 * Функция для логирования ошибок в файл
 */
function logError($message, $file = null, $line = null) {
    $logFile = __DIR__ . '/logs/errors.log';
    $logDir = dirname($logFile);
    
    // Создаем директорию для логов, если её нет
    if (!file_exists($logDir)) {
        mkdir($logDir, 0777, true);
    }
    
    $date = date('Y-m-d H:i:s');
    $log = "[$date] $message";
    if ($file) {
        $log .= " in file: $file";
    }
    if ($line) {
        $log .= " on line: $line";
    }
    $log .= PHP_EOL;
    
    file_put_contents($logFile, $log, FILE_APPEND);
}

/**
 * Обработчик неперехваченных исключений
 */
set_exception_handler(function($e) {
    $message = $e->getMessage();
    $file = $e->getFile();
    $line = $e->getLine();
    
    logError($message, $file, $line);
    
    // Выводим сообщение об ошибке на экран в режиме разработки
    if (defined('DEV_MODE') && DEV_MODE === true) {
        echo "<div style='background: #ffebee; border: 1px solid #ef9a9a; padding: 15px; margin: 10px; border-radius: 5px;'>";
        echo "<h3 style='color: #c62828; margin-top: 0;'>Ошибка:</h3>";
        echo "<p><strong>Сообщение:</strong> " . htmlspecialchars($message) . "</p>";
        echo "<p><strong>Файл:</strong> " . htmlspecialchars($file) . "</p>";
        echo "<p><strong>Строка:</strong> " . $line . "</p>";
        echo "</div>";
    } else {
        // В продакшене показываем общее сообщение об ошибке
        echo "<div style='background: #ffebee; padding: 15px; margin: 10px; border-radius: 5px;'>";
        echo "<p>Произошла ошибка. Пожалуйста, попробуйте позже или обратитесь к администратору.</p>";
        echo "</div>";
    }
});

// Константа для режима разработки
define('DEV_MODE', true);

/**
 * Функция для отслеживания SQL-запросов
 */
function debugSQL($query, $params = []) {
    if (defined('DEV_MODE') && DEV_MODE === true) {
        echo "<div style='background: #e3f2fd; border: 1px solid #90caf9; padding: 10px; margin: 10px; border-radius: 5px;'>";
        echo "<h4 style='color: #1565c0; margin-top: 0;'>SQL Query:</h4>";
        echo "<pre>" . htmlspecialchars($query) . "</pre>";
        if (!empty($params)) {
            echo "<h4 style='color: #1565c0;'>Parameters:</h4>";
            echo "<pre>";
            print_r($params);
            echo "</pre>";
        }
        echo "</div>";
    }
}