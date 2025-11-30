# Módulo de Espacios Comunes - Manual Técnico

## 1. Descripción General

El módulo de **Espacios Comunes** gestiona las áreas compartidas del hotel (lobby, gimnasio, piscina, restaurantes, etc.) permitiendo el control de estado y registro de mantenimientos específicos.

### Características principales:
- Visualización en tarjetas con lazy loading
- Estadísticas en tiempo real (disponibles, ocupados, mantenimiento)
- Filtrado por edificio, estado y tipo
- Paginación (10 espacios por página)
- Gestión de estados similar a habitaciones
- Mantenimientos específicos para espacios comunes

## 2. Estructura de Archivos

```
├── index.html                              # Contiene tab de espacios comunes
├── js/
│   ├── app-loader-espacios-comunes.js      # Módulo principal
│   └── app.js                              # Integración con app principal
├── css/
│   └── style.css                           # Estilos compartidos
├── api/
│   └── index.js                            # Endpoints de API
```

## 3. API Endpoints

### 3.1 Obtener Espacios Comunes
```
GET /api/espacios-comunes
```
**Response:**
```json
[
    {
        "id": 1,
        "nombre": "Lobby Principal",
        "edificio_id": 1,
        "edificio_nombre": "Torre A",
        "tipo": "comun",
        "estado": "disponible",
        "activo": true
    }
]
```

### 3.2 Obtener Espacio por ID
```
GET /api/espacios-comunes/:id
```

### 3.3 Actualizar Estado
```
PUT /api/espacios-comunes/:id
Authorization: Bearer <token>
```
**Request Body:**
```json
{
    "estado": "mantenimiento"
}
```

### 3.4 Obtener Mantenimientos de Espacios
```
GET /api/mantenimientos/espacios?espacio_comun_id=1
```

### 3.5 Crear Mantenimiento de Espacio
```
POST /api/mantenimientos/espacios
Authorization: Bearer <token>
```
**Request Body:**
```json
{
    "espacio_comun_id": 1,
    "descripcion": "Limpieza profunda del lobby",
    "tipo": "normal",
    "hora": "08:00",
    "dia_alerta": "2025-12-01",
    "prioridad": "media",
    "estado": "pendiente",
    "usuario_asignado_id": 3,
    "notas": "Requiere equipo especial",
    "estado_espacio": "mantenimiento",
    "tarea_id": 10
}
```

## 4. Variables del Módulo

```javascript
let espaciosComunes = [];                  // Array de espacios
let mantenimientosEspacios = [];           // Array de mantenimientos
let espaciosComunesCargados = false;       // Flag de carga inicial
const ESPACIOS_POR_PAGINA = 10;
let espaciosComunesFiltradosActual = [];
let paginaActualEspacios = 1;
let totalPaginasEspacios = 1;
```

## 5. Estados de Espacios Comunes

| Estado | Clase CSS | Icono | Descripción |
|--------|-----------|-------|-------------|
| disponible | `estado-vacio` | `fa-check-circle` | Listo para uso |
| ocupado | `estado-ocupado` | `fa-user` | En uso |
| mantenimiento | `estado-mantenimiento` | `fa-tools` | En reparación |
| fuera_servicio | `estado-fuera-servicio` | `fa-ban` | No disponible |

## 6. Tipos de Espacios Comunes

| Tipo | Ejemplos |
|------|----------|
| `comun` | Lobby, pasillos, áreas comunes |
| `recreativo` | Gimnasio, piscina, spa |
| `restaurante` | Restaurantes, bares |
| `servicio` | Lavandería, almacenes |
| `exterior` | Jardines, terrazas, estacionamiento |

## 7. Funciones Principales

### 7.1 Mostrar Skeletons
```javascript
function mostrarSkeletonsEspacios()
```
Muestra placeholders mientras cargan los datos.

### 7.2 Cargar Espacios
```javascript
async function cargarEspaciosComunes()
```
Obtiene espacios y mantenimientos desde la API.

### 7.3 Sincronizar Filtros
```javascript
function sincronizarEspaciosFiltrados(mantenerPagina = false)
```
Reinicializa el array de espacios filtrados.

### 7.4 Actualizar Estadísticas
```javascript
function actualizarEstadisticasEspacios()
```
Calcula y muestra estadísticas en el panel.

### 7.5 Mostrar Espacios
```javascript
function mostrarEspaciosComunes()
```
Renderiza la lista con lazy loading y paginación.

### 7.6 Cargar Contenido de Espacio
```javascript
function cargarContenidoEspacio(li, espacio)
```
Carga el contenido completo de una tarjeta.

### 7.7 Paginación
```javascript
function renderizarPaginacionEspacios(total)
function irAPaginaEspacios(pagina)
```

## 8. Panel de Estadísticas

