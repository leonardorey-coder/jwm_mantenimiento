# Sistema de Usuarios y Autenticación

**Sistema:** JW Marriott - Sistema de Gestión de Servicios y Operaciones de Mantenimiento (SGSOM)  
**Versión:** 2.0  
**Fecha:** 14 de Noviembre de 2025  
**Autor:** Leonardo Cruz

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Modelo de Datos](#modelo-de-datos)
4. [Roles y Permisos](#roles-y-permisos)
5. [Autenticación JWT](#autenticación-jwt)
6. [Gestión de Sesiones](#gestión-de-sesiones)
7. [Seguridad y Auditoría](#seguridad-y-auditoría)
8. [API Endpoints](#api-endpoints)
9. [Frontend: Flujo de Autenticación](#frontend-flujo-de-autenticación)
10. [Casos de Uso](#casos-de-uso)

---

## 1. Introducción

El sistema de usuarios implementa un modelo robusto de autenticación, autorización y auditoría basado en **JSON Web Tokens (JWT)** con refresh tokens, control de acceso basado en roles (RBAC), y registro completo de sesiones y eventos de seguridad.

### Características Principales

- ✅ **Autenticación JWT** con tokens de acceso y refresco
- ✅ **Control de acceso basado en roles** (RBAC): Admin, Supervisor, Técnico
- ✅ **Gestión completa de sesiones** (login/logout con metadata)
- ✅ **Bloqueo automático** por intentos fallidos (5 intentos → 30 min)
- ✅ **Auditoría completa** de acciones de usuarios
- ✅ **Registro y baja de personal** (sign-in/sign-out)
- ✅ **Cambio forzado de contraseña** al primer login
- ✅ **Detección de dispositivo, navegador y ubicación**

---

## 2. Arquitectura del Sistema

### Stack Tecnológico

- **Backend:** Node.js + Express
- **Base de Datos:** PostgreSQL 14+
- **Autenticación:** JWT (jsonwebtoken)
- **Hash de Contraseñas:** bcrypt (función nativa PostgreSQL)
- **Frontend:** Vanilla JavaScript (ES6+)
- **Persistencia:** localStorage + sessionStorage

### Diagrama de Arquitectura

```
┌─────────────────┐
│   Frontend      │
│  (login.html)   │
│  (app.js)       │
└────────┬────────┘
         │ HTTP + JWT
         ▼
┌─────────────────┐
│  API Express    │
│  auth-routes.js │
│  auth.js        │
└────────┬────────┘
         │ SQL
         ▼
┌─────────────────┐
│   PostgreSQL    │
│  - usuarios     │
│  - roles        │
│  - sesiones     │
│  - auditoria    │
└─────────────────┘
```

---

## 3. Modelo de Datos

### 3.1. Tabla: `roles`

Define los roles disponibles en el sistema con sus permisos.

```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    permisos JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Datos Predefinidos:**

| ID | Nombre     | Descripción                      | Permisos                                          |
|----|------------|----------------------------------|---------------------------------------------------|
| 1  | ADMIN      | Administrador del sistema        | `{"all": true}`                                   |
| 2  | SUPERVISOR | Supervisor de mantenimiento      | `{"read": true, "write": true, "approve": true}`  |
| 3  | TECNICO    | Técnico de mantenimiento         | `{"read": true, "write": true}`                   |

**Índices:**
- `UNIQUE(nombre)` - Nombre de rol único

---

### 3.2. Tabla: `usuarios`

Almacena la información de todos los usuarios del sistema.

```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    rol_id INTEGER NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_baja TIMESTAMP,
    motivo_baja TEXT,
    usuario_baja_id INTEGER,
    telefono VARCHAR(20),
    departamento VARCHAR(100),
    numero_empleado VARCHAR(50) UNIQUE,
    foto_perfil_url TEXT,
    ultimo_acceso TIMESTAMP,
    ultimo_cambio_password TIMESTAMP,
    requiere_cambio_password BOOLEAN DEFAULT FALSE,
    intentos_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMP,
    notas_admin TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES roles(id),
    FOREIGN KEY (usuario_baja_id) REFERENCES usuarios(id)
);
```

**Atributos Clave:**

| Campo                      | Tipo         | Descripción                                           |
|----------------------------|--------------|-------------------------------------------------------|
| `id`                       | SERIAL       | Identificador único del usuario                       |
| `nombre`                   | VARCHAR(100) | Nombre completo                                       |
| `email`                    | VARCHAR(100) | Email único (usado para login)                        |
| `password_hash`            | VARCHAR(255) | Hash bcrypt de la contraseña                          |
| `rol_id`                   | INTEGER      | Referencia al rol del usuario                         |
| `activo`                   | BOOLEAN      | Usuario activo en el sistema                          |
| `fecha_registro`           | TIMESTAMP    | Fecha de alta en el sistema (sign-in)                 |
| `fecha_baja`               | TIMESTAMP    | Fecha de baja del sistema (sign-out)                  |
| `motivo_baja`              | TEXT         | Razón de la baja                                      |
| `usuario_baja_id`          | INTEGER      | Admin que dio de baja al usuario                      |
| `numero_empleado`          | VARCHAR(50)  | Número de empleado único                              |
| `departamento`             | VARCHAR(100) | Departamento/área de trabajo                          |
| `telefono`                 | VARCHAR(20)  | Teléfono de contacto                                  |
| `ultimo_acceso`            | TIMESTAMP    | Último login exitoso                                  |
| `requiere_cambio_password` | BOOLEAN      | Forzar cambio de contraseña al próximo login          |
| `intentos_fallidos`        | INTEGER      | Contador de intentos de login fallidos                |
| `bloqueado_hasta`          | TIMESTAMP    | Fecha hasta la cual está bloqueado                    |

**Índices:**
- `UNIQUE(email)` - Email único
- `UNIQUE(numero_empleado)` - Número de empleado único
- `idx_usuarios_rol` - Búsqueda por rol
- `idx_usuarios_activo` - Filtrado por usuarios activos
- `idx_usuarios_departamento` - Búsqueda por departamento
- `idx_usuarios_bloqueado` - Usuarios bloqueados

---

### 3.3. Tabla: `sesiones_usuarios`

Registra todas las sesiones de login/logout con información detallada.

```sql
CREATE TABLE sesiones_usuarios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    token_sesion VARCHAR(255) UNIQUE NOT NULL,
    jwt_token TEXT,
    refresh_token TEXT,
    jwt_expiracion TIMESTAMP,
    refresh_expiracion TIMESTAMP,
    fecha_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_logout TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    dispositivo VARCHAR(200),
    sistema_operativo VARCHAR(100),
    navegador VARCHAR(100),
    ubicacion_geografica VARCHAR(255),
    duracion_minutos INTEGER,
    activa BOOLEAN DEFAULT TRUE,
    cerrada_por VARCHAR(20) CHECK (cerrada_por IN ('usuario', 'sistema', 'admin', 'timeout', 'expiracion')),
    notas TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
```

**Atributos Clave:**

| Campo                  | Tipo         | Descripción                                    |
|------------------------|--------------|------------------------------------------------|
| `usuario_id`           | INTEGER      | Usuario dueño de la sesión                     |
| `token_sesion`         | VARCHAR(255) | Token único de sesión (refresh token)          |
| `jwt_token`            | TEXT         | Token JWT de acceso                            |
| `refresh_token`        | TEXT         | Token de refresco (7 días de validez)          |
| `jwt_expiracion`       | TIMESTAMP    | Expiración del JWT (1 hora)                    |
| `refresh_expiracion`   | TIMESTAMP    | Expiración del refresh token (7 días)          |
| `fecha_login`          | TIMESTAMP    | Momento exacto del login                       |
| `fecha_logout`         | TIMESTAMP    | Momento exacto del logout                      |
| `ip_address`           | VARCHAR(45)  | Dirección IP del cliente                       |
| `user_agent`           | TEXT         | User agent del navegador                       |
| `dispositivo`          | VARCHAR(200) | Tipo de dispositivo (Desktop, Mobile, Tablet)  |
| `sistema_operativo`    | VARCHAR(100) | Sistema operativo (Windows, macOS, Linux, etc) |
| `navegador`            | VARCHAR(100) | Navegador usado (Chrome, Firefox, Safari, etc) |
| `activa`               | BOOLEAN      | Indica si la sesión sigue activa               |
| `cerrada_por`          | VARCHAR(20)  | Método de cierre: usuario, sistema, admin, etc |

**Índices:**
- `UNIQUE(token_sesion)` - Token de sesión único
- `idx_sesiones_usuario` - Búsqueda por usuario
- `idx_sesiones_jwt_token` - Búsqueda por JWT
- `idx_sesiones_refresh_token` - Búsqueda por refresh token
- `idx_sesiones_activa` - Filtrado de sesiones activas
- `idx_sesiones_fecha_login` - Ordenamiento por fecha de login

---

### 3.4. Tabla: `auditoria_usuarios`

Registra todos los eventos de seguridad y cambios en usuarios.

```sql
CREATE TABLE auditoria_usuarios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    accion VARCHAR(50) NOT NULL CHECK (accion IN (
        'registro', 'actualizacion', 'baja', 'reactivacion',
        'cambio_password', 'cambio_rol', 'cambio_permisos',
        'bloqueo', 'desbloqueo', 'intento_login_fallido'
    )),
    descripcion TEXT,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    usuario_ejecutor_id INTEGER,
    ip_address VARCHAR(45),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (usuario_ejecutor_id) REFERENCES usuarios(id)
);
```

**Acciones Auditadas:**

| Acción                  | Descripción                                   |
|-------------------------|-----------------------------------------------|
| `registro`              | Alta de nuevo usuario en el sistema           |
| `actualizacion`         | Modificación de datos del usuario             |
| `baja`                  | Baja del usuario del sistema                  |
| `reactivacion`          | Reactivación de usuario dado de baja          |
| `cambio_password`       | Cambio de contraseña                          |
| `cambio_rol`            | Cambio de rol del usuario                     |
| `cambio_permisos`       | Modificación de permisos                      |
| `bloqueo`               | Bloqueo de usuario                            |
| `desbloqueo`            | Desbloqueo de usuario                         |
| `intento_login_fallido` | Intento fallido de inicio de sesión           |

**Índices:**
- `idx_auditoria_usuario` - Búsqueda por usuario
- `idx_auditoria_accion` - Filtrado por tipo de acción
- `idx_auditoria_fecha` - Ordenamiento cronológico
- `idx_auditoria_ejecutor` - Búsqueda por admin ejecutor

---

## 4. Roles y Permisos

### 4.1. Matriz de Permisos

| Funcionalidad                     | TÉCNICO | SUPERVISOR | ADMIN |
|-----------------------------------|---------|------------|-------|
| **Habitaciones**                  |         |            |       |
| Ver listado de habitaciones       | ✅      | ✅         | ✅    |
| Filtrar por edificio/estado       | ✅      | ✅         | ✅    |
| Registrar mantenimiento           | ✅      | ✅         | ✅    |
| **Espacios Comunes**              |         |            |       |
| Ver espacios comunes              | ✅      | ✅         | ✅    |
| Gestionar espacios                | ✅      | ✅         | ✅    |
| **Sábana de Servicios**           |         |            |       |
| Consultar sábanas                 | ✅      | ✅         | ✅    |
| Crear nueva sábana                | ❌      | ✅         | ✅    |
| Exportar a Excel                  | ❌      | ✅         | ✅    |
| Archivar período                  | ❌      | ✅         | ✅    |
| Ver historial                     | ✅      | ✅         | ✅    |
| **Checklist**                     |         |            |       |
| Realizar checklist                | ✅      | ✅         | ✅    |
| Consultar checklist               | ✅      | ✅         | ✅    |
| **Gestión de Usuarios**           |         |            |       |
| Ver listado de usuarios           | ❌      | ❌         | ✅    |
| Crear nuevo usuario               | ❌      | ❌         | ✅    |
| Editar usuario                    | ❌      | ❌         | ✅    |
| Bloquear/Desbloquear usuario      | ❌      | ❌         | ✅    |
| Dar de baja usuario               | ❌      | ❌         | ✅    |
| Ver historial de sesiones         | ❌      | ❌         | ✅    |
| Ver auditoría                     | ❌      | ❌         | ✅    |

### 4.2. Implementación en Frontend

**CSS:** Control visual basado en clases

```css
/* Elementos visibles solo para ADMIN */
body:not(.admin) .admin-only {
    display: none !important;
}

/* Elementos visibles para SUPERVISOR y ADMIN */
body:not(.supervisor):not(.admin) .supervisor-only {
    display: none !important;
}
```

**JavaScript:** Control programático de permisos

```javascript
function applyRolePermissions(role) {
    document.body.classList.add(role);
    
    // Manejar elementos admin-only
    if (role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'flex';
        });
    } else {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });
    }
    
    // Manejar elementos supervisor-only
    if (role === 'admin' || role === 'supervisor') {
        document.querySelectorAll('.supervisor-only').forEach(el => {
            el.style.display = 'flex';
        });
    } else {
        document.querySelectorAll('.supervisor-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}
```

### 4.3. Implementación en Backend

**Middleware de Autenticación:**

```javascript
// Verificar que el usuario esté autenticado
function verificarAutenticacion(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    
    const token = authHeader.substring(7);
    const decoded = verificarJWT(token);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Token inválido' });
    }
    
    req.usuario = decoded;
    next();
}

// Verificar rol de ADMIN
function verificarAdmin(req, res, next) {
    if (req.usuario.rol_nombre !== 'ADMIN') {
        return res.status(403).json({ 
            error: 'Prohibido',
            mensaje: 'Se requieren permisos de administrador' 
        });
    }
    next();
}

// Verificar rol de SUPERVISOR o superior
function verificarSupervisor(req, res, next) {
    const rolesPermitidos = ['ADMIN', 'SUPERVISOR'];
    if (!rolesPermitidos.includes(req.usuario.rol_nombre)) {
        return res.status(403).json({ 
            error: 'Prohibido',
            mensaje: 'Se requieren permisos de supervisor o administrador' 
        });
    }
    next();
}
```

**Uso en rutas:**

```javascript
// Ruta solo para administradores
router.get('/usuarios', 
    verificarAutenticacion, 
    verificarAdmin, 
    listarUsuarios
);

// Ruta para supervisores y administradores
router.post('/sabana/archivar', 
    verificarAutenticacion, 
    verificarSupervisor, 
    archivarPeriodo
);

// Ruta para todos los usuarios autenticados
router.get('/habitaciones', 
    verificarAutenticacion, 
    listarHabitaciones
);
```

---

## 5. Autenticación JWT

### 5.1. Arquitectura de Tokens

El sistema implementa un esquema de **doble token**:

1. **Access Token (JWT):** Token de corta duración (1 hora) para autenticar solicitudes
2. **Refresh Token:** Token de larga duración (7 días) para renovar el access token

```
┌──────────────┐
│  Login       │
│  POST /login │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Genera:              │
│ - JWT (1h)           │
│ - Refresh Token (7d) │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Cliente guarda:      │
│ - accessToken        │
│ - refreshToken       │
└──────────────────────┘
```

### 5.2. Estructura del JWT

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**
```json
{
  "id": 123,
  "email": "usuario@ejemplo.com",
  "nombre": "Juan Pérez",
  "rol_id": 2,
  "rol_nombre": "SUPERVISOR",
  "numero_empleado": "EMP001",
  "departamento": "Mantenimiento",
  "iss": "jwm-mantenimiento",
  "aud": "jwm-users",
  "exp": 1699999999,
  "iat": 1699996399
}
```

**Signature:** Hash HMAC-SHA256 con clave secreta

### 5.3. Generación de Tokens

**Código Backend (`auth.js`):**

```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'jwm_mant_secret_key_2025';
const JWT_EXPIRATION = '1h';
const REFRESH_TOKEN_EXPIRATION = '7d';

// Generar JWT
function generarJWT(usuario) {
    const payload = {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol_id: usuario.rol_id,
        rol_nombre: usuario.rol_nombre,
        numero_empleado: usuario.numero_empleado,
        departamento: usuario.departamento
    };

    const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRATION,
        issuer: 'jwm-mantenimiento',
        audience: 'jwm-users'
    });

    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);

    return { token, expiration };
}

// Generar Refresh Token
function generarRefreshToken() {
    const token = crypto.randomBytes(64).toString('hex');
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7);
    return { token, expiration };
}

