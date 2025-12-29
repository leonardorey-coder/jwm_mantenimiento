# Módulo de Sábanas - Manual Técnico

## 1. Descripción General

El módulo de **Sábanas** gestiona el control y seguimiento de servicios programados para todas las habitaciones, permitiendo marcar como realizados, agregar observaciones y archivar períodos completados.

### Características principales:

- Creación de sábanas con todas las habitaciones
- Tabla con lazy loading (lotes de 30 filas)
- Marcado de servicios realizados con timestamp
- Campo de observaciones por habitación
- Filtros por edificio, personal y estado
- Historial de sábanas archivadas
- Contadores de progreso en tiempo real

## 2. Estructura de Archivos

```
├── index.html                  # Contiene tab de sábanas
├── js/
│   ├── sabana-functions.js     # Funciones principales
│   └── app.js                  # Integración con app
├── css/
│   └── style.css               # Estilos compartidos
├── api/
│   └── index.js                # Endpoints de API
├── db/
│   ├── postgres-manager.js     # Gestor de BD
│   └── schema_sabanas.sql      # Esquema de tablas
```

## 3. API Endpoints

### 3.1 Crear Sábana

```
POST /api/sabanas
Authorization: Bearer <token>
```

**Request Body:**

```json
{
  "nombre": "Servicio de Limpieza Profunda",
  "servicio_id": "limpieza-profunda-001",
  "servicio_nombre": "Limpieza Profunda",
  "notas": "Programación mensual"
}
```

**Response:**

```json
{
    "id": 1,
    "nombre": "Servicio de Limpieza Profunda",
    "servicio_id": "limpieza-profunda-001",
    "servicio_nombre": "Limpieza Profunda",
    "fecha_creacion": "2025-11-30T10:00:00.000Z",
    "archivada": false,
    "items": [...]
}
```

### 3.2 Obtener Sábanas

```
GET /api/sabanas?includeArchivadas=true
Authorization: Bearer <token>
```

### 3.3 Obtener Sábanas Archivadas

```
GET /api/sabanas/archivadas
Authorization: Bearer <token>
```

### 3.4 Obtener Sábana por ID

```
GET /api/sabanas/:id
Authorization: Bearer <token>
```

**Response:**

```json
{
  "id": 1,
  "nombre": "Servicio Mensual",
  "servicio_id": "mensual-001",
  "servicio_nombre": "Mantenimiento Mensual",
  "fecha_creacion": "2025-11-01T00:00:00.000Z",
  "archivada": false,
  "items": [
    {
      "id": 1,
      "cuarto_id": 101,
      "habitacion": "101",
      "edificio": "Torre A",
      "fecha_programada": "2025-11-15",
      "fecha_realizado": null,
      "responsable": null,
      "observaciones": null,
      "realizado": false
    }
  ]
}
```

### 3.5 Actualizar Item de Sábana

```
PATCH /api/sabanas/items/:id
Authorization: Bearer <token>
```

**Request Body (marcar realizado):**

```json
{
  "realizado": true
}
```

**Request Body (actualizar observaciones):**

```json
{
  "observaciones": "Sin novedades"
}
```

### 3.6 Obtener Sábanas por Servicio

```
GET /api/sabanas/servicio/:servicioId?includeArchivadas=false
Authorization: Bearer <token>
```

### 3.7 Archivar Sábana

```
POST /api/sabanas/:id/archivar
Authorization: Bearer <token>
```

**Requiere rol:** ADMIN

## 4. Variables del Módulo

```javascript
let currentSabanaId = null; // ID de sábana actual
let currentSabanaArchivada = false; // Flag de archivada
let currentSabanaItems = []; // Items para filtrado
let estoyCreandoSabana = false; // Flag anti-doble click
let cerrarModalNuevaSabanaEscHandler = null;
let cerrarModalHistorialEscHandler = null;
```

## 5. Funciones Principales

### 5.1 Cargar Lista de Sábanas

```javascript
async function cargarListaSabanas()
```

Obtiene sábanas y las popula en el selector.

### 5.2 Cambiar Servicio Actual

```javascript
async function cambiarServicioActual(sabanaId)
```

Carga una sábana específica y renderiza su tabla.

### 5.3 Renderizar Tabla

