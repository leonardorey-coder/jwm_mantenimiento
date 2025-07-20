<?php
/**
 * Configuración de la base de datos
 * 
 * Define las credenciales y configuraciones para la conexión a la base de datos
 */

// Configuración de la base de datos
return [
    'host' => 'localhost',
    'username' => 'root',
    'password' => '',
    'database' => 'finest_mant_cuartos',
    'charset' => 'utf8',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]
];
?> 