// Verificar JWT
function verificarJWT(token) {
    try {
        return jwt.verify(token, JWT_SECRET, {
            issuer: 'jwm-mantenimiento',
            audience: 'jwm-users'
        });
    } catch (error) {
        console.error('Token inválido:', error.message);
        return null;
    }
}
```

### 5.4. Flujo de Refresco de Token

```
Cliente detecta JWT expirado (401)
         │
         ▼
POST /api/auth/refresh
{ refreshToken: "..." }
         │
         ▼
Backend valida refresh token
         │
         ├─ Válido ──────────┐
         │                   ▼
         │          Genera nuevo JWT
         │                   │
         │                   ▼
         │          Respuesta con nuevo JWT
         │
         └─ Inválido ───────┐
                            ▼
                   Error 401 → Redirigir a login
```

**Código Frontend:**

```javascript
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken') || 
                         sessionStorage.getItem('refreshToken');
    
    if (!refreshToken) {
        clearAuthData();
        return false;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Actualizar access token
            const isRemembered = localStorage.getItem('refreshToken') !== null;
            if (isRemembered) {
                localStorage.setItem('accessToken', data.tokens.accessToken);
            } else {
                sessionStorage.setItem('accessToken', data.tokens.accessToken);
            }
            return true;
        }
    } catch (error) {
        console.error('Error al refrescar token:', error);
        clearAuthData();
        return false;
    }
}
```

### 5.5. Almacenamiento de Tokens

**Opción 1: "Recordar sesión" (localStorage)**
- Access Token → `localStorage.accessToken`
- Refresh Token → `localStorage.refreshToken`
- Persiste entre cierres de navegador

**Opción 2: Sesión temporal (sessionStorage)**
- Access Token → `sessionStorage.accessToken`
- Refresh Token → `sessionStorage.refreshToken`
- Se borra al cerrar pestaña

```javascript
// Al hacer login con "Recordar sesión"
if (rememberMe) {
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
} else {
    sessionStorage.setItem('accessToken', data.tokens.accessToken);
    sessionStorage.setItem('refreshToken', data.tokens.refreshToken);
}
```

---

## 6. Gestión de Sesiones

### 6.1. Ciclo de Vida de una Sesión

```
1. LOGIN
   ├─ Usuario ingresa email/password
   ├─ Backend valida credenciales
   ├─ Genera JWT + Refresh Token
   ├─ Crea registro en sesiones_usuarios
   ├─ Detecta: IP, dispositivo, navegador, SO
   └─ Responde con tokens

