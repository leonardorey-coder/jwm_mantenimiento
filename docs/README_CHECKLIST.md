# Módulo de Checklist - Manual Técnico

## 1. Descripción General

El módulo de **Checklist** permite la inspección sistemática de las habitaciones mediante categorías de verificación, estados de items y seguimiento del progreso de inspección.

### Características principales:

- Categorías dinámicas con iconos personalizables
- Items de catálogo por categoría
- Estados: Bueno, Regular, Malo
- Checklist por habitación
- Resúmenes de inspección
- Filtros por edificio, categoría y estado
- Paginación de habitaciones

## 2. Estructura de Archivos

```
├── views/
│   └── checklist/
│       ├── checklist-tab.js        # Módulo principal
│       ├── checklist-styles.css    # Estilos del módulo
│       └── README.md               # Documentación básica
├── js/
│   └── checklist-api.js            # Cliente API
├── api/
│   └── index.js                    # Endpoints
├── db/
│   ├── postgres-manager.js         # Gestor de BD
│   ├── migration_checklist_schema.sql  # Migración
│   └── checklist_schema_proposal.sql   # Propuesta de esquema
```

## 3. API Endpoints

### 3.1 Categorías

#### Obtener Categorías

```
GET /api/checklist/categorias
```

**Response:**

```json
[
  {
    "id": 1,
    "nombre": "Climatización",
    "slug": "climatizacion",
    "icono": "fa-temperature-half",
    "orden": 1
  }
]
```

#### Crear Categoría

```
POST /api/checklist/categorias
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "nombre": "Electrónica",
  "icono": "fa-plug",
  "orden": 2
}
```

#### Eliminar Categoría

```
DELETE /api/checklist/categorias/:id
Authorization: Bearer <token>
```

**Requiere rol:** ADMIN

### 3.2 Items del Catálogo

#### Obtener Items

```
GET /api/checklist/items?categoria_id=1
```

**Response:**

```json
[
  {
    "id": 1,
    "nombre": "Aire Acondicionado",
    "categoria_id": 1,
    "descripcion": "Verificar funcionamiento correcto",
    "orden": 1
  }
]
```

#### Crear Item

```
POST /api/checklist/items
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "nombre": "Control Remoto A/C",
  "categoria_id": 1,
  "descripcion": "Verificar pilas y funcionamiento"
}
```

#### Eliminar Item

```
DELETE /api/checklist/items/:id
Authorization: Bearer <token>
```

### 3.3 Checklist por Cuarto

#### Obtener Todos los Datos

```
GET /api/checklist/cuartos?edificio_id=1&categoria_id=2
```

#### Obtener Checklist de un Cuarto

```
GET /api/checklist/cuartos/:cuartoId
```

**Response:**

```json
{
  "cuarto_id": 1,
  "cuarto_numero": "101",
  "edificio_nombre": "Torre A",
  "items": [
    {
      "item_id": 1,
      "item_nombre": "Aire Acondicionado",
      "categoria_nombre": "Climatización",
      "estado": "bueno",
      "observacion": null,
      "ultima_actualizacion": "2025-11-30T10:00:00.000Z"
    }
  ]
}
```

#### Actualizar Estado de Item

```
PUT /api/checklist/cuartos/:cuartoId/items/:itemId
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "estado": "malo",
  "observacion": "Requiere revisión técnica"
}
```

#### Actualización Masiva

```
PUT /api/checklist/cuartos/:cuartoId/items
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "items": [
    { "item_id": 1, "estado": "bueno" },
    { "item_id": 2, "estado": "regular", "observacion": "Revisar" }
  ]
}
```

### 3.4 Resúmenes

#### Resumen por Cuarto

```
GET /api/checklist/cuartos/:cuartoId/resumen
```

#### Resumen General

```
GET /api/checklist/resumen
```

### 3.5 Administración

#### Inicializar Tablas

```
POST /api/checklist/init
Authorization: Bearer <token>
```

**Requiere rol:** ADMIN

#### Obtener Iconos Disponibles

```
GET /api/checklist/iconos
```

**Response:**

```json
[
    { "value": "fa-layer-group", "label": "Genérico", "emoji": "📦" },
    { "value": "fa-couch", "label": "Mobiliario", "emoji": "🛋️" },
    { "value": "fa-temperature-half", "label": "Climatización", "emoji": "🌡️" },
    ...
]
```

