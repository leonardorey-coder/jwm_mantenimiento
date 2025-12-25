# Sistema de Permisos de Usuarios

## Resumen General

El sistema de mantenimiento JW Marriott implementa un control de acceso basado en roles (RBAC) con tres niveles de usuario:

| Rol            | Descripción                                           |
| -------------- | ----------------------------------------------------- |
| **ADMIN**      | Administrador con acceso total al sistema             |
| **SUPERVISOR** | Supervisor con acceso a reportes y gestión de equipos |
| **TECNICO**    | Técnico de mantenimiento con acceso limitado          |

---

## Estructura de Roles en Base de Datos

### Tabla `roles`

```sql
CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text,
    permisos jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
```

### Permisos JSON por Rol

```javascript
// ADMIN - Acceso total
{
    "all": true,
    "usuarios": true,
    "exportar_excel": true,
    "habitaciones": true,
    "espacios": true,
    "tareas": true,
    "checklist": true,
    "sabanas": true,
    "alertas": true
}

// SUPERVISOR - Sin gestión de usuarios
{
    "all": false,
    "usuarios": false,
    "exportar_excel": true,
    "habitaciones": true,
    "espacios": true,
    "tareas": true,
    "checklist": true,
    "sabanas": true,
    "alertas": true
}

// TECNICO - Sin usuarios ni exportación
{
    "all": false,
    "usuarios": false,
    "exportar_excel": false,
    "habitaciones": true,
    "espacios": true,
    "tareas": true,
    "checklist": true,
    "sabanas": false,
    "alertas": true
}
```

---

## Matriz de Permisos por Funcionalidad

### Navegación y Pestañas

| Funcionalidad                | ADMIN | SUPERVISOR | TECNICO |
| ---------------------------- | :---: | :--------: | :-----: |
| Pestaña Inicio               |  ✅   |     ✅     |   ✅    |
| Pestaña Habitaciones         |  ✅   |     ✅     |   ✅    |
| Pestaña Espacios Comunes     |  ✅   |     ✅     |   ✅    |
| Pestaña Tareas               |  ✅   |     ✅     |   ✅    |
| Pestaña Checklist/Inspección |  ✅   |     ✅     |   ✅    |
| Pestaña Sábanas              |  ✅   |     ✅     |   ✅    |
| **Pestaña Usuarios**         |  ✅   |     ❌     |   ❌    |

### Gestión de Usuarios

| Acción                 | ADMIN | SUPERVISOR | TECNICO |
| ---------------------- | :---: | :--------: | :-----: |
| Ver lista de usuarios  |  ✅   |     ❌     |   ❌    |
| Crear usuario          |  ✅   |     ❌     |   ❌    |
| Editar usuario         |  ✅   |     ❌     |   ❌    |
| Desactivar usuario     |  ✅   |     ❌     |   ❌    |
| Reactivar usuario      |  ✅   |     ❌     |   ❌    |
| Desbloquear usuario    |  ✅   |     ❌     |   ❌    |
| Cambiar rol de usuario |  ✅   |     ❌     |   ❌    |

### Exportación de Datos

| Acción                     | ADMIN | SUPERVISOR | TECNICO |
| -------------------------- | :---: | :--------: | :-----: |
| Exportar Sábana a Excel    |  ✅   |     ✅     |   ❌    |
| Exportar Checklist a Excel |  ✅   |     ✅     |   ❌    |
| Archivar períodos          |  ✅   |     ❌     |   ❌    |

### Gestión de Tareas

| Acción                            | ADMIN | SUPERVISOR | TECNICO  |
| --------------------------------- | :---: | :--------: | :------: |
| Ver todas las tareas              |  ✅   |     ✅     |    ✅    |
| Crear tarea                       |  ✅   |     ✅     |    ✅    |
| Editar tarea (cualquier estado)   |  ✅   |    ✅\*    |  ❌\*\*  |
| Editar tarea pendiente/en proceso |  ✅   |    ✅\*    | ✅\*\*\* |
| Eliminar tarea                    |  ✅   |    ✅\*    |    ❌    |

> \* Supervisor no puede editar tareas asignadas a ADMIN  
> \*\* Técnico ve el botón pero recibe modal de advertencia  
> \*\*\* Solo tareas asignadas a rol TECNICO

### Gestión de Servicios/Mantenimientos

| Acción                     | ADMIN | SUPERVISOR | TECNICO |
| -------------------------- | :---: | :--------: | :-----: |
| Ver servicios              |  ✅   |     ✅     |   ✅    |
| Crear servicio             |  ✅   |     ✅     |   ✅    |
| Editar servicio            |  ✅   |     ✅     |   ✅    |
| Cambiar estado de servicio |  ✅   |     ✅     |   ✅    |