2. USO
   ├─ Cliente envía JWT en cada request
   ├─ Backend valida JWT
   ├─ Si expira → usa refresh token
   └─ Actualiza ultimo_acceso

3. LOGOUT
   ├─ Cliente solicita cierre de sesión
   ├─ Backend marca sesión como inactiva
   ├─ Registra fecha_logout
   └─ Cliente elimina tokens
```

### 6.2. Detección de Dispositivo y Ubicación

**Código Backend (`auth.js`):**

```javascript
function extraerInfoDispositivo(userAgent) {
    // Detectar dispositivo
    let dispositivo = 'Desktop';
    if (/mobile/i.test(userAgent)) dispositivo = 'Mobile';
    else if (/tablet/i.test(userAgent)) dispositivo = 'Tablet';
    
    // Detectar navegador
    let navegador = 'Desconocido';
    if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) {
        navegador = 'Chrome';
    } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
        navegador = 'Safari';
    } else if (/Firefox/i.test(userAgent)) {
        navegador = 'Firefox';
    } else if (/Edg/i.test(userAgent)) {
        navegador = 'Edge';
    }
    
    // Detectar sistema operativo
    let sistema_operativo = 'Desconocido';
    if (/Windows/i.test(userAgent)) sistema_operativo = 'Windows';
    else if (/Mac OS X/i.test(userAgent)) sistema_operativo = 'macOS';
    else if (/Linux/i.test(userAgent)) sistema_operativo = 'Linux';
    else if (/Android/i.test(userAgent)) sistema_operativo = 'Android';
    else if (/iOS|iPhone|iPad/i.test(userAgent)) sistema_operativo = 'iOS';
    
    return { dispositivo, navegador, sistema_operativo };
}