```javascript
function renderSabanaTable(items, archivada = false)
```

Renderiza la tabla con lazy loading (30 items por lote).

### 5.4 Toggle Realizado

```javascript
async function toggleRealizadoSabana(itemId, realizado)
```

Marca/desmarca un item como realizado.

### 5.5 Guardar Observación

```javascript
async function guardarObservacionSabana(itemId, observaciones)
```

Guarda las observaciones de un item.

### 5.6 Actualizar Contadores

```javascript
function actualizarContadoresSabana(items)
```

Actualiza los contadores de completados/totales.

### 5.7 Poblar Filtros

```javascript
function poblarEdificiosSabana(items)
function poblarPersonalSabana(items)
```

Llena los selects de filtros con opciones únicas.

### 5.8 Filtrar Items

```javascript
function filtrarItemsSabana()
```

Aplica filtros de edificio, personal y estado.

## 6. Estructura de Tabla

```html
<table class="tabla-sabana">
  <thead>
    <tr>
      <th>Edificio</th>
      <th>Habitación</th>
      <th>Programada</th>
      <th>Realizada</th>
      <th>Responsable</th>
      <th>Observaciones</th>
      <th>Estado</th>
    </tr>
  </thead>
  <tbody id="sabanaTableBody">
    <!-- Filas dinámicas -->
  </tbody>
</table>
```

## 7. Estructura de Fila

```html
<tr>
  <td data-label="Edificio">Torre A</td>
  <td data-label="Habitación"><strong>101</strong></td>
  <td data-label="Programada">15/11/2025</td>
  <td data-label="Realizada">
    <span class="fecha-realizado">30/11/2025, 10:30 a.m.</span>
  </td>
  <td data-label="Responsable">
    <span class="responsable-nombre">Juan Técnico</span>
  </td>
  <td data-label="Observaciones">
    <input
      type="text"
      class="input-observaciones"
      value=""
      data-item-id="1"
      onchange="guardarObservacionSabana(1, this.value)"
    />
  </td>
  <td data-label="Estado">
    <label class="checkbox-container">
      <input
        type="checkbox"
        class="checkbox-sabana"
        data-item-id="1"
        onchange="toggleRealizadoSabana(1, this.checked)"
      />
      <span class="checkmark"></span>
    </label>
  </td>
</tr>
```

## 8. Lazy Loading de Tabla

```javascript
const BATCH_SIZE = 30;
let currentIndex = 0;

const renderBatch = () => {
  const endIndex = Math.min(currentIndex + BATCH_SIZE, items.length);
  const fragment = document.createDocumentFragment();

  for (let i = currentIndex; i < endIndex; i++) {
    // Crear fila
  }

  tbody.appendChild(fragment);
  currentIndex = endIndex;

  if (currentIndex < items.length) {
    // Crear sentinel y observer para siguiente lote
    const sentinel = document.createElement('tr');
    sentinel.className = 'lazy-sentinel';
    tbody.appendChild(sentinel);

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.unobserve(entries[0].target);
          entries[0].target.remove();
          renderBatch();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(sentinel);
  }
};
```

## 9. Contadores de Progreso

```html
<div class="sabana-stats">
  <span class="stat-completados">
    <strong id="serviciosCompletados">0</strong> completados
  </span>
  <span class="stat-totales">
    de <strong id="serviciosTotales">0</strong> totales
  </span>
</div>
```

## 10. Filtros

### 10.1 Por Edificio

```html
<select id="filtroEdificioSabana" onchange="filtrarItemsSabana()">
  <option value="">Todos los edificios</option>
  <!-- Opciones dinámicas -->
</select>
```

### 10.2 Por Personal

```html
<select id="filtroPersonalSabana" onchange="filtrarItemsSabana()">
  <option value="">Todo el personal</option>
  <!-- Opciones dinámicas -->
</select>
```

### 10.3 Por Estado

```html
<select id="filtroEstadoSabana" onchange="filtrarItemsSabana()">
  <option value="">Todos</option>
  <option value="pendiente">Pendientes</option>
  <option value="realizado">Realizados</option>
</select>
```

## 11. Modal de Nueva Sábana