## 4. Cliente API (ChecklistAPI)

```javascript
const ChecklistAPI = {
    baseUrl: '/api/checklist',

    getAuthToken() { ... },
    getHeaders() { ... },
    handleResponse(response) { ... },

    // Categorías
    getCategorias() { ... },
    addCategoria(data) { ... },
    deleteCategoria(categoriaId) { ... },

    // Items
    getCatalogItems(categoriaId) { ... },
    addCatalogItem(data) { ... },
    deleteCatalogItem(itemId) { ... },

    // Checklist por Cuarto
    getAllChecklistData(filters) { ... },
    getChecklistByCuarto(cuartoId) { ... },
    updateItemEstado(cuartoId, itemId, estado, observacion) { ... },
    updateItemsBulk(cuartoId, items) { ... },

    // Resúmenes
    getResumenByCuarto(cuartoId) { ... },
    getResumenGeneral() { ... },

    // Admin
    initChecklistTables() { ... }
};
```

## 5. Estados de Items

| Estado    | Clase CSS        | Icono                   | Color    |
| --------- | ---------------- | ----------------------- | -------- |
| `bueno`   | `estado-bueno`   | `fa-check-circle`       | Verde    |
| `regular` | `estado-regular` | `fa-exclamation-circle` | Amarillo |
| `malo`    | `estado-malo`    | `fa-times-circle`       | Rojo     |

## 6. Extensión de AppState

```javascript
const checklistDefaults = {
  checklistItems: [],
  checklistCategorias: [],
  checklistFilters: {
    categoria: '',
    busqueda: '',
    habitacion: '',
    edificio: '',
    estado: '',
  },
  checklistPagination: {
    page: 1,
    perPage: 4,
    totalPages: 1,
  },
  checklistFiltradas: [],
  inspeccionesRecientes: [],
};
```

## 7. Funciones Principales

### 7.1 Cargar Datos

```javascript
async function loadChecklistData()
window.loadChecklistDataFromAPI = loadChecklistData;
```

### 7.2 Renderizar Categorías

```javascript
function renderChecklistCategorias()
```

### 7.3 Renderizar Items por Categoría

```javascript
function renderChecklistItems(categoriaId)
```

### 7.4 Renderizar Habitaciones con Checklist

```javascript
function renderChecklistHabitaciones()
```

### 7.5 Cambiar Estado de Item

```javascript
async function cambiarEstadoItem(cuartoId, itemId, nuevoEstado)
```

### 7.6 Agregar Observación

```javascript
async function agregarObservacion(cuartoId, itemId, observacion)
```

## 8. Estructura de Interfaz

### 8.1 Panel de Categorías

```html
<div class="checklist-categorias">
  <div class="categoria-item active" data-categoria-id="1">
    <i class="fas fa-temperature-half"></i>
    <span>Climatización</span>
  </div>
  <!-- Más categorías -->
</div>
```

### 8.2 Lista de Items por Categoría

```html
<div class="checklist-items">
  <div class="item-checklist" data-item-id="1">
    <div class="item-info">
      <span class="item-nombre">Aire Acondicionado</span>
      <span class="item-descripcion">Verificar funcionamiento</span>
    </div>
    <div class="item-estado">
      <button class="estado-btn bueno active">
        <i class="fas fa-check"></i>
      </button>
      <button class="estado-btn regular">
        <i class="fas fa-minus"></i>
      </button>
      <button class="estado-btn malo">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>
</div>
```

### 8.3 Tarjeta de Habitación

```html
<div class="habitacion-checklist-card" data-cuarto-id="1">
  <div class="card-header">
    <span class="habitacion-numero">101</span>
    <span class="edificio-nombre">Torre A</span>
  </div>
  <div class="checklist-progreso">
    <div class="progreso-bar">
      <div class="progreso-bueno" style="width: 60%"></div>
      <div class="progreso-regular" style="width: 25%"></div>
      <div class="progreso-malo" style="width: 15%"></div>
    </div>
    <div class="progreso-stats">
      <span class="stat bueno">12 buenos</span>
      <span class="stat regular">5 regulares</span>
      <span class="stat malo">3 malos</span>
    </div>
  </div>
  <button onclick="abrirDetalleChecklist(1)">Ver Detalle</button>
</div>
```

## 9. Base de Datos

