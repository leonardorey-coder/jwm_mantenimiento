/**
 * Módulo de Autenticación JWT
 * Sistema: JW Marriott - Sistema de Mantenimiento
 * Implementa JWT para autenticación de usuarios
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'jwm_mant_secret_key_2025_change_in_production';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '8h'; // 8 horas (aumentado para desarrollo)
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '7d'; // 7 días

/**
 * Genera un token JWT para un usuario
 * @param {Object} usuario - Datos del usuario
 * @returns {Object} { token, expiration }
 */
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

    // Calcular fecha de expiración
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 8); // 8 horas

    return {
        token,
        expiration
    };
}

/**
 * Genera un refresh token único
 * @returns {Object} { token, expiration }
 */
function generarRefreshToken() {
    const token = crypto.randomBytes(64).toString('hex');

    // Calcular fecha de expiración (7 días)
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7);

    return {
        token,
        expiration
    };
}

/**
 * Verifica y decodifica un token JWT
 * @param {string} token - Token JWT
 * @returns {Object|null} Payload del token o null si es inválido
 */
function verificarJWT(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'jwm-mantenimiento',
            audience: 'jwm-users'
        });
        return decoded;
    } catch (error) {
        return null;
    }
}

/**
 * Middleware para verificar autenticación JWT
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next middleware
 */
function verificarAutenticacion(req, res, next) {
    // Obtener token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'No autorizado',
            mensaje: 'Token de autenticación no proporcionado'
        });
    }

    const token = authHeader.substring(7); // Remover "Bearer "
    const decoded = verificarJWT(token);

    if (!decoded) {
        return res.status(401).json({
            error: 'No autorizado',
            mensaje: 'Token de autenticación inválido o expirado'
        });
    }

    // Agregar datos del usuario al request
    req.usuario = decoded;
    next();
}

/**
 * Middleware para verificar rol de administrador
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next middleware
 */
function verificarAdmin(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({
            error: 'No autorizado',
            mensaje: 'Se requiere autenticación'
        });
    }

    if (req.usuario.rol_nombre !== 'ADMIN') {
        return res.status(403).json({
            error: 'Prohibido',
            mensaje: 'Se requieren permisos de administrador'
        });
    }

    next();
}

/**
 * Middleware para verificar rol de supervisor o superior
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next middleware
 */
function verificarSupervisor(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({
            error: 'No autorizado',
            mensaje: 'Se requiere autenticación'
        });
    }

    const rolesPermitidos = ['ADMIN', 'SUPERVISOR'];
    if (!rolesPermitidos.includes(req.usuario.rol_nombre)) {
        return res.status(403).json({
            error: 'Prohibido',
            mensaje: 'Se requieren permisos de supervisor o administrador'
        });
    }

    next();
}

/**
 * Extrae información del user agent
 * @param {string} userAgent - User agent del navegador
 * @returns {Object} Información del dispositivo
 */
function extraerInfoDispositivo(userAgent) {
    if (!userAgent) {
        return {
            dispositivo: 'Desconocido',
            navegador: 'Desconocido',
            sistema_operativo: 'Desconocido'
        };
    }

    // Detectar dispositivo
    let dispositivo = 'Desktop';
    if (/mobile/i.test(userAgent)) {
        dispositivo = 'Mobile';
    } else if (/tablet/i.test(userAgent)) {
        dispositivo = 'Tablet';
    }

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
    } else if (/MSIE|Trident/i.test(userAgent)) {
        navegador = 'Internet Explorer';
    }

    // Detectar sistema operativo
    let sistema_operativo = 'Desconocido';
    if (/Windows/i.test(userAgent)) {
        sistema_operativo = 'Windows';
    } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
        sistema_operativo = 'macOS';
    } else if (/Linux/i.test(userAgent)) {
        sistema_operativo = 'Linux';
    } else if (/Android/i.test(userAgent)) {
        sistema_operativo = 'Android';
    } else if (/iOS|iPhone|iPad/i.test(userAgent)) {
        sistema_operativo = 'iOS';
    }

    return {
        dispositivo,
        navegador,
        sistema_operativo
    };
}

/**
 * Obtiene la IP real del cliente
 * @param {Object} req - Request de Express
 * @returns {string} IP del cliente
 */
function obtenerIPCliente(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        'unknown';
}

module.exports = {
    generarJWT,
    generarRefreshToken,
    verificarJWT,
    verificarAutenticacion,
    verificarAdmin,
    verificarSupervisor,
    extraerInfoDispositivo,
    obtenerIPCliente,
    JWT_SECRET,
    JWT_EXPIRATION,
    REFRESH_TOKEN_EXPIRATION
};