function obtenerIPCliente(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           'unknown';
}
```

### 6.3. Registro de Sesión

**Al hacer login:**

```sql
INSERT INTO sesiones_usuarios (
    usuario_id, token_sesion, jwt_token, refresh_token,
    jwt_expiracion, refresh_expiracion, ip_address, user_agent,
    dispositivo, navegador, sistema_operativo
) VALUES (
    123, 
    'refresh_token_hex', 
    'jwt_token', 
    'refresh_token_hex',
    '2025-11-14 15:00:00',
    '2025-11-21 14:00:00',
    '192.168.1.100',
    'Mozilla/5.0...',
    'Desktop',
    'Chrome',
    'Windows'
);
```

### 6.4. Cierre de Sesión

**Tipos de cierre:**

| Tipo         | Descripción                                |
|--------------|--------------------------------------------|
| `usuario`    | Usuario hace logout manualmente            |
| `sistema`    | Cierre automático por inactividad          |
| `admin`      | Administrador cierra sesión remotamente    |
| `timeout`    | Timeout de inactividad                     |
| `expiracion` | Refresh token expirado                     |

**SQL de cierre:**

```sql
UPDATE sesiones_usuarios 
SET activa = FALSE, 
    fecha_logout = CURRENT_TIMESTAMP, 
    cerrada_por = 'usuario'
