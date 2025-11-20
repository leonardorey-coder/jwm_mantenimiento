# Sistema de Autenticación JWT

## 📋 Descripción General

Sistema completo de autenticación basado en JSON Web Tokens (JWT) para el sistema de mantenimiento JW Marriott.

## 🔐 Características

- ✅ Autenticación JWT con tokens de acceso y refresco
- ✅ Hashing de contraseñas con bcrypt (a través de pgcrypto en PostgreSQL)
- ✅ Bloqueo automático por intentos fallidos (5 intentos = 30 minutos bloqueado)
- ✅ Sesiones rastreadas en base de datos
- ✅ Refresh tokens para renovar acceso sin relogin
- ✅ Auditoría completa de acciones
- ✅ Información de dispositivo y ubicación
- ✅ Roles y permisos (ADMIN, SUPERVISOR, TECNICO)

## 👤 Usuario Administrador

Por defecto, el sistema incluye un usuario administrador:

```
Nombre: Fidel Cruz Lozada
Email: fcruz@grupodiestra.com
Teléfono: +52 624 237 1063
Contraseña: fcl1020
Rol: ADMIN
```

Este administrador es el contacto para:
- Registro de nuevos usuarios
- Recuperación de contraseñas
- Solicitudes de acceso
- Soporte general

## 🚀 Instalación

### 1. Instalar Dependencias

```bash
npm install
```

Esto instalará:
- `jsonwebtoken` - Para manejo de JWT
- `bcrypt` - Para hashing de contraseñas (respaldo)
- `pg` - Cliente PostgreSQL

### 2. Configurar Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```env
# JWT
JWT_SECRET=tu_clave_secreta_super_segura_cambiar_en_produccion
JWT_EXPIRATION=1h
REFRESH_TOKEN_EXPIRATION=7d

# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jwm_mantenimiento
DB_USER=postgres
DB_PASSWORD=tu_password
```

### 3. Ejecutar Script de Base de Datos

```bash
# Conectar a PostgreSQL
psql -U postgres -d jwm_mantenimiento

# Ejecutar script de mejora de usuarios y sesiones
\i db/mejora_usuarios_sesiones.sql
```

Esto creará:
- Extensión pgcrypto para hashing
- Tablas de usuarios, sesiones, auditoría
- Usuario admin por defecto
- Funciones y triggers automáticos

## 📡 API Endpoints

### Públicos (No requieren autenticación)

#### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "fcruz@grupodiestra.com",
  "password": "fcl1020"
}
```

**Respuesta Exitosa:**
```json
{
  "success": true,
  "mensaje": "Login exitoso",
  "usuario": {
    "id": 1,
    "nombre": "Fidel Cruz Lozada",
    "email": "fcruz@grupodiestra.com",
    "numero_empleado": "ADM-001",
    "departamento": "Administración General",
    "telefono": "+52 624 237 1063",
    "rol": "ADMIN",
    "permisos": {"all": true}
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "expiresIn": "2025-11-13T15:30:00.000Z",
    "tokenType": "Bearer"
  },
  "sesion_id": 123
}
```

#### 2. Refrescar Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

#### 3. Contacto Administrador
```http
GET /api/auth/contacto-admin
```

#### 4. Solicitar Acceso
```http
POST /api/auth/solicitar-acceso
Content-Type: application/json

{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "+52 624 123 4567",
  "departamento": "Mantenimiento",
  "motivo": "Necesito acceso para gestionar mantenimientos"
}
```

### Protegidos (Requieren JWT)

#### 5. Logout
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

#### 6. Información del Usuario
```http
GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔒 Uso en Frontend

### Login y Almacenamiento de Tokens

```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'fcruz@grupodiestra.com',
    password: 'fcl1020'
  })
});

const data = await response.json();

if (data.success) {
  // Guardar tokens
  localStorage.setItem('accessToken', data.tokens.accessToken);
  localStorage.setItem('refreshToken', data.tokens.refreshToken);
  localStorage.setItem('tokenExpiration', data.tokens.expiresIn);
  localStorage.setItem('currentUser', JSON.stringify(data.usuario));
}
```

### Hacer Peticiones Autenticadas

```javascript
// Función helper (ya incluida en login-jwt.js)
async function fetchWithAuth(url, options = {}) {
  const accessToken = localStorage.getItem('accessToken');
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
  
  const response = await fetch(url, { ...options, headers });
  
  // Si token expiró, refrescar automáticamente
  if (response.status === 401) {
    await refreshAccessToken();
    // Reintentar petición
    const newToken = localStorage.getItem('accessToken');
    headers['Authorization'] = `Bearer ${newToken}`;
    return await fetch(url, { ...options, headers });
  }
  
  return response;
}