### 9.1 Tabla Categorías de Checklist

```sql
CREATE TABLE checklist_categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    icono VARCHAR(50) DEFAULT 'fa-layer-group',
    descripcion TEXT,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 9.2 Tabla Items del Catálogo

```sql
CREATE TABLE checklist_items (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER REFERENCES checklist_categorias(id),
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    orden INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 9.3 Tabla Estados por Cuarto

```sql
CREATE TABLE checklist_cuarto_items (
    id SERIAL PRIMARY KEY,
    cuarto_id INTEGER REFERENCES cuartos(id),
    item_id INTEGER REFERENCES checklist_items(id),
    estado VARCHAR(20) DEFAULT 'pendiente',
    observacion TEXT,
    verificado_por INTEGER REFERENCES usuarios(id),
    fecha_verificacion TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cuarto_id, item_id)
);
```

## 10. Categorías Predefinidas

| Categoría     | Icono                 | Descripción       |
| ------------- | --------------------- | ----------------- |
| Climatización | `fa-temperature-half` | A/C, ventilación  |
| Electrónica   | `fa-plug`             | TV, conectores    |
| Mobiliario    | `fa-couch`            | Camas, muebles    |
| Sanitarios    | `fa-shower`           | Baño, plomería    |
| Amenidades    | `fa-concierge-bell`   | Extras, servicios |
| Estructura    | `fa-door-open`        | Puertas, ventanas |

## 11. Iconos Disponibles

```javascript
const iconosDisponibles = [
  { value: 'fa-layer-group', label: 'Genérico' },
  { value: 'fa-couch', label: 'Mobiliario' },
  { value: 'fa-temperature-half', label: 'Climatización' },
  { value: 'fa-plug', label: 'Electrónica' },
  { value: 'fa-shower', label: 'Sanitarios' },
  { value: 'fa-concierge-bell', label: 'Amenidades' },
  { value: 'fa-door-open', label: 'Estructura' },
  { value: 'fa-bed', label: 'Cama' },
  { value: 'fa-tv', label: 'TV/Pantallas' },
  { value: 'fa-lightbulb', label: 'Iluminación' },
  { value: 'fa-paint-roller', label: 'Decoración' },
  { value: 'fa-broom', label: 'Limpieza' },
  { value: 'fa-key', label: 'Seguridad' },
  { value: 'fa-wifi', label: 'Conectividad' },
  { value: 'fa-utensils', label: 'Cocina' },
  { value: 'fa-swimming-pool', label: 'Piscina' },
  { value: 'fa-dumbbell', label: 'Gimnasio' },
  { value: 'fa-car', label: 'Estacionamiento' },
  { value: 'fa-tree', label: 'Jardín' },
  { value: 'fa-fire-extinguisher', label: 'Seguridad contra incendios' },
];
```

## 12. Filtros

### 12.1 Por Categoría

```javascript
AppState.checklistFilters.categoria = 'climatizacion';
```

### 12.2 Por Edificio

```javascript
AppState.checklistFilters.edificio = '1';
```

### 12.3 Por Estado

```javascript
AppState.checklistFilters.estado = 'malo';
```

### 12.4 Búsqueda

```javascript
AppState.checklistFilters.busqueda = '101';
```

## 13. Paginación

```javascript
AppState.checklistPagination = {
  page: 1,
  perPage: 4, // Habitaciones por página
  totalPages: 1,
};
```

## 14. Funciones de Utilidad

### 14.1 Sanitizar Texto

```javascript
function sanitizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}
```

## 15. Modal de Administración de Usuarios

El módulo también incluye gestión de usuarios:

```javascript
const UsuarioModalState = {
  initialized: false,
  modal: null,
  form: null,
  feedback: null,
  fields: {},
  title: null,
  keydownHandler: null,
};
```

## 16. CSS Clases Importantes

| Clase                        | Descripción              |
| ---------------------------- | ------------------------ |
| `.checklist-categorias`      | Contenedor de categorías |
| `.categoria-item`            | Item de categoría        |
| `.checklist-items`           | Lista de items           |
| `.item-checklist`            | Item individual          |
| `.estado-btn`                | Botón de estado          |
| `.estado-bueno/regular/malo` | Colores de estado        |
| `.checklist-progreso`        | Barra de progreso        |
| `.habitacion-checklist-card` | Tarjeta de habitación    |