WHERE refresh_token = $1 AND usuario_id = $2;
```

---

## 7. Seguridad y Auditoría

### 7.1. Hash de Contraseñas

Las contraseñas se almacenan usando **bcrypt** con 10 rondas de salt.

**Función PostgreSQL:**

```sql
CREATE OR REPLACE FUNCTION generar_password_hash(password_plano TEXT)
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN crypt(password_plano, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verificar_password(password_plano TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN password_hash = crypt(password_plano, password_hash);
END;
$$ LANGUAGE plpgsql;
```

**Uso en Backend:**

```javascript
// Al crear usuario
const passwordHash = await pool.query(
    'SELECT generar_password_hash($1) as hash',
    ['password123']
);

// Al validar login
const isValid = await pool.query(
    'SELECT verificar_password($1, $2) as valido',
    ['password123', usuario.password_hash]
);
```

### 7.2. Protección contra Ataques de Fuerza Bruta

**Mecanismo de bloqueo:**

- **5 intentos fallidos** → Bloqueo de **30 minutos**
- Contador se resetea al login exitoso
- Se registra cada intento fallido en auditoría

**Código Backend:**

```javascript
// Incrementar intentos fallidos
const intentosFallidos = usuario.intentos_fallidos + 1;
let bloqueadoHasta = null;

if (intentosFallidos >= 5) {
    bloqueadoHasta = new Date();
    bloqueadoHasta.setMinutes(bloqueadoHasta.getMinutes() + 30);
}

await pool.query(
    'UPDATE usuarios SET intentos_fallidos = $1, bloqueado_hasta = $2 WHERE id = $3',
    [intentosFallidos, bloqueadoHasta, usuario.id]
);

// Registrar en auditoría
await pool.query(`
    INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, ip_address)
    VALUES ($1, 'intento_login_fallido', $2, $3)
`, [usuario.id, `Intento fallido #${intentosFallidos}`, ipCliente]);
```

### 7.3. Cambio Forzado de Contraseña

Al crear un usuario, se puede marcar `requiere_cambio_password = TRUE`, lo que obliga al usuario a cambiar su contraseña en el primer login.

**Flujo:**

```
1. Admin crea usuario con password temporal
2. requiere_cambio_password = TRUE
3. Usuario hace login → Respuesta incluye flag
4. Frontend detecta flag → Muestra modal de cambio
5. Usuario cambia password
6. requiere_cambio_password = FALSE
```

**Código Frontend:**

```javascript
if (currentUser.requiere_cambio_password) {
    // Verificar con backend
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await response.json();
    
    if (data.usuario.requiere_cambio_password) {
        window.location.href = 'login.html?forcePassword=1';
        return false;
    }
}
```

### 7.4. Auditoría de Eventos

Todos los eventos críticos se registran en `auditoria_usuarios`:

**Eventos auditados:**
- ✅ Registro de nuevo usuario
- ✅ Modificación de datos
- ✅ Cambio de contraseña
- ✅ Cambio de rol
- ✅ Bloqueo/desbloqueo
- ✅ Baja/reactivación
- ✅ Intentos de login fallidos

**Consulta de auditoría:**

```sql
SELECT 
    a.fecha_hora,
    a.accion,
    a.descripcion,
    u.nombre as usuario_afectado,
    e.nombre as ejecutor,
    a.ip_address
FROM auditoria_usuarios a
LEFT JOIN usuarios u ON a.usuario_id = u.id
LEFT JOIN usuarios e ON a.usuario_ejecutor_id = e.id
WHERE a.usuario_id = 123
ORDER BY a.fecha_hora DESC
LIMIT 50;
```

---

## 8. API Endpoints

### 8.1. Autenticación

#### `POST /api/auth/login`

Iniciar sesión.

**Request:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "mensaje": "Login exitoso",
  "usuario": {
    "id": 123,
    "nombre": "Juan Pérez",
    "email": "usuario@ejemplo.com",
    "rol": "SUPERVISOR",
    "departamento": "Mantenimiento",
    "requiere_cambio_password": false
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6...",
    "expiresIn": "2025-11-14T15:00:00Z",
    "tokenType": "Bearer"
  },
  "sesion_id": 456
}
```

**Errores:**
- `401 Unauthorized` - Credenciales inválidas
- `403 Forbidden` - Usuario inactivo o bloqueado

---

#### `POST /api/auth/logout`

Cerrar sesión.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "mensaje": "Sesión cerrada exitosamente"
}
```

---

#### `POST /api/auth/refresh`

Refrescar access token.

**Request:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "mensaje": "Token refrescado exitosamente",
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6...",
    "expiresIn": "2025-11-14T16:00:00Z",
    "tokenType": "Bearer"
  }
}
```

**Errores:**
- `401 Unauthorized` - Refresh token inválido o expirado

---

#### `GET /api/auth/me`

Obtener información del usuario autenticado.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "usuario": {
    "id": 123,
    "nombre": "Juan Pérez",
    "email": "usuario@ejemplo.com",
    "numero_empleado": "EMP001",
    "departamento": "Mantenimiento",
    "telefono": "+52 624 123 4567",
    "rol_nombre": "SUPERVISOR",
    "activo": true,
    "ultimo_acceso": "2025-11-14T14:30:00Z",
    "requiere_cambio_password": false
  }
}
```

---

### 8.2. Gestión de Usuarios (Solo ADMIN)

#### `GET /api/usuarios`

Listar todos los usuarios.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "usuarios": [
    {
      "id": 123,
      "nombre": "Juan Pérez",
      "email": "juan@ejemplo.com",
      "rol": "SUPERVISOR",
      "departamento": "Mantenimiento",
      "activo": true,
      "fecha_registro": "2025-01-15T10:00:00Z"
    }
  ]
}
```

