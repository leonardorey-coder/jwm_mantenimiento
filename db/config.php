<?php
// Cargar variables de entorno desde .env si existe
function cargarVariablesEntorno() {
    $envFile = __DIR__ . '/../.env';
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            // Ignorar comentarios
            if (strpos(trim($line), '#') === 0) {
                continue;
            }

            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            
            // Establecer la variable de entorno si no existe
            if (!isset($_ENV[$name])) {
                $_ENV[$name] = $value;
                putenv("$name=$value");
            }
        }
    }
}

// Intentar cargar variables de entorno
cargarVariablesEntorno();

// Archivo de configuración para la conexión a la base de datos

// Función para sanitizar datos
function sanitizar($conexion, $dato) {
    if (is_string($dato)) {
        return $conexion->real_escape_string(trim($dato));
    }
    return $dato;
}

// Configuración de la conexión a la base de datos usando variables de entorno
function conectarDB() {
    // Intentar obtener valores de variables de entorno, con respaldo a valores predeterminados
    $host = getenv('DB_HOST');
    $puerto = getenv('DB_PORT');
    $usuario = getenv('DB_USER');
    $password = getenv('DB_PASS');
    $database = getenv('DB_NAME');
    
    // Configuración de zona horaria
    $timezone = getenv('TIMEZONE') ?: 'America/Mexico_City';
    date_default_timezone_set($timezone);
    
    // Crear la conexión con el puerto especificado
    $conexion = new mysqli($host, $usuario, $password, $database, $puerto);
    
    // Comprobar la conexión
    if ($conexion->connect_error) {
        error_log("Error de conexión a la base de datos: " . $conexion->connect_error);
        return false;
    }
    
    // Establecer charset
    $conexion->set_charset("utf8");
    
    return $conexion;
}
?>