### Alertas Programadas

| Acción                 | ADMIN | SUPERVISOR | TECNICO |
| ---------------------- | :---: | :--------: | :-----: |
| Ver alertas pendientes |  ✅   |     ✅     |   ✅    |
| Ver alertas emitidas   |  ✅   |     ✅     |   ✅    |
| Crear alerta           |  ✅   |     ✅     |   ✅    |
| Editar alerta          |  ✅   |     ✅     |   ✅    |

---

## Implementación en Frontend

### Clases CSS para Control de Visibilidad

```html
<!-- Solo visible para ADMIN -->
<element class="admin-only">...</element>

<!-- Visible para ADMIN y SUPERVISOR -->
<element class="supervisor-only">...</element>
```

### Función de Aplicación de Permisos

**Archivo:** `js/app.js` y `views/checklist/checklist-tab.js`

```javascript
function applyRolePermissions(role) {
  // Agregar clase al body según el rol
  document.body.classList.add(role);

  // Manejar elementos admin-only (solo admin)
  if (role === 'admin') {
    document.querySelectorAll('.admin-only').forEach((el) => {
      if (!el.classList.contains('tab-content')) {
        el.style.display =
          el.tagName === 'A' || el.tagName === 'BUTTON' ? 'flex' : 'block';
      }
    });
  } else {
    document.querySelectorAll('.admin-only').forEach((el) => {
      if (!el.classList.contains('tab-content')) {
        el.style.display = 'none';
      }
    });
  }

  // Manejar elementos supervisor-only (admin y supervisor pueden ver)
  if (role === 'admin' || role === 'supervisor') {
    document.querySelectorAll('.supervisor-only').forEach((el) => {
      el.style.display =
        el.tagName === 'A' || el.tagName === 'BUTTON' ? 'flex' : 'block';
    });
  } else {
    // Técnico: ocultar elementos de supervisor
    document.querySelectorAll('.supervisor-only').forEach((el) => {
      el.style.display = 'none';
    });
  }
}
```

---

## Implementación en Backend

### Middlewares de Autenticación

**Archivo:** `api/auth.js`

```javascript
// Verificar que el usuario esté autenticado
function verificarAutenticacion(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  // Verificar y decodificar JWT...
  next();
}

// Verificar que el usuario sea administrador
function verificarAdmin(req, res, next) {
  const rolesAdmin = ['ADMIN', 'admin', 'Administrador'];
  if (!rolesAdmin.includes(req.usuario?.rol)) {
    return res.status(403).json({
      mensaje: 'Se requieren permisos de administrador',
    });
  }
  next();
}

// Verificar que el usuario sea supervisor o admin
function verificarSupervisor(req, res, next) {
  const rolesPermitidos = ['ADMIN', 'SUPERVISOR'];
  if (!rolesPermitidos.includes(req.usuario?.rol?.toUpperCase())) {
    return res.status(403).json({
      mensaje: 'Se requieren permisos de supervisor o administrador',
    });
  }
  next();
}
```

### Rutas Protegidas

```javascript
// Solo ADMIN puede acceder
app.get('/api/auth/usuarios', verificarAutenticacion, verificarAdmin, ...);
app.post('/api/usuarios', verificarAutenticacion, verificarAdmin, ...);
app.put('/api/usuarios/:id', verificarAutenticacion, verificarAdmin, ...);
app.post('/api/usuarios/:id/desactivar', verificarAutenticacion, verificarAdmin, ...);

// ADMIN y SUPERVISOR pueden acceder
app.get('/api/reportes/exportar', verificarAutenticacion, verificarSupervisor, ...);
```

---

## Lógica Especial para Tareas

### Función para Determinar si Mostrar Botón Editar

**Archivo:** `views/tareas/tareas-module.js`

```javascript
function puedeEditarTarea(tarea) {
  const rolUsuario = obtenerRolUsuarioActual();

  // Admin puede editar todo
  if (rolUsuario === 'admin') {
    return true;
  }

  // Supervisor puede editar todo excepto tareas de admin
  if (rolUsuario === 'supervisor') {
    return tarea.asignado_a_rol_nombre !== 'ADMIN';
  }

  // Técnico puede VER el botón si la tarea está asignada a técnicos
  // El modal de advertencia se muestra al hacer clic si está completada/cancelada
  if (rolUsuario === 'tecnico') {
    return tarea.asignado_a_rol_nombre === 'TECNICO';
  }

  return false;
}
```

### Validación al Abrir Modal de Edición