```html
<div class="modal-nueva-sabana" id="modalNuevaSabana">
  <div class="modal-content">
    <h3>Crear Nueva Sábana</h3>
    <form id="formNuevaSabana">
      <input type="text" id="nombreSabana" required />
      <select id="servicioSabana" required>
        <!-- Tipos de servicio -->
      </select>
      <textarea id="notasSabana"></textarea>
      <label>
        <input type="checkbox" id="switchArchivarActual" />
        Archivar sábana actual
      </label>
      <div id="alertaArchivarActual" style="display:none;">
        <!-- Alerta de confirmación -->
      </div>
      <button type="submit">Crear Sábana</button>
    </form>
  </div>
</div>
```

## 12. Historial de Sábanas Archivadas

```javascript
async function abrirHistorialSabanas()
async function cerrarHistorialSabanas()
async function cargarHistorialSabanas()
function verSabanaArchivada(sabanaId)
```

## 13. Base de Datos

### 13.1 Tabla Sabanas

```sql
CREATE TABLE sabanas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    servicio_id VARCHAR(100),
    servicio_nombre VARCHAR(255),
    usuario_creador_id INTEGER REFERENCES usuarios(id),
    notas TEXT,
    archivada BOOLEAN DEFAULT FALSE,
    fecha_archivado TIMESTAMP,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 13.2 Tabla Sabana Items

```sql
CREATE TABLE sabana_items (
    id SERIAL PRIMARY KEY,
    sabana_id INTEGER REFERENCES sabanas(id) ON DELETE CASCADE,
    cuarto_id INTEGER REFERENCES cuartos(id),
    habitacion VARCHAR(50),
    edificio VARCHAR(100),
    edificio_id INTEGER,
    fecha_programada DATE,
    fecha_realizado TIMESTAMP,
    responsable VARCHAR(100),
    usuario_responsable_id INTEGER REFERENCES usuarios(id),
    observaciones TEXT,
    realizado BOOLEAN DEFAULT FALSE
);
```

## 14. Modo Solo Lectura (Archivada)

Cuando una sábana está archivada:

- Los checkboxes están deshabilitados
- Los inputs de observaciones están deshabilitados
- Se muestra badge "Archivada · Solo lectura"
- Intentar modificar muestra mensaje de error

```javascript
if (currentSabanaArchivada) {
  mostrarMensajeSabana('No se puede editar una sábana archivada', 'error');
  return;
}
```

## 15. Actualización en Tiempo Real

Cuando se marca un item como realizado:

1. Se envía PATCH a la API
2. Se actualiza el item en `currentSabanaItems`
3. Se actualiza la celda de fecha_realizado
4. Se actualiza la celda de responsable
5. Se actualizan los contadores
6. Se repuebla el filtro de personal

## 16. Funciones de Modal

```javascript
function lockBodyScroll() {
  document.body.classList.add('modal-open');
}

function unlockBodyScroll() {
  document.body.classList.remove('modal-open');
}

function unlockBodyScrollIfNoModal() {
  setTimeout(() => {
    const modalVisible = Array.from(
      document.querySelectorAll('.modal-detalles')
    ).some((modal) => window.getComputedStyle(modal).display !== 'none');
    if (!modalVisible) {
      document.body.classList.remove('modal-open');
    }
  }, 50);
}
```

## 17. Mensajes de Feedback

```javascript
function mostrarMensajeSabana(mensaje, tipo = 'info') {
  if (typeof mostrarMensaje === 'function') {
    mostrarMensaje(mensaje, tipo);
  } else {
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
    if (tipo === 'error') {
      alert(mensaje);
    }
  }
}
```

Tipos: `info`, `success`, `warning`, `error`

## 18. Clases CSS Importantes

| Clase                     | Descripción                          |
| ------------------------- | ------------------------------------ |
| `.tabla-sabana`           | Tabla principal                      |
| `.checkbox-sabana`        | Checkbox de estado                   |
| `.input-observaciones`    | Campo de observaciones               |
| `.checkbox-container`     | Contenedor de checkbox               |
| `.checkmark`              | Estilo visual del checkbox           |
| `.fecha-realizado`        | Fecha formateada                     |
| `.responsable-nombre`     | Nombre del responsable               |
| `.sabana-archivada-badge` | Badge de archivada                   |
| `.lazy-sentinel`          | Elemento centinela para lazy loading |