---

#### `POST /api/usuarios`

Crear nuevo usuario.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "nombre": "María González",
  "email": "maria@ejemplo.com",
  "password": "temporal123",
  "rol_id": 3,
  "numero_empleado": "EMP002",
  "departamento": "Limpieza",
  "telefono": "+52 624 987 6543",
  "requiere_cambio_password": true
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "mensaje": "Usuario creado exitosamente",
  "usuario": {
    "id": 124,
    "nombre": "María González",
    "email": "maria@ejemplo.com",
    "rol": "TECNICO",
    "requiere_cambio_password": true
  }
}
```

---

#### `PUT /api/usuarios/:id`

Actualizar usuario existente.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "nombre": "María González López",
  "telefono": "+52 624 111 2222",
  "departamento": "Mantenimiento"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "mensaje": "Usuario actualizado exitosamente"
}
```

---

#### `POST /api/usuarios/:id/bloquear`

Bloquear usuario.

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```json
{
  "motivo": "Incumplimiento de normas",
  "duracion_horas": 24
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "mensaje": "Usuario bloqueado exitosamente"
}
```

---

#### `POST /api/usuarios/:id/desbloquear`

Desbloquear usuario.

**Response (200 OK):**
```json
{
  "success": true,
  "mensaje": "Usuario desbloqueado exitosamente"
}
```

---

#### `GET /api/usuarios/:id/sesiones`

Historial de sesiones de un usuario.

**Response (200 OK):**
```json
{
  "success": true,
  "sesiones": [
    {
      "id": 456,
      "fecha_login": "2025-11-14T10:00:00Z",
      "fecha_logout": "2025-11-14T18:00:00Z",
      "ip_address": "192.168.1.100",
      "dispositivo": "Desktop",
      "navegador": "Chrome",
      "sistema_operativo": "Windows",
      "duracion_minutos": 480,
      "activa": false
    }
  ]
}
```

---

## 9. Frontend: Flujo de Autenticación

### 9.1. Login (`login.html`)

**Formulario HTML:**

```html
<form id="loginForm">
    <input type="email" id="emailInput" placeholder="Email" required>
    <input type="password" id="passwordInput" placeholder="Contraseña" required>
    <div class="checkbox-wrapper">
        <input type="checkbox" id="rememberMe">
        <label for="rememberMe">Recordar sesión</label>
    </div>
    <button type="submit">Iniciar Sesión</button>
</form>
```

**JavaScript (`login.js`):**

```javascript
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Guardar tokens
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('accessToken', data.tokens.accessToken);
            storage.setItem('refreshToken', data.tokens.refreshToken);
            storage.setItem('currentUser', JSON.stringify(data.usuario));
            
            // Redirigir
            if (data.usuario.requiere_cambio_password) {
                window.location.href = 'cambiar-password.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            alert(data.mensaje || 'Error al iniciar sesión');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}
```

### 9.2. Verificación de Autenticación (`app.js`)

```javascript
async function checkAuthentication() {
    const accessToken = localStorage.getItem('accessToken') || 
                        sessionStorage.getItem('accessToken');
    const currentUser = JSON.parse(
        localStorage.getItem('currentUser') || 
        sessionStorage.getItem('currentUser') || 
        'null'
    );
    
    if (!accessToken || !currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    
    // Verificar requiere cambio de password
    if (currentUser.requiere_cambio_password) {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        const data = await response.json();
        if (data.usuario.requiere_cambio_password) {
            window.location.href = 'login.html?forcePassword=1';
            return false;
        }
    }
    
    AppState.currentUser = currentUser;
    updateUserInfo();
    applyRolePermissions(currentUser.rol.toLowerCase());
    
    return true;
}
```

### 9.3. Requests Autenticados

```javascript
async function fetchWithAuth(url, options = {}) {
    const accessToken = localStorage.getItem('accessToken') || 
                        sessionStorage.getItem('accessToken');
    
    if (!accessToken) {
        window.location.href = 'login.html';
        throw new Error('No hay sesión activa');
    }
    
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
    };
    
    const response = await fetch(url, { ...options, headers });
    
    // Si el token expiró, intentar refrescar
    if (response.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
            // Reintentar con nuevo token
            const newAccessToken = localStorage.getItem('accessToken');
            headers['Authorization'] = `Bearer ${newAccessToken}`;
            return await fetch(url, { ...options, headers });
        } else {
            window.location.href = 'login.html';
        }
    }
    
    return response;
}

// Uso
const response = await fetchWithAuth('/api/usuarios');
const data = await response.json();
```

### 9.4. Logout

