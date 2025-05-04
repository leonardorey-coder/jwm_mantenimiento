<?php
// Archivo de configuración para la conexión a la base de datos
define('DB_HOST', 'localhost');
define('DB_USER', 'root');     // Usuario por defecto de XAMPP
define('DB_PASS', '');         // Contraseña por defecto de XAMPP (vacía)
define('DB_NAME', 'finest_mant_cuartos');

// Crear conexión usando mysqli
function conectarDB() {
    $conexion = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    // Verificar conexión
    if ($conexion->connect_error) {
        die("Error de conexión: " . $conexion->connect_error);
    }
    
    // Establecer conjunto de caracteres
    $conexion->set_charset("utf8");
    
    return $conexion;
}

// Función para escapar y sanitizar datos de entrada
function sanitizar($conexion, $dato) {
    $dato = $conexion->real_escape_string($dato);
    $dato = htmlspecialchars($dato);
    return $dato;
}
?>