```javascript
async function abrirModalEditarTarea(tareaId) {
  const tarea = await fetch(`/api/tareas/${tareaId}`).then((r) => r.json());
  const rolUsuario = obtenerRolUsuarioActual();

  // Si es técnico y la tarea está completada o cancelada, mostrar advertencia
  if (
    rolUsuario === 'tecnico' &&
    (tarea.estado === 'completada' || tarea.estado === 'cancelada')
  ) {
    mostrarModalAdvertenciaEdicion();
    return;
  }

  // Continuar con la edición normal...
  await poblarFormularioEdicion(tarea);
  modal.style.display = 'flex';
}
```

### Modal de Advertencia para Técnicos

```html
<div id="modalAdvertenciaEdicion" class="modal-detalles">
  <div class="modal-detalles-contenido">
    <h3>No se puede editar esta tarea</h3>
    <i class="fas fa-exclamation-triangle"></i>
    <p>Esta tarea está completada o cancelada</p>
    <p>Contacta a administrador o supervisor para realizar cambios.</p>
    <button data-close-advertencia-modal>Entendido</button>
  </div>
</div>
```

---

## Obtención del Rol del Usuario

### Función Normalizada

**Archivo:** `views/tareas/tareas-module.js`

```javascript
function obtenerRolUsuarioActual() {
  let userRole = null;

  // Intentar obtener desde AppState
  if (window.AppState && window.AppState.currentUser) {
    userRole =
      window.AppState.currentUser.role || window.AppState.currentUser.rol;
  }

  // Si no está en AppState, intentar desde localStorage/sessionStorage
  if (!userRole) {
    const storedUser = JSON.parse(
      localStorage.getItem('currentUser') ||
        sessionStorage.getItem('currentUser') ||
        'null'
    );
    if (storedUser) {
      userRole = storedUser.role || storedUser.rol;
    }
  }

  // Normalizar el rol
  const roleMap = {
    admin: 'admin',
    ADMIN: 'admin',
    Administrador: 'admin',
    supervisor: 'supervisor',
    SUPERVISOR: 'supervisor',
    Supervisor: 'supervisor',
    tecnico: 'tecnico',
    TECNICO: 'tecnico',
    Técnico: 'tecnico',
  };

  return roleMap[userRole] || userRole?.toLowerCase() || null;
}
```

---

## Flujo de Autenticación y Permisos

```
┌─────────────────────────────────────────────────────────────┐
│                         LOGIN                                │
│  Usuario ingresa credenciales                                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    VALIDACIÓN JWT                            │
│  Backend verifica credenciales y genera token                │
│  Token incluye: { id, email, rol, nombre }                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              ALMACENAMIENTO EN CLIENTE                       │
│  - localStorage.currentUser (sesión persistente)             │
│  - sessionStorage.currentUser (solo sesión actual)           │
│  - window.AppState.currentUser (memoria)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              APLICACIÓN DE PERMISOS                          │
│  applyRolePermissions(role)                                  │
│  - Agregar clase al body (admin/supervisor/tecnico)          │
│  - Mostrar/ocultar elementos .admin-only                     │
│  - Mostrar/ocultar elementos .supervisor-only                │
└─────────────────────────────────────────────────────────────┘
```

---

## Buenas Prácticas de Seguridad

1. **Validación en Backend**: Nunca confiar solo en la validación del frontend. Todas las rutas sensibles deben tener middleware de autenticación y autorización.

2. **Tokens JWT**: Los tokens tienen tiempo de expiración y se refrescan automáticamente.

3. **Normalización de Roles**: Siempre normalizar los roles a minúsculas para comparaciones consistentes.

4. **Principio de Menor Privilegio**: Los técnicos tienen acceso mínimo necesario para realizar su trabajo.

5. **Auditoría**: Todas las acciones críticas (cambios de usuario, estados de tareas) se registran en la tabla `auditoria_usuarios`.

---

## Archivos Relacionados

| Archivo                            | Descripción                                           |
| ---------------------------------- | ----------------------------------------------------- |
| `api/auth.js`                      | Middlewares de autenticación y autorización           |
| `api/auth-routes.js`               | Rutas de autenticación (login, logout, refresh)       |
| `js/app.js`                        | Función `applyRolePermissions()` principal            |
| `views/checklist/checklist-tab.js` | Permisos en módulo checklist                          |
| `views/tareas/tareas-module.js`    | Permisos en módulo tareas                             |
| `js/sabana-functions.js`           | Permisos para exportación de sábanas                  |
| `db/postgres-manager.js`           | Definición de roles en BD                             |
| `index.html`                       | Elementos con clases `admin-only` y `supervisor-only` |

---

_Última actualización: Diciembre 2025_