```javascript
async function logout() {
    if (!confirm('¿Está seguro que desea cerrar sesión?')) {
        return;
    }
    
    try {
        const refreshToken = localStorage.getItem('refreshToken') || 
                            sessionStorage.getItem('refreshToken');
        
        if (refreshToken) {
            await fetchWithAuth(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                body: JSON.stringify({ refreshToken })
            });
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    } finally {
        clearAuthData();
        window.location.href = 'login.html';
    }
}

function clearAuthData() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('currentUser');
}
```

---

## 10. Casos de Uso

### 10.1. Caso: Crear Usuario Nuevo

**Actor:** Administrador

**Flujo:**

1. Admin abre pestaña "Usuarios"
2. Click en "Nuevo Usuario"
3. Completa formulario:
   - Nombre: "Carlos Ramírez"
   - Email: "carlos@ejemplo.com"
   - Rol: TÉCNICO
   - Número Empleado: EMP003
   - Departamento: Mantenimiento
   - Password temporal: "temp123"
   - ✅ Requiere cambio de password
4. Click "Guardar"
5. Sistema:
   - Valida datos
   - Hash de password con bcrypt
   - Inserta en `usuarios`
   - Registra en `auditoria_usuarios`
   - Envía notificación al usuario
6. Carlos recibe credenciales y accede al sistema
7. Al hacer login, se le fuerza cambio de password

---

### 10.2. Caso: Login con Bloqueo por Intentos Fallidos

**Actor:** Usuario

**Flujo:**

1. Usuario intenta login con password incorrecta (Intento 1)
   - Sistema: `intentos_fallidos = 1`
2. Intenta nuevamente con password incorrecta (Intento 2-4)
   - Sistema: `intentos_fallidos = 4`
3. Intenta por quinta vez con password incorrecta (Intento 5)
   - Sistema:
     - `intentos_fallidos = 5`
     - `bloqueado_hasta = NOW() + 30 minutos`
     - Registra en `auditoria_usuarios`
4. Usuario intenta login nuevamente
   - Sistema responde: "Usuario bloqueado por múltiples intentos fallidos"
5. Usuario espera 30 minutos
6. Usuario hace login con password correcta
   - Sistema:
     - `intentos_fallidos = 0`
     - `bloqueado_hasta = NULL`
     - Login exitoso

---

### 10.3. Caso: Sesión con Refresh Token

**Actor:** Usuario Supervisor

**Flujo:**

1. Usuario hace login (10:00 AM)
   - Access Token expira a las 11:00 AM
   - Refresh Token expira en 7 días
2. Usuario trabaja normalmente (10:30 AM)
   - Cada request usa Access Token
3. Usuario sigue trabajando (11:05 AM)
   - Access Token expirado
   - Sistema detecta 401
   - Automáticamente usa Refresh Token
   - Obtiene nuevo Access Token válido por 1h
4. Usuario continúa trabajando sin interrupción
5. Usuario hace logout (6:00 PM)
   - Sesión se marca como `activa = FALSE`
   - Se registra `fecha_logout`

---

### 10.4. Caso: Auditoría de Cambios

**Actor:** Administrador

**Flujo:**

1. Admin abre perfil de usuario "Carlos Ramírez"
2. Click en "Ver Historial de Cambios"
3. Sistema muestra tabla de auditoría:

| Fecha                | Acción              | Ejecutor        | Descripción                    |
|----------------------|---------------------|-----------------|--------------------------------|
| 2025-11-14 14:30:00 | cambio_password     | Carlos Ramírez  | Cambio de password obligatorio |
| 2025-11-14 10:00:00 | registro            | Admin Principal | Usuario registrado en sistema  |

4. Admin puede exportar auditoría a Excel
5. Admin puede filtrar por tipo de acción o rango de fechas

---

## 📚 Referencias

- **JWT:** https://jwt.io/
- **bcrypt:** https://www.npmjs.com/package/bcrypt
- **PostgreSQL Crypto:** https://www.postgresql.org/docs/current/pgcrypto.html
- **Express.js:** https://expressjs.com/
- **MDN Web Docs - Fetch API:** https://developer.mozilla.org/es/docs/Web/API/Fetch_API

---

## 📝 Historial de Cambios

| Versión | Fecha      | Autor          | Cambios                                    |
|---------|------------|----------------|--------------------------------------------|
| 2.0     | 2025-11-14 | Leonardo Cruz  | Documentación completa del sistema JWT     |
| 1.5     | 2025-11-13 | Leonardo Cruz  | Implementación de sesiones y auditoría     |
| 1.0     | 2025-11-11 | Leonardo Cruz  | Esquema inicial de usuarios y roles        |

---

**Fin del documento técnico**
