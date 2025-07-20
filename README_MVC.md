# Sistema de Mantenimiento JW Marriott - Arquitectura MVC

## Descripción

Este proyecto ha sido reorganizado siguiendo el patrón arquitectónico **Model-View-Controller (MVC)** para mejorar la mantenibilidad, escalabilidad y organización del código.

## Estructura del Proyecto

```
jwm_mant_cuartos/
├── app/                          # Código de la aplicación
│   ├── Controllers/              # Controladores
│   │   ├── HomeController.php    # Controlador principal
│   │   └── MantenimientoController.php # Controlador de mantenimientos
│   ├── Models/                   # Modelos de datos
│   │   ├── Edificio.php         # Modelo de edificios
│   │   ├── Cuarto.php           # Modelo de cuartos
│   │   └── Mantenimiento.php    # Modelo de mantenimientos
│   ├── Views/                    # Vistas (presentación)
│   │   ├── layout.php           # Layout principal
│   │   └── home/
│   │       └── index.php        # Vista principal
│   └── Core/                     # Clases base del framework
│       ├── Controller.php       # Controlador base
│       ├── Model.php            # Modelo base
│       └── Database.php         # Clase de base de datos
├── config/                       # Archivos de configuración
│   ├── app.php                  # Configuración general
│   └── database.php             # Configuración de base de datos
├── storage/                      # Almacenamiento
│   ├── logs/                    # Logs de la aplicación
│   └── uploads/                 # Archivos subidos
├── public/                       # Archivos públicos (aún no migrados)
│   ├── assets/                  # CSS, JS, imágenes
│   └── ...
├── bootstrap.php                 # Inicializador de la aplicación
├── index.php                     # Punto de entrada
└── README_MVC.md                # Esta documentación
```

## Componentes del MVC

### 1. Models (Modelos)
Los modelos manejan la lógica de datos y la interacción con la base de datos:

- **`Edificio.php`**: Gestiona operaciones CRUD de edificios
- **`Cuarto.php`**: Gestiona operaciones CRUD de cuartos/habitaciones
- **`Mantenimiento.php`**: Gestiona operaciones CRUD de mantenimientos y alertas

### 2. Views (Vistas)
Las vistas manejan la presentación y el HTML:

- **`layout.php`**: Layout base para todas las páginas
- **`home/index.php`**: Vista principal del sistema

### 3. Controllers (Controladores)
Los controladores manejan la lógica de negocio y coordinan modelos y vistas:

- **`HomeController.php`**: Controlador principal del sistema
- **`MantenimientoController.php`**: Controlador para operaciones de mantenimiento

### 4. Core (Núcleo)
Clases base que proporcionan funcionalidad común:

- **`Database.php`**: Manejo de conexiones y operaciones de base de datos
- **`Model.php`**: Clase base para todos los modelos
- **`Controller.php`**: Clase base para todos los controladores

## Rutas Disponibles

### Páginas principales
- `GET /` - Página principal
- `GET /home` - Página principal (alternativa)

### Mantenimientos
- `POST /mantenimiento/create` - Crear mantenimiento
- `POST /mantenimiento/update` - Actualizar mantenimiento
- `POST /mantenimiento/delete` - Eliminar mantenimiento
- `GET /mantenimiento/show` - Mostrar mantenimiento
- `GET /mantenimiento/alertas` - Obtener alertas
- `GET /mantenimiento/alertas-hoy` - Obtener alertas de hoy
- `GET /mantenimiento/recientes` - Obtener mantenimientos recientes

### Compatibilidad
- `POST /procesar.php` - Compatibilidad con el sistema anterior

## Características Implementadas

### Base de Datos
- Patrón Singleton para conexiones
- Uso de PDO para mayor seguridad
- Prepared statements para prevenir SQL injection
- Manejo de transacciones

### Seguridad
- Sanitización automática de datos
- Validación de entrada
- Escape de HTML en vistas
- Protección CSRF (puede implementarse)

### Funcionalidades
- Sistema de notificaciones y alertas
- Búsqueda y filtrado de cuartos
- Gestión completa de mantenimientos
- Interfaz responsive
- Progressive Web App (PWA)

## Configuración

### 1. Base de Datos
Editar `config/database.php`:
```php
return [
    'host' => 'localhost',
    'username' => 'root',
    'password' => '',
    'database' => 'finest_mant_cuartos',
    // ...
];
```

### 2. Aplicación
Editar `config/app.php` para configuraciones generales.

## Migración desde el Sistema Anterior

### Archivos Principales
- ✅ `index.php` - Convertido a punto de entrada MVC
- ✅ `procesar.php` - Lógica migrada a controladores
- ✅ `db/config.php` - Migrado a `config/database.php`

### Archivos de Vista
- ✅ HTML principal migrado a `app/Views/home/index.php`
- ✅ Layout común extraído a `app/Views/layout.php`

### JavaScript y CSS
- ⚠️ `script_index.js` - Mantiene compatibilidad
- ⚠️ `style.css` - Sin cambios
- ⚠️ Archivos estáticos - Sin migrar a carpeta `public/`

## Próximos Pasos

### 1. Migración Completa de Assets
```
public/
├── css/
│   └── style.css
├── js/
│   └── script_index.js
├── images/
│   ├── logo_high.png
│   └── logo_low.png
└── icons/
```

### 2. Controladores Adicionales
- `EdificioController.php` - Gestión de edificios
- `CuartoController.php` - Gestión de cuartos
- `ApiController.php` - API REST

### 3. Middleware
- Autenticación
- Autorización
- Rate limiting
- CORS

### 4. Servicios
- `NotificationService.php` - Servicio de notificaciones
- `ReportService.php` - Generación de reportes
- `BackupService.php` - Respaldos automáticos

## Ventajas de la Arquitectura MVC

### Mantenibilidad
- Separación clara de responsabilidades
- Código más organizado y legible
- Fácil localización de bugs

### Escalabilidad
- Estructura modular
- Fácil agregar nuevas funcionalidades
- Reutilización de código

### Testabilidad
- Componentes aislados
- Fácil crear pruebas unitarias
- Mock de dependencias

### Colaboración
- Diferentes desarrolladores pueden trabajar en diferentes capas
- Estándares de código claros
- Documentación estructurada

## Comandos Útiles

### Desarrollo
```bash
# Verificar errores de sintaxis
php -l bootstrap.php

# Ejecutar en servidor de desarrollo
php -S localhost:8000

# Ver logs en tiempo real
tail -f storage/logs/app.log
```

### Base de Datos
```bash
# Importar esquema
mysql -u root -p finest_mant_cuartos < db/schema.sql

# Crear respaldo
mysqldump -u root -p finest_mant_cuartos > backup.sql
```

## Soporte y Contacto

Para dudas sobre la nueva arquitectura o migración de funcionalidades, consultar la documentación técnica o contactar al equipo de desarrollo.

---

**Versión**: 2.0.0 (MVC)  
**Fecha**: 2024  
**Autor**: Sistema de Desarrollo JWM 