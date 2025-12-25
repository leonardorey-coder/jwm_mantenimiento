# Módulo de Usuarios - Manual Técnico

## 1. Descripción General

El módulo de **Usuarios** gestiona la administración de usuarios del sistema, incluyendo la creación, edición, activación/desactivación y gestión de roles y permisos.

### Características principales:

- CRUD completo de usuarios
- Gestión de roles (Admin, Supervisor, Técnico)
- Activación/Desactivación de cuentas
- Bloqueo/Desbloqueo de usuarios
- Reseteo de contraseñas
- Historial de sesiones
- Auditoría de acciones

## 2. Estructura de Archivos

```
├── views/
│   └── usuarios/
│       └── usuarios-styles.css     # Estilos del módulo
├── views/
│   └── checklist/
│       └── checklist-tab.js        # Incluye lógica de usuarios
├── api/
│   ├── index.js                    # Endpoints de usuarios
│   └── auth-routes.js              # Rutas de autenticación
├── db/
│   ├── postgres-manager.js         # Gestor de BD
│   └── mejora_usuarios_sesiones.sql # Migración de usuarios
├── css/
│   ├── style-users.css             # Estilos generales
│   └── style-users-blocked.css     # Estilos para bloqueados
```

## 3. API Endpoints

### 3.1 Obtener Usuarios

```
GET /api/auth/usuarios?includeInactive=true
Authorization: Bearer <token>
```

**Requiere rol:** ADMIN

**Response:**

```json
[
  {
    "id": 1,
    "nombre": "Fidel Cruz Lozada",
    "email": "fcruz@grupodiestra.com",
    "numero_empleado": "ADM-001",
    "telefono": "+52 624 237 1065",
    "departamento": "Administración General",
    "rol_id": 1,
    "rol_nombre": "ADMIN",
    "activo": true,
    "bloqueado_hasta": null,
    "intentos_fallidos": 0,
    "fecha_baja": null,
    "ultimo_acceso": "2025-11-30T10:00:00.000Z",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
]
```

### 3.2 Obtener Roles

```
GET /api/usuarios/roles
Authorization: Bearer <token>
```

**Requiere rol:** ADMIN

**Response:**

```json
[
    { "id": 1, "nombre": "ADMIN", "permisos": {...} },
    { "id": 2, "nombre": "SUPERVISOR", "permisos": {...} },
    { "id": 3, "nombre": "TECNICO", "permisos": {...} }
]
```

### 3.3 Crear Usuario

```
POST /api/usuarios
Authorization: Bearer <token>
```

**Requiere rol:** ADMIN

**Request Body:**

```json
{
  "nombre": "Nuevo Usuario",
  "email": "nuevo@jwmarriott.com",
  "password": "contraseña123",
  "rol_id": 3,
  "numero_empleado": "TEC-002",
  "departamento": "Mantenimiento",
  "telefono": "+52 624 XXX XXXX"
}
```

### 3.4 Actualizar Usuario

```
PUT /api/usuarios/:id
Authorization: Bearer <token>
```

**Requiere rol:** ADMIN

**Request Body:**

```json
{
  "nombre": "Nombre Actualizado",
  "email": "actualizado@jwmarriott.com",
  "rol_id": 2,
  "departamento": "Supervisión",
  "telefono": "+52 624 XXX XXXX"
}
```

### 3.5 Desactivar Usuario

```
POST /api/usuarios/:id/desactivar
Authorization: Bearer <token>
```

**Requiere rol:** ADMIN

**Request Body:**

```json
{
  "motivo": "Baja voluntaria"
}
```

### 3.6 Reactivar Usuario

```
POST /api/usuarios/:id/activar
Authorization: Bearer <token>
```

**Requiere rol:** ADMIN

### 3.7 Desbloquear Usuario

```
POST /api/usuarios/:id/desbloquear
Authorization: Bearer <token>
```

**Requiere rol:** ADMIN

## 4. Roles del Sistema

| Rol        | ID  | Descripción   | Permisos Principales                 |
| ---------- | --- | ------------- | ------------------------------------ |
| ADMIN      | 1   | Administrador | Acceso total al sistema              |
| SUPERVISOR | 2   | Supervisor    | Gestión de operaciones, ver reportes |
| TECNICO    | 3   | Técnico       | Operaciones de mantenimiento         |

## 5. Estados de Usuario

