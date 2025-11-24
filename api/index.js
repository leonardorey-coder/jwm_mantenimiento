/**
 * Vercel Serverless Function
 * Este archivo exporta la aplicación Express como función serverless para Vercel
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const PostgresManager = require('../db/postgres-manager');
const { verificarAutenticacion, verificarAdmin, verificarSupervisor } = require('./auth');
const authRoutes = require('./auth-routes');

const app = express();

// Inicializar base de datos PostgreSQL
let postgresManager;
let dbInitialized = false;

const validationMessageRegex = /(requerid|vac[ií]a|contraseñ|cambio|rol|válid|cambios)/i;

function mapUsuarioErrorStatus(error) {
    if (!error) return 500;
    if (error.code === '23505') {
        return 409;
    }
    const message = error.message || '';
    if (message.toLowerCase().includes('no encontrado')) {
        return 404;
    }
    if (validationMessageRegex.test(message)) {
        return 400;
    }
    return 500;
}

function parseBooleanFlag(value) {
    if (value === undefined || value === null) {
        return false;
    }
    return ['true', '1', 'yes', 'si'].includes(value.toString().toLowerCase());
}

// Inicializar la aplicación (solo una vez)
async function initializeApp() {
    if (dbInitialized) {
        return;
    }

    console.log('🚀 Inicializando aplicación en Vercel...');
    console.log('🌐 Entorno:', process.env.NODE_ENV || 'development');

    try {
        console.log('🗄️ Inicializando base de datos PostgreSQL...');
        postgresManager = new PostgresManager();
        await postgresManager.initialize();
        console.log('✅ Base de datos PostgreSQL inicializada correctamente');
        dbInitialized = true;
    } catch (error) {
        console.error('❌ Error inicializando la base de datos:', error);
        console.log('🔄 Continuando sin base de datos PostgreSQL - usando datos mock');
        postgresManager = null;
        dbInitialized = true;
    }
}

// Configuración de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para inicializar DB en cada request (si no está inicializada)
app.use(async (req, res, next) => {
    if (!dbInitialized) {
        await initializeApp();
    }
    next();
});

// ====================================
// DATOS MOCK (cuando no hay base de datos)
// ====================================
const mockData = {
    edificios: [
        { id: 1, nombre: 'Torre A', descripcion: 'Edificio principal' },
        { id: 2, nombre: 'Torre B', descripcion: 'Edificio secundario' }
    ],
    cuartos: [
        { id: 1, numero: '101', nombre: '101', edificio_id: 1, edificio_nombre: 'Torre A', estado: 'ocupado' },
        { id: 2, numero: '102', nombre: '102', edificio_id: 1, edificio_nombre: 'Torre A', estado: 'vacio' },
        { id: 3, numero: '201', nombre: '201', edificio_id: 2, edificio_nombre: 'Torre B', estado: 'mantenimiento' }
    ],
    usuarios: [
        { id: 1, nombre: 'Admin Sistema', email: 'admin@sistema.com', rol_id: 1, rol_nombre: 'ADMIN', departamento: 'Administración' },
        { id: 2, nombre: 'Supervisor Principal', email: 'supervisor@sistema.com', rol_id: 2, rol_nombre: 'SUPERVISOR', departamento: 'Supervisión' },
        { id: 3, nombre: 'Técnico Mantenimiento', email: 'tecnico@sistema.com', rol_id: 3, rol_nombre: 'TECNICO', departamento: 'Mantenimiento' }
    ],
    mantenimientos: [
        {
            id: 1,
            cuarto_id: 1,
            tipo: 'normal',
            descripcion: 'Reparación de aire acondicionado',
            fecha_registro: new Date().toISOString(),
            estado: 'pendiente',
            cuarto_numero: '101',
            cuarto_nombre: '101'
        },
        {
            id: 2,
            cuarto_id: 1,
            tipo: 'rutina',
            descripcion: 'Cambio de filtros programado',
            hora: '14:00:00',
            dia_alerta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            nivel_alerta: 'media',
            fecha_registro: new Date().toISOString(),
            estado: 'pendiente',
            cuarto_numero: '101',
            cuarto_nombre: '101'
        }
    ]
};

// ====================================
// RUTAS DE LA API
// ====================================

// ====================================
// RUTAS DE AUTENTICACIÓN (Públicas)
// ====================================
app.post('/api/auth/login', authRoutes.login);
app.post('/api/auth/refresh', authRoutes.refresh);
app.get('/api/auth/contacto-admin', authRoutes.contactoAdmin);
app.post('/api/auth/solicitar-acceso', authRoutes.solicitarAcceso);
app.post('/api/auth/cambiar-password-obligatorio', verificarAutenticacion, authRoutes.cambiarPasswordObligatorio);

// Rutas protegidas de autenticación
app.post('/api/auth/logout', verificarAutenticacion, authRoutes.logout);
app.get('/api/auth/me', verificarAutenticacion, authRoutes.me);

// ====================================
// RUTAS DE USUARIOS (Solo Admin)
// ====================================
app.get('/api/auth/usuarios', verificarAutenticacion, verificarAdmin, async (req, res) => {
    console.log('📋 [API] GET /api/auth/usuarios - Usuario:', req.usuario?.nombre);
    try {
        if (!postgresManager) {
            console.error('❌ [API] Base de datos no disponible');
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const includeInactive = parseBooleanFlag(req.query.includeInactive);
        const usuarios = await postgresManager.getUsuarios(includeInactive);
        res.json(usuarios);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios', details: error.message });
    }
});

app.get('/api/usuarios/roles', verificarAutenticacion, verificarAdmin, async (req, res) => {
    try {
        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }
        const roles = await postgresManager.getRoles();
        res.json(roles);
    } catch (error) {
        console.error('Error al obtener roles:', error);
        res.status(500).json({ error: 'Error al obtener roles', details: error.message });
    }
});

app.post('/api/usuarios', verificarAutenticacion, verificarAdmin, async (req, res) => {
    try {
        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }
        const nuevoUsuario = await postgresManager.createUsuario(req.body || {});
        res.status(201).json({ success: true, usuario: nuevoUsuario });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        const status = mapUsuarioErrorStatus(error);
        res.status(status).json({ error: error.message || 'Error al crear usuario' });
    }
});

app.put('/api/usuarios/:id', verificarAutenticacion, verificarAdmin, async (req, res) => {
    try {
        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }
        const usuarioActualizado = await postgresManager.updateUsuario(parseInt(req.params.id, 10), req.body || {});
        res.json({ success: true, usuario: usuarioActualizado });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        const status = mapUsuarioErrorStatus(error);
        res.status(status).json({ error: error.message || 'Error al actualizar usuario' });
    }
});

app.post('/api/usuarios/:id/desactivar', verificarAutenticacion, verificarAdmin, async (req, res) => {
    try {
        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const userId = parseInt(req.params.id, 10);
        const motivo = req.body?.motivo || 'Desactivado por administrador';
        const usuario = await postgresManager.darBajaUsuario(userId, motivo, req.usuario.id);
        res.json({ success: true, usuario });
    } catch (error) {
        console.error('Error al desactivar usuario:', error);
        const status = mapUsuarioErrorStatus(error);
        res.status(status).json({ error: error.message || 'Error al desactivar usuario' });
    }
});

app.post('/api/usuarios/:id/activar', verificarAutenticacion, verificarAdmin, async (req, res) => {
    try {
        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const userId = parseInt(req.params.id, 10);
        const usuario = await postgresManager.reactivarUsuario(userId, req.usuario.id);
        res.json({ success: true, usuario });
    } catch (error) {
        console.error('Error al activar usuario:', error);
        const status = mapUsuarioErrorStatus(error);
        res.status(status).json({ error: error.message || 'Error al activar usuario' });
    }
});

app.post('/api/usuarios/:id/desbloquear', verificarAutenticacion, verificarAdmin, async (req, res) => {
    try {
        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const userId = parseInt(req.params.id, 10);
        const usuario = await postgresManager.desbloquearUsuario(userId, req.usuario.id);
        res.json({ success: true, usuario, mensaje: 'Usuario desbloqueado exitosamente' });
    } catch (error) {
        console.error('Error al desbloquear usuario:', error);
        const status = mapUsuarioErrorStatus(error);
        res.status(status).json({ error: error.message || 'Error al desbloquear usuario' });
    }
});

// Ruta raíz de la API - información general
app.get('/api', (req, res) => {
    res.json({
        name: 'JW Mantto API',
        version: '1.2.0',
        status: 'ok',
        endpoints: {
            health: '/api/health',
            auth: {
                login: 'POST /api/auth/login',
                logout: 'POST /api/auth/logout',
                refresh: 'POST /api/auth/refresh',
                me: 'GET /api/auth/me',
                contacto: 'GET /api/auth/contacto-admin',
                solicitar: 'POST /api/auth/solicitar-acceso'
            },
            edificios: '/api/edificios',
            cuartos: '/api/cuartos',
            mantenimientos: '/api/mantenimientos'
        },
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: postgresManager ? 'connected' : 'disconnected',
        environment: process.env.VERCEL ? 'vercel' : 'local'
    });
});

// Obtener edificios
app.get('/api/edificios', async (req, res) => {
    try {
        if (postgresManager) {
            const edificios = await postgresManager.getEdificios();
            res.json(edificios);
        } else {
            console.error('❌ Base de datos no disponible, usando datos mock');
            res.json(mockData.edificios);
        }
    } catch (error) {
        console.error('Error al obtener edificios:', error);
        res.status(500).json({ error: 'Error al obtener edificios', details: error.message });
    }
});

// Obtener usuarios activos con sus roles
app.get('/api/usuarios', async (req, res) => {
    try {
        console.log('📥 GET /api/usuarios - iniciando...');
        if (postgresManager) {
            const query = `
                SELECT u.id, u.nombre, u.email, u.rol_id, u.departamento, r.nombre as rol_nombre
                FROM usuarios u
                LEFT JOIN roles r ON u.rol_id = r.id
                WHERE u.activo = true
                ORDER BY u.nombre
            `;
            const result = await postgresManager.pool.query(query);
            console.log(`✅ Usuarios obtenidos: ${result.rows.length} registros`);
            res.json(result.rows);
        } else {
            console.error('❌ Base de datos no disponible, usando datos mock');
            res.json(mockData.usuarios || []);
        }
    } catch (error) {
        console.error('❌ Error al obtener usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios', details: error.message });
    }
});

// Obtener cuartos
app.get('/api/cuartos', async (req, res) => {
    try {
        console.log('📥 GET /api/cuartos - iniciando...');
        console.log('🗄️ postgresManager:', postgresManager ? 'DISPONIBLE' : 'NO DISPONIBLE');

        if (postgresManager) {
            console.log('🔍 Consultando base de datos...');
            const cuartos = await postgresManager.getCuartos();
            console.log(`✅ Cuartos obtenidos: ${cuartos.length} registros`);
            console.log('📤 Enviando respuesta JSON...');
            res.json(cuartos);
        } else {
            console.error('❌ Base de datos no disponible, usando datos mock');
            res.json(mockData.cuartos);
        }
    } catch (error) {
        console.error('❌ Error al obtener cuartos:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Error al obtener cuartos', details: error.message });
    }
});

// Obtener cuarto específico
app.get('/api/cuartos/:id', async (req, res) => {
    try {
        if (postgresManager) {
            const cuarto = await postgresManager.getCuartoById(req.params.id);
            if (!cuarto) {
                return res.status(404).json({ error: 'Cuarto no encontrado' });
            }
            res.json(cuarto);
        } else {
            const cuarto = mockData.cuartos.find(c => c.id === parseInt(req.params.id));
            if (!cuarto) {
                return res.status(404).json({ error: 'Cuarto no encontrado' });
            }
            res.json(cuarto);
        }
    } catch (error) {
        console.error('Error al obtener cuarto:', error);
        res.status(500).json({ error: 'Error al obtener cuarto', details: error.message });
    }
});

// Actualizar estado del cuarto
app.put('/api/cuartos/:id', async (req, res) => {
    try {
        const cuartoId = parseInt(req.params.id);
        const { estado } = req.body;

        // Validar que el estado sea válido
        const estadosValidos = ['disponible', 'ocupado', 'mantenimiento', 'fuera_servicio'];
        if (!estado || !estadosValidos.includes(estado)) {
            return res.status(400).json({
                error: 'Estado inválido',
                message: `El estado debe ser uno de: ${estadosValidos.join(', ')}`
            });
        }

        console.log(`🔄 Actualizando cuarto ${cuartoId} - nuevo estado: ${estado}`);

        if (postgresManager) {
            const resultado = await postgresManager.updateEstadoCuarto(cuartoId, estado);
            if (!resultado) {
                return res.status(404).json({ error: 'Cuarto no encontrado' });
            }
            console.log('✅ Estado actualizado en base de datos');
            res.json({
                success: true,
                message: 'Estado actualizado correctamente',
                cuarto: resultado
            });
        } else {
            // Modo mock: actualizar en memoria
            const cuarto = mockData.cuartos.find(c => c.id === cuartoId);
            if (!cuarto) {
                return res.status(404).json({ error: 'Cuarto no encontrado' });
            }
            cuarto.estado = estado;
            console.log('✅ Estado actualizado en datos mock');
            res.json({
                success: true,
                message: 'Estado actualizado correctamente',
                cuarto: cuarto
            });
        }
    } catch (error) {
        console.error('❌ Error al actualizar estado del cuarto:', error);
        res.status(500).json({ error: 'Error al actualizar estado', details: error.message });
    }
});

// Obtener mantenimientos
app.get('/api/mantenimientos', async (req, res) => {
    try {
        if (postgresManager) {
            const cuartoId = req.query.cuarto_id;
            const mantenimientos = await postgresManager.getMantenimientos(cuartoId);
            res.json(mantenimientos);
        } else {
            console.error('❌ Base de datos no disponible, usando datos mock');
            let mantenimientos = mockData.mantenimientos;
            if (req.query.cuarto_id) {
                mantenimientos = mantenimientos.filter(m => m.cuarto_id === parseInt(req.query.cuarto_id));
            }
            res.json(mantenimientos);
        }
    } catch (error) {
        console.error('Error al obtener mantenimientos:', error);
        res.status(500).json({ error: 'Error al obtener mantenimientos', details: error.message });
    }
});

// Agregar mantenimiento (requiere autenticación)
app.post('/api/mantenimientos', verificarAutenticacion, async (req, res) => {
    try {
        const {
            cuarto_id,
            descripcion,
            tipo = 'normal',
            hora,
            dia_alerta,
            prioridad = 'media',
            estado = 'pendiente',
            usuario_creador_id,
            usuario_asignado_id,
            tarea_id,  // Asignación de tarea
            notas,
            estado_cuarto
        } = req.body;

        // Usar el usuario del JWT (autenticado) como creador
        const creadorId = req.usuario?.id || usuario_creador_id || 3;

        console.log('📝 Creando mantenimiento:', {
            cuarto_id, descripcion, tipo, hora, dia_alerta, prioridad, estado,
            usuario_creador_id: creadorId, usuario_asignado_id, tarea_id, notas, estado_cuarto,
            usuario_jwt: req.usuario?.nombre
        });

        if (postgresManager) {
            // Determinar fecha_finalizacion si el estado es completado o cancelado
            let fecha_finalizacion = null;
            if (estado === 'completado' || estado === 'cancelado') {
                fecha_finalizacion = new Date();
            }

            // Construir query con los nuevos campos
            const query = `
                INSERT INTO mantenimientos (
                    cuarto_id, descripcion, tipo, hora, dia_alerta, prioridad,
                    estado, usuario_creador_id, usuario_asignado_id, tarea_id, notas,
                    fecha_finalizacion, fecha_creacion
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
                RETURNING *
            `;

            const values = [
                parseInt(cuarto_id),
                descripcion,
                tipo,
                hora || null,
                dia_alerta || null,
                prioridad,
                estado,
                creadorId, // Usuario del JWT autenticado
                usuario_asignado_id ? parseInt(usuario_asignado_id) : null,
                tarea_id ? parseInt(tarea_id) : null,  // Tarea asignada
                notas || null,
                fecha_finalizacion
            ];

            const result = await postgresManager.pool.query(query, values);
            const nuevoMantenimiento = result.rows[0];

            console.log('✅ Mantenimiento creado:', nuevoMantenimiento);

            // Si se proporcionó un estado_cuarto, actualizar el estado del cuarto
            if (estado_cuarto) {
                console.log(`🔄 Actualizando estado del cuarto ${cuarto_id} a: ${estado_cuarto}`);
                await postgresManager.updateEstadoCuarto(parseInt(cuarto_id), estado_cuarto);
            }

            res.status(201).json(nuevoMantenimiento);
        } else {
            // Mock response
            const nuevoMantenimiento = {
                id: mockData.mantenimientos.length + 1,
                cuarto_id: parseInt(cuarto_id),
                descripcion,
                tipo,
                hora: hora || null,
                dia_alerta: dia_alerta || null,
                prioridad: prioridad || 'media',
                fecha_registro: new Date().toISOString(),
                estado: 'pendiente'
            };
            mockData.mantenimientos.push(nuevoMantenimiento);
            res.status(201).json(nuevoMantenimiento);
        }
    } catch (error) {
        console.error('❌ Error al crear mantenimiento:', error);
        res.status(500).json({ error: 'Error al crear mantenimiento', details: error.message });
    }
});

// Actualizar mantenimiento
app.put('/api/mantenimientos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            descripcion,
            hora,
            dia_alerta,
            prioridad,
            estado,
            usuario_asignado_id,
            notas,
            tarea_id
        } = req.body;
        const mantenimientoId = parseInt(id);

        console.log('✏️ Actualizando mantenimiento:', mantenimientoId, { descripcion, hora, dia_alerta, prioridad, estado, usuario_asignado_id, notas, tarea_id });

        if (postgresManager) {
            // Obtener el registro actual para comparar cambios
            const queryActual = 'SELECT estado, dia_alerta, hora FROM mantenimientos WHERE id = $1';
            const resultActual = await postgresManager.pool.query(queryActual, [mantenimientoId]);
            const registroActual = resultActual.rows[0];

            if (!registroActual) {
                return res.status(404).json({ error: 'Mantenimiento no encontrado' });
            }

            const estadoActual = registroActual.estado;

            // Determinar si se debe actualizar fecha_finalizacion
            let fecha_finalizacion = undefined;
            if (estado && (estado === 'completado' || estado === 'cancelado') && estadoActual !== estado) {
                fecha_finalizacion = new Date();
            }

            // Determinar si cambió la fecha o la hora (para resetear alerta_emitida)
            const fechaCambio = dia_alerta !== undefined && registroActual.dia_alerta !== dia_alerta;
            const horaCambio = hora !== undefined && registroActual.hora !== hora;
            const debeResetearAlerta = fechaCambio || horaCambio;

            // Construir query dinámicamente
            const campos = [];
            const valores = [];
            let contador = 1;

            if (descripcion !== undefined) {
                campos.push(`descripcion = $${contador++}`);
                valores.push(descripcion);
            }
            if (hora !== undefined) {
                campos.push(`hora = $${contador++}`);
                valores.push(hora || null);
            }
            if (dia_alerta !== undefined) {
                campos.push(`dia_alerta = $${contador++}`);
                valores.push(dia_alerta || null);
            }
            if (prioridad !== undefined) {
                campos.push(`prioridad = $${contador++}`);
                valores.push(prioridad);
            }
            if (estado !== undefined) {
                campos.push(`estado = $${contador++}`);
                valores.push(estado);
            }
            if (usuario_asignado_id !== undefined) {
                campos.push(`usuario_asignado_id = $${contador++}`);
                valores.push(usuario_asignado_id ? parseInt(usuario_asignado_id) : null);
            }
            if (notas !== undefined) {
                campos.push(`notas = $${contador++}`);
                valores.push(notas || null);
            }
            if (tarea_id !== undefined) {
                campos.push(`tarea_id = $${contador++}`);
                valores.push(tarea_id ? parseInt(tarea_id) : null);
            }
            if (fecha_finalizacion !== undefined) {
                campos.push(`fecha_finalizacion = $${contador++}`);
                valores.push(fecha_finalizacion);
            }

            // Si cambió la fecha o la hora, resetear alerta_emitida a FALSE
            if (debeResetearAlerta) {
                campos.push(`alerta_emitida = $${contador++}`);
                valores.push(false);
                console.log('🔄 Reseteando alerta_emitida a FALSE debido a cambio en fecha/hora');
            }

            if (campos.length > 0) {
                valores.push(mantenimientoId);
                const query = `
                    UPDATE mantenimientos 
                    SET ${campos.join(', ')}
                    WHERE id = $${contador}
                    RETURNING *
                `;

                const result = await postgresManager.pool.query(query, valores);
                console.log('✅ Mantenimiento actualizado:', result.rows[0]);

                res.json({
                    success: true,
                    message: 'Mantenimiento actualizado correctamente',
                    data: result.rows[0]
                });
            } else {
                res.json({
                    success: true,
                    message: 'No hay cambios para actualizar'
                });
            }
        } else {
            // Mock update
            const mantenimiento = mockData.mantenimientos.find(m => m.id === mantenimientoId);
            if (mantenimiento) {
                if (descripcion) mantenimiento.descripcion = descripcion;
                if (hora) mantenimiento.hora = hora;
                if (dia_alerta) mantenimiento.dia_alerta = dia_alerta;
                if (nivel_alerta) mantenimiento.nivel_alerta = nivel_alerta;
            }
            res.json({
                success: true,
                message: 'Mantenimiento actualizado correctamente'
            });
        }

    } catch (error) {
        console.error('❌ Error actualizando mantenimiento:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            details: error.message
        });
    }
});

// Obtener alertas emitidas
app.get('/api/alertas/emitidas', async (req, res) => {
    try {
        const { fecha } = req.query; // Opcional: filtrar por fecha específica

        console.log('📋 Obteniendo alertas emitidas', fecha ? `para fecha: ${fecha}` : '(todas)');

        if (postgresManager) {
            const alertas = await postgresManager.getAlertasEmitidas(fecha || null);
            console.log(`✅ Alertas emitidas encontradas: ${alertas.length}`);
            res.json(alertas);
        } else {
            console.warn('⚠️ postgresManager no disponible, retornando array vacío');
            res.json([]);
        }
    } catch (error) {
        console.error('❌ Error obteniendo alertas emitidas:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: 'Error al obtener alertas emitidas',
            details: error.message,
            stack: error.stack
        });
    }
});

// Obtener alertas pendientes (no emitidas)
app.get('/api/alertas/pendientes', async (req, res) => {
    try {
        console.log('📋 Obteniendo alertas pendientes (no emitidas)');

        if (postgresManager) {
            const alertas = await postgresManager.getAlertasPendientes();
            console.log(`✅ Alertas pendientes encontradas: ${alertas.length}`);
            res.json(alertas);
        } else {
            console.warn('⚠️ postgresManager no disponible, retornando array vacío');
            res.json([]);
        }
    } catch (error) {
        console.error('❌ Error obteniendo alertas pendientes:', error);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: 'Error al obtener alertas pendientes',
            details: error.message,
            stack: error.stack
        });
    }
});

// Marcar alerta como emitida
app.patch('/api/mantenimientos/:id/emitir', async (req, res) => {
    try {
        const { id } = req.params;
        const mantenimientoId = parseInt(id);

        console.log('📢 Marcando alerta como emitida:', mantenimientoId);

        if (postgresManager) {
            await postgresManager.marcarAlertaEmitida(mantenimientoId);

            res.json({
                success: true,
                message: 'Alerta marcada como emitida'
            });
        } else {
            // Mock response
            res.json({
                success: true,
                message: 'Alerta marcada como emitida'
            });
        }

    } catch (error) {
        console.error('❌ Error marcando alerta como emitida:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            details: error.message
        });
    }
});

// Marcar automáticamente alertas pasadas como emitidas
app.post('/api/alertas/marcar-pasadas', async (req, res) => {
    try {
        console.log('🔄 Marcando alertas pasadas como emitidas...');

        if (postgresManager) {
            const count = await postgresManager.marcarAlertasPasadasComoEmitidas();

            res.json({
                success: true,
                message: `${count} alertas pasadas marcadas como emitidas`,
                count
            });
        } else {
            res.json({
                success: true,
                message: 'No hay base de datos disponible',
                count: 0
            });
        }

    } catch (error) {
        console.error('❌ Error marcando alertas pasadas:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            details: error.message
        });
    }
});

// Verificar y reparar columna alerta_emitida (endpoint temporal para debugging)
app.get('/api/debug/verificar-alertas', async (req, res) => {
    try {
        if (!postgresManager || !postgresManager.pool) {
            return res.json({ error: 'No hay conexión a base de datos' });
        }

        // Verificar si existe la columna alerta_emitida
        const checkColumn = await postgresManager.pool.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns 
            WHERE table_name = 'mantenimientos' 
            AND column_name = 'alerta_emitida'
        `);

        if (checkColumn.rows.length === 0) {
            // La columna no existe, crearla
            await postgresManager.pool.query(`
                ALTER TABLE mantenimientos 
                ADD COLUMN alerta_emitida BOOLEAN DEFAULT FALSE
            `);

            return res.json({
                success: true,
                message: 'Columna alerta_emitida creada exitosamente',
                action: 'created'
            });
        } else {
            // Probar la consulta que usa getAlertasEmitidas
            let testQuery = `
                SELECT m.*, c.numero as cuarto_numero, e.nombre as edificio_nombre
                FROM mantenimientos m
                LEFT JOIN cuartos c ON m.cuarto_id = c.id
                LEFT JOIN edificios e ON c.edificio_id = e.id
                WHERE m.tipo = 'rutina'
                AND m.alerta_emitida = TRUE
                ORDER BY m.dia_alerta DESC, m.hora DESC
            `;

            const testResult = await postgresManager.pool.query(testQuery);

            return res.json({
                success: true,
                message: 'Columna alerta_emitida ya existe',
                columnInfo: checkColumn.rows[0],
                testQueryResult: testResult.rows,
                testQueryCount: testResult.rows.length,
                action: 'exists'
            });
        }
    } catch (error) {
        console.error('❌ Error verificando columna:', error);
        res.status(500).json({
            error: 'Error verificando columna',
            details: error.message,
            stack: error.stack
        });
    }
});

// Eliminar mantenimiento
app.delete('/api/mantenimientos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const mantenimientoId = parseInt(id);

        console.log('🗑️ Eliminando mantenimiento:', mantenimientoId);

        if (postgresManager) {
            await postgresManager.deleteMantenimiento(mantenimientoId);

            res.json({
                success: true,
                message: 'Mantenimiento eliminado correctamente'
            });
        } else {
            // Mock delete
            const index = mockData.mantenimientos.findIndex(m => m.id === mantenimientoId);
            if (index > -1) {
                mockData.mantenimientos.splice(index, 1);
            }
            res.json({
                success: true,
                message: 'Mantenimiento eliminado correctamente'
            });
        }

    } catch (error) {
        console.error('❌ Error eliminando mantenimiento:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            details: error.message
        });
    }
});

// ====================================
// RUTAS DE ESPACIOS COMUNES
// ====================================

// Obtener espacios comunes
app.get('/api/espacios-comunes', async (req, res) => {
    try {
        console.log('📥 GET /api/espacios-comunes - iniciando...');

        if (postgresManager) {
            const query = `
                SELECT ec.*, e.nombre as edificio_nombre
                FROM espacios_comunes ec
                LEFT JOIN edificios e ON ec.edificio_id = e.id
                WHERE ec.activo = true
                ORDER BY e.nombre, ec.nombre
            `;
            const result = await postgresManager.pool.query(query);
            console.log(`✅ Espacios comunes obtenidos: ${result.rows.length} registros`);
            res.json(result.rows);
        } else {
            console.error('❌ Base de datos no disponible, usando datos mock');
            const mockEspacios = [
                { id: 1, nombre: 'Lobby Principal', edificio_id: 1, edificio_nombre: 'Torre A', tipo: 'comun', estado: 'disponible' },
                { id: 2, nombre: 'Gimnasio', edificio_id: 1, edificio_nombre: 'Torre A', tipo: 'recreativo', estado: 'disponible' },
                { id: 3, nombre: 'Piscina', edificio_id: 2, edificio_nombre: 'Torre B', tipo: 'recreativo', estado: 'mantenimiento' }
            ];
            res.json(mockEspacios);
        }
    } catch (error) {
        console.error('❌ Error al obtener espacios comunes:', error);
        res.status(500).json({ error: 'Error al obtener espacios comunes', details: error.message });
    }
});

// Obtener espacio común específico
app.get('/api/espacios-comunes/:id', async (req, res) => {
    try {
        if (postgresManager) {
            const query = `
                SELECT ec.*, e.nombre as edificio_nombre
                FROM espacios_comunes ec
                LEFT JOIN edificios e ON ec.edificio_id = e.id
                WHERE ec.id = $1
            `;
            const result = await postgresManager.pool.query(query, [parseInt(req.params.id)]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Espacio común no encontrado' });
            }
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Espacio común no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener espacio común:', error);
        res.status(500).json({ error: 'Error al obtener espacio común', details: error.message });
    }
});

// Actualizar estado del espacio común
app.put('/api/espacios-comunes/:id', async (req, res) => {
    try {
        const espacioId = parseInt(req.params.id);
        const { estado } = req.body;

        const estadosValidos = ['disponible', 'ocupado', 'mantenimiento', 'fuera_servicio'];
        if (!estado || !estadosValidos.includes(estado)) {
            return res.status(400).json({
                error: 'Estado inválido',
                message: `El estado debe ser uno de: ${estadosValidos.join(', ')}`
            });
        }

        console.log(`🔄 Actualizando espacio común ${espacioId} - nuevo estado: ${estado}`);

        if (postgresManager) {
            const query = `
                UPDATE espacios_comunes 
                SET estado = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;
            const result = await postgresManager.pool.query(query, [estado, espacioId]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Espacio común no encontrado' });
            }

            console.log('✅ Estado actualizado en base de datos');
            res.json({
                success: true,
                message: 'Estado actualizado correctamente',
                espacio: result.rows[0]
            });
        } else {
            res.json({
                success: true,
                message: 'Estado actualizado correctamente'
            });
        }
    } catch (error) {
        console.error('❌ Error al actualizar estado del espacio común:', error);
        res.status(500).json({ error: 'Error al actualizar estado', details: error.message });
    }
});

// Obtener mantenimientos de espacios comunes
app.get('/api/mantenimientos/espacios', async (req, res) => {
    try {
        if (postgresManager) {
            const espacioId = req.query.espacio_comun_id;
            let query = `
                SELECT m.*, ec.nombre as espacio_nombre, e.nombre as edificio_nombre
                FROM mantenimientos m
                LEFT JOIN espacios_comunes ec ON m.espacio_comun_id = ec.id
                LEFT JOIN edificios e ON ec.edificio_id = e.id
                WHERE m.espacio_comun_id IS NOT NULL
            `;

            const params = [];
            if (espacioId) {
                query += ' AND m.espacio_comun_id = $1';
                params.push(parseInt(espacioId));
            }

            query += ' ORDER BY m.fecha_creacion DESC';

            const result = await postgresManager.pool.query(query, params);
            res.json(result.rows);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error al obtener mantenimientos de espacios:', error);
        res.status(500).json({ error: 'Error al obtener mantenimientos de espacios', details: error.message });
    }
});

// Agregar mantenimiento a espacio común
app.post('/api/mantenimientos/espacios', verificarAutenticacion, async (req, res) => {
    try {
        const {
            espacio_comun_id,
            descripcion,
            tipo = 'normal',
            hora,
            dia_alerta,
            prioridad = 'media',
            estado = 'pendiente',
            usuario_asignado_id,
            notas,
            estado_espacio
        } = req.body;

        const creadorId = req.usuario?.id || 3;

        console.log('📝 Creando mantenimiento para espacio común:', {
            espacio_comun_id, descripcion, tipo, hora, dia_alerta, prioridad, estado,
            usuario_creador_id: creadorId, usuario_asignado_id, notas, estado_espacio
        });

        if (postgresManager) {
            let fecha_finalizacion = null;
            if (estado === 'completado' || estado === 'cancelado') {
                fecha_finalizacion = new Date();
            }

            const query = `
                INSERT INTO mantenimientos (
                    espacio_comun_id, descripcion, tipo, hora, dia_alerta, prioridad,
                    estado, usuario_creador_id, usuario_asignado_id, notas,
                    fecha_finalizacion, fecha_creacion
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
                RETURNING *
            `;

            const values = [
                parseInt(espacio_comun_id),
                descripcion,
                tipo,
                hora || null,
                dia_alerta || null,
                prioridad,
                estado,
                creadorId,
                usuario_asignado_id ? parseInt(usuario_asignado_id) : null,
                notas || null,
                fecha_finalizacion
            ];

            const result = await postgresManager.pool.query(query, values);
            const nuevoMantenimiento = result.rows[0];

            console.log('✅ Mantenimiento de espacio común creado:', nuevoMantenimiento);

            if (estado_espacio) {
                console.log(`🔄 Actualizando estado del espacio ${espacio_comun_id} a: ${estado_espacio}`);
                await postgresManager.pool.query(
                    'UPDATE espacios_comunes SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                    [estado_espacio, parseInt(espacio_comun_id)]
                );
            }

            res.status(201).json(nuevoMantenimiento);
        } else {
            res.status(201).json({ success: true, message: 'Mantenimiento creado (mock)' });
        }
    } catch (error) {
        console.error('❌ Error al crear mantenimiento de espacio común:', error);
        res.status(500).json({ error: 'Error al crear mantenimiento', details: error.message });
    }
});

// ====================================
// RUTAS DE SÁBANAS
// ====================================

app.post('/api/sabanas', verificarAutenticacion, async (req, res) => {
    try {
        console.log('📝 Creando nueva sábana:', req.body);

        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const { nombre, servicio_id, servicio_nombre, notas } = req.body;
        const usuario_creador_id = req.usuario?.id;

        if (!nombre || !servicio_id || !servicio_nombre) {
            return res.status(400).json({
                error: 'Faltan campos requeridos',
                required: ['nombre', 'servicio_id', 'servicio_nombre']
            });
        }

        const cuartosResult = await postgresManager.getCuartos();

        const cuartosParaSabana = cuartosResult.map(cuarto => ({
            cuarto_id: cuarto.id,
            habitacion: cuarto.numero,
            edificio: cuarto.edificio_nombre || 'Sin edificio',
            edificio_id: cuarto.edificio_id,
            fecha_programada: new Date().toISOString().split('T')[0],
            fecha_realizado: null,
            responsable: null,
            usuario_responsable_id: null,
            observaciones: null,
            realizado: false
        }));

        const sabanaData = {
            nombre,
            servicio_id,
            servicio_nombre,
            usuario_creador_id,
            notas,
            cuartos: cuartosParaSabana
        };

        const nuevaSabana = await postgresManager.createSabana(sabanaData);
        console.log('✅ Sábana creada:', nuevaSabana.id);

        res.status(201).json(nuevaSabana);
    } catch (error) {
        console.error('❌ Error al crear sábana:', error);
        res.status(500).json({ error: 'Error al crear sábana', details: error.message });
    }
});

app.get('/api/sabanas', verificarAutenticacion, async (req, res) => {
    try {
        console.log('📥 GET /api/sabanas');

        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const includeArchivadas = parseBooleanFlag(req.query.includeArchivadas);
        const sabanas = await postgresManager.getSabanas(includeArchivadas);

        res.json(sabanas);
    } catch (error) {
        console.error('❌ Error al obtener sábanas:', error);
        res.status(500).json({ error: 'Error al obtener sábanas', details: error.message });
    }
});

app.get('/api/sabanas/archivadas', verificarAutenticacion, async (req, res) => {
    try {
        console.log('📥 GET /api/sabanas/archivadas');

        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const sabanas = await postgresManager.getSabanasArchivadas();
        console.log('📦 Sábanas archivadas encontradas:', sabanas.length);
        if (sabanas.length > 0) {
            console.log('📊 Primera sábana archivada:', JSON.stringify(sabanas[0], null, 2));
        }
        res.json(sabanas);
    } catch (error) {
        console.error('❌ Error al obtener sábanas archivadas:', error);
        res.status(500).json({ error: 'Error al obtener sábanas archivadas', details: error.message });
    }
});

app.get('/api/sabanas/:id', verificarAutenticacion, async (req, res) => {
    try {
        console.log('📥 GET /api/sabanas/:id', req.params.id);

        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const sabana = await postgresManager.getSabanaById(parseInt(req.params.id));

        if (!sabana) {
            return res.status(404).json({ error: 'Sábana no encontrada' });
        }

        console.log('✅ Sábana encontrada:', sabana.id, 'con', sabana.items?.length || 0, 'items');

        res.json(sabana);
    } catch (error) {
        console.error('❌ Error al obtener sábana:', error);
        res.status(500).json({ error: 'Error al obtener sábana', details: error.message });
    }
});

app.patch('/api/sabanas/items/:id', verificarAutenticacion, async (req, res) => {
    try {
        console.log('✏️ PATCH /api/sabanas/items/:id', req.params.id, req.body);

        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const itemId = parseInt(req.params.id);
        const { observaciones, realizado } = req.body;

        const updateData = {
            observaciones
        };

        // Si se actualizan observaciones, actualizar también el responsable
        if (observaciones !== undefined) {
            updateData.responsable = req.usuario?.nombre;
            updateData.usuario_responsable_id = req.usuario?.id;
        }

        if (realizado !== undefined) {
            updateData.realizado = realizado;

            if (realizado) {
                updateData.fecha_realizado = new Date();
                updateData.responsable = req.usuario?.nombre;
                updateData.usuario_responsable_id = req.usuario?.id;
            } else {
                updateData.fecha_realizado = null;
                updateData.responsable = null;
                updateData.usuario_responsable_id = null;
            }
        }

        const itemActualizado = await postgresManager.updateSabanaItem(itemId, updateData);

        console.log('✅ Item de sábana actualizado:', itemActualizado.id);
        res.json({ success: true, item: itemActualizado });
    } catch (error) {
        console.error('❌ Error al actualizar item de sábana:', error);
        res.status(500).json({ error: 'Error al actualizar item', details: error.message });
    }
});

app.post('/api/sabanas/:id/archivar', verificarAutenticacion, verificarAdmin, async (req, res) => {
    try {
        console.log('📦 POST /api/sabanas/:id/archivar', req.params.id);

        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const sabanaId = parseInt(req.params.id);

        if (isNaN(sabanaId)) {
            return res.status(400).json({ error: 'ID de sábana inválido' });
        }

        console.log('🔄 Archivando sábana ID:', sabanaId);
        const sabanaArchivada = await postgresManager.archivarSabana(sabanaId);

        console.log('✅ Sábana archivada exitosamente:', {
            id: sabanaArchivada.id,
            nombre: sabanaArchivada.nombre,
            archivada: sabanaArchivada.archivada,
            fecha_archivado: sabanaArchivada.fecha_archivado
        });

        res.json({ success: true, sabana: sabanaArchivada });
    } catch (error) {
        console.error('❌ Error al archivar sábana:', error);
        res.status(500).json({ error: 'Error al archivar sábana', details: error.message });
    }
});

app.get('/api/sabanas/servicio/:servicioId', verificarAutenticacion, async (req, res) => {
    try {
        console.log('📥 GET /api/sabanas/servicio/:servicioId', req.params.servicioId);

        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        const includeArchivadas = parseBooleanFlag(req.query.includeArchivadas);
        const sabanas = await postgresManager.getSabanasByServicio(
            req.params.servicioId,
            includeArchivadas
        );

        res.json(sabanas);
    } catch (error) {
        console.error('❌ Error al obtener sábanas por servicio:', error);
        res.status(500).json({ error: 'Error al obtener sábanas', details: error.message });
    }
});

// ====================================
// RUTAS DE TAREAS
// ====================================

// Obtener todas las tareas
app.get('/api/tareas', async (req, res) => {
    try {
        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }
        const filters = {
            estado: req.query.estado,
            prioridad: req.query.prioridad,
            asignado_a: req.query.asignado_a
        };
        const tareas = await postgresManager.getTareas(filters);
        res.json(tareas);
    } catch (error) {
        console.error('Error al obtener tareas:', error);
        res.status(500).json({ error: 'Error al obtener tareas', details: error.message });
    }
});

// Obtener tarea por ID
app.get('/api/tareas/:id', verificarAutenticacion, async (req, res) => {
    try {
        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }
        const tarea = await postgresManager.getTareaById(req.params.id);
        if (!tarea) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        res.json(tarea);
    } catch (error) {
        console.error('Error al obtener tarea:', error);
        res.status(500).json({ error: 'Error al obtener tarea', details: error.message });
    }
});

// Crear nueva tarea
app.post('/api/tareas', async (req, res) => {
    try {
        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }

        console.log('📝 Creando tarea:', req.body);

        // Mapear campos del frontend a la base de datos
        const data = {
            titulo: req.body.nombre,
            descripcion: req.body.descripcion,
            estado: req.body.estado,
            prioridad: req.body.prioridad,
            fecha_vencimiento: req.body.fecha_limite,
            asignado_a: req.body.responsable_id ? parseInt(req.body.responsable_id) : null,
            ubicacion: req.body.ubicacion,
            tags: req.body.tags,
            creado_por: req.body.usuario_creador_id || 3 // Default a usuario sistema si no hay auth
        };

        const nuevaTarea = await postgresManager.createTarea(data);
        console.log('✅ Tarea creada:', nuevaTarea);
        res.status(201).json(nuevaTarea);
    } catch (error) {
        console.error('Error al crear tarea:', error);
        res.status(500).json({ error: 'Error al crear tarea', details: error.message });
    }
});

// Actualizar tarea
app.put('/api/tareas/:id', verificarAutenticacion, async (req, res) => {
    try {
        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }
        const tareaActualizada = await postgresManager.updateTarea(req.params.id, req.body);
        if (!tareaActualizada) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        res.json(tareaActualizada);
    } catch (error) {
        console.error('Error al actualizar tarea:', error);
        res.status(500).json({ error: 'Error al actualizar tarea', details: error.message });
    }
});

// Eliminar tarea
app.delete('/api/tareas/:id', verificarAutenticacion, async (req, res) => {
    try {
        if (!postgresManager) {
            return res.status(500).json({ error: 'Base de datos no disponible' });
        }
        const tareaEliminada = await postgresManager.deleteTarea(req.params.id);
        if (!tareaEliminada) {
            return res.status(404).json({ error: 'Tarea no encontrada' });
        }
        res.json({ success: true, message: 'Tarea eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar tarea:', error);
        res.status(500).json({ error: 'Error al eliminar tarea', details: error.message });
    }
});

// Manejar rutas no encontradas (debe ir al final, después de todas las rutas)
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada', path: req.path });
});

// Exportar como función serverless para Vercel
// Con @vercel/node, podemos exportar la app de Express directamente
module.exports = app;
