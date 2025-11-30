# Módulo de Habitaciones - Manual Técnico

## 1. Descripción General

El módulo de **Habitaciones** gestiona la visualización, filtrado y administración de los cuartos/habitaciones del hotel JW Marriott Los Cabos, incluyendo el registro de mantenimientos y cambios de estado.

### Características principales:
- Visualización de habitaciones en tarjetas (cards) con lazy loading
- Filtrado por edificio, estado y búsqueda de texto
- Paginación dinámica (5 items mobile, 10 items desktop)
- Skeleton loading para mejor UX
- Gestión de estados (Disponible, Ocupado, Mantenimiento, Fuera de Servicio)
- Registro y visualización de servicios de mantenimiento
- IntersectionObserver para carga diferida

## 2. Estructura de Archivos

```
├── index.html                          # Página principal (contiene tab de habitaciones)
├── js/
│   ├── app-loader.js                   # Cargador principal de la aplicación
│   ├── app-loader-habitaciones.js      # Módulo específico de habitaciones
│   ├── app.js                          # Lógica principal del frontend
│   └── enhanced-frontend.js            # Mejoras de interfaz
├── css/
│   └── style.css                       # Estilos principales
├── api/
│   └── index.js                        # Endpoints de API
├── db/
│   └── postgres-manager.js             # Gestor de base de datos
```

## 3. Estados de Habitaciones

| Estado | Clase CSS | Icono | Descripción |
|--------|-----------|-------|-------------|
| Disponible | `estado-vacio` | `fa-check-circle` | Habitación lista para ocupar |
| Ocupado | `estado-ocupado` | `fa-user` | Habitación con huésped |
| En Mantenimiento | `estado-mantenimiento` | `fa-tools` | En proceso de reparación |
| Fuera de Servicio | `estado-fuera-servicio` | `fa-ban` | No disponible temporalmente |

## 4. API Endpoints

### 4.1 Obtener Edificios
```
GET /api/edificios
```
**Response:**
```json
[
    { "id": 1, "nombre": "Torre A", "descripcion": "Edificio principal" },
    { "id": 2, "nombre": "Torre B", "descripcion": "Edificio secundario" }
]
```

### 4.2 Obtener Cuartos
```
GET /api/cuartos
```
**Response:**
```json
[
    {
        "id": 1,
        "numero": "101",
        "nombre": "101",
        "edificio_id": 1,
        "edificio_nombre": "Torre A",
        "estado": "disponible",
        "descripcion": "Habitación estándar"
    }
]
```

### 4.3 Obtener Cuarto por ID
```
GET /api/cuartos/:id
```

### 4.4 Actualizar Estado del Cuarto
```
PUT /api/cuartos/:id
Authorization: Bearer <token>
```
**Request Body:**
```json
{
    "estado": "ocupado"
}
```
Estados válidos: `disponible`, `ocupado`, `mantenimiento`, `fuera_servicio`

### 4.5 Obtener Mantenimientos
```
GET /api/mantenimientos?cuarto_id=1
```
**Response:**
```json
[
    {
        "id": 1,
        "cuarto_id": 1,
        "descripcion": "Reparación de aire acondicionado",
        "tipo": "normal",
        "estado": "pendiente",
        "prioridad": "media",
        "hora": "14:00:00",
        "dia_alerta": "2025-12-01",
        "fecha_creacion": "2025-11-30T10:00:00.000Z",
        "cuarto_numero": "101",
        "cuarto_nombre": "101"
    }
]
```

### 4.6 Crear Mantenimiento
```
POST /api/mantenimientos
Authorization: Bearer <token>
```
**Request Body:**
```json
{
    "cuarto_id": 1,
    "descripcion": "Cambio de filtros de A/C",
    "tipo": "rutina",
    "hora": "10:00",
    "dia_alerta": "2025-12-15",
    "prioridad": "media",
    "estado": "pendiente",
    "usuario_asignado_id": 3,
    "tarea_id": 5,
    "notas": "Programado para revisión mensual",
    "estado_cuarto": "mantenimiento"
}
```

### 4.7 Actualizar Mantenimiento
```
PUT /api/mantenimientos/:id
```

### 4.8 Eliminar Mantenimiento
```
DELETE /api/mantenimientos/:id
```

## 5. Componentes del Frontend

### 5.1 Estado Compartido (AppLoaderState)
```javascript
window.appLoaderState = {
    cuartos: [],                    // Array de cuartos
    mantenimientos: [],             // Array de mantenimientos
    edificios: [],                  // Array de edificios
    usuarios: [],                   // Array de usuarios
    cuartosFiltradosActual: [],     // Cuartos después del filtrado
    paginaActualCuartos: 1,         // Página actual
    totalPaginasCuartos: 1,         // Total de páginas
    CUARTOS_POR_PAGINA: 10          // Items por página
};
```

### 5.2 Caché de Mantenimientos
```javascript
window.mantenimientosPorCuarto = new Map();
// Key: cuarto_id, Value: Array de mantenimientos
```

## 6. Funciones Principales

### 6.1 Mostrar Skeletons Iniciales
```javascript
function mostrarSkeletonsIniciales()
```
Muestra placeholders animados mientras cargan los datos.

### 6.2 Mostrar Cuartos
```javascript
function mostrarCuartos()
```
Renderiza la lista de cuartos con paginación y lazy loading.

### 6.3 Generar HTML de Servicios
```javascript
function generarServiciosHTML(mantenimientosCuarto, cuartoId)
```
Genera el HTML para mostrar los servicios de mantenimiento de un cuarto.

