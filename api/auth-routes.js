/**
 * Rutas de Autenticación
 * Sistema: JW Marriott - Sistema de Mantenimiento
 * Endpoints para login, logout, registro, recuperación de contraseña
 */

const { Pool } = require('pg');
const {
    generarJWT,
    generarRefreshToken,
    verificarJWT,
    verificarAutenticacion,
    verificarAdmin,
    extraerInfoDispositivo,
    obtenerIPCliente
} = require('./auth');
const { dbConfig } = require('../db/config');

// Configuración de PostgreSQL (usa la configuración centralizada que soporta DATABASE_URL)
const pool = new Pool(dbConfig);

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: 'Datos incompletos',
            mensaje: 'Email y contraseña son requeridos'
        });
    }

    try {
        // Buscar usuario por email
        const userResult = await pool.query(`
            SELECT 
                u.id, u.nombre, u.email, u.password_hash, u.activo, 
                u.bloqueado_hasta, u.intentos_fallidos, u.fecha_baja,
                u.numero_empleado, u.departamento, u.telefono,
                u.requiere_cambio_password,
                r.id as rol_id, r.nombre as rol_nombre, r.permisos
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.email = $1
        `, [email]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Credenciales inválidas',
                mensaje: 'Email o contraseña incorrectos'
            });
        }

        const usuario = userResult.rows[0];

        // Verificar si el usuario está activo
        if (!usuario.activo || usuario.fecha_baja) {
            return res.status(403).json({
                error: 'Usuario inactivo',
                mensaje: 'Esta cuenta ha sido desactivada. Contacte al administrador.',
                contacto: {
                    nombre: 'Fidel Cruz Lozada',
                    email: 'fcruz@grupodiestra.com',
                    telefono: '+52 624 237 1063'
                }
            });
        }

        // Verificar si está bloqueado
        if (usuario.bloqueado_hasta && new Date(usuario.bloqueado_hasta) > new Date()) {
            return res.status(403).json({
                error: 'Usuario bloqueado',
                mensaje: 'Usuario bloqueado por múltiples intentos fallidos',
                bloqueado_hasta: usuario.bloqueado_hasta
            });
        }

        // Verificar contraseña
        const passwordResult = await pool.query(
            'SELECT verificar_password($1, $2) as valido',
            [password, usuario.password_hash]
        );

        if (!passwordResult.rows[0].valido) {
            // Incrementar intentos fallidos
            const intentosFallidos = usuario.intentos_fallidos + 1;
            let bloqueadoHasta = null;

            // Bloquear después de 5 intentos fallidos
            if (intentosFallidos >= 5) {
                bloqueadoHasta = new Date();
                bloqueadoHasta.setMinutes(bloqueadoHasta.getMinutes() + 30); // 30 minutos
            }

            await pool.query(
                'UPDATE usuarios SET intentos_fallidos = $1, bloqueado_hasta = $2 WHERE id = $3',
                [intentosFallidos, bloqueadoHasta, usuario.id]
            );

            // Registrar intento fallido
            await pool.query(`
                INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, ip_address)
                VALUES ($1, 'intento_login_fallido', $2, $3)
            `, [usuario.id, `Intento fallido #${intentosFallidos}`, obtenerIPCliente(req)]);

            return res.status(401).json({
                error: 'Credenciales inválidas',
                mensaje: 'Email o contraseña incorrectos',
                intentos_restantes: Math.max(0, 5 - intentosFallidos)
            });
        }

        // Login exitoso - Generar tokens
        const { token: jwtToken, expiration: jwtExpiration } = generarJWT(usuario);
        const { token: refreshToken, expiration: refreshExpiration } = generarRefreshToken();

        // Extraer información del dispositivo
        const infoDispositivo = extraerInfoDispositivo(req.headers['user-agent']);
        const ipCliente = obtenerIPCliente(req);

        // Crear sesión en la base de datos
        const sessionResult = await pool.query(`
            INSERT INTO sesiones_usuarios (
                usuario_id, token_sesion, jwt_token, refresh_token,
                jwt_expiracion, refresh_expiracion, ip_address, user_agent,
                dispositivo, navegador, sistema_operativo
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id
        `, [
            usuario.id,
            refreshToken, // Usar refresh token como token de sesión
            jwtToken,
            refreshToken,
            jwtExpiration,
            refreshExpiration,
            ipCliente,
            req.headers['user-agent'],
            infoDispositivo.dispositivo,
            infoDispositivo.navegador,
            infoDispositivo.sistema_operativo
        ]);


        // Resetear intentos fallidos
        await pool.query(
            'UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = $1',
            [usuario.id]
        );

        res.json({
            success: true,
            mensaje: 'Login exitoso',
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                numero_empleado: usuario.numero_empleado,
                departamento: usuario.departamento,
                telefono: usuario.telefono,
                rol: usuario.rol_nombre,
                permisos: usuario.permisos,
                requiere_cambio_password: usuario.requiere_cambio_password
            },
            tokens: {
                accessToken: jwtToken,
                refreshToken: refreshToken,
                expiresIn: jwtExpiration,
                tokenType: 'Bearer'
            },
            sesion_id: sessionResult.rows[0].id
        });

    } catch (error) {
        console.error('❌ [AUTH-ROUTES] Error en login:', error);
        console.error('❌ [AUTH-ROUTES] Stack:', error.stack);
        console.error('❌ [AUTH-ROUTES] Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        res.status(500).json({
            error: 'Error del servidor',
            mensaje: 'Error al procesar el login',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
async function logout(req, res) {
    try {
        const { refreshToken } = req.body;
        const usuario = req.usuario; // Del middleware de autenticación

        if (refreshToken) {
            // Cerrar sesión específica por refresh token
            await pool.query(`
                UPDATE sesiones_usuarios 
                SET activa = FALSE, fecha_logout = CURRENT_TIMESTAMP, cerrada_por = 'usuario'
                WHERE refresh_token = $1 AND usuario_id = $2
            `, [refreshToken, usuario.id]);
        } else {
            // Cerrar todas las sesiones activas del usuario
            await pool.query(`
                UPDATE sesiones_usuarios 
                SET activa = FALSE, fecha_logout = CURRENT_TIMESTAMP, cerrada_por = 'usuario'
                WHERE usuario_id = $1 AND activa = TRUE
            `, [usuario.id]);
        }

        res.json({
            success: true,
            mensaje: 'Sesión cerrada exitosamente'
        });

    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({
            error: 'Error del servidor',
            mensaje: 'Error al cerrar sesión'
        });
    }
}

/**
 * POST /api/auth/refresh
 * Refrescar token JWT
 */
async function refresh(req, res) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({
            error: 'Token requerido',
            mensaje: 'Refresh token es requerido'
        });
    }

    try {
        // Buscar sesión por refresh token
        const sessionResult = await pool.query(`
            SELECT 
                s.id, s.usuario_id, s.activa, s.refresh_expiracion,
                u.id as user_id, u.nombre, u.email, u.activo, u.fecha_baja,
                u.numero_empleado, u.departamento,
                r.id as rol_id, r.nombre as rol_nombre, r.permisos
            FROM sesiones_usuarios s
            LEFT JOIN usuarios u ON s.usuario_id = u.id
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE s.refresh_token = $1
        `, [refreshToken]);

        if (sessionResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Token inválido',
                mensaje: 'Refresh token no válido'
            });
        }

        const session = sessionResult.rows[0];

        // Verificar si la sesión está activa
        if (!session.activa) {
            return res.status(401).json({
                error: 'Sesión cerrada',
                mensaje: 'La sesión ha sido cerrada'
            });
        }

        // Verificar si el refresh token expiró
        if (new Date(session.refresh_expiracion) < new Date()) {
            // Cerrar sesión expirada
            await pool.query(
                'UPDATE sesiones_usuarios SET activa = FALSE, cerrada_por = $1 WHERE id = $2',
                ['expiracion', session.id]
            );

            return res.status(401).json({
                error: 'Token expirado',
                mensaje: 'Refresh token ha expirado. Por favor, inicie sesión nuevamente.'
            });
        }

        // Verificar usuario activo
        if (!session.activo || session.fecha_baja) {
            return res.status(403).json({
                error: 'Usuario inactivo',
                mensaje: 'Esta cuenta ha sido desactivada'
            });
        }

        // Generar nuevo JWT
        const { token: newJwtToken, expiration: newJwtExpiration } = generarJWT({
            id: session.user_id,
            email: session.email,
            nombre: session.nombre,
            rol_id: session.rol_id,
            rol_nombre: session.rol_nombre,
            numero_empleado: session.numero_empleado,
            departamento: session.departamento
        });

        // Actualizar JWT en la sesión
        await pool.query(
            'UPDATE sesiones_usuarios SET jwt_token = $1, jwt_expiracion = $2 WHERE id = $3',
            [newJwtToken, newJwtExpiration, session.id]
        );

        res.json({
            success: true,
            mensaje: 'Token refrescado exitosamente',
            tokens: {
                accessToken: newJwtToken,
                refreshToken: refreshToken, // Mismo refresh token
                expiresIn: newJwtExpiration,
                tokenType: 'Bearer'
            }
        });

    } catch (error) {
        console.error('Error en refresh:', error);
        res.status(500).json({
            error: 'Error del servidor',
            mensaje: 'Error al refrescar token'
        });
    }
}

