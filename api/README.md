# API REST - JW Mantto

Esta carpeta contiene todos los endpoints de la API REST organizados por recursos.

## Estructura de Archivos

```
api/
├── index.js            # Configurador principal de rutas
├── edificios.js        # Endpoints de edificios
├── cuartos.js          # Endpoints de cuartos/habitaciones
├── mantenimientos.js   # Endpoints de mantenimientos y alertas
└── README.md           # Esta documentación
```

## Endpoints Disponibles

### Health Check

```http
GET /api/health
```

Verifica el estado del servidor y la conexión a la base de datos.

**Respuesta exitosa:**

```json
{
  "status": "ok",
  "timestamp": "2025-11-10T12:00:00.000Z",
  "database": "connected"
}
```

---

### Edificios

#### Obtener todos los edificios

```http
GET /api/edificios
```

**Respuesta exitosa:**

```json
[
  {
    "id": 1,
    "nombre": "Edificio A",
    "descripcion": "Edificio principal"
  }
]
```

#### Obtener un edificio específico

```http
GET /api/edificios/:id
```

**Parámetros:**

- `id` (number): ID del edificio

**Respuesta exitosa:**

```json
{
  "id": 1,
  "nombre": "Edificio A",
  "descripcion": "Edificio principal"
}
```

---

### Cuartos

#### Obtener todos los cuartos

```http
GET /api/cuartos
```

**Respuesta exitosa:**

```json
[
  {
    "id": 1,
    "numero": "101",
    "nombre": "Habitación 101",
    "edificio_id": 1,
    "edificio_nombre": "Edificio A",
    "descripcion": "Habitación estándar"
  }
]
```

#### Obtener un cuarto específico

```http
GET /api/cuartos/:id
```

**Parámetros:**

- `id` (number): ID del cuarto

#### Crear un nuevo cuarto

```http
POST /api/cuartos
```

**Body (JSON):**

```json
{
  "numero": "102",
  "nombre": "Habitación 102",
  "edificio_id": 1,
  "descripcion": "Habitación suite"
}
```

**Campos obligatorios:**

- `numero` (string)
- `edificio_id` (number)

**Respuesta exitosa:** `201 Created`

```json
{
  "id": 2,
  "numero": "102",
  "nombre": "Habitación 102",
  "edificio_id": 1,
  "descripcion": "Habitación suite"
}
```

#### Actualizar un cuarto

```http
PUT /api/cuartos/:id
```

**Parámetros:**

- `id` (number): ID del cuarto

**Body (JSON):**

```json
{
  "numero": "102",
  "nombre": "Habitación 102 Renovada",
  "edificio_id": 1,
  "descripcion": "Suite Premium"
}
```

#### Eliminar un cuarto

```http
DELETE /api/cuartos/:id
```

**Parámetros:**

- `id` (number): ID del cuarto

---

### Mantenimientos

#### Obtener todos los mantenimientos

```http
GET /api/mantenimientos
```

**Query params (opcionales):**

- `cuarto_id` (number): Filtrar por cuarto específico

**Respuesta exitosa:**

```json
[
  {
    "id": 1,
    "cuarto_id": 1,
    "cuarto_nombre": "101",
    "tipo": "rutina",
    "descripcion": "Limpieza general",
    "hora": "14:30:00",
    "dia_alerta": 15,
    "fecha_solicitud": "2025-11-10",
    "fecha_creacion": "2025-11-10T10:30:00.000Z",
    "estado": "pendiente",
    "alerta_emitida": false
  }
]
```

#### Obtener un mantenimiento específico

```http
GET /api/mantenimientos/:id
```

**Parámetros:**

- `id` (number): ID del mantenimiento

#### Crear un nuevo mantenimiento

```http
POST /api/mantenimientos
```

**Body (JSON) - Avería normal:**

```json
{
  "cuarto_id": 1,
  "tipo": "normal",
  "descripcion": "Reparar aire acondicionado"
}
```

**Body (JSON) - Alerta/Rutina:**

```json
{
  "cuarto_id": 1,
  "tipo": "rutina",
  "descripcion": "Limpieza profunda mensual",
  "hora": "14:30",
  "dia_alerta": "2025-11-15"
}
```

**Campos obligatorios:**

- `cuarto_id` (number)
- `descripcion` (string)
- `tipo` (string): "normal" o "rutina"
- `hora` (string): Obligatorio si tipo es "rutina" (formato HH:mm)
- `dia_alerta` (string/number): Obligatorio si tipo es "rutina" (día del mes 1-31)

**Respuesta exitosa:** `201 Created`

#### Actualizar un mantenimiento

```http
PUT /api/mantenimientos/:id
```

**Parámetros:**

- `id` (number): ID del mantenimiento

**Body (JSON):**

```json
{
  "descripcion": "Limpieza profunda y desinfección",
  "hora": "15:00",
  "dia_alerta": "2025-11-20",
  "tipo": "rutina",
  "estado": "en_proceso"
}
```

Todos los campos son opcionales. Solo se actualizarán los campos enviados.

#### Marcar alerta como emitida

```http
PATCH /api/mantenimientos/:id/emitir
```

**Parámetros:**

- `id` (number): ID del mantenimiento

Este endpoint marca una alerta como emitida cuando el sistema de notificaciones la ha mostrado al usuario.

**Respuesta exitosa:**

```json
{
  "success": true,
  "message": "Alerta marcada como emitida"
}
```

#### Eliminar un mantenimiento

```http
DELETE /api/mantenimientos/:id
```

**Parámetros:**

- `id` (number): ID del mantenimiento

**Respuesta exitosa:**

```json
{
  "success": true,
  "message": "Mantenimiento eliminado correctamente"
}
```

---

## Manejo de Errores

Todos los endpoints devuelven errores en el siguiente formato:

```json
{
  "error": "Descripción del error",
  "details": "Detalles técnicos (opcional)"
}
```

### Códigos de estado HTTP

- `200` - OK: Operación exitosa
- `201` - Created: Recurso creado exitosamente
- `400` - Bad Request: Datos de entrada inválidos
- `404` - Not Found: Recurso no encontrado
- `500` - Internal Server Error: Error del servidor

---

## Ejemplos de Uso

### JavaScript (Fetch API)

```javascript
// Obtener todos los cuartos
const cuartos = await fetch('http://localhost:3001/api/cuartos').then((res) =>
  res.json()
);

// Crear un mantenimiento
const nuevoMantenimiento = await fetch(
  'http://localhost:3001/api/mantenimientos',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cuarto_id: 1,
      tipo: 'normal',
      descripcion: 'Cambiar bombillas',
    }),
  }
).then((res) => res.json());

// Eliminar un mantenimiento
await fetch('http://localhost:3001/api/mantenimientos/5', {
  method: 'DELETE',
});
```

### cURL

```bash
# Obtener todos los edificios
curl http://localhost:3001/api/edificios

# Crear un cuarto
curl -X POST http://localhost:3001/api/cuartos \
  -H "Content-Type: application/json" \
  -d '{
    "numero": "103",
    "nombre": "Habitación 103",
    "edificio_id": 1
  }'

# Actualizar un mantenimiento
curl -X PUT http://localhost:3001/api/mantenimientos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "descripcion": "Limpieza completada",
    "estado": "completado"
  }'
```

---

## Notas Técnicas

### Base de Datos

- Las APIs utilizan PostgreSQL como base de datos principal
- Si la base de datos no está disponible, los endpoints devuelven error 500
- Los datos se validan antes de ser insertados/actualizados

### CORS

El servidor tiene CORS habilitado para permitir peticiones desde cualquier origen durante el desarrollo.

### Logging

Todas las peticiones se registran en la consola con timestamp, método HTTP y URL.

### Formato de Fechas

- **Entrada**: Las fechas se aceptan en formato ISO 8601 (YYYY-MM-DD)
- **Salida**: Las fechas se devuelven en formato ISO 8601 completo con timestamp
- **día_alerta**: Se almacena como número (1-31) representando el día del mes