// Usar en peticiones
const cuartos = await fetchWithAuth('/api/cuartos');
```

### Logout

```javascript
async function logout() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  await fetchWithAuth('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken })
  });
  
  // Limpiar localStorage
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('tokenExpiration');
  localStorage.removeItem('currentUser');
  
  // Redirigir a login
  window.location.href = 'login.html';
}
```

## 🛡️ Middlewares de Protección

### 1. Verificar Autenticación

Protege cualquier ruta que requiera usuario autenticado:

```javascript
const { verificarAutenticacion } = require('./api/auth');

app.get('/api/cuartos', verificarAutenticacion, (req, res) => {
  // req.usuario contiene datos del JWT
  console.log('Usuario autenticado:', req.usuario);
  // ... tu código
});
```

### 2. Verificar Admin

Solo permite acceso a administradores:

```javascript
const { verificarAdmin } = require('./api/auth');

app.delete('/api/usuarios/:id', verificarAdmin, (req, res) => {
  // Solo admins pueden eliminar usuarios
});
```

### 3. Verificar Supervisor

Permite acceso a supervisores y administradores:

```javascript
const { verificarSupervisor } = require('./api/auth');

app.post('/api/mantenimientos', verificarSupervisor, (req, res) => {
  // Supervisores y admins pueden crear mantenimientos
});
```

## 🔐 Seguridad

### Hashing de Contraseñas

Las contraseñas se hashean automáticamente en PostgreSQL usando pgcrypto:

```sql
-- Hashear contraseña
SELECT hashear_password('mi_contraseña');

-- Verificar contraseña
SELECT verificar_password('mi_contraseña', password_hash);
```

### Bloqueo por Intentos Fallidos

- Después de 5 intentos fallidos, el usuario se bloquea por 30 minutos
- El contador se resetea al hacer login exitoso
- Los intentos fallidos se registran en auditoría

### Expiración de Tokens

- **Access Token**: 1 hora (configurable)
- **Refresh Token**: 7 días (configurable)
- Los refresh tokens permiten renovar el access token sin relogin

### Auditoría

Todas las acciones se registran automáticamente:
- Login/Logout
- Intentos fallidos
- Cambios de contraseña
- Cambios de rol
- Bloqueos/Desbloqueos

## 📊 Consultas Útiles

### Ver Sesiones Activas

```sql
SELECT * FROM vista_sesiones_activas;
```

### Ver Auditoría de un Usuario

```sql
SELECT * FROM vista_actividad_reciente 
WHERE usuario_id = 1 
ORDER BY fecha_hora DESC;
```

### Ver Estadísticas de Usuarios

```sql
SELECT * FROM obtener_estadisticas_usuarios();
```

### Cerrar Todas las Sesiones de un Usuario

```sql
UPDATE sesiones_usuarios 
SET activa = FALSE, 
    fecha_logout = CURRENT_TIMESTAMP,
    cerrada_por = 'admin'
WHERE usuario_id = 5 AND activa = TRUE;
```

## 🔧 Configuración de Producción

### Variables de Entorno Críticas

```env
# CAMBIAR EN PRODUCCIÓN
JWT_SECRET=clave_super_secreta_aleatoria_de_64_caracteres_minimo
JWT_EXPIRATION=1h
REFRESH_TOKEN_EXPIRATION=7d

# Base de datos en producción
DB_HOST=tu-servidor-postgres.com
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

### Recomendaciones

1. **JWT_SECRET**: Usar clave aleatoria de al menos 64 caracteres
2. **HTTPS**: Siempre usar HTTPS en producción
3. **Tokens**: No exponer tokens en logs o errores
4. **Refresh Tokens**: Considerar rotación de refresh tokens
5. **Backups**: Hacer backups regulares de las tablas de usuarios y sesiones

## 📝 Notas

- El sistema usa la extensión `pgcrypto` de PostgreSQL para hashing bcrypt
- Los tokens JWT incluyen información básica del usuario (no sensible)
- Las sesiones se rastrean completamente en la base de datos
- No se eliminan usuarios, solo se marcan como inactivos

## 🆘 Soporte

Para soporte o dudas sobre el sistema:

**Fidel Cruz Lozada**  
Email: fcruz@grupodiestra.com  
Teléfono: +52 624 237 1063

---

**Versión**: 1.0.0  
**Fecha**: 2025-11-13  
**Sistema**: JW Marriott Maintenance
