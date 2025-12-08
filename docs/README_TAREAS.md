# Módulo de Tareas - Manual Técnico

## 1. Descripción General

El módulo de **Tareas** permite la creación, asignación y seguimiento de tareas de mantenimiento, con soporte para múltiples servicios, prioridades, fechas límite y asignación de responsables.

### Características principales:
- Creación de tareas con servicios múltiples
- Sistema de prioridades con semáforo visual
- Asignación de responsables
- Barra de progreso según servicios completados
- Filtros por estado, prioridad y responsable
- Modal de edición y detalle
- Timeline de actividades

## 2. Estructura de Archivos

```
├── views/
│   └── tareas/
│       ├── tareas-module.js        # Módulo principal de tareas
│       ├── tareas-cards.css        # Estilos de tarjetas
│       ├── tareas-timeline.css     # Estilos de timeline

├── api/
│   └── index.js                    # Endpoints de API
├── db/
│   └── postgres-manager.js         # Gestor de base de datos
```

## 3. API Endpoints

### 3.1 Obtener Tareas
```
GET /api/tareas?estado=pendiente&prioridad=alta&asignado_a=1
```
**Response:**
```json
[
    {
        "id": 1,
        "titulo": "Revisión de aires acondicionados",
        "descripcion": "Revisar unidades del piso 3",
        "estado": "pendiente",
        "prioridad": "alta",
        "fecha_creacion": "2025-11-30T10:00:00.000Z",
        "fecha_vencimiento": "2025-12-05",
        "creado_por": 1,
        "asignado_a": 3,
        "ubicacion": "Piso 3 - Torre A",
        "tags": ["HVAC", "Revisión"],
        "archivos": []
    }
]
```

### 3.2 Obtener Tarea por ID
```
GET /api/tareas/:id
Authorization: Bearer <token>
```

### 3.3 Crear Tarea
```
POST /api/tareas
```
**Request Body:**
```json
{
    "nombre": "Mantenimiento preventivo",
    "descripcion": "Revisión mensual de equipos",
    "estado": "pendiente",
    "prioridad": "media",
    "fecha_limite": "2025-12-15",
    "responsable_id": 3,
    "ubicacion": "Edificio A",
    "tags": ["Preventivo", "Mensual"]
}
```

### 3.4 Actualizar Tarea
```
PUT /api/tareas/:id
Authorization: Bearer <token>
```
**Request Body:**
```json
{
    "titulo": "Título actualizado",
    "estado": "en_proceso",
    "prioridad": "alta",
    "fecha_limite": "2025-12-20",
    "responsable_id": 5
}
```

### 3.5 Eliminar Tarea
```
DELETE /api/tareas/:id
Authorization: Bearer <token>
```

## 4. Estados de Tareas

| Estado | Descripción | Color |
|--------|-------------|-------|
| `pendiente` | No iniciada | Gris |
| `en_proceso` | En curso | Azul |
| `completada` | Finalizada | Verde |
| `cancelada` | Cancelada | Rojo |

## 5. Prioridades

| Prioridad | Color | Icono Semáforo |
|-----------|-------|----------------|
| `baja` | Verde | 🟢 |
| `media` | Amarillo | 🟡 |
| `alta` | Naranja | 🟠 |
| `urgente` | Rojo | 🔴 |

## 6. Constantes y Variables

```javascript
const API_URL = '/api';
let cuartoIdActual = null;          // ID del cuarto asociado
let tareaIdActual = null;           // ID de tarea en edición
let archivosSeleccionados = [];     // Archivos adjuntos
let todosLosServiciosCache = [];    // Cache de servicios

// Lazy loading de servicios
let todosLosServicios = [];
let serviciosFiltrados = [];
let serviciosRenderizados = 0;
const SERVICIOS_POR_LOTE = 20;
let observerServicios = null;
```

## 7. Funciones Principales

### 7.1 Control de Autenticación
```javascript
const obtenerHeadersConAuth = () => {
    const token = localStorage.getItem('accessToken') || 
                  sessionStorage.getItem('accessToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
    };
};
```

### 7.2 Obtener Rol del Usuario
```javascript
function obtenerRolUsuarioActual()
// Retorna: 'admin', 'supervisor', 'tecnico' o null
```

### 7.3 Abrir Modal de Creación
```javascript
function abrirModalCrearTarea(cuartoId)
```
- Limpia el formulario
- Carga usuarios en select
- Carga servicios para selección múltiple
- Establece fecha mínima como hoy
- Inicializa semáforo de prioridad

### 7.4 Cargar Servicios para Selección
```javascript
async function cargarServiciosParaSeleccion()
```
- Obtiene todos los mantenimientos del sistema
- Implementa lazy loading con IntersectionObserver
- Permite búsqueda/filtrado

### 7.5 Filtrar Servicios
```javascript
function filtrarServicios(termino)
```
Filtra por descripción, ubicación o tipo.

### 7.6 Renderizar Lote de Servicios
```javascript
function renderizarLoteServicios(container)
```
Renderiza SERVICIOS_POR_LOTE (20) servicios a la vez.

### 7.7 Actualizar Semáforo de Prioridad
```javascript
function actualizarSemaforoPrioridad(selectId, semaforoId)
```
Actualiza visualmente el indicador de prioridad.

### 7.8 Limpiar Formulario
```javascript
function limpiarFormulario(formId)
```

### 7.9 Cargar Usuarios en Select
```javascript
async function cargarUsuariosEnSelect(selectId)
```

## 8. Barra de Progreso de Tareas

