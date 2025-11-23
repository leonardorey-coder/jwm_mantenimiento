# 📦 Módulo de Tareas - JW Marriott Mantenimiento

Paquete completo y standalone para implementar el sistema de gestión de tareas en cualquier proyecto web.

**Desarrollado por:** Fidel Cruz Lozada  
**Email:** fcruz@grupodiestra.com  
**Versión:** 1.0.0  
**Fecha:** Noviembre 2025

---

## 📋 Contenido del Paquete

```
tareas-tab/
├── tareas-module.html    ← Estructura HTML completa
├── tareas-module.css     ← Estilos completos (14 secciones)
├── tareas-module.js      ← Lógica completa (58 funciones)
└── README.md             ← Esta documentación
```

---

## ✅ Requisitos

- **Font Awesome 6.5+** para iconos
- **JavaScript ES6+** (arrow functions, spread operator, localStorage)
- **CSS Grid & Flexbox** (navegadores modernos)
- **LocalStorage** habilitado

---

## 🚀 Instalación en 3 Pasos

### 1. Incluir Font Awesome

Agrega en el `<head>` de tu HTML:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
```

### 2. Copiar Archivos

Copia los 3 archivos del módulo a tu proyecto:

```bash
tareas-module.html
tareas-module.css
tareas-module.js
```

### 3. Incluir en tu Proyecto

#### Opción A: Uso Standalone (Archivo completo)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Tareas</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="tareas-module.css">
</head>
<body>
    <!-- Incluir el contenido de tareas-module.html aquí -->
    
    <script src="tareas-module.js"></script>
</body>
</html>
```

#### Opción B: Integración en Proyecto Existente

1. **Agregar CSS:**
```html
<link rel="stylesheet" href="path/to/tareas-module.css">
```

2. **Agregar HTML:** Copia el contenido de `tareas-module.html` donde necesites el módulo

3. **Agregar JavaScript:**
```html
<script src="path/to/tareas-module.js"></script>
```

---

## ⚙️ Configuración

### Cambiar Usuario Actual

Edita en `tareas-module.js` (línea 24):

```javascript
AppState.currentUser = {
    role: 'admin',  // Cambiar a: 'admin', 'supervisor', 'tecnico'
    name: 'Tu Nombre'
};
```

### Agregar Tareas Personalizadas

Edita en `tareas-module.js` (línea 130-230) el array `DEFAULT_TAREAS`:

```javascript
const DEFAULT_TAREAS = [
    {
        id: 'task-001',
        titulo: 'Mi tarea personalizada',
        descripcion: 'Descripción detallada',
        rol: 'admin',  // 'admin', 'supervisor', 'tecnico'
        prioridad: 'alta',  // 'alta', 'media', 'baja'
        estado: 'pendiente',  // 'pendiente', 'en_proceso', 'completada'
        vence: '2025-12-31',
        icono: 'fa-tasks',  // Icono de Font Awesome
        etiquetas: ['Tag1', 'Tag2'],
        ubicacion: 'Mi ubicación',
        responsable: 'Nombre del responsable',
        adjuntos: [],
        historial: []
    }
];
```

---

## 🎨 Características

✅ **Sistema de Filtros:**
- Por rol (Mi rol, Todos, Admin, Supervisor, Técnico)
- Por estado (Pendiente, En proceso, Completada)
- Por prioridad (Alta, Media, Baja)
- Búsqueda por texto

✅ **Visualización:**
- Grid responsivo de tarjetas
- Paginación (6 tareas por página)
- Indicadores visuales de prioridad (semáforos)
- Alertas de vencimiento con colores

✅ **Modales:**
- Modal de detalle de tarea
- Modal de edición completa
- Tags dinámicos
- Adjuntos de archivos
- Historial de cambios

✅ **Panel Lateral:**
- Resumen estadístico por rol
- Tarjeta de progreso (Pixar style)
- Timeline de próximos vencimientos

✅ **Persistencia:**
- Datos guardados en localStorage
- Sincronización automática

---

## 📐 Estructura del Código

### HTML (tareas-module.html)
- **Líneas 1-65:** Panel de filtros
- **Líneas 66-220:** Grid de tareas + paginación
- **Líneas 221-310:** Paneles laterales (resumen, stats, timeline)
- **Líneas 311-420:** Modal de detalle
- **Líneas 421-580:** Modal de edición

### JavaScript (tareas-module.js)
- **Líneas 1-90:** Configuración y constantes
- **Líneas 91-230:** Datos de ejemplo (DEFAULT_TAREAS)
- **Líneas 231-380:** Funciones de normalización y formateo
- **Líneas 381-550:** Sistema de filtros y renderizado
- **Líneas 551-720:** Paginación
- **Líneas 721-920:** Modales (detalle y edición)
- **Líneas 921-1050:** Estadísticas y resumen
- **Líneas 1051-1100:** Inicialización automática

### CSS (tareas-module.css)
- **Sección 1:** Variables CSS (colores, espaciado)
- **Sección 2:** Reset y base
- **Sección 3:** Layout principal
- **Sección 4:** Vista duo (columnas)
- **Sección 5:** Panel de filtros
- **Sección 6:** Grid de tareas
- **Sección 7:** Tarjetas de tareas (con estados y prioridades)
- **Sección 8:** Paginación
- **Sección 9:** Paneles laterales
- **Sección 10:** Tarjeta Pixar Stats
- **Sección 11:** Timeline de vencimientos
- **Sección 12:** Modales (detalle)
- **Sección 13:** Modal de edición
- **Sección 14:** Responsive

---

## 🔧 API JavaScript

### Inicializar Módulo

```javascript
// Inicialización automática al cargar
// O manual:
window.TareasModule.init();
```

### Cambiar Rol del Usuario

```javascript
window.TareasModule.setUserRole('admin'); // o 'supervisor', 'tecnico'
```

### Agregar Tarea Programáticamente

```javascript
window.TareasModule.addTarea({
    id: 'task-custom-001',
    titulo: 'Nueva tarea',
    descripcion: 'Descripción',
    rol: 'admin',
    prioridad: 'alta',
    estado: 'pendiente',
    vence: '2025-12-31',
    icono: 'fa-check',
    etiquetas: ['Custom'],
    ubicacion: 'Oficina',
    responsable: 'Usuario',
    adjuntos: [],
    historial: []
});
```

### Refrescar Vista

```javascript
window.TareasModule.refresh();
```

---

## 🎨 Personalización de Colores

Edita variables CSS en `tareas-module.css` (líneas 10-35):

```css
:root {
  --negro-carbon: #18181B;
  --verde-oliva: #5D7F5F;
  --rojo-vino: #A15C5C;
  --amarillo-vivo: #FFD151;
  --color-exito: #22c55e;
  --color-advertencia: #f59e0b;
  --color-critico: #ef4444;
}
```

---

## 📱 Responsive

- **Desktop (>1200px):** Grid 3+ columnas + panel lateral
- **Tablet (768-1200px):** Grid 2 columnas
- **Mobile (<768px):** Grid 1 columna

---

## 🐛 Solución de Problemas

### Tareas no se cargan
```javascript
// Verifica que localStorage esté habilitado
localStorage.setItem('test', 'ok');
console.log(localStorage.getItem('test')); // Debe mostrar 'ok'
```

### Filtros no funcionan
- Verifica que los IDs de HTML coincidan:
  - `buscarTarea`, `filtroRolTarea`, `filtroEstadoTarea`, `filtroPrioridadTarea`

### Modales no abren
- Verifica que los IDs coincidan:
  - `modalDetalleTarea`, `modalEditarTarea`

### Estilos no se aplican
- Verifica que Font Awesome esté cargado
- Verifica ruta del CSS
- Abre consola del navegador para ver errores

---

## 📦 Almacenamiento

Los datos se guardan en **localStorage** con la clave:
```
jwm_tareas_data
```

Para limpiar datos:
```javascript
localStorage.removeItem('jwm_tareas_data');
location.reload();
```

---

## 🔐 Datos de Prueba

El módulo incluye **4 tareas de ejemplo**:
- 1 tarea de Admin
- 1 tarea de Supervisor  
- 2 tareas de Técnico

Puedes eliminarlas editando `DEFAULT_TAREAS` en `tareas-module.js` o limpiando localStorage.

---

## 📞 Soporte

Para dudas o soporte:
- **Email:** fcruz@grupodiestra.com
- **Proyecto:** JW Marriott Los Cabos - Sistema de Mantenimiento

---

## 📄 Licencia

Código propietario - Uso exclusivo para implementación en proyectos autorizados.

---

**¡Listo para usar! 🚀**

Solo copia los 3 archivos, incluye Font Awesome y abre el HTML en tu navegador.
