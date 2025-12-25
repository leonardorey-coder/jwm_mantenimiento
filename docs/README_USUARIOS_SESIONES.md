# Sistema de Gestión de Usuarios, Sesiones y Auditoría

## 📋 Descripción General

Este módulo mejora significativamente el sistema de registro y control de personal del JW Marriott, implementando un sistema completo de:

- **Sign-in (Registro)**: Registro de nuevos empleados en el sistema
- **Sign-out (Baja)**: Baja de empleados sin eliminar datos históricos
- **Login**: Inicio de sesión de usuarios
- **Logout**: Cierre de sesión de usuarios
- **Auditoría completa**: Registro de todas las acciones sobre usuarios
- **Sesiones**: Control detallado de todas las sesiones activas e históricas

## 🗄️ Estructura de Tablas

### 1. Tabla `usuarios` (Mejorada)

Tabla principal de usuarios del sistema con campos adicionales:

#### Campos Nuevos:

| Campo                      | Tipo         | Descripción                               |
| -------------------------- | ------------ | ----------------------------------------- |
| `fecha_registro`           | TIMESTAMP    | Fecha de registro (sign-in) del empleado  |
| `fecha_baja`               | TIMESTAMP    | Fecha de baja (sign-out) del empleado     |
| `motivo_baja`              | TEXT         | Razón de la baja del empleado             |
| `usuario_baja_id`          | INTEGER      | Admin que dio de baja al usuario          |
| `telefono`                 | VARCHAR(20)  | Teléfono del empleado                     |
| `departamento`             | VARCHAR(100) | Departamento del empleado                 |
| `numero_empleado`          | VARCHAR(50)  | Número único de empleado                  |
| `foto_perfil_url`          | TEXT         | URL de la foto del empleado               |
| `ultimo_cambio_password`   | TIMESTAMP    | Última modificación de contraseña         |
| `requiere_cambio_password` | BOOLEAN      | Si debe cambiar password en próximo login |
| `intentos_fallidos`        | INTEGER      | Contador de intentos fallidos de login    |
| `bloqueado_hasta`          | TIMESTAMP    | Fecha hasta la cual está bloqueado        |
| `notas_admin`              | TEXT         | Notas administrativas internas            |

#### Campos Existentes Actualizados:

| Campo           | Tipo      | Descripción                          |
| --------------- | --------- | ------------------------------------ |
| `activo`        | BOOLEAN   | Estado del usuario (activo/inactivo) |
| `ultimo_acceso` | TIMESTAMP | Última vez que hizo login exitoso    |

### 2. Tabla `sesiones_usuarios` (Nueva)

Registra todas las sesiones de login/logout de los usuarios.

| Campo                  | Tipo         | Descripción                                              |
| ---------------------- | ------------ | -------------------------------------------------------- |
| `id`                   | SERIAL       | ID único de la sesión                                    |
| `usuario_id`           | INTEGER      | Usuario de la sesión                                     |
| `token_sesion`         | VARCHAR(255) | Token único de sesión                                    |
| `fecha_login`          | TIMESTAMP    | Momento del login                                        |
| `fecha_logout`         | TIMESTAMP    | Momento del logout                                       |
| `ip_address`           | VARCHAR(45)  | Dirección IP del usuario                                 |
| `user_agent`           | TEXT         | User agent del navegador                                 |
| `dispositivo`          | VARCHAR(200) | Tipo de dispositivo                                      |
| `sistema_operativo`    | VARCHAR(100) | SO del dispositivo                                       |
| `navegador`            | VARCHAR(100) | Navegador utilizado                                      |
| `ubicacion_geografica` | VARCHAR(255) | Ubicación geográfica (opcional)                          |
| `duracion_minutos`     | INTEGER      | Duración total de la sesión                              |
| `activa`               | BOOLEAN      | Si la sesión sigue activa                                |
| `cerrada_por`          | VARCHAR(20)  | Cómo se cerró (usuario/sistema/admin/timeout/expiracion) |
| `notas`                | TEXT         | Notas adicionales                                        |

### 3. Tabla `auditoria_usuarios` (Nueva)

Registro completo de auditoría de todas las acciones sobre usuarios.

| Campo                 | Tipo        | Descripción                   |
| --------------------- | ----------- | ----------------------------- |
| `id`                  | SERIAL      | ID único del registro         |
| `usuario_id`          | INTEGER     | Usuario afectado              |
| `accion`              | VARCHAR(50) | Tipo de acción realizada      |
| `descripcion`         | TEXT        | Descripción de la acción      |
| `datos_anteriores`    | JSONB       | Estado anterior (JSON)        |
| `datos_nuevos`        | JSONB       | Estado nuevo (JSON)           |
| `usuario_ejecutor_id` | INTEGER     | Usuario que ejecutó la acción |
| `ip_address`          | VARCHAR(45) | IP desde donde se ejecutó     |
| `fecha_hora`          | TIMESTAMP   | Momento de la acción          |

#### Tipos de Acciones Auditadas:

- `registro`: Nuevo usuario registrado (sign-in)
- `actualizacion`: Datos del usuario actualizados
- `baja`: Usuario dado de baja (sign-out)
- `reactivacion`: Usuario reactivado
- `cambio_password`: Contraseña modificada
- `cambio_rol`: Rol cambiado
- `cambio_permisos`: Permisos modificados
- `bloqueo`: Usuario bloqueado
- `desbloqueo`: Usuario desbloqueado
- `intento_login_fallido`: Intento fallido de login

### 4. Tabla `historial_passwords` (Nueva)

Historial de contraseñas para prevenir reutilización.

| Campo                | Tipo         | Descripción               |
| -------------------- | ------------ | ------------------------- |
| `id`                 | SERIAL       | ID único                  |
| `usuario_id`         | INTEGER      | Usuario                   |
| `password_hash`      | VARCHAR(255) | Hash de la contraseña     |
| `fecha_cambio`       | TIMESTAMP    | Fecha del cambio          |
| `cambiado_por_admin` | BOOLEAN      | Si fue forzado por admin  |
| `admin_id`           | INTEGER      | Admin que forzó el cambio |
| `motivo`             | TEXT         | Motivo del cambio         |

## 📊 Vistas Útiles

### 1. `vista_usuarios_activos`

Lista de usuarios activos con información de sesiones.

```sql
SELECT * FROM vista_usuarios_activos;
```

**Columnas:**

- Información básica del usuario
- Total de sesiones
- Última sesión login/logout
- Sesiones activas actuales

### 2. `vista_usuarios_inactivos`

Lista de usuarios dados de baja con información de la baja.

```sql
SELECT * FROM vista_usuarios_inactivos;
```

**Columnas:**

- Información del usuario
- Fecha y motivo de baja
- Usuario que realizó la baja

### 3. `vista_sesiones_activas`

Sesiones actualmente abiertas en el sistema.

```sql
SELECT * FROM vista_sesiones_activas;
```

**Columnas:**

- Usuario y rol
- Fecha de login
- Información del dispositivo
- Minutos activa

### 4. `vista_actividad_reciente`

Actividad reciente de auditoría.

```sql
SELECT * FROM vista_actividad_reciente;
```

## 🔧 Funciones Útiles

### 1. `obtener_estadisticas_usuarios()`

Obtiene estadísticas generales del sistema de usuarios.

```sql
SELECT * FROM obtener_estadisticas_usuarios();
```

**Retorna:**

- Total de usuarios
- Usuarios activos/inactivos
- Usuarios bloqueados
- Sesiones activas
- Total de sesiones hoy
- Promedio de sesiones por usuario

### 2. `dar_baja_usuario(usuario_id, motivo, admin_id)`

Da de baja a un usuario de forma segura.

```sql
SELECT dar_baja_usuario(5, 'Renuncia voluntaria', 1);
```

**Acciones:**

- Marca usuario como inactivo
- Registra fecha y motivo de baja
- Cierra todas sus sesiones activas
- Registra auditoría automáticamente

### 3. `reactivar_usuario(usuario_id, admin_id)`

Reactiva un usuario dado de baja.

```sql
SELECT reactivar_usuario(5, 1);
```

**Acciones:**

- Marca usuario como activo
- Limpia fecha y motivo de baja
- Resetea intentos fallidos
- Desbloquea si estaba bloqueado

## 🔄 Triggers Automáticos

### 1. `trigger_auditoria_usuarios`

Se ejecuta automáticamente en INSERT/UPDATE de usuarios para registrar auditoría.

### 2. `trigger_duracion_sesion`

Calcula automáticamente la duración de una sesión cuando se cierra (logout).

### 3. `trigger_actualizar_ultimo_acceso`

Actualiza el campo `ultimo_acceso` cuando se crea una nueva sesión (login).

## 📝 Flujos de Trabajo

### Flujo de Sign-in (Registro de Empleado)

```sql
-- 1. Crear nuevo usuario
INSERT INTO usuarios (
    nombre, email, password_hash, rol_id,
    numero_empleado, departamento, telefono
) VALUES (
    'Juan Pérez', 'juan.perez@jwmarriott.com',
    '$2b$10$...', 3,
    'EMP-001', 'Mantenimiento', '555-1234'
);

-- Automáticamente:
-- - Se registra en auditoria_usuarios con accion='registro'
-- - Se establece fecha_registro
-- - Se establece activo=TRUE
```

### Flujo de Login

```sql
-- 1. Crear sesión
INSERT INTO sesiones_usuarios (
    usuario_id, token_sesion, ip_address,
    dispositivo, navegador, sistema_operativo
) VALUES (
    5, 'unique-token-123', '192.168.1.100',
    'Desktop', 'Chrome', 'Windows 10'
);

-- Automáticamente:
-- - Se actualiza usuarios.ultimo_acceso
-- - Se resetea usuarios.intentos_fallidos
-- - Se establece sesiones_usuarios.activa=TRUE
```

### Flujo de Logout

```sql
-- 1. Cerrar sesión
UPDATE sesiones_usuarios
SET
    fecha_logout = CURRENT_TIMESTAMP,
    cerrada_por = 'usuario'
WHERE token_sesion = 'unique-token-123';

-- Automáticamente:
-- - Se calcula duracion_minutos
-- - Se establece activa=FALSE
```