/**
 * GET /api/auth/me
 * Obtener información del usuario autenticado
 */
async function me(req, res) {
    try {
        const usuario = req.usuario; // Del middleware de autenticación

        // Obtener información actualizada del usuario
        const userResult = await pool.query(`
            SELECT 
                u.id, u.nombre, u.email, u.numero_empleado, 
                u.departamento, u.telefono, u.foto_perfil_url,
                u.activo, u.ultimo_acceso, u.created_at,
                u.requiere_cambio_password,
                r.nombre as rol_nombre, r.permisos
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.id = $1
        `, [usuario.id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                mensaje: 'El usuario no existe'
            });
        }

        res.json({
            success: true,
            usuario: userResult.rows[0]
        });

    } catch (error) {
        console.error('Error en me:', error);
        res.status(500).json({
            error: 'Error del servidor',
            mensaje: 'Error al obtener información del usuario'
        });
    }
}

/**
 * GET /api/auth/contacto-admin
 * Obtener información de contacto del administrador
 */
async function contactoAdmin(req, res) {
    try {
        const adminResult = await pool.query(`
            SELECT nombre, email, telefono, departamento
            FROM usuarios
            WHERE email = 'fcruz@grupodiestra.com'
        `);

        if (adminResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Administrador no encontrado',
                mensaje: 'No se encontró información del administrador'
            });
        }

        const admin = adminResult.rows[0];

        res.json({
            success: true,
            administrador: {
                nombre: admin.nombre,
                email: admin.email,
                telefono: admin.telefono,
                departamento: admin.departamento,
                mensaje: 'Para solicitudes de registro, recuperación de contraseña o soporte, contacte al administrador.'
            }
        });

    } catch (error) {
        console.error('Error obteniendo contacto admin:', error);
        res.status(500).json({
            error: 'Error del servidor',
            mensaje: 'Error al obtener contacto del administrador'
        });
    }
}

/**
 * POST /api/auth/solicitar-acceso
 * Enviar solicitud de acceso al administrador
 */
async function solicitarAcceso(req, res) {
    const { nombre, email, telefono, departamento, motivo } = req.body;

    if (!nombre || !email) {
        return res.status(400).json({
            error: 'Datos incompletos',
            mensaje: 'Nombre y email son requeridos'
        });
    }

    try {
        // Aquí podrías implementar envío de email al admin
        // Por ahora, solo registramos en logs
            nombre,
            email,
            telefono,
            departamento,
            motivo,
            fecha: new Date().toISOString()
        });

        res.json({
            success: true,
            mensaje: 'Solicitud enviada exitosamente',
            info: 'Su solicitud ha sido enviada al administrador. Será contactado pronto.',
            contacto: {
                nombre: 'Fidel Cruz Lozada',
                email: 'fcruz@grupodiestra.com',
                telefono: '+52 624 237 1063'
            }
        });

    } catch (error) {
        console.error('Error en solicitud de acceso:', error);
        res.status(500).json({
            error: 'Error del servidor',
            mensaje: 'Error al enviar solicitud'
        });
    }
}

/**
 * POST /api/auth/cambiar-password-obligatorio
 * Permite al usuario actualizar su contraseña cuando es requerida
 */
async function cambiarPasswordObligatorio(req, res) {
    const usuarioId = req.usuario?.id;
    const { passwordActual, nuevoPassword, confirmarPassword } = req.body || {};

    if (!usuarioId) {
        return res.status(401).json({
            error: 'No autorizado',
            mensaje: 'Sesión inválida'
        });
    }

    if (!passwordActual || !nuevoPassword || !confirmarPassword) {
        return res.status(400).json({
            error: 'Datos incompletos',
            mensaje: 'Debes proporcionar la contraseña actual y la nueva contraseña'
        });
    }

    const passwordActualSanitizado = passwordActual.trim();
    const nuevoPasswordSanitizado = nuevoPassword.trim();
    const confirmarPasswordSanitizado = confirmarPassword.trim();

    if (!passwordActualSanitizado || !nuevoPasswordSanitizado || !confirmarPasswordSanitizado) {
        return res.status(400).json({
            error: 'Datos inválidos',
            mensaje: 'Los campos no pueden estar vacíos'
        });
    }

    if (nuevoPasswordSanitizado !== confirmarPasswordSanitizado) {
        return res.status(400).json({
            error: 'Confirmación inválida',
            mensaje: 'La confirmación no coincide con la nueva contraseña'
        });
    }

    if (nuevoPasswordSanitizado.length < 8) {
        return res.status(400).json({
            error: 'Contraseña débil',
            mensaje: 'La nueva contraseña debe tener al menos 8 caracteres'
        });
    }

    try {
        const userResult = await pool.query(`
            SELECT id, password_hash, requiere_cambio_password
            FROM usuarios
            WHERE id = $1
        `, [usuarioId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Usuario no encontrado',
                mensaje: 'No se pudo validar la sesión del usuario'
            });
        }

        const usuario = userResult.rows[0];

        const passwordValido = await pool.query(
            'SELECT verificar_password($1, $2) as valido',
            [passwordActualSanitizado, usuario.password_hash]
        );

        if (!passwordValido.rows[0].valido) {
            return res.status(400).json({
                error: 'Contraseña incorrecta',
                mensaje: 'La contraseña actual no es válida'
            });
        }

        const esIgualAlAnterior = await pool.query(
            'SELECT verificar_password($1, $2) as valido',
            [nuevoPasswordSanitizado, usuario.password_hash]
        );

        if (esIgualAlAnterior.rows[0].valido) {
            return res.status(400).json({
                error: 'Contraseña repetida',
                mensaje: 'La nueva contraseña debe ser diferente a la anterior'
            });
        }

        await pool.query('BEGIN');

        const hashResult = await pool.query(
            'SELECT hashear_password($1) as hash',
            [nuevoPasswordSanitizado]
        );
        const nuevoHash = hashResult.rows[0].hash;

        await pool.query(`
            UPDATE usuarios
            SET password_hash = $1,
                ultimo_cambio_password = CURRENT_TIMESTAMP,
                requiere_cambio_password = FALSE,
                intentos_fallidos = 0,
                bloqueado_hasta = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [nuevoHash, usuarioId]);

        await pool.query(`
            INSERT INTO historial_passwords (usuario_id, password_hash, cambiado_por_admin, motivo)
            VALUES ($1, $2, FALSE, 'Cambio obligatorio completado por el usuario')
        `, [usuarioId, nuevoHash]);

        await pool.query('COMMIT');

        res.json({
            success: true,
            mensaje: 'Contraseña actualizada correctamente'
        });
    } catch (error) {
        console.error('Error al cambiar contraseña obligatoria:', error);
        try {
            await pool.query('ROLLBACK');
        } catch (rollbackError) {
            console.error('Error al hacer rollback:', rollbackError);
        }
        res.status(500).json({
            error: 'Error del servidor',
            mensaje: 'No se pudo actualizar la contraseña. Intenta nuevamente'
        });
    }
}

module.exports = {
    login,
    logout,
    refresh,
    me,
    contactoAdmin,
    solicitarAcceso,
    cambiarPasswordObligatorio
};
