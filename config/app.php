<?php
/**
 * Configuración general de la aplicación
 */

return [
    'app_name' => 'JW Marriott - Sistema de Mantenimiento',
    'app_version' => '1.0.0',
    'debug' => false,
    'timezone' => 'America/Mexico_City',
    'locale' => 'es',
    
    // Configuraciones de sesión
    'session' => [
        'name' => 'jwm_maintenance_session',
        'lifetime' => 3600, // 1 hora
        'path' => '/',
        'domain' => '',
        'secure' => false,
        'httponly' => true
    ],
    
    // Configuraciones de archivos
    'upload' => [
        'max_size' => 5242880, // 5MB
        'allowed_types' => ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
        'path' => __DIR__ . '/../storage/uploads/'
    ],
    
    // Configuraciones de logging
    'logging' => [
        'enabled' => true,
        'level' => 'info',
        'path' => __DIR__ . '/../storage/logs/',
        'max_files' => 30
    ]
];
?> 