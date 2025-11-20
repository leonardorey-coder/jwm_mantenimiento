-- ============================================================================
-- MEJORA DE ESQUEMA: USUARIOS, SESIONES Y AUDITORÍA
-- Sistema: JW Mantto - SGSOM
-- Fecha: 2025-11-13
-- Descripción: Mejora el registro de personal con sesiones, login/logout,
--              sign-in (registro), sign-out (baja), y auditoría completa
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MEJORAR TABLA DE USUARIOS
-- ============================================================================

-- Agregar campos adicionales a la tabla usuarios
ALTER TABLE usuarios 
    ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS fecha_baja TIMESTAMP,
    ADD COLUMN IF NOT EXISTS motivo_baja TEXT,
    ADD COLUMN IF NOT EXISTS usuario_baja_id INTEGER,
    ADD COLUMN IF NOT EXISTS telefono VARCHAR(20),
    ADD COLUMN IF NOT EXISTS departamento VARCHAR(100),
    ADD COLUMN IF NOT EXISTS numero_empleado VARCHAR(50) UNIQUE,
    ADD COLUMN IF NOT EXISTS foto_perfil_url TEXT,
    ADD COLUMN IF NOT EXISTS ultimo_cambio_password TIMESTAMP,
    ADD COLUMN IF NOT EXISTS requiere_cambio_password BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS intentos_fallidos INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMP,
    ADD COLUMN IF NOT EXISTS notas_admin TEXT;

-- Crear índices adicionales
CREATE INDEX IF NOT EXISTS idx_usuarios_fecha_registro ON usuarios(fecha_registro DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_fecha_baja ON usuarios(fecha_baja);
CREATE INDEX IF NOT EXISTS idx_usuarios_numero_empleado ON usuarios(numero_empleado);
CREATE INDEX IF NOT EXISTS idx_usuarios_departamento ON usuarios(departamento);
CREATE INDEX IF NOT EXISTS idx_usuarios_bloqueado ON usuarios(bloqueado_hasta) WHERE bloqueado_hasta IS NOT NULL;

-- Agregar clave foránea para usuario que da de baja
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'usuarios_usuario_baja_id_fkey'
    ) THEN
        ALTER TABLE usuarios 
        ADD CONSTRAINT usuarios_usuario_baja_id_fkey 
        FOREIGN KEY (usuario_baja_id) REFERENCES usuarios(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Comentarios en columnas
COMMENT ON COLUMN usuarios.activo IS 'Indica si el usuario está activo en el sistema (no dado de baja)';
COMMENT ON COLUMN usuarios.fecha_registro IS 'Fecha en que el usuario fue registrado (sign-in) en el sistema';
COMMENT ON COLUMN usuarios.fecha_baja IS 'Fecha en que el usuario fue dado de baja (sign-out) del sistema';
COMMENT ON COLUMN usuarios.motivo_baja IS 'Razón por la cual el usuario fue dado de baja';
COMMENT ON COLUMN usuarios.usuario_baja_id IS 'Usuario administrador que dio de baja a este usuario';
COMMENT ON COLUMN usuarios.ultimo_acceso IS 'Última vez que el usuario inició sesión (login) exitosamente';
COMMENT ON COLUMN usuarios.bloqueado_hasta IS 'Fecha hasta la cual el usuario está bloqueado por intentos fallidos';
COMMENT ON COLUMN usuarios.intentos_fallidos IS 'Contador de intentos fallidos de login consecutivos';

-- ============================================================================
-- 2. CREAR TABLA DE SESIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS sesiones_usuarios (
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

-- Índices para sesiones
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario ON sesiones_usuarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones_usuarios(token_sesion);
CREATE INDEX IF NOT EXISTS idx_sesiones_jwt_token ON sesiones_usuarios(jwt_token);
CREATE INDEX IF NOT EXISTS idx_sesiones_refresh_token ON sesiones_usuarios(refresh_token);
CREATE INDEX IF NOT EXISTS idx_sesiones_activa ON sesiones_usuarios(activa) WHERE activa = TRUE;
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha_login ON sesiones_usuarios(fecha_login DESC);
CREATE INDEX IF NOT EXISTS idx_sesiones_fecha_logout ON sesiones_usuarios(fecha_logout DESC);
CREATE INDEX IF NOT EXISTS idx_sesiones_jwt_expiracion ON sesiones_usuarios(jwt_expiracion) WHERE activa = TRUE;

-- Comentarios
COMMENT ON TABLE sesiones_usuarios IS 'Registro completo de todas las sesiones de usuarios (login/logout) con JWT';
COMMENT ON COLUMN sesiones_usuarios.jwt_token IS 'Token JWT para autenticación';
COMMENT ON COLUMN sesiones_usuarios.refresh_token IS 'Token de refresco para renovar JWT';
COMMENT ON COLUMN sesiones_usuarios.jwt_expiracion IS 'Fecha de expiración del JWT';
COMMENT ON COLUMN sesiones_usuarios.refresh_expiracion IS 'Fecha de expiración del refresh token';
COMMENT ON COLUMN sesiones_usuarios.fecha_login IS 'Momento exacto en que el usuario inició sesión (login)';
COMMENT ON COLUMN sesiones_usuarios.fecha_logout IS 'Momento exacto en que el usuario cerró sesión (logout)';
COMMENT ON COLUMN sesiones_usuarios.activa IS 'Indica si la sesión sigue activa';
COMMENT ON COLUMN sesiones_usuarios.duracion_minutos IS 'Duración total de la sesión en minutos';
COMMENT ON COLUMN sesiones_usuarios.cerrada_por IS 'Indica cómo se cerró la sesión';

-- ============================================================================
-- 3. CREAR TABLA DE AUDITORÍA DE USUARIOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS auditoria_usuarios (
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
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_ejecutor_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices para auditoría
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_usuarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_accion ON auditoria_usuarios(accion);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_usuarios(fecha_hora DESC);
CREATE INDEX IF NOT EXISTS idx_auditoria_ejecutor ON auditoria_usuarios(usuario_ejecutor_id);

-- Comentarios
COMMENT ON TABLE auditoria_usuarios IS 'Registro de auditoría de todas las acciones realizadas sobre usuarios';
COMMENT ON COLUMN auditoria_usuarios.accion IS 'Tipo de acción realizada sobre el usuario';
COMMENT ON COLUMN auditoria_usuarios.datos_anteriores IS 'Datos antes de la modificación (formato JSON)';
COMMENT ON COLUMN auditoria_usuarios.datos_nuevos IS 'Datos después de la modificación (formato JSON)';
COMMENT ON COLUMN auditoria_usuarios.usuario_ejecutor_id IS 'Usuario que ejecutó la acción (típicamente un admin)';

-- ============================================================================
-- 4. CREAR TABLA DE HISTORIAL DE PASSWORDS
-- ============================================================================

CREATE TABLE IF NOT EXISTS historial_passwords (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cambiado_por_admin BOOLEAN DEFAULT FALSE,
    admin_id INTEGER,
    motivo TEXT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_historial_passwords_usuario ON historial_passwords(usuario_id);
CREATE INDEX IF NOT EXISTS idx_historial_passwords_fecha ON historial_passwords(fecha_cambio DESC);

-- Comentarios
COMMENT ON TABLE historial_passwords IS 'Historial de cambios de contraseña para prevenir reutilización';
COMMENT ON COLUMN historial_passwords.cambiado_por_admin IS 'Indica si el cambio fue forzado por un administrador';

-- ============================================================================
-- 5. CREAR VISTAS ÚTILES
-- ============================================================================

-- Vista de usuarios activos con última sesión
CREATE OR REPLACE VIEW vista_usuarios_activos AS
SELECT 
    u.id,
    u.numero_empleado,
    u.nombre,
    u.email,
    u.telefono,
    u.departamento,
    r.nombre as rol_nombre,
    u.activo,
    u.fecha_registro,
    u.ultimo_acceso,
    u.intentos_fallidos,
    u.bloqueado_hasta,
    (SELECT COUNT(*) FROM sesiones_usuarios WHERE usuario_id = u.id) as total_sesiones,
    (SELECT fecha_login FROM sesiones_usuarios WHERE usuario_id = u.id ORDER BY fecha_login DESC LIMIT 1) as ultima_sesion_login,
    (SELECT fecha_logout FROM sesiones_usuarios WHERE usuario_id = u.id ORDER BY fecha_logout DESC LIMIT 1) as ultima_sesion_logout,
    (SELECT COUNT(*) FROM sesiones_usuarios WHERE usuario_id = u.id AND activa = TRUE) as sesiones_activas
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
WHERE u.activo = TRUE AND u.fecha_baja IS NULL;

-- Vista de usuarios dados de baja
CREATE OR REPLACE VIEW vista_usuarios_inactivos AS
SELECT 
    u.id,
    u.numero_empleado,
    u.nombre,
    u.email,
    u.departamento,
    r.nombre as rol_nombre,
    u.fecha_registro,
    u.fecha_baja,
    u.motivo_baja,
    ub.nombre as usuario_baja_nombre,
    ub.email as usuario_baja_email
FROM usuarios u
LEFT JOIN roles r ON u.rol_id = r.id
LEFT JOIN usuarios ub ON u.usuario_baja_id = ub.id
WHERE u.activo = FALSE OR u.fecha_baja IS NOT NULL;

-- Vista de sesiones activas
CREATE OR REPLACE VIEW vista_sesiones_activas AS
SELECT 
    s.id,
    s.usuario_id,
    u.nombre as usuario_nombre,
    u.email as usuario_email,
    r.nombre as usuario_rol,
    s.fecha_login,
    s.ip_address,
    s.dispositivo,
    s.navegador,
    s.sistema_operativo,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.fecha_login))/60 as minutos_activa
FROM sesiones_usuarios s
LEFT JOIN usuarios u ON s.usuario_id = u.id
LEFT JOIN roles r ON u.rol_id = r.id
WHERE s.activa = TRUE
ORDER BY s.fecha_login DESC;

-- Vista de actividad reciente de usuarios
CREATE OR REPLACE VIEW vista_actividad_reciente AS
SELECT 
    a.id,
    a.usuario_id,
    u.nombre as usuario_nombre,
    u.email as usuario_email,
    a.accion,
    a.descripcion,
    a.fecha_hora,
    ue.nombre as ejecutor_nombre,
    a.ip_address
FROM auditoria_usuarios a
LEFT JOIN usuarios u ON a.usuario_id = u.id
LEFT JOIN usuarios ue ON a.usuario_ejecutor_id = ue.id
ORDER BY a.fecha_hora DESC;

-- ============================================================================
-- 6. CREAR FUNCIONES ÚTILES
-- ============================================================================

-- Función para registrar auditoría automáticamente
CREATE OR REPLACE FUNCTION registrar_auditoria_usuario()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_nuevos)
        VALUES (NEW.id, 'registro', 'Usuario registrado en el sistema', 
                row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Detectar tipo de cambio
        IF (OLD.activo = TRUE AND NEW.activo = FALSE) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'baja', 'Usuario dado de baja', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSIF (OLD.activo = FALSE AND NEW.activo = TRUE) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'reactivacion', 'Usuario reactivado', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSIF (OLD.password_hash != NEW.password_hash) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'cambio_password', 'Contraseña cambiada', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSIF (OLD.rol_id != NEW.rol_id) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'cambio_rol', 'Rol modificado', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSIF (OLD.bloqueado_hasta IS NULL AND NEW.bloqueado_hasta IS NOT NULL) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'bloqueo', 'Usuario bloqueado', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSIF (OLD.bloqueado_hasta IS NOT NULL AND NEW.bloqueado_hasta IS NULL) THEN
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'desbloqueo', 'Usuario desbloqueado', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        ELSE
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, datos_anteriores, datos_nuevos)
            VALUES (NEW.id, 'actualizacion', 'Información del usuario actualizada', 
                    row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular duración de sesión al cerrarla
CREATE OR REPLACE FUNCTION calcular_duracion_sesion()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.fecha_logout IS NOT NULL AND OLD.fecha_logout IS NULL) THEN
        NEW.duracion_minutos := EXTRACT(EPOCH FROM (NEW.fecha_logout - NEW.fecha_login))/60;
        NEW.activa := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de usuarios
CREATE OR REPLACE FUNCTION obtener_estadisticas_usuarios()
RETURNS TABLE(
    total_usuarios BIGINT,
    usuarios_activos BIGINT,
    usuarios_inactivos BIGINT,
    usuarios_bloqueados BIGINT,
    sesiones_activas BIGINT,
    total_sesiones_hoy BIGINT,
    promedio_sesiones_por_usuario NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM usuarios) as total_usuarios,
        (SELECT COUNT(*) FROM usuarios WHERE activo = TRUE AND fecha_baja IS NULL) as usuarios_activos,
        (SELECT COUNT(*) FROM usuarios WHERE activo = FALSE OR fecha_baja IS NOT NULL) as usuarios_inactivos,
        (SELECT COUNT(*) FROM usuarios WHERE bloqueado_hasta > CURRENT_TIMESTAMP) as usuarios_bloqueados,
        (SELECT COUNT(*) FROM sesiones_usuarios WHERE activa = TRUE) as sesiones_activas,
        (SELECT COUNT(*) FROM sesiones_usuarios WHERE DATE(fecha_login) = CURRENT_DATE) as total_sesiones_hoy,
        (SELECT ROUND(COUNT(*)::NUMERIC / NULLIF((SELECT COUNT(*) FROM usuarios WHERE activo = TRUE), 0), 2) 
         FROM sesiones_usuarios) as promedio_sesiones_por_usuario;
END;
$$ LANGUAGE plpgsql;

-- Función para dar de baja un usuario
CREATE OR REPLACE FUNCTION dar_baja_usuario(
    p_usuario_id INTEGER,
    p_motivo TEXT,
    p_admin_id INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Actualizar usuario
    UPDATE usuarios 
    SET 
        activo = FALSE,
        fecha_baja = CURRENT_TIMESTAMP,
        motivo_baja = p_motivo,
        usuario_baja_id = p_admin_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_usuario_id;
    
    -- Cerrar todas las sesiones activas
    UPDATE sesiones_usuarios
    SET 
        activa = FALSE,
        fecha_logout = CURRENT_TIMESTAMP,
        cerrada_por = 'admin',
        notas = 'Sesión cerrada por baja de usuario'
    WHERE usuario_id = p_usuario_id AND activa = TRUE;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Función para reactivar un usuario
CREATE OR REPLACE FUNCTION reactivar_usuario(
    p_usuario_id INTEGER,
    p_admin_id INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE usuarios 
    SET 
        activo = TRUE,
        fecha_baja = NULL,
        motivo_baja = NULL,
        usuario_baja_id = NULL,
        intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_usuario_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. CREAR TRIGGERS
-- ============================================================================

-- Trigger para auditoría automática de usuarios
DROP TRIGGER IF EXISTS trigger_auditoria_usuarios ON usuarios;
CREATE TRIGGER trigger_auditoria_usuarios
    AFTER INSERT OR UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION registrar_auditoria_usuario();

-- Trigger para calcular duración de sesión
DROP TRIGGER IF EXISTS trigger_duracion_sesion ON sesiones_usuarios;
CREATE TRIGGER trigger_duracion_sesion
    BEFORE UPDATE OF fecha_logout ON sesiones_usuarios
    FOR EACH ROW
    EXECUTE FUNCTION calcular_duracion_sesion();

-- Trigger para actualizar ultimo_acceso en login
CREATE OR REPLACE FUNCTION actualizar_ultimo_acceso()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE usuarios 
    SET ultimo_acceso = NEW.fecha_login,
        intentos_fallidos = 0
    WHERE id = NEW.usuario_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_ultimo_acceso ON sesiones_usuarios;
CREATE TRIGGER trigger_actualizar_ultimo_acceso
    AFTER INSERT ON sesiones_usuarios
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_ultimo_acceso();

-- ============================================================================
-- 8. POLÍTICAS DE SEGURIDAD (Row Level Security - Opcional)
-- ============================================================================

-- Habilitar RLS en tablas sensibles (comentado por defecto, descomentar si se necesita)
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sesiones_usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE auditoria_usuarios ENABLE ROW LEVEL SECURITY;

-- Crear políticas de ejemplo (descomentar si se usa RLS)
-- CREATE POLICY usuarios_select_policy ON usuarios
--     FOR SELECT
--     USING (activo = TRUE OR id = current_setting('app.current_user_id')::INTEGER);

-- ============================================================================
-- 9. EXTENSIÓN PARA HASHING DE CONTRASEÑAS
-- ============================================================================

-- Instalar extensión pgcrypto para hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Función para hashear contraseñas con bcrypt
CREATE OR REPLACE FUNCTION hashear_password(password_texto TEXT)
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN crypt(password_texto, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- Función para verificar contraseñas
CREATE OR REPLACE FUNCTION verificar_password(password_texto TEXT, password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN password_hash = crypt(password_texto, password_hash);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION hashear_password IS 'Hashea una contraseña usando bcrypt con factor de trabajo 10';
COMMENT ON FUNCTION verificar_password IS 'Verifica si una contraseña coincide con su hash';

-- ============================================================================
-- 10. DATOS INICIALES - USUARIO ADMINISTRADOR
-- ============================================================================

-- Eliminar usuarios admin antiguos si existen
DELETE FROM usuarios WHERE email IN ('admin@jwmarriott.com', 'admin@jwmantto.com');

-- Insertar usuario administrador principal
INSERT INTO usuarios (
    nombre, 
    email, 
    password_hash, 
    rol_id, 
    numero_empleado, 
    departamento, 
    telefono,
    activo,
    fecha_registro,
    created_at
) VALUES (
    'Fidel Cruz Lozada',
    'fcruz@grupodiestra.com',
    hashear_password('fcl1020'),
    (SELECT id FROM roles WHERE nombre = 'ADMIN'),
    'ADM-001',
    'Administración General',
    '+52 624 237 1063',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (email) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    password_hash = EXCLUDED.password_hash,
    numero_empleado = EXCLUDED.numero_empleado,
    departamento = EXCLUDED.departamento,
    telefono = EXCLUDED.telefono,
    activo = TRUE,
    fecha_registro = COALESCE(usuarios.fecha_registro, CURRENT_TIMESTAMP);

-- Actualizar usuarios admin existentes con campos nuevos (si hay otros)
UPDATE usuarios 
SET 
    numero_empleado = COALESCE(numero_empleado, 'ADM-' || LPAD(id::TEXT, 3, '0')),
    departamento = COALESCE(departamento, 'Administración'),
    fecha_registro = COALESCE(fecha_registro, created_at)
WHERE rol_id = (SELECT id FROM roles WHERE nombre = 'ADMIN')
  AND email != 'fcruz@grupodiestra.com';

-- ============================================================================
-- FINALIZAR
-- ============================================================================

COMMIT;

-- Mostrar resumen
SELECT 
    'Mejora de usuarios y sesiones completada' as mensaje,
    (SELECT COUNT(*) FROM usuarios) as total_usuarios,
    (SELECT COUNT(*) FROM sesiones_usuarios) as total_sesiones,
    (SELECT COUNT(*) FROM auditoria_usuarios) as registros_auditoria;

-- Mostrar estadísticas
SELECT * FROM obtener_estadisticas_usuarios();