### 6.4 Cambio de Estado Inline
```javascript
function seleccionarEstadoInline(cuartoId, estado, button)
```
Actualiza el estado de una habitación sin abrir modal.

### 6.5 Paginación
```javascript
function getCuartosPorPagina()
// Mobile (≤768px): 5 items
// Desktop (>768px): 10 items
```

## 7. Lazy Loading con IntersectionObserver

### 7.1 Configuración del Observer
```javascript
window.cuartoObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Cargar contenido real del cuarto
            const li = entry.target;
            if (!li.dataset.loaded) {
                // Renderizar card completa
            }
        }
    });
}, {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
});
```

### 7.2 Datos en Dataset
Cada card guarda los datos necesarios en `dataset`:
- `data-cuarto-id`
- `data-nombre-cuarto`
- `data-edificio-nombre`
- `data-edificio-id`
- `data-descripcion`
- `data-index`

## 8. Estructura de Tarjeta de Habitación

```html
<li class="habitacion-card" data-aos="fade-up">
    <div class="habitacion-header">
        <div class="habitacion-titulo">
            <i class="habitacion-icon fas fa-door-closed"></i>
            <div>
                <div class="habitacion-nombre">101</div>
                <div class="habitacion-edificio">
                    <i class="fas fa-building"></i> Torre A
                </div>
            </div>
        </div>
        <div class="habitacion-estado-badge estado-vacio">
            <i class="fas fa-check-circle"></i> Disponible
        </div>
    </div>
    <div class="habitacion-servicios">
        <!-- Lista de servicios de mantenimiento -->
    </div>
    <div class="estado-selector-inline">
        <!-- Botones de cambio de estado -->
    </div>
    <div class="habitacion-acciones">
        <!-- Botones de acción -->
    </div>
</li>
```

## 9. Skeleton Loading Template

```html
<div class="card-placeholder skeleton-card">
    <div class="skeleton-header">
        <div class="skeleton-icon"></div>
        <div class="skeleton-text-group">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-subtitle"></div>
        </div>
        <div class="skeleton-badge"></div>
    </div>
    <div class="skeleton-content">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
    </div>
    <div class="skeleton-actions">
        <div class="skeleton-button"></div>
        <div class="skeleton-button"></div>
    </div>
</div>
```

## 10. Tipos de Mantenimiento

| Tipo | Descripción | Comportamiento |
|------|-------------|----------------|
| `normal` | Mantenimiento estándar | Sin alertas programadas |
| `rutina` | Mantenimiento programado | Genera alertas en fecha/hora especificada |

## 11. Prioridades de Mantenimiento

| Prioridad | Color | Descripción |
|-----------|-------|-------------|
| `baja` | Verde | Puede esperar |
| `media` | Amarillo | Atención normal |
| `alta` | Naranja | Requiere atención pronta |
| `urgente` | Rojo | Atención inmediata |

## 12. Estados de Mantenimiento

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Aún no iniciado |
| `en_proceso` | En curso |
| `completado` | Finalizado |
| `cancelado` | Cancelado |

## 13. Base de Datos

### 13.1 Tabla Cuartos
```sql
CREATE TABLE cuartos (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(100) NOT NULL,
    nombre VARCHAR(100),
    edificio_id INTEGER REFERENCES edificios(id),
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (numero, edificio_id)
);
```

### 13.2 Tabla Mantenimientos
```sql
CREATE TABLE mantenimientos (
    id SERIAL PRIMARY KEY,
    cuarto_id INTEGER REFERENCES cuartos(id),
    espacio_comun_id INTEGER REFERENCES espacios_comunes(id),
    descripcion TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'normal',
    estado VARCHAR(50) DEFAULT 'pendiente',
    prioridad VARCHAR(20) DEFAULT 'media',
    hora TIME,
    dia_alerta DATE,
    alerta_emitida BOOLEAN DEFAULT FALSE,
    usuario_creador_id INTEGER REFERENCES usuarios(id),
    usuario_asignado_id INTEGER REFERENCES usuarios(id),
    tarea_id INTEGER REFERENCES tareas(id),
    notas TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_finalizacion TIMESTAMP
);
```

## 14. Filtros Disponibles

### 14.1 Por Edificio
```javascript
const edificioFiltro = document.getElementById('filtroEdificioHabitacion');
```

### 14.2 Por Estado
```javascript
const estadoFiltro = document.getElementById('filtroEstadoHabitacion');
```

### 14.3 Búsqueda por Texto
```javascript
const busquedaFiltro = document.getElementById('filtroHabitacionBusqueda');
```

## 15. Optimizaciones de Rendimiento

1. **Document Fragment**: Uso de fragments para batch DOM updates
2. **requestAnimationFrame**: Para optimizar rendering
3. **requestIdleCallback**: Para cargar en tiempo de inactividad
4. **IntersectionObserver**: Para lazy loading de cards
5. **Caché de mantenimientos**: Map para acceso O(1) por cuarto_id
6. **Delay diagonal**: 5ms entre cards para efecto visual suave

## 16. Eventos y Listeners

### 16.1 Resize
Ajusta items por página según tamaño de pantalla.

### 16.2 Filtros
Los filtros reconstruyen `cuartosFiltradosActual` y vuelven a página 1.

### 16.3 Paginación
Botones de navegación actualizan `paginaActualCuartos` y re-renderizan.