| Estado       | Campo                              | Descripción        |
| ------------ | ---------------------------------- | ------------------ |
| Activo       | `activo = true, fecha_baja = null` | Usuario operativo  |
| Inactivo     | `activo = false`                   | Cuenta desactivada |
| Dado de baja | `fecha_baja IS NOT NULL`           | Baja definitiva    |
| Bloqueado    | `bloqueado_hasta > NOW()`          | Bloqueo temporal   |

## 6. Base de Datos

### 6.1 Tabla Usuarios

```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INTEGER REFERENCES roles(id),
    numero_empleado VARCHAR(50),
    departamento VARCHAR(100),
    telefono VARCHAR(20),
    foto_perfil_url TEXT,
    activo BOOLEAN DEFAULT TRUE,
    bloqueado_hasta TIMESTAMP,
    intentos_fallidos INTEGER DEFAULT 0,
    requiere_cambio_password BOOLEAN DEFAULT FALSE,
    ultimo_cambio_password TIMESTAMP,
    ultimo_acceso TIMESTAMP,
    fecha_baja TIMESTAMP,
    motivo_baja TEXT,
    dado_baja_por INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6.2 Tabla Roles

```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    permisos JSONB DEFAULT '{}',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6.3 Tabla Sesiones de Usuarios

```sql
CREATE TABLE sesiones_usuarios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    token_sesion VARCHAR(255),
    jwt_token TEXT,
    refresh_token VARCHAR(255),
    jwt_expiracion TIMESTAMP,
    refresh_expiracion TIMESTAMP,
    ip_address VARCHAR(50),
    user_agent TEXT,
    dispositivo VARCHAR(50),
    navegador VARCHAR(50),
    sistema_operativo VARCHAR(50),
    activa BOOLEAN DEFAULT TRUE,
    fecha_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_logout TIMESTAMP,
    cerrada_por VARCHAR(50)
);
```

### 6.4 Tabla Auditoría de Usuarios