### Flujo de Sign-out (Baja de Empleado)

```sql
-- Usar función de baja
SELECT dar_baja_usuario(
    5,                           -- usuario_id
    'Fin de contrato',          -- motivo
    1                            -- admin_id
);

-- Automáticamente:
-- - Se marca activo=FALSE
-- - Se registra fecha_baja
-- - Se cierra todas las sesiones activas
-- - Se registra en auditoría con accion='baja'
```

### Flujo de Reactivación

```sql
-- Reactivar usuario
SELECT reactivar_usuario(
    5,  -- usuario_id
    1   -- admin_id
);

-- Automáticamente:
-- - Se marca activo=TRUE
-- - Se limpia fecha_baja y motivo_baja
-- - Se resetea intentos_fallidos y bloqueado_hasta
-- - Se registra en auditoría con accion='reactivacion'
```

## 🔒 Características de Seguridad

### 1. Bloqueo por Intentos Fallidos

El sistema puede bloquear usuarios automáticamente después de varios intentos fallidos:

```sql
-- Incrementar intentos fallidos
UPDATE usuarios
SET intentos_fallidos = intentos_fallidos + 1
WHERE id = 5;

-- Bloquear si excede límite (ej. 5 intentos)
UPDATE usuarios
SET bloqueado_hasta = CURRENT_TIMESTAMP + INTERVAL '30 minutes'
WHERE id = 5 AND intentos_fallidos >= 5;
```

### 2. Historial de Contraseñas

Previene reutilización de contraseñas anteriores:

```sql
-- Al cambiar contraseña, guardar en historial
INSERT INTO historial_passwords (
    usuario_id, password_hash
) VALUES (5, '$2b$10$...');
```

### 3. No se Eliminan Datos

**IMPORTANTE**: Los usuarios NUNCA se eliminan de la base de datos. Solo se marcan como inactivos:

- Preserva integridad referencial
- Mantiene historial completo
- Permite auditorías futuras
- Posibilita reactivación

## 📈 Consultas Útiles

### Usuarios Activos Hoy

```sql
SELECT u.nombre, u.email, COUNT(s.id) as sesiones_hoy
FROM usuarios u
LEFT JOIN sesiones_usuarios s ON u.id = s.usuario_id
    AND DATE(s.fecha_login) = CURRENT_DATE
WHERE u.activo = TRUE
GROUP BY u.id, u.nombre, u.email
ORDER BY sesiones_hoy DESC;
```

### Sesiones Más Largas

```sql
SELECT
    u.nombre,
    s.fecha_login,
    s.fecha_logout,
    s.duracion_minutos
FROM sesiones_usuarios s
LEFT JOIN usuarios u ON s.usuario_id = u.id
WHERE s.duracion_minutos IS NOT NULL
ORDER BY s.duracion_minutos DESC
LIMIT 10;
```

### Usuarios Bloqueados

```sql
SELECT
    nombre, email, intentos_fallidos,
    bloqueado_hasta,
    bloqueado_hasta - CURRENT_TIMESTAMP as tiempo_restante
FROM usuarios
WHERE bloqueado_hasta > CURRENT_TIMESTAMP;
```

### Auditoría de un Usuario

```sql
SELECT
    fecha_hora, accion, descripcion,
    ejecutor_nombre, ip_address
FROM vista_actividad_reciente
WHERE usuario_id = 5
ORDER BY fecha_hora DESC;
```

## 🚀 Instalación

Para aplicar estas mejoras a la base de datos existente:

```bash
# Conectar a PostgreSQL
psql -U postgres -d jwm_mantenimiento

# Ejecutar script de mejora
\i db/mejora_usuarios_sesiones.sql
```

## ⚠️ Consideraciones Importantes

1. **Backups**: Hacer backup antes de ejecutar el script
2. **Transacciones**: El script usa transacciones (BEGIN/COMMIT)
3. **Compatibilidad**: Compatible con esquema existente
4. **Sin Pérdida de Datos**: No elimina datos existentes
5. **Auditoría Automática**: Los triggers se activan automáticamente

## 🔄 Migración de Datos Existentes

Si ya tienes usuarios en el sistema, actualiza sus datos:

```sql
-- Establecer fecha_registro para usuarios existentes
UPDATE usuarios
SET fecha_registro = created_at
WHERE fecha_registro IS NULL;

-- Asignar números de empleado si no tienen
UPDATE usuarios
SET numero_empleado = 'EMP-' || LPAD(id::TEXT, 4, '0')
WHERE numero_empleado IS NULL;
```

## 📚 Documentación Adicional

- [Esquema BD Completo](./ESQUEMA_BD_COMPLETO.md)
- [Migración PostgreSQL](./MIGRACION_POSTGRES.md)
- [API Gestión de Estados](../docs/API_GESTION_ESTADOS.md)

---

**Versión**: 1.0.0  
**Fecha**: 2025-11-13  
**Autor**: Sistema JW Marriott Maintenance
