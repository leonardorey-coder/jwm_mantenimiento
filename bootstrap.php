<?php

/**
 * Bootstrap de la aplicación
 * Inicializa la aplicación y maneja el enrutamiento básico
 */

// Habilitar reporte de errores en desarrollo
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Definir constantes de la aplicación
define('APP_ROOT', __DIR__);
define('APP_PATH', APP_ROOT . '/app');
define('CONFIG_PATH', APP_ROOT . '/config');

// Autoloader simple para las clases
spl_autoload_register(function ($class) {
    // Convertir namespace a ruta de archivo
    $classPath = str_replace('\\', '/', $class);
    $file = APP_ROOT . '/' . $classPath . '.php';
    
    if (file_exists($file)) {
        require_once $file;
    }
});

// Iniciar sesión
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Configurar zona horaria
$appConfig = require CONFIG_PATH . '/app.php';
date_default_timezone_set($appConfig['timezone']);

// Router básico
class Router
{
    private $routes = [];

    public function addRoute($method, $path, $controller, $action)
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $path,
            'controller' => $controller,
            'action' => $action
        ];
    }

    public function handleRequest()
    {
        $requestMethod = $_SERVER['REQUEST_METHOD'];
        $requestUri = $_SERVER['REQUEST_URI'];
        
        // Remover query string
        $requestPath = parse_url($requestUri, PHP_URL_PATH);
        
        // Buscar ruta coincidente
        foreach ($this->routes as $route) {
            if ($this->matchRoute($route, $requestMethod, $requestPath)) {
                return $this->executeRoute($route);
            }
        }
        
        // Si no se encuentra ruta, mostrar 404
        $this->handle404();
    }

    private function matchRoute($route, $method, $path)
    {
        if ($route['method'] !== $method) {
            return false;
        }

        // Convertir ruta con parámetros a regex
        $pattern = str_replace('/', '\/', $route['path']);
        $pattern = preg_replace('/\{[^}]+\}/', '([^\/]+)', $pattern);
        $pattern = '/^' . $pattern . '$/';

        return preg_match($pattern, $path);
    }

    private function executeRoute($route)
    {
        $controllerClass = $route['controller'];
        $action = $route['action'];

        if (class_exists($controllerClass)) {
            $controller = new $controllerClass();
            
            if (method_exists($controller, $action)) {
                return $controller->$action();
            }
        }

        $this->handle404();
    }

    private function handle404()
    {
        http_response_code(404);
        $controller = new \App\Controllers\HomeController();
        $controller->notFound();
    }
}

// Configurar rutas
$router = new Router();

// Rutas principales
$router->addRoute('GET', '/', 'App\Controllers\HomeController', 'index');
$router->addRoute('GET', '/home', 'App\Controllers\HomeController', 'index');
$router->addRoute('POST', '/home/search', 'App\Controllers\HomeController', 'search');

// Rutas de mantenimiento
$router->addRoute('POST', '/mantenimiento/create', 'App\Controllers\MantenimientoController', 'create');
$router->addRoute('POST', '/mantenimiento/update', 'App\Controllers\MantenimientoController', 'update');
$router->addRoute('POST', '/mantenimiento/delete', 'App\Controllers\MantenimientoController', 'delete');
$router->addRoute('GET', '/mantenimiento/show', 'App\Controllers\MantenimientoController', 'show');
$router->addRoute('GET', '/mantenimiento/alertas', 'App\Controllers\MantenimientoController', 'getAlertas');
$router->addRoute('GET', '/mantenimiento/alertas-hoy', 'App\Controllers\MantenimientoController', 'getAlertasHoy');
$router->addRoute('GET', '/mantenimiento/recientes', 'App\Controllers\MantenimientoController', 'getRecientes');

// Para compatibilidad con procesar.php
$router->addRoute('POST', '/procesar.php', 'App\Controllers\MantenimientoController', 'create');

// Páginas de utilidad
$router->addRoute('GET', '/info', 'App\Controllers\HomeController', 'info');

// Manejar la petición
$router->handleRequest();
?> 