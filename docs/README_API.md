# API REST - Manual Técnico

## 1. Descripción General

La API REST del sistema SGSOM proporciona todos los endpoints necesarios para la gestión de habitaciones, espacios comunes, mantenimientos, tareas, sábanas, checklist y usuarios.

### Tecnologías:
- **Express.js**: Framework web
- **PostgreSQL**: Base de datos
- **JWT**: Autenticación
- **Vercel**: Despliegue serverless

## 2. Configuración

### 2.1 URL Base
```
Producción: https://[tu-dominio].vercel.app/api
Desarrollo: http://localhost:3001/api
```

### 2.2 Headers Requeridos
```
Content-Type: application/json
Authorization: Bearer <token>  (para endpoints protegidos)
```

### 2.3 CORS
```javascript
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
```

## 3. Endpoints de Autenticación

### 3.1 Login
```
POST /api/auth/login
```
**Request:**
```json
{
    "email": "usuario@ejemplo.com",
    "password": "contraseña123"
}
```
**Response (200):**
```json
{
    "success": true,
    "mensaje": "Login exitoso",
    "usuario": {
        "id": 1,
        "nombre": "Usuario",
        "email": "usuario@ejemplo.com",
        "rol": "ADMIN",
        "permisos": {...}
    },
    "tokens": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "abc123...",
        "expiresIn": "2025-12-01T00:00:00.000Z",
        "tokenType": "Bearer"
    },
    "sesion_id": 1
}
```

### 3.2 Logout
```
POST /api/auth/logout
Authorization: Bearer <token>
```

### 3.3 Refresh Token
```
POST /api/auth/refresh
```
**Request:**
```json
{
    "refreshToken": "abc123..."
}
```

### 3.4 Usuario Actual
```
GET /api/auth/me
Authorization: Bearer <token>
```

### 3.5 Contacto Admin
```
GET /api/auth/contacto-admin
```

### 3.6 Solicitar Acceso
```
POST /api/auth/solicitar-acceso
```

### 3.7 Cambiar Contraseña Obligatorio
```
POST /api/auth/cambiar-password-obligatorio
Authorization: Bearer <token>
```

## 4. Endpoints de Usuarios

### 4.1 Listar Usuarios (Admin)
```
GET /api/auth/usuarios?includeInactive=true
Authorization: Bearer <token>
```

### 4.2 Obtener Roles
```
GET /api/usuarios/roles
Authorization: Bearer <token>
```

### 4.3 Crear Usuario
```
POST /api/usuarios
Authorization: Bearer <token>
```

### 4.4 Actualizar Usuario
```
PUT /api/usuarios/:id
Authorization: Bearer <token>
```

### 4.5 Desactivar Usuario
```
POST /api/usuarios/:id/desactivar
Authorization: Bearer <token>
```

### 4.6 Activar Usuario
```
POST /api/usuarios/:id/activar
Authorization: Bearer <token>
```

### 4.7 Desbloquear Usuario
```
POST /api/usuarios/:id/desbloquear
Authorization: Bearer <token>
```

## 5. Endpoints de Edificios

### 5.1 Listar Edificios
```
GET /api/edificios
```
**Response:**
```json
[
    { "id": 1, "nombre": "Torre A", "descripcion": "..." }
]
```

## 6. Endpoints de Cuartos

### 6.1 Listar Cuartos
```
GET /api/cuartos
```

### 6.2 Obtener Cuarto
```
GET /api/cuartos/:id
```

### 6.3 Actualizar Estado
```
PUT /api/cuartos/:id
```
**Request:**
```json
{
    "estado": "disponible|ocupado|mantenimiento|fuera_servicio"
}
```

## 7. Endpoints de Espacios Comunes

### 7.1 Listar Espacios
```
GET /api/espacios-comunes
```

### 7.2 Obtener Espacio
```
GET /api/espacios-comunes/:id
```

### 7.3 Actualizar Estado
```
PUT /api/espacios-comunes/:id
```

## 8. Endpoints de Mantenimientos

### 8.1 Listar Mantenimientos
```
GET /api/mantenimientos?cuarto_id=1
```

### 8.2 Crear Mantenimiento
```
POST /api/mantenimientos
Authorization: Bearer <token>
```
**Request:**
```json
{
    "cuarto_id": 1,
    "descripcion": "Descripción del servicio",
    "tipo": "normal|rutina",
    "hora": "10:00",
    "dia_alerta": "2025-12-15",
    "prioridad": "baja|media|alta|urgente",
    "estado": "pendiente|en_proceso|completado|cancelado",
    "usuario_asignado_id": 3,
    "tarea_id": 5,
    "notas": "Notas adicionales",
    "estado_cuarto": "mantenimiento"
}
```

### 8.3 Actualizar Mantenimiento
```
PUT /api/mantenimientos/:id
```

### 8.4 Eliminar Mantenimiento
```
DELETE /api/mantenimientos/:id
```

### 8.5 Mantenimientos de Espacios Comunes
```
GET /api/mantenimientos/espacios?espacio_comun_id=1
POST /api/mantenimientos/espacios
```

## 9. Endpoints de Alertas

### 9.1 Alertas Emitidas
```
GET /api/alertas/emitidas?fecha=2025-12-01
```

### 9.2 Alertas Pendientes
```
GET /api/alertas/pendientes
```

### 9.3 Marcar Alerta como Emitida
```
PATCH /api/mantenimientos/:id/emitir
```

### 9.4 Marcar Alertas Pasadas
```
POST /api/alertas/marcar-pasadas
```

## 10. Endpoints de Tareas

### 10.1 Listar Tareas
```
GET /api/tareas?estado=pendiente&prioridad=alta&asignado_a=1
```

### 10.2 Obtener Tarea
```
GET /api/tareas/:id
Authorization: Bearer <token>
```

### 10.3 Crear Tarea
```
POST /api/tareas
```
**Request:**
```json
{
    "nombre": "Título de la tarea",
    "descripcion": "Descripción",
    "estado": "pendiente",
    "prioridad": "media",
    "fecha_limite": "2025-12-15",
    "responsable_id": 3,
    "ubicacion": "Ubicación",
    "tags": ["tag1", "tag2"]
}
```

### 10.4 Actualizar Tarea
```
PUT /api/tareas/:id
Authorization: Bearer <token>
```

### 10.5 Eliminar Tarea
```
DELETE /api/tareas/:id
Authorization: Bearer <token>
```

## 11. Endpoints de Sábanas

### 11.1 Listar Sábanas
```
GET /api/sabanas?includeArchivadas=true
Authorization: Bearer <token>
```

### 11.2 Sábanas Archivadas
```
GET /api/sabanas/archivadas
Authorization: Bearer <token>
```

### 11.3 Obtener Sábana
```
GET /api/sabanas/:id
Authorization: Bearer <token>
```

### 11.4 Crear Sábana
```
POST /api/sabanas
Authorization: Bearer <token>
```
**Request:**
```json
{
    "nombre": "Nombre de la sábana",
    "servicio_id": "servicio-001",
    "servicio_nombre": "Nombre del Servicio",
    "notas": "Notas opcionales"
}
```

### 11.5 Actualizar Item de Sábana
```
PATCH /api/sabanas/items/:id
Authorization: Bearer <token>
```
**Request:**
```json
{
    "realizado": true,
    "observaciones": "Sin novedades"
}
```

### 11.6 Archivar Sábana (Admin)
```
POST /api/sabanas/:id/archivar
Authorization: Bearer <token>
```

### 11.7 Sábanas por Servicio
```
GET /api/sabanas/servicio/:servicioId
Authorization: Bearer <token>
```

## 12. Endpoints de Checklist

### 12.1 Inicializar Tablas (Admin)
```
POST /api/checklist/init
Authorization: Bearer <token>
```

### 12.2 Iconos Disponibles
```
GET /api/checklist/iconos
```

### 12.3 Categorías
```
GET /api/checklist/categorias
POST /api/checklist/categorias
DELETE /api/checklist/categorias/:id
```

### 12.4 Items del Catálogo
```
GET /api/checklist/items?categoria_id=1
POST /api/checklist/items
DELETE /api/checklist/items/:id
```

### 12.5 Checklist por Cuarto
```
GET /api/checklist/cuartos?edificio_id=1&categoria_id=2
GET /api/checklist/cuartos/:cuartoId
PUT /api/checklist/cuartos/:cuartoId/items/:itemId
PUT /api/checklist/cuartos/:cuartoId/items  (bulk update)
```

### 12.6 Resúmenes
```
GET /api/checklist/cuartos/:cuartoId/resumen
GET /api/checklist/resumen
```

## 13. Endpoints de Utilidad

### 13.1 Información de la API
```
GET /api
```
**Response:**
```json
{
    "name": "JW Mantto API",
    "version": "1.2.0",
    "status": "ok",
    "endpoints": {...},
    "timestamp": "2025-11-30T10:00:00.000Z"
}
```

### 13.2 Health Check
```
GET /api/health
```
**Response:**
```json
{
    "status": "ok",
    "timestamp": "2025-11-30T10:00:00.000Z",
    "database": "connected",
    "environment": "vercel"
}
```

### 13.3 Debug Alertas
```
GET /api/debug/verificar-alertas
```

## 14. Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | Éxito |
| 201 | Recurso creado |
| 400 | Error de validación |
| 401 | No autorizado |
| 403 | Prohibido (sin permisos) |
| 404 | Recurso no encontrado |
| 409 | Conflicto (duplicado) |
| 500 | Error interno |

## 15. Formato de Errores

```json
{
    "error": "Tipo de error",
    "mensaje": "Descripción del error",
    "details": "Información adicional (opcional)"
}
```

## 16. Middleware de Autenticación

### 16.1 Verificar Autenticación
```javascript
function verificarAutenticacion(req, res, next)
// Verifica JWT en header Authorization
```

### 16.2 Verificar Admin
```javascript
function verificarAdmin(req, res, next)
// Requiere rol ADMIN
```

### 16.3 Verificar Supervisor
```javascript
function verificarSupervisor(req, res, next)
// Requiere rol ADMIN o SUPERVISOR
```

## 17. Configuración de JWT

```javascript
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = '8h';
const REFRESH_TOKEN_EXPIRATION = '7d';
```

## 18. Base de Datos

### 18.1 Pool de Conexiones
```javascript
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});
```

### 18.2 PostgresManager
El archivo `db/postgres-manager.js` contiene todas las funciones de acceso a datos:
- `getEdificios()`
- `getCuartos()`
- `getCuartoById(id)`
- `updateEstadoCuarto(id, estado)`
- `getMantenimientos(cuartoId)`
- `createMantenimiento(data)`
- `updateMantenimiento(id, data)`
- `deleteMantenimiento(id)`
- `getTareas(filters)`
- `createTarea(data)`
- `updateTarea(id, data)`
- `deleteTarea(id)`
- `getSabanas(includeArchivadas)`
- `getSabanaById(id)`
- `createSabana(data)`
- `updateSabanaItem(id, data)`
- `archivarSabana(id)`
- `getChecklistCategorias()`
- `getChecklistItems(categoriaId)`
- `getUsuarios(includeInactive)`
- `createUsuario(data)`
- `updateUsuario(id, data)`
- ... y más

## 19. Variables de Entorno

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jwm_mantenimiento
DB_USER=postgres
DB_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=8h
REFRESH_TOKEN_EXPIRATION=7d

# Entorno
NODE_ENV=development
```

## 20. Despliegue en Vercel

### 20.1 Archivo vercel.json
```json
{
    "version": 2,
    "builds": [
        {
            "src": "api/index.js",
            "use": "@vercel/node"
        }
    ],
    "routes": [
        {
            "src": "/api/(.*)",
            "dest": "/api/index.js"
        }
    ]
}
```

### 20.2 Inicialización
```javascript
async function initializeApp() {
    if (dbInitialized) return;
    
    postgresManager = new PostgresManager();
    await postgresManager.initialize();
    dbInitialized = true;
}
```

## 21. Datos Mock (Fallback)

Cuando la base de datos no está disponible:
```javascript
const mockData = {
    edificios: [...],
    cuartos: [...],
    usuarios: [...],
    mantenimientos: [...]
};
```

## 22. Estructura de Archivos API

```
api/
├── index.js          # Aplicación Express principal
├── auth.js           # Funciones de autenticación JWT
└── auth-routes.js    # Rutas de autenticación
```