### 8.1 Cálculo del Progreso
```javascript
// El progreso se calcula basándose en los servicios asociados
const serviciosAsociados = mantenimientos.filter(m => m.tarea_id === tarea.id);
const completados = serviciosAsociados.filter(m => m.estado === 'completado').length;
const progreso = serviciosAsociados.length > 0 
    ? Math.round((completados / serviciosAsociados.length) * 100) 
    : 0;
```

### 8.2 Actualización Automática
Cuando un mantenimiento cambia de estado a `completado`, la barra de progreso de la tarea asociada se actualiza automáticamente.

## 9. Modal de Creación de Tarea

### 9.1 Campos del Formulario
```html
<form id="formCrearTarea">
    <input id="crearTareaNombre" type="text" required />
    <textarea id="crearTareaDescripcion"></textarea>
    <select id="crearTareaPrioridad">
        <option value="baja">Baja</option>
        <option value="media" selected>Media</option>
        <option value="alta">Alta</option>
        <option value="urgente">Urgente</option>
    </select>
    <input id="crearTareaFecha" type="date" />
    <select id="crearTareaResponsable"></select>
    <input id="crearTareaUbicacion" type="text" />
    <div id="listaServiciosCrear">
        <!-- Servicios seleccionables -->
    </div>
    <input id="buscarServiciosTarea" type="text" placeholder="Buscar servicios..." />
    <input id="tareaCrearCuartoId" type="hidden" />
</form>
```

### 9.2 Semáforo de Prioridad
```html
<div class="semaforo-prioridad" id="semaforoPrioridadCrear">
    <span class="luz verde"></span>
    <span class="luz amarilla"></span>
    <span class="luz roja"></span>
</div>
```

## 10. Selección de Servicios

### 10.1 Estructura de Item de Servicio
```html
<label class="servicio-item">
    <input type="checkbox" value="1" />
    <div class="servicio-info">
        <span class="servicio-descripcion">Cambio de filtros A/C</span>
        <span class="servicio-ubicacion">Hab. 101 - Torre A</span>
        <span class="servicio-tipo">Rutina</span>
    </div>
</label>
```

### 10.2 IntersectionObserver para Lazy Loading
```javascript
observerServicios = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        renderizarLoteServicios(container);
    }
}, { root: container, threshold: 0.1 });
```

## 11. Base de Datos

### 11.1 Tabla Tareas
```sql
CREATE TABLE tareas (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'pendiente',
    prioridad VARCHAR(50) DEFAULT 'media',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento DATE,
    creado_por INTEGER REFERENCES usuarios(id),
    asignado_a INTEGER REFERENCES usuarios(id),
    ubicacion VARCHAR(255),
    tags TEXT[],
    archivos TEXT[]
);
```

### 11.2 Relación con Mantenimientos
```sql
-- En tabla mantenimientos
tarea_id INTEGER REFERENCES tareas(id) ON DELETE SET NULL
```

## 12. Mapeo de Campos Frontend-Backend

| Frontend | Backend |
|----------|---------|
| `nombre` | `titulo` |
| `fecha_limite` | `fecha_vencimiento` |
| `responsable_id` | `asignado_a` |
| `usuario_creador_id` | `creado_por` |

## 13. Filtros de Tareas

```javascript
AppState.tareasFilters = {
    search: '',           // Búsqueda por texto
    role: 'mi-rol',       // Filtro por rol
    estado: '',           // Estado de la tarea
    prioridad: ''         // Prioridad
};
```

## 14. Paginación de Tareas

```javascript
AppState.tareasPagination = {
    page: 1,
    perPage: 6
};
```

## 15. Estructura de Tarjeta de Tarea

```html
<div class="tarea-card" data-tarea-id="1" data-prioridad="alta">
    <div class="tarea-header">
        <span class="tarea-prioridad prioridad-alta">
            <i class="fas fa-exclamation-circle"></i> Alta
        </span>
        <span class="tarea-estado estado-pendiente">Pendiente</span>
    </div>
    <h4 class="tarea-titulo">Título de la tarea</h4>
    <p class="tarea-descripcion">Descripción breve...</p>
    <div class="tarea-meta">
        <span class="tarea-fecha">
            <i class="fas fa-calendar"></i> 15/12/2025
        </span>
        <span class="tarea-responsable">
            <i class="fas fa-user"></i> Juan Técnico
        </span>
    </div>
    <div class="tarea-progreso">
        <div class="progreso-bar" style="width: 60%"></div>
        <span class="progreso-texto">3/5 servicios</span>
    </div>
    <div class="tarea-acciones">
        <button onclick="verDetalleTarea(1)">Ver</button>
        <button onclick="editarTarea(1)">Editar</button>
    </div>
</div>
```

## 16. Control de Modales

```javascript
function lockBodyScroll() {
    document.body.classList.add('modal-open');
}

function unlockBodyScrollIfNoModal() {
    const modalVisible = Array.from(document.querySelectorAll('.modal-detalles'))
        .some(modal => window.getComputedStyle(modal).display !== 'none');
    if (!modalVisible) {
        document.body.classList.remove('modal-open');
    }
}
```

## 17. CSS Clases Importantes

| Clase | Descripción |
|-------|-------------|
| `.tarea-card` | Contenedor de tarjeta |
| `.prioridad-baja/media/alta/urgente` | Colores de prioridad |
| `.estado-pendiente/en_proceso/completada` | Colores de estado |
| `.tarea-progreso` | Barra de progreso |
| `.semaforo-prioridad` | Indicador visual tipo semáforo |
| `.servicio-item` | Item seleccionable de servicio |