```sql
CREATE TABLE auditoria_usuarios (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    accion VARCHAR(100) NOT NULL,
    descripcion TEXT,
    ip_address VARCHAR(50),
    detalles JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 6.5 Tabla Historial de Contraseñas

```sql
CREATE TABLE historial_passwords (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    password_hash VARCHAR(255) NOT NULL,
    cambiado_por_admin BOOLEAN DEFAULT FALSE,
    motivo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 7. Funciones de Base de Datos

### 7.1 Hashear Contraseña

```sql
CREATE OR REPLACE FUNCTION hashear_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;
```

### 7.2 Verificar Contraseña

```sql
CREATE OR REPLACE FUNCTION verificar_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;
```

## 8. Modal de Usuario

### 8.1 Estado del Modal

```javascript
const UsuarioModalState = {
  initialized: false,
  modal: null,
  form: null,
  feedback: null,
  fields: {
    id: null,
    nombre: null,
    email: null,
    password: null,
    rol: null,
    departamento: null,
    telefono: null,
    numeroEmpleado: null,
  },
  title: null,
  keydownHandler: null,
};
```

### 8.2 Estructura HTML

```html
<div class="modal-usuario" id="modalUsuario">
  <div class="modal-content">
    <div class="modal-header">
      <h3 id="modalUsuarioTitle">Nuevo Usuario</h3>
      <button class="close-btn" onclick="cerrarModalUsuario()">×</button>
    </div>
    <form id="formUsuario">
      <div class="form-group">
        <label>Nombre Completo</label>
        <input type="text" id="usuarioNombre" required />
      </div>
      <div class="form-group">
        <label>Correo Electrónico</label>
        <input type="email" id="usuarioEmail" required />
      </div>
      <div class="form-group">
        <label>Contraseña</label>
        <input type="password" id="usuarioPassword" />
      </div>
      <div class="form-group">
        <label>Rol</label>
        <select id="usuarioRol" required>
          <option value="">Seleccionar...</option>
          <option value="1">Administrador</option>
          <option value="2">Supervisor</option>
          <option value="3">Técnico</option>
        </select>
      </div>
      <div class="form-group">
        <label>Departamento</label>
        <input type="text" id="usuarioDepartamento" />
      </div>
      <div class="form-group">
        <label>Teléfono</label>
        <input type="tel" id="usuarioTelefono" />
      </div>
      <div class="form-group">
        <label>Número de Empleado</label>
        <input type="text" id="usuarioNumeroEmpleado" />
      </div>
      <div class="form-feedback" id="usuarioFeedback"></div>
      <div class="form-actions">
        <button type="button" onclick="cerrarModalUsuario()">Cancelar</button>
        <button type="submit">Guardar</button>
      </div>
    </form>
  </div>
</div>
```

## 9. Tarjeta de Usuario

```html
<div class="usuario-card" data-usuario-id="1">
  <div class="usuario-avatar">
    <i class="fas fa-user-shield"></i>
  </div>
  <div class="usuario-info">
    <h4 class="usuario-nombre">Fidel Cruz Lozada</h4>
    <span class="usuario-rol rol-admin">Administrador</span>
    <span class="usuario-email">fcruz@grupodiestra.com</span>
    <span class="usuario-departamento">Administración General</span>
  </div>
  <div class="usuario-meta">
    <span class="usuario-empleado">ADM-001</span>
    <span class="usuario-sesiones">
      <i class="fas fa-clock"></i> Última sesión: 30/11/2025
    </span>
  </div>
  <div class="usuario-acciones">
    <button onclick="editarUsuario(1)">
      <i class="fas fa-edit"></i>
    </button>
    <button onclick="desactivarUsuario(1)">
      <i class="fas fa-user-slash"></i>
    </button>
  </div>
</div>
```

## 10. Usuarios por Defecto (Mock)

```javascript
const DEFAULT_USUARIOS = [
  {
    id: 'usr-admin-1',
    nombre: 'Fidel Cruz Lozada',
    rol: 'admin',
    avatarIcon: 'fa-user-shield',
    email: 'fcruz@grupodiestra.com',
    telefono: '+52 624 237 1065',
    departamento: '# Administración General',
    numeroEmpleado: 'ADM-001',
    ultimoAcceso: 'Sin registro',
    ultimaSesion: '13 nov 2025, 6:56 p.m.',
    sesiones: { total: 9, activas: 2 },
    activo: true,
  },
  // ...más usuarios
];
```

## 11. Iconos por Rol

| Rol        | Icono Font Awesome |
| ---------- | ------------------ |
| ADMIN      | `fa-user-shield`   |
| SUPERVISOR | `fa-user-tie`      |
| TECNICO    | `fa-user-cog`      |

## 12. Paginación

```javascript
const USUARIOS_POR_PAGINA = 4;
```

## 13. Funciones Principales

### 13.1 Cargar Usuarios

```javascript
async function cargarUsuarios()
```

### 13.2 Renderizar Lista

```javascript
function renderUsuarios(usuarios)
```

### 13.3 Abrir Modal de Creación

```javascript
function abrirModalNuevoUsuario()
```

### 13.4 Abrir Modal de Edición

```javascript
async function editarUsuario(usuarioId)
```

### 13.5 Guardar Usuario

```javascript
async function guardarUsuario(event)
```

### 13.6 Desactivar Usuario

```javascript
async function desactivarUsuario(usuarioId)
```

### 13.7 Activar Usuario

```javascript
async function activarUsuario(usuarioId)
```

### 13.8 Desbloquear Usuario

```javascript
async function desbloquearUsuario(usuarioId)
```

## 14. Validaciones

### 14.1 Email

- Formato válido de correo electrónico
- Único en el sistema

### 14.2 Contraseña

- Mínimo 8 caracteres
- Requerida solo en creación

### 14.3 Campos Requeridos

- Nombre
- Email
- Rol

## 15. Códigos de Error

| Código | Descripción                   |
| ------ | ----------------------------- |
| 400    | Datos inválidos o incompletos |
| 404    | Usuario no encontrado         |
| 409    | Email ya existe (duplicado)   |
| 500    | Error interno del servidor    |

## 16. Mensajes de Feedback

```javascript
function mostrarFeedbackUsuario(mensaje, tipo) {
  const feedback = document.getElementById('usuarioFeedback');
  feedback.textContent = mensaje;
  feedback.className = `form-feedback ${tipo}`;
  feedback.style.display = 'block';
}
// tipos: 'success', 'error', 'warning', 'info'
```

## 17. CSS Clases Importantes

| Clase                           | Descripción         |
| ------------------------------- | ------------------- |
| `.usuario-card`                 | Tarjeta de usuario  |
| `.usuario-avatar`               | Avatar con icono    |
| `.rol-admin/supervisor/tecnico` | Colores por rol     |
| `.usuario-inactivo`             | Usuario desactivado |
| `.usuario-bloqueado`            | Usuario bloqueado   |
| `.modal-usuario`                | Modal de edición    |
| `.form-feedback`                | Área de mensajes    |

## 18. Seguridad

- Solo administradores pueden gestionar usuarios
- Las contraseñas se hashean con bcrypt
- Los tokens JWT expiran en 8 horas
- Bloqueo automático después de 5 intentos fallidos
- Auditoría de todas las acciones