```html
<div class="stats-panel espacios-stats">
    <div class="stat-item">
        <span class="stat-value" id="espaciosStatsDisponibles">0</span>
        <span class="stat-label">Disponibles</span>
    </div>
    <div class="stat-item">
        <span class="stat-value" id="espaciosStatsOcupados">0</span>
        <span class="stat-label">Ocupados</span>
    </div>
    <div class="stat-item">
        <span class="stat-value" id="espaciosStatsMantenimiento">0</span>
        <span class="stat-label">En Mantenimiento</span>
    </div>
    <div class="stat-item">
        <span class="stat-value" id="espaciosStatsFuera">0</span>
        <span class="stat-label">Fuera de Servicio</span>
    </div>
</div>
```

## 9. Estructura de Tarjeta

```html
<li class="habitacion-card espacio-card" id="espacio-1">
    <div class="habitacion-header">
        <div class="habitacion-titulo">
            <i class="habitacion-icon fas fa-building"></i>
            <div>
                <div class="habitacion-nombre">Lobby Principal</div>
                <div class="habitacion-edificio">
                    <i class="fas fa-layer-group"></i> Torre A
                    <span class="tipo-badge">Común</span>
                </div>
            </div>
        </div>
        <div class="habitacion-estado-badge estado-vacio">
            <i class="fas fa-check-circle"></i> Disponible
        </div>
    </div>
    <div class="habitacion-servicios" id="servicios-espacio-1">
        <!-- Mantenimientos del espacio -->
    </div>
    <div class="habitacion-acciones">
        <!-- Botones de acción -->
    </div>
</li>
```

## 10. Caché de Mantenimientos

```javascript
window.mantenimientosPorEspacio = new Map();
// Key: espacio_comun_id
// Value: Array de mantenimientos
```

## 11. Lazy Loading con IntersectionObserver

```javascript
window.espacioObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const li = entry.target;
            if (!li.dataset.loaded) {
                li.dataset.loaded = 'true';
                const espacioId = parseInt(li.dataset.espacioId);
                const espacio = espaciosComunes.find(e => e.id === espacioId);
                if (espacio) {
                    cargarContenidoEspacio(li, espacio);
                }
                observer.unobserve(li);
            }
        }
    });
}, {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
});
```

## 12. Datos en Dataset

Cada card almacena:
- `data-espacio-id`: ID del espacio
- `data-nombre`: Nombre del espacio
- `data-edificio-nombre`: Nombre del edificio
- `data-estado`: Estado actual
- `data-tipo`: Tipo de espacio

## 13. Integración con AppState

```javascript
if (window.appLoaderState) {
    window.appLoaderState.espaciosComunes = espaciosComunes;
    window.appLoaderState.mantenimientosEspacios = mantenimientosEspacios;
}
```

## 14. Filtros Disponibles

### 14.1 Por Edificio
```javascript
document.getElementById('filtroEdificioEspacio')
```

### 14.2 Por Estado
```javascript
document.getElementById('filtroEstadoEspacio')
```

### 14.3 Por Tipo
```javascript
document.getElementById('filtroTipoEspacio')
```

### 14.4 Búsqueda
```javascript
document.getElementById('busquedaEspacio')
```

## 15. Base de Datos

### 15.1 Tabla Espacios Comunes
```sql
CREATE TABLE espacios_comunes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    edificio_id INTEGER REFERENCES edificios(id),
    tipo VARCHAR(50),
    estado VARCHAR(50) DEFAULT 'disponible',
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 15.2 Relación con Mantenimientos
Los mantenimientos de espacios comunes usan la columna `espacio_comun_id` en la tabla `mantenimientos` (en lugar de `cuarto_id`).

## 16. Alertas de Espacios

```javascript
if (window.cargarAlertasEspacios) {
    await window.cargarAlertasEspacios();
}
```
Carga alertas programadas específicas para espacios comunes.

## 17. Iconos por Tipo de Espacio

| Tipo | Icono Font Awesome |
|------|--------------------|
| comun | `fa-building` |
| recreativo | `fa-dumbbell` |
| restaurante | `fa-utensils` |
| servicio | `fa-concierge-bell` |
| exterior | `fa-tree` |
| piscina | `fa-swimming-pool` |

## 18. Diferencias con Módulo de Habitaciones

| Aspecto | Habitaciones | Espacios Comunes |
|---------|--------------|------------------|
| Campo API | `cuarto_id` | `espacio_comun_id` |
| Endpoint mantenimientos | `/api/mantenimientos` | `/api/mantenimientos/espacios` |
| Tipo adicional | - | Campo `tipo` |
| Panel estadísticas | No | Sí |
| Variable caché | `mantenimientosPorCuarto` | `mantenimientosPorEspacio` |
