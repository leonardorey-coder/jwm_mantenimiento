/**
 * Vercel Serverless Function
 * Este archivo exporta la aplicación Express como función serverless para Vercel
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer');
const PostgresManager = require('../db/postgres-manager');
const {
  verificarAutenticacion,
  verificarAdmin,
  verificarSupervisor,
} = require('./auth');
const authRoutes = require('./auth-routes');

// UploadThing para almacenamiento de archivos en la nube (Server-side uploads)
// Leer token de UploadThing desde .env.local sin afectar otras variables de entorno
const { UTApi } = require('uploadthing/server');
let uploadthingToken = process.env.UPLOADTHING_TOKEN;

// Si no está en el entorno, intentar leer solo esa variable del archivo .env.local
if (!uploadthingToken) {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(
        /^UPLOADTHING_TOKEN=['"]?([^'"\n]+)['"]?/m
      );
      if (match) {
        uploadthingToken = match[1];
        console.log('✅ UPLOADTHING_TOKEN cargado desde .env.local');
      }
    }
  } catch (e) {
    console.warn(
      '⚠️ No se pudo leer UPLOADTHING_TOKEN de .env.local:',
      e.message
    );
  }
}

const utapi = new UTApi({ token: uploadthingToken });

const app = express();

// Inicializar base de datos PostgreSQL
let postgresManager;
let dbInitialized = false;

const validationMessageRegex =
  /(requerid|vac[ií]a|contraseñ|cambio|rol|válid|cambios)/i;

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
    console.log(
      '🔄 Continuando sin base de datos PostgreSQL - usando datos mock'
    );
    postgresManager = null;
    dbInitialized = true;
  }
}

// Configuración de CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
  })
);

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
    { id: 2, nombre: 'Torre B', descripcion: 'Edificio secundario' },
  ],
  cuartos: [
    {
      id: 1,
      numero: '101',
      nombre: '101',
      edificio_id: 1,
      edificio_nombre: 'Torre A',
      estado: 'ocupado',
    },
    {
      id: 2,
      numero: '102',
      nombre: '102',
      edificio_id: 1,
      edificio_nombre: 'Torre A',
      estado: 'vacio',
    },
    {
      id: 3,
      numero: '201',
      nombre: '201',
      edificio_id: 2,
      edificio_nombre: 'Torre B',
      estado: 'mantenimiento',
    },
  ],
  usuarios: [
    {
      id: 1,
      nombre: 'Admin Sistema',
      email: 'admin@sistema.com',
      rol_id: 1,
      rol_nombre: 'ADMIN',
      departamento: 'Administración',
    },
    {
      id: 2,
      nombre: 'Supervisor Principal',
      email: 'supervisor@sistema.com',
      rol_id: 2,
      rol_nombre: 'SUPERVISOR',
      departamento: 'Supervisión',
    },
    {
      id: 3,
      nombre: 'Técnico Mantenimiento',
      email: 'tecnico@sistema.com',
      rol_id: 3,
      rol_nombre: 'TECNICO',
      departamento: 'Mantenimiento',
    },
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
      cuarto_nombre: '101',
    },
    {
      id: 2,
      cuarto_id: 1,
      tipo: 'rutina',
      descripcion: 'Cambio de filtros programado',
      hora: '14:00:00',
      dia_alerta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      nivel_alerta: 'media',
      fecha_registro: new Date().toISOString(),
      estado: 'pendiente',
      cuarto_numero: '101',
      cuarto_nombre: '101',
    },
  ],
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
app.post(
  '/api/auth/cambiar-password-obligatorio',
  verificarAutenticacion,
  authRoutes.cambiarPasswordObligatorio
);

// Rutas protegidas de autenticación
app.post('/api/auth/logout', verificarAutenticacion, authRoutes.logout);
app.get('/api/auth/me', verificarAutenticacion, authRoutes.me);

// ====================================
// RUTAS DE USUARIOS (Solo Admin)
// ====================================
app.get(
  '/api/auth/usuarios',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
    console.log(
      '📋 [API] GET /api/auth/usuarios - Usuario:',
      req.usuario?.nombre
    );
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
      res
        .status(500)
        .json({ error: 'Error al obtener usuarios', details: error.message });
    }
  }
);

app.get(
  '/api/usuarios/roles',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
    try {
      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }
      const roles = await postgresManager.getRoles();
      res.json(roles);
    } catch (error) {
      console.error('Error al obtener roles:', error);
      res
        .status(500)
        .json({ error: 'Error al obtener roles', details: error.message });
    }
  }
);

app.post(
  '/api/usuarios',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
    try {
      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }
      const nuevoUsuario = await postgresManager.createUsuario(req.body || {});
      res.status(201).json({ success: true, usuario: nuevoUsuario });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      const status = mapUsuarioErrorStatus(error);
      res
        .status(status)
        .json({ error: error.message || 'Error al crear usuario' });
    }
  }
);

app.put(
  '/api/usuarios/:id',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
    try {
      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }
      const usuarioActualizado = await postgresManager.updateUsuario(
        parseInt(req.params.id, 10),
        req.body || {}
      );
      res.json({ success: true, usuario: usuarioActualizado });
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      const status = mapUsuarioErrorStatus(error);
      res
        .status(status)
        .json({ error: error.message || 'Error al actualizar usuario' });
    }
  }
);

app.post(
  '/api/usuarios/:id/desactivar',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
    try {
      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const userId = parseInt(req.params.id, 10);
      const motivo = req.body?.motivo || 'Desactivado por administrador';
      const usuario = await postgresManager.darBajaUsuario(
        userId,
        motivo,
        req.usuario.id
      );
      res.json({ success: true, usuario });
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      const status = mapUsuarioErrorStatus(error);
      res
        .status(status)
        .json({ error: error.message || 'Error al desactivar usuario' });
    }
  }
);

app.post(
  '/api/usuarios/:id/activar',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
    try {
      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const userId = parseInt(req.params.id, 10);
      const usuario = await postgresManager.reactivarUsuario(
        userId,
        req.usuario.id
      );
      res.json({ success: true, usuario });
    } catch (error) {
      console.error('Error al activar usuario:', error);
      const status = mapUsuarioErrorStatus(error);
      res
        .status(status)
        .json({ error: error.message || 'Error al activar usuario' });
    }
  }
);

app.post(
  '/api/usuarios/:id/desbloquear',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
    try {
      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const userId = parseInt(req.params.id, 10);
      const usuario = await postgresManager.desbloquearUsuario(
        userId,
        req.usuario.id
      );
      res.json({
        success: true,
        usuario,
        mensaje: 'Usuario desbloqueado exitosamente',
      });
    } catch (error) {
      console.error('Error al desbloquear usuario:', error);
      const status = mapUsuarioErrorStatus(error);
      res
        .status(status)
        .json({ error: error.message || 'Error al desbloquear usuario' });
    }
  }
);

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
        solicitar: 'POST /api/auth/solicitar-acceso',
      },
      edificios: '/api/edificios',
      cuartos: '/api/cuartos',
      mantenimientos: '/api/mantenimientos',
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: postgresManager ? 'connected' : 'disconnected',
    environment: process.env.VERCEL ? 'vercel' : 'local',
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
    res
      .status(500)
      .json({ error: 'Error al obtener edificios', details: error.message });
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
    res
      .status(500)
      .json({ error: 'Error al obtener usuarios', details: error.message });
  }
});

// Obtener cuartos
app.get('/api/cuartos', async (req, res) => {
  try {
    console.log('📥 GET /api/cuartos - iniciando...');
    console.log(
      '🗄️ postgresManager:',
      postgresManager ? 'DISPONIBLE' : 'NO DISPONIBLE'
    );

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
    res
      .status(500)
      .json({ error: 'Error al obtener cuartos', details: error.message });
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
      const cuarto = mockData.cuartos.find(
        (c) => c.id === parseInt(req.params.id)
      );
      if (!cuarto) {
        return res.status(404).json({ error: 'Cuarto no encontrado' });
      }
      res.json(cuarto);
    }
  } catch (error) {
    console.error('Error al obtener cuarto:', error);
    res
      .status(500)
      .json({ error: 'Error al obtener cuarto', details: error.message });
  }
});

// Actualizar estado del cuarto
app.put('/api/cuartos/:id', async (req, res) => {
  try {
    const cuartoId = parseInt(req.params.id);
    const { estado } = req.body;

    // Validar que el estado sea válido
    const estadosValidos = [
      'disponible',
      'ocupado',
      'mantenimiento',
      'fuera_servicio',
    ];
    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: 'Estado inválido',
        message: `El estado debe ser uno de: ${estadosValidos.join(', ')}`,
      });
    }

    console.log(`🔄 Actualizando cuarto ${cuartoId} - nuevo estado: ${estado}`);

    if (postgresManager) {
      const resultado = await postgresManager.updateEstadoCuarto(
        cuartoId,
        estado
      );
      if (!resultado) {
        return res.status(404).json({ error: 'Cuarto no encontrado' });
      }
      console.log('✅ Estado actualizado en base de datos');
      res.json({
        success: true,
        message: 'Estado actualizado correctamente',
        cuarto: resultado,
      });
    } else {
      // Modo mock: actualizar en memoria
      const cuarto = mockData.cuartos.find((c) => c.id === cuartoId);
      if (!cuarto) {
        return res.status(404).json({ error: 'Cuarto no encontrado' });
      }
      cuarto.estado = estado;
      console.log('✅ Estado actualizado en datos mock');
      res.json({
        success: true,
        message: 'Estado actualizado correctamente',
        cuarto: cuarto,
      });
    }
  } catch (error) {
    console.error('❌ Error al actualizar estado del cuarto:', error);
    res
      .status(500)
      .json({ error: 'Error al actualizar estado', details: error.message });
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
        mantenimientos = mantenimientos.filter(
          (m) => m.cuarto_id === parseInt(req.query.cuarto_id)
        );
      }
      res.json(mantenimientos);
    }
  } catch (error) {
    console.error('Error al obtener mantenimientos:', error);
    res
      .status(500)
      .json({
        error: 'Error al obtener mantenimientos',
        details: error.message,
      });
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
      tarea_id, // Asignación de tarea
      notas,
      estado_cuarto,
    } = req.body;

    // Usar el usuario del JWT (autenticado) como creador
    const creadorId = req.usuario?.id || usuario_creador_id || 3;

    console.log('📝 Creando mantenimiento:', {
      cuarto_id,
      descripcion,
      tipo,
      hora,
      dia_alerta,
      prioridad,
      estado,
      usuario_creador_id: creadorId,
      usuario_asignado_id,
      tarea_id,
      notas,
      estado_cuarto,
      usuario_jwt: req.usuario?.nombre,
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
        tarea_id ? parseInt(tarea_id) : null, // Tarea asignada
        notas || null,
        fecha_finalizacion,
      ];

      const result = await postgresManager.pool.query(query, values);
      const nuevoMantenimiento = result.rows[0];

      console.log('✅ Mantenimiento creado:', nuevoMantenimiento);

      // Si se proporcionó un estado_cuarto, actualizar el estado del cuarto
      if (estado_cuarto) {
        console.log(
          `🔄 Actualizando estado del cuarto ${cuarto_id} a: ${estado_cuarto}`
        );
        await postgresManager.updateEstadoCuarto(
          parseInt(cuarto_id),
          estado_cuarto
        );
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
        estado: 'pendiente',
      };
      mockData.mantenimientos.push(nuevoMantenimiento);
      res.status(201).json(nuevoMantenimiento);
    }
  } catch (error) {
    console.error('❌ Error al crear mantenimiento:', error);
    res
      .status(500)
      .json({ error: 'Error al crear mantenimiento', details: error.message });
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
      tarea_id,
    } = req.body;
    const mantenimientoId = parseInt(id);

    console.log('✏️ Actualizando mantenimiento:', mantenimientoId, {
      descripcion,
      hora,
      dia_alerta,
      prioridad,
      estado,
      usuario_asignado_id,
      notas,
      tarea_id,
    });

    if (postgresManager) {
      // Obtener el registro actual para comparar cambios
      const queryActual =
        'SELECT estado, dia_alerta, hora, fecha_finalizacion FROM mantenimientos WHERE id = $1';
      const resultActual = await postgresManager.pool.query(queryActual, [
        mantenimientoId,
      ]);
      const registroActual = resultActual.rows[0];

      if (!registroActual) {
        return res.status(404).json({ error: 'Mantenimiento no encontrado' });
      }

      const estadoActual = registroActual.estado;

      // Determinar si se debe actualizar fecha_finalizacion
      let fecha_finalizacion = undefined;
      if (estado) {
        const esEstadoFinal = estado === 'completado' || estado === 'cancelado';
        const esEstadoActivo =
          estado === 'pendiente' || estado === 'en_proceso';

        if (esEstadoFinal && estadoActual !== estado) {
          fecha_finalizacion = new Date();
        } else if (esEstadoActivo && registroActual.fecha_finalizacion) {
          // Reiniciar fecha de finalización si la tarea vuelve a un estado activo
          fecha_finalizacion = null;
        }
      }

      // Determinar si cambió la fecha o la hora (para resetear alerta_emitida)
      const fechaCambio =
        dia_alerta !== undefined && registroActual.dia_alerta !== dia_alerta;
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
        valores.push(
          usuario_asignado_id ? parseInt(usuario_asignado_id) : null
        );
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
        console.log(
          '🔄 Reseteando alerta_emitida a FALSE debido a cambio en fecha/hora'
        );
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
          data: result.rows[0],
        });
      } else {
        res.json({
          success: true,
          message: 'No hay cambios para actualizar',
        });
      }
    } else {
      // Mock update
      const mantenimiento = mockData.mantenimientos.find(
        (m) => m.id === mantenimientoId
      );
      if (mantenimiento) {
        if (descripcion) mantenimiento.descripcion = descripcion;
        if (hora) mantenimiento.hora = hora;
        if (dia_alerta) mantenimiento.dia_alerta = dia_alerta;
        if (nivel_alerta) mantenimiento.nivel_alerta = nivel_alerta;
      }
      res.json({
        success: true,
        message: 'Mantenimiento actualizado correctamente',
      });
    }
  } catch (error) {
    console.error('❌ Error actualizando mantenimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: error.message,
    });
  }
});

// Obtener alertas emitidas
app.get('/api/alertas/emitidas', async (req, res) => {
  try {
    const { fecha } = req.query; // Opcional: filtrar por fecha específica

    // Log de timezone para debugging
    const serverTime = new Date();
    const losCabosTime = new Date(
      serverTime.toLocaleString('en-US', { timeZone: 'America/Mazatlan' })
    );
    console.log(
      '📋 Obteniendo alertas emitidas',
      fecha ? `para fecha: ${fecha}` : '(todas)'
    );
    console.log(`🕐 Server UTC: ${serverTime.toISOString()}`);
    console.log(`🕐 Los Cabos time: ${losCabosTime.toISOString()}`);

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
      stack: error.stack,
    });
  }
});

// Obtener alertas pendientes (no emitidas)
app.get('/api/alertas/pendientes', async (req, res) => {
  try {
    // Log de timezone para debugging
    const serverTime = new Date();
    const losCabosTime = new Date(
      serverTime.toLocaleString('en-US', { timeZone: 'America/Mazatlan' })
    );
    console.log('📋 Obteniendo alertas pendientes (no emitidas)');
    console.log(`🕐 Server UTC: ${serverTime.toISOString()}`);
    console.log(`🕐 Los Cabos time: ${losCabosTime.toISOString()}`);

    if (postgresManager) {
      const alertas = await postgresManager.getAlertasPendientes();
      console.log(`✅ Alertas pendientes encontradas: ${alertas.length}`);
      alertas.forEach((a) => {
        console.log(
          `   - ID ${a.id}: ${a.dia_alerta} ${a.hora} - ${a.descripcion?.substring(0, 30)}`
        );
      });
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
      stack: error.stack,
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
        message: 'Alerta marcada como emitida',
      });
    } else {
      // Mock response
      res.json({
        success: true,
        message: 'Alerta marcada como emitida',
      });
    }
  } catch (error) {
    console.error('❌ Error marcando alerta como emitida:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: error.message,
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
        count,
      });
    } else {
      res.json({
        success: true,
        message: 'No hay base de datos disponible',
        count: 0,
      });
    }
  } catch (error) {
    console.error('❌ Error marcando alertas pasadas:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: error.message,
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
        action: 'created',
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
        action: 'exists',
      });
    }
  } catch (error) {
    console.error('❌ Error verificando columna:', error);
    res.status(500).json({
      error: 'Error verificando columna',
      details: error.message,
      stack: error.stack,
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
        message: 'Mantenimiento eliminado correctamente',
      });
    } else {
      // Mock delete
      const index = mockData.mantenimientos.findIndex(
        (m) => m.id === mantenimientoId
      );
      if (index > -1) {
        mockData.mantenimientos.splice(index, 1);
      }
      res.json({
        success: true,
        message: 'Mantenimiento eliminado correctamente',
      });
    }
  } catch (error) {
    console.error('❌ Error eliminando mantenimiento:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      details: error.message,
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
      console.log(
        `✅ Espacios comunes obtenidos: ${result.rows.length} registros`
      );
      res.json(result.rows);
    } else {
      console.error('❌ Base de datos no disponible, usando datos mock');
      const mockEspacios = [
        {
          id: 1,
          nombre: 'Lobby Principal',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'comun',
          estado: 'disponible',
        },
        {
          id: 2,
          nombre: 'Gimnasio',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'recreativo',
          estado: 'disponible',
        },
        {
          id: 3,
          nombre: 'Piscina Principal',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'recreativo',
          estado: 'disponible',
        },
        {
          id: 4,
          nombre: 'Restaurante Principal',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'restaurante',
          estado: 'ocupado',
        },
        {
          id: 5,
          nombre: 'Spa y Wellness',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'recreativo',
          estado: 'disponible',
        },
        {
          id: 6,
          nombre: 'Bar Lounge',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'restaurante',
          estado: 'disponible',
        },
        {
          id: 7,
          nombre: 'Salón de Eventos',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'comun',
          estado: 'ocupado',
        },
        {
          id: 8,
          nombre: 'Business Center',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'servicio',
          estado: 'disponible',
        },
        {
          id: 9,
          nombre: 'Lavandería',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'servicio',
          estado: 'disponible',
        },
        {
          id: 10,
          nombre: 'Estacionamiento',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'exterior',
          estado: 'disponible',
        },
        {
          id: 11,
          nombre: 'Terraza',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'exterior',
          estado: 'disponible',
        },
        {
          id: 12,
          nombre: 'Jardín Principal',
          edificio_id: 1,
          edificio_nombre: 'Torre A',
          tipo: 'exterior',
          estado: 'disponible',
        },
        {
          id: 13,
          nombre: 'Piscina Infantil',
          edificio_id: 2,
          edificio_nombre: 'Torre B',
          tipo: 'recreativo',
          estado: 'disponible',
        },
        {
          id: 14,
          nombre: 'Restaurante Terraza',
          edificio_id: 2,
          edificio_nombre: 'Torre B',
          tipo: 'restaurante',
          estado: 'disponible',
        },
        {
          id: 15,
          nombre: 'Gift Shop',
          edificio_id: 2,
          edificio_nombre: 'Torre B',
          tipo: 'servicio',
          estado: 'disponible',
        },
        {
          id: 16,
          nombre: 'Biblioteca',
          edificio_id: 2,
          edificio_nombre: 'Torre B',
          tipo: 'comun',
          estado: 'disponible',
        },
        {
          id: 17,
          nombre: 'Área de Juegos',
          edificio_id: 2,
          edificio_nombre: 'Torre B',
          tipo: 'recreativo',
          estado: 'mantenimiento',
        },
        {
          id: 18,
          nombre: 'Lobby Torre B',
          edificio_id: 2,
          edificio_nombre: 'Torre B',
          tipo: 'comun',
          estado: 'disponible',
        },
      ];
      res.json(mockEspacios);
    }
  } catch (error) {
    console.error('❌ Error al obtener espacios comunes:', error);
    res
      .status(500)
      .json({
        error: 'Error al obtener espacios comunes',
        details: error.message,
      });
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
      const result = await postgresManager.pool.query(query, [
        parseInt(req.params.id),
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Espacio común no encontrado' });
      }
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Espacio común no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener espacio común:', error);
    res
      .status(500)
      .json({
        error: 'Error al obtener espacio común',
        details: error.message,
      });
  }
});

// Actualizar estado del espacio común
app.put('/api/espacios-comunes/:id', async (req, res) => {
  try {
    const espacioId = parseInt(req.params.id);
    const { estado } = req.body;

    const estadosValidos = [
      'disponible',
      'ocupado',
      'mantenimiento',
      'fuera_servicio',
    ];
    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: 'Estado inválido',
        message: `El estado debe ser uno de: ${estadosValidos.join(', ')}`,
      });
    }

    console.log(
      `🔄 Actualizando espacio común ${espacioId} - nuevo estado: ${estado}`
    );

    if (postgresManager) {
      const query = `
                UPDATE espacios_comunes 
                SET estado = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;
      const result = await postgresManager.pool.query(query, [
        estado,
        espacioId,
      ]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Espacio común no encontrado' });
      }

      console.log('✅ Estado actualizado en base de datos');
      res.json({
        success: true,
        message: 'Estado actualizado correctamente',
        espacio: result.rows[0],
      });
    } else {
      res.json({
        success: true,
        message: 'Estado actualizado correctamente',
      });
    }
  } catch (error) {
    console.error('❌ Error al actualizar estado del espacio común:', error);
    res
      .status(500)
      .json({ error: 'Error al actualizar estado', details: error.message });
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
    res
      .status(500)
      .json({
        error: 'Error al obtener mantenimientos de espacios',
        details: error.message,
      });
  }
});

// Agregar mantenimiento a espacio común
app.post(
  '/api/mantenimientos/espacios',
  verificarAutenticacion,
  async (req, res) => {
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
        estado_espacio,
        tarea_id,
      } = req.body;

      const creadorId = req.usuario?.id || 3;

      console.log('📝 Creando mantenimiento para espacio común:', {
        espacio_comun_id,
        descripcion,
        tipo,
        hora,
        dia_alerta,
        prioridad,
        estado,
        usuario_creador_id: creadorId,
        usuario_asignado_id,
        notas,
        estado_espacio,
        tarea_id,
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
                    fecha_finalizacion, fecha_creacion, tarea_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, $12)
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
          fecha_finalizacion,
          tarea_id ? parseInt(tarea_id) : null,
        ];

        const result = await postgresManager.pool.query(query, values);
        const nuevoMantenimiento = result.rows[0];

        console.log(
          '✅ Mantenimiento de espacio común creado:',
          nuevoMantenimiento
        );

        if (estado_espacio) {
          console.log(
            `🔄 Actualizando estado del espacio ${espacio_comun_id} a: ${estado_espacio}`
          );
          await postgresManager.pool.query(
            'UPDATE espacios_comunes SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [estado_espacio, parseInt(espacio_comun_id)]
          );
        }

        res.status(201).json(nuevoMantenimiento);
      } else {
        res
          .status(201)
          .json({ success: true, message: 'Mantenimiento creado (mock)' });
      }
    } catch (error) {
      console.error('❌ Error al crear mantenimiento de espacio común:', error);
      res
        .status(500)
        .json({
          error: 'Error al crear mantenimiento',
          details: error.message,
        });
    }
  }
);

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
        required: ['nombre', 'servicio_id', 'servicio_nombre'],
      });
    }

    const cuartosResult = await postgresManager.getCuartos();

    // Guardar timestamp completo con timezone (TIMESTAMPTZ)
    // El frontend convertirá a la zona horaria local del usuario con toLocaleDateString()
    const fechaProgramadaTimestamp = new Date().toISOString();

    const cuartosParaSabana = cuartosResult.map((cuarto) => ({
      cuarto_id: cuarto.id,
      habitacion: cuarto.numero,
      edificio: cuarto.edificio_nombre || 'Sin edificio',
      edificio_id: cuarto.edificio_id,
      fecha_programada: fechaProgramadaTimestamp,
      fecha_realizado: null,
      responsable: null,
      usuario_responsable_id: null,
      observaciones: null,
      realizado: false,
    }));

    const sabanaData = {
      nombre,
      servicio_id,
      servicio_nombre,
      usuario_creador_id,
      notas,
      cuartos: cuartosParaSabana,
    };

    const nuevaSabana = await postgresManager.createSabana(sabanaData);
    console.log('✅ Sábana creada:', nuevaSabana.id);

    res.status(201).json(nuevaSabana);
  } catch (error) {
    console.error('❌ Error al crear sábana:', error);
    res
      .status(500)
      .json({ error: 'Error al crear sábana', details: error.message });
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
    res
      .status(500)
      .json({ error: 'Error al obtener sábanas', details: error.message });
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
      console.log(
        '📊 Primera sábana archivada:',
        JSON.stringify(sabanas[0], null, 2)
      );
    }
    res.json(sabanas);
  } catch (error) {
    console.error('❌ Error al obtener sábanas archivadas:', error);
    res
      .status(500)
      .json({
        error: 'Error al obtener sábanas archivadas',
        details: error.message,
      });
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

    console.log(
      '✅ Sábana encontrada:',
      sabana.id,
      'con',
      sabana.items?.length || 0,
      'items'
    );

    res.json(sabana);
  } catch (error) {
    console.error('❌ Error al obtener sábana:', error);
    res
      .status(500)
      .json({ error: 'Error al obtener sábana', details: error.message });
  }
});

app.patch(
  '/api/sabanas/items/:id',
  verificarAutenticacion,
  async (req, res) => {
    try {
      console.log('✏️ PATCH /api/sabanas/items/:id', req.params.id, req.body);

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const itemId = parseInt(req.params.id);
      const { observaciones, realizado } = req.body;

      const updateData = {
        observaciones,
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

      const itemActualizado = await postgresManager.updateSabanaItem(
        itemId,
        updateData
      );

      console.log('✅ Item de sábana actualizado:', itemActualizado.id);
      res.json({ success: true, item: itemActualizado });
    } catch (error) {
      console.error('❌ Error al actualizar item de sábana:', error);
      res
        .status(500)
        .json({ error: 'Error al actualizar item', details: error.message });
    }
  }
);

app.post(
  '/api/sabanas/:id/archivar',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
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
        fecha_archivado: sabanaArchivada.fecha_archivado,
      });

      res.json({ success: true, sabana: sabanaArchivada });
    } catch (error) {
      console.error('❌ Error al archivar sábana:', error);
      res
        .status(500)
        .json({ error: 'Error al archivar sábana', details: error.message });
    }
  }
);

app.get(
  '/api/sabanas/servicio/:servicioId',
  verificarAutenticacion,
  async (req, res) => {
    try {
      console.log(
        '📥 GET /api/sabanas/servicio/:servicioId',
        req.params.servicioId
      );

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
      res
        .status(500)
        .json({ error: 'Error al obtener sábanas', details: error.message });
    }
  }
);

app.delete(
  '/api/sabanas/:id',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
    try {
      console.log('🗑️ DELETE /api/sabanas/:id', req.params.id);

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const sabanaId = parseInt(req.params.id);

      if (isNaN(sabanaId)) {
        return res.status(400).json({ error: 'ID de sábana inválido' });
      }

      const sabana = await postgresManager.getSabanaById(sabanaId);
      if (!sabana) {
        return res.status(404).json({ error: 'Sábana no encontrada' });
      }

      console.log(
        '🗑️ Eliminando sábana ID:',
        sabanaId,
        'Nombre:',
        sabana.nombre
      );

      const query = 'DELETE FROM sabanas WHERE id = $1 RETURNING id, nombre';
      const result = await postgresManager.pool.query(query, [sabanaId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Sábana no encontrada' });
      }

      const sabanaEliminada = result.rows[0];
      console.log('✅ Sábana eliminada exitosamente:', sabanaEliminada);

      res.json({
        success: true,
        message: 'Sábana eliminada correctamente',
        sabana: sabanaEliminada,
      });
    } catch (error) {
      console.error('❌ Error al eliminar sábana:', error);
      res
        .status(500)
        .json({ error: 'Error interno del servidor al eliminar la sábana' });
    }
  }
);

// ====================================
// RUTAS DE TAREAS
// ====================================

// *** IMPORTANTE: Las rutas específicas de adjuntos deben ir ANTES de /api/tareas/:id ***
// para evitar que Express interprete 'adjuntos' como un :id

// Eliminar un adjunto (DEBE IR ANTES de /api/tareas/:id)
app.delete(
  '/api/tareas/adjuntos/:id',
  verificarAutenticacion,
  async (req, res) => {
    try {
      const adjuntoId = parseInt(req.params.id);
      console.log(`📎 Eliminando adjunto ${adjuntoId}`);

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      // Obtener info del adjunto antes de eliminar
      const queryGet = 'SELECT * FROM tareas_adjuntos WHERE id = $1';
      const resultGet = await postgresManager.pool.query(queryGet, [adjuntoId]);

      if (resultGet.rows.length === 0) {
        return res.status(404).json({ error: 'Adjunto no encontrado' });
      }

      const adjunto = resultGet.rows[0];

      // Eliminar de la base de datos
      const queryDelete = 'DELETE FROM tareas_adjuntos WHERE id = $1';
      await postgresManager.pool.query(queryDelete, [adjuntoId]);

      // Eliminar de UploadThing si tiene key
      if (adjunto.uploadthing_key) {
        try {
          await utapi.deleteFiles(adjunto.uploadthing_key);
          console.log(
            '✅ Archivo eliminado de UploadThing:',
            adjunto.uploadthing_key
          );
        } catch (utError) {
          console.warn(
            '⚠️ Error eliminando de UploadThing (archivo puede no existir):',
            utError.message
          );
        }
      } else if (adjunto.ruta_archivo && fs.existsSync(adjunto.ruta_archivo)) {
        // Fallback: eliminar archivo físico local si existe (para adjuntos antiguos)
        fs.unlinkSync(adjunto.ruta_archivo);
        console.log('✅ Archivo físico local eliminado:', adjunto.ruta_archivo);
      }

      console.log('✅ Adjunto eliminado:', adjuntoId);
      res.json({ success: true, message: 'Adjunto eliminado correctamente' });
    } catch (error) {
      console.error('❌ Error al eliminar adjunto:', error);
      res
        .status(500)
        .json({ error: 'Error al eliminar adjunto', details: error.message });
    }
  }
);

// Ver preview de un adjunto (DEBE IR ANTES de /api/tareas/:id)
app.get(
  '/api/tareas/adjuntos/:id/preview',
  verificarAutenticacion,
  async (req, res) => {
    try {
      const adjuntoId = parseInt(req.params.id);
      console.log(`📎 Preview adjunto ${adjuntoId}`);

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const query = 'SELECT * FROM tareas_adjuntos WHERE id = $1';
      const result = await postgresManager.pool.query(query, [adjuntoId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Adjunto no encontrado' });
      }

      const adjunto = result.rows[0];

      // Si tiene URL de UploadThing, redirigir
      if (adjunto.url) {
        console.log('📎 Redirigiendo a UploadThing URL:', adjunto.url);
        return res.redirect(adjunto.url);
      }

      // Fallback: servir archivo local (para adjuntos antiguos)
      if (adjunto.ruta_archivo && fs.existsSync(adjunto.ruta_archivo)) {
        res.setHeader('Content-Type', adjunto.mime_type);
        return res.sendFile(adjunto.ruta_archivo);
      }

      return res.status(404).json({ error: 'Archivo no encontrado' });
    } catch (error) {
      console.error('❌ Error al obtener preview adjunto:', error);
      res
        .status(500)
        .json({ error: 'Error al obtener preview', details: error.message });
    }
  }
);

// Descargar un adjunto (DEBE IR ANTES de /api/tareas/:id)
app.get(
  '/api/tareas/adjuntos/:id/download',
  verificarAutenticacion,
  async (req, res) => {
    try {
      const adjuntoId = parseInt(req.params.id);
      console.log(`📎 Descargando adjunto ${adjuntoId}`);

      if (!postgresManager) {
        console.log('❌ postgresManager no disponible');
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const query = 'SELECT * FROM tareas_adjuntos WHERE id = $1';
      const result = await postgresManager.pool.query(query, [adjuntoId]);
      console.log(`📎 Query resultado: ${result.rows.length} filas`);

      if (result.rows.length === 0) {
        console.log(`❌ Adjunto ${adjuntoId} no encontrado en BD`);
        return res.status(404).json({ error: 'Adjunto no encontrado' });
      }

      const adjunto = result.rows[0];
      console.log(
        `📎 Adjunto encontrado: url=${adjunto.url}, ruta=${adjunto.ruta_archivo}`
      );

      // Si tiene URL de UploadThing, redirigir para descarga
      if (adjunto.url) {
        console.log(
          '📎 Redirigiendo a UploadThing URL para descarga:',
          adjunto.url
        );
        return res.redirect(adjunto.url);
      }

      // Fallback: servir archivo local (para adjuntos antiguos)
      if (adjunto.ruta_archivo && fs.existsSync(adjunto.ruta_archivo)) {
        console.log('📎 Sirviendo archivo local:', adjunto.ruta_archivo);
        res.setHeader('Content-Type', adjunto.mime_type);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${adjunto.nombre_original}"`
        );
        return res.sendFile(path.resolve(adjunto.ruta_archivo));
      }

      console.log('❌ Archivo no encontrado (sin URL ni archivo local)');
      return res.status(404).json({ error: 'Archivo no encontrado' });
    } catch (error) {
      console.error('❌ Error al descargar adjunto:', error);
      res
        .status(500)
        .json({ error: 'Error al descargar adjunto', details: error.message });
    }
  }
);

app.get(
  '/api/tareas/:id/adjuntos',
  verificarAutenticacion,
  async (req, res) => {
    try {
      const tareaId = parseInt(req.params.id);
      console.log(`📎 Obteniendo adjuntos de tarea ${tareaId}`);

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const query = `
            SELECT ta.*, u.nombre as subido_por_nombre
            FROM tareas_adjuntos ta
            LEFT JOIN usuarios u ON ta.subido_por = u.id
            WHERE ta.tarea_id = $1
            ORDER BY ta.created_at DESC
        `;
      const result = await postgresManager.pool.query(query, [tareaId]);

      console.log(`✅ ${result.rows.length} adjuntos encontrados`);
      res.json(result.rows);
    } catch (error) {
      console.error('❌ Error al obtener adjuntos:', error);
      res
        .status(500)
        .json({ error: 'Error al obtener adjuntos', details: error.message });
    }
  }
);

// Obtener todas las tareas
app.get('/api/tareas', async (req, res) => {
  try {
    if (!postgresManager) {
      return res.status(500).json({ error: 'Base de datos no disponible' });
    }
    const filters = {
      estado: req.query.estado,
      prioridad: req.query.prioridad,
      asignado_a: req.query.asignado_a,
    };
    const tareas = await postgresManager.getTareas(filters);
    res.json(tareas);
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res
      .status(500)
      .json({ error: 'Error al obtener tareas', details: error.message });
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
    res
      .status(500)
      .json({ error: 'Error al obtener tarea', details: error.message });
  }
});

// Crear nueva tarea
app.post('/api/tareas', async (req, res) => {
  try {
    if (!postgresManager) {
      return res.status(500).json({ error: 'Base de datos no disponible' });
    }

    console.log('📝 Creando tarea:', req.body);

    // Obtener usuario creador desde JWT o body
    let creadoPor = req.body.usuario_creador_id;

    // Si no viene en el body, intentar obtenerlo del token JWT
    if (!creadoPor) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const jwt = require('jsonwebtoken');
          const token = authHeader.slice(7);
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'jwmarriott-secret-2025'
          );
          creadoPor = decoded.id || decoded.userId;
          console.log('📝 Usuario extraído del JWT:', creadoPor);
        } catch (jwtError) {
          console.warn('⚠️ No se pudo decodificar JWT:', jwtError.message);
        }
      }
    }

    // Mapear campos del frontend a la base de datos
    const data = {
      titulo: req.body.nombre || req.body.titulo,
      descripcion: req.body.descripcion,
      estado: req.body.estado,
      prioridad: req.body.prioridad,
      fecha_vencimiento: req.body.fecha_limite,
      asignado_a: req.body.responsable_id
        ? parseInt(req.body.responsable_id)
        : null,
      ubicacion: req.body.ubicacion,
      tags: req.body.tags || [],
      creado_por: creadoPor ? parseInt(creadoPor) : null,
    };

    console.log('📝 Datos mapeados para BD:', data);

    const nuevaTarea = await postgresManager.createTarea(data);
    console.log('✅ Tarea creada:', nuevaTarea);
    res.status(201).json(nuevaTarea);
  } catch (error) {
    console.error('❌ Error al crear tarea:', error);
    res.status(500).json({
      error: 'Error al crear tarea',
      message: error.message,
      details: error.detail || error.message,
    });
  }
});

// Actualizar tarea
app.put('/api/tareas/:id', verificarAutenticacion, async (req, res) => {
  try {
    if (!postgresManager) {
      return res.status(500).json({ error: 'Base de datos no disponible' });
    }

    console.log(`📝 Actualizando tarea ${req.params.id}:`, req.body);

    // Mapear campos del frontend a la base de datos
    // El frontend envía: nombre/titulo, fecha_limite, responsable_id
    // La BD espera: titulo, fecha_vencimiento, asignado_a
    const data = {
      titulo: req.body.titulo || req.body.nombre,
      descripcion: req.body.descripcion,
      estado: req.body.estado,
      prioridad: req.body.prioridad,
      fecha_vencimiento: req.body.fecha_limite || req.body.fecha_vencimiento,
      asignado_a: req.body.responsable_id
        ? parseInt(req.body.responsable_id)
        : req.body.asignado_a
          ? parseInt(req.body.asignado_a)
          : undefined,
      ubicacion: req.body.ubicacion,
      tags: req.body.tags,
    };

    // Eliminar campos undefined para no sobrescribir con null/undefined si no se enviaron
    Object.keys(data).forEach(
      (key) => data[key] === undefined && delete data[key]
    );

    const tareaActualizada = await postgresManager.updateTarea(
      req.params.id,
      data
    );
    if (!tareaActualizada) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }
    res.json(tareaActualizada);
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    res
      .status(500)
      .json({ error: 'Error al actualizar tarea', details: error.message });
  }
});

// Eliminar tarea
app.delete('/api/tareas/:id', verificarAutenticacion, async (req, res) => {
  try {
    if (!postgresManager) {
      return res.status(500).json({ error: 'Base de datos no disponible' });
    }

    const tareaId = req.params.id;

    // Primero obtener los adjuntos para eliminar los archivos
    const queryAdjuntos =
      'SELECT uploadthing_key, ruta_archivo FROM tareas_adjuntos WHERE tarea_id = $1';
    const adjuntosResult = await postgresManager.pool.query(queryAdjuntos, [
      tareaId,
    ]);
    const adjuntos = adjuntosResult.rows;

    console.log(
      `📎 Tarea ${tareaId} tiene ${adjuntos.length} adjuntos a eliminar`
    );

    // Recolectar keys de UploadThing para eliminar
    const uploadthingKeys = adjuntos
      .filter((a) => a.uploadthing_key)
      .map((a) => a.uploadthing_key);

    // Eliminar la tarea (los registros de adjuntos se eliminan por CASCADE)
    const tareaEliminada = await postgresManager.deleteTarea(tareaId);
    if (!tareaEliminada) {
      return res.status(404).json({ error: 'Tarea no encontrada' });
    }

    // Eliminar archivos de UploadThing
    if (uploadthingKeys.length > 0) {
      try {
        await utapi.deleteFiles(uploadthingKeys);
        console.log(
          `✅ ${uploadthingKeys.length} archivos eliminados de UploadThing`
        );
      } catch (utError) {
        console.warn('⚠️ Error eliminando de UploadThing:', utError.message);
      }
    }

    // Eliminar archivos físicos locales (para adjuntos antiguos)
    for (const adjunto of adjuntos) {
      if (
        adjunto.ruta_archivo &&
        !adjunto.ruta_archivo.includes('utfs.io') &&
        fs.existsSync(adjunto.ruta_archivo)
      ) {
        try {
          fs.unlinkSync(adjunto.ruta_archivo);
          console.log('✅ Archivo físico eliminado:', adjunto.ruta_archivo);
        } catch (fileError) {
          console.error('⚠️ Error al eliminar archivo físico:', fileError);
        }
      }
    }

    console.log(
      `✅ Tarea ${tareaId} eliminada con ${adjuntos.length} archivos`
    );
    res.json({ success: true, message: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res
      .status(500)
      .json({ error: 'Error al eliminar tarea', details: error.message });
  }
});

// ====================================
// RUTAS DE CHECKLIST
// ====================================

// Inicializar tablas de checklist (ejecutar migración)
app.post(
  '/api/checklist/init',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
    try {
      console.log('🔄 Inicializando tablas de checklist...');

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      await postgresManager.runChecklistMigration();

      res.json({
        success: true,
        message: 'Tablas de checklist inicializadas correctamente',
      });
    } catch (error) {
      console.error('❌ Error inicializando checklist:', error);
      res
        .status(500)
        .json({
          error: 'Error al inicializar checklist',
          details: error.message,
        });
    }
  }
);

// Obtener iconos disponibles para categorías
app.get('/api/checklist/iconos', (req, res) => {
  const iconosDisponibles = [
    { value: 'fa-layer-group', label: 'Genérico', emoji: '📦' },
    { value: 'fa-couch', label: 'Mobiliario', emoji: '🛋️' },
    { value: 'fa-temperature-half', label: 'Climatización', emoji: '🌡️' },
    { value: 'fa-plug', label: 'Electrónica', emoji: '🔌' },
    { value: 'fa-shower', label: 'Sanitarios', emoji: '🚿' },
    { value: 'fa-concierge-bell', label: 'Amenidades', emoji: '🛎️' },
    { value: 'fa-door-open', label: 'Estructura', emoji: '🚪' },
    { value: 'fa-bed', label: 'Cama', emoji: '🛏️' },
    { value: 'fa-tv', label: 'TV/Pantallas', emoji: '📺' },
    { value: 'fa-lightbulb', label: 'Iluminación', emoji: '💡' },
    { value: 'fa-paint-roller', label: 'Decoración', emoji: '🎨' },
    { value: 'fa-broom', label: 'Limpieza', emoji: '🧹' },
    { value: 'fa-key', label: 'Seguridad', emoji: '🔑' },
    { value: 'fa-wifi', label: 'Conectividad', emoji: '📶' },
    { value: 'fa-utensils', label: 'Cocina', emoji: '🍽️' },
    { value: 'fa-swimming-pool', label: 'Piscina', emoji: '🏊' },
    { value: 'fa-dumbbell', label: 'Gimnasio', emoji: '🏋️' },
    { value: 'fa-car', label: 'Estacionamiento', emoji: '🚗' },
    { value: 'fa-tree', label: 'Jardín', emoji: '🌳' },
    {
      value: 'fa-fire-extinguisher',
      label: 'Seguridad contra incendios',
      emoji: '🧯',
    },
  ];
  res.json(iconosDisponibles);
});

// Obtener categorías del checklist
app.get('/api/checklist/categorias', async (req, res) => {
  try {
    console.log('📥 ========================================');
    console.log('📥 GET /api/checklist/categorias');
    console.log('📥 postgresManager disponible:', !!postgresManager);
    console.log('📥 ========================================');

    if (!postgresManager) {
      console.log('📥 ⚠️ Sin conexión BD, retornando mock');
      // Datos mock para fallback
      const mockCategorias = [
        {
          id: 1,
          nombre: 'Climatización',
          slug: 'climatizacion',
          icono: 'fa-temperature-half',
          orden: 1,
        },
        {
          id: 2,
          nombre: 'Electrónica',
          slug: 'electronica',
          icono: 'fa-plug',
          orden: 2,
        },
        {
          id: 3,
          nombre: 'Mobiliario',
          slug: 'mobiliario',
          icono: 'fa-couch',
          orden: 3,
        },
        {
          id: 4,
          nombre: 'Sanitarios',
          slug: 'sanitarios',
          icono: 'fa-shower',
          orden: 4,
        },
        {
          id: 5,
          nombre: 'Amenidades',
          slug: 'amenidades',
          icono: 'fa-concierge-bell',
          orden: 5,
        },
        {
          id: 6,
          nombre: 'Estructura',
          slug: 'estructura',
          icono: 'fa-door-open',
          orden: 6,
        },
      ];
      return res.json(mockCategorias);
    }

    // Intentar ejecutar migración si las tablas no existen
    try {
      await postgresManager.runChecklistMigration();
    } catch (migrationError) {
      console.warn(
        '📥 ⚠️ Migración ya ejecutada o error:',
        migrationError.message
      );
    }

    console.log('📥 Consultando categorías en BD...');
    const categorias = await postgresManager.getChecklistCategorias();
    console.log(`📥 ✅ Categorías obtenidas de BD: ${categorias.length}`);
    console.log('📥 Categorías:', JSON.stringify(categorias, null, 2));
    res.json(categorias);
  } catch (error) {
    console.error('📥 ❌ Error al obtener categorías:', error);
    res
      .status(500)
      .json({ error: 'Error al obtener categorías', details: error.message });
  }
});

// Agregar nueva categoría
app.post(
  '/api/checklist/categorias',
  verificarAutenticacion,
  async (req, res) => {
    try {
      console.log('📝 Creando categoría de checklist:', req.body);

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const { nombre, icono, orden } = req.body;

      if (!nombre) {
        return res.status(400).json({ error: 'El nombre es requerido' });
      }

      const nuevaCategoria = await postgresManager.addChecklistCategoria({
        nombre,
        icono,
        orden,
      });
      console.log('✅ Categoría creada:', nuevaCategoria);
      res.status(201).json(nuevaCategoria);
    } catch (error) {
      console.error('❌ Error al crear categoría:', error);
      res
        .status(500)
        .json({ error: 'Error al crear categoría', details: error.message });
    }
  }
);

// Eliminar categoría (soft delete)
app.delete(
  '/api/checklist/categorias/:id',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
    try {
      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const resultado = await postgresManager.deleteChecklistCategoria(
        req.params.id
      );
      if (!resultado) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }
      res.json({ success: true, message: 'Categoría eliminada correctamente' });
    } catch (error) {
      console.error('❌ Error al eliminar categoría:', error);
      res
        .status(500)
        .json({ error: 'Error al eliminar categoría', details: error.message });
    }
  }
);

// Obtener ítems del catálogo de checklist
app.get('/api/checklist/items', async (req, res) => {
  try {
    console.log('📥 GET /api/checklist/items');

    if (!postgresManager) {
      // Datos mock para fallback
      const mockItems = [
        {
          id: 1,
          nombre: 'Aire acondicionado',
          categoria_id: 1,
          categoria_slug: 'climatizacion',
          orden: 1,
        },
        {
          id: 2,
          nombre: 'Calefacción',
          categoria_id: 1,
          categoria_slug: 'climatizacion',
          orden: 2,
        },
        {
          id: 3,
          nombre: 'Ventilación',
          categoria_id: 1,
          categoria_slug: 'climatizacion',
          orden: 3,
        },
        {
          id: 4,
          nombre: 'Televisión',
          categoria_id: 2,
          categoria_slug: 'electronica',
          orden: 1,
        },
        {
          id: 5,
          nombre: 'Teléfono',
          categoria_id: 2,
          categoria_slug: 'electronica',
          orden: 2,
        },
      ];
      return res.json(mockItems);
    }

    const categoriaId = req.query.categoria_id
      ? parseInt(req.query.categoria_id)
      : null;
    const items = await postgresManager.getChecklistCatalogItems(categoriaId);
    console.log(`✅ Ítems obtenidos: ${items.length}`);
    res.json(items);
  } catch (error) {
    console.error('❌ Error al obtener ítems:', error);
    res
      .status(500)
      .json({ error: 'Error al obtener ítems', details: error.message });
  }
});

// Agregar nuevo ítem al catálogo
app.post('/api/checklist/items', verificarAutenticacion, async (req, res) => {
  try {
    console.log('📝 Creando ítem de checklist:', req.body);

    if (!postgresManager) {
      return res.status(500).json({ error: 'Base de datos no disponible' });
    }

    const { nombre, categoria_id, orden } = req.body;

    if (!nombre || !categoria_id) {
      return res
        .status(400)
        .json({ error: 'El nombre y categoria_id son requeridos' });
    }

    const nuevoItem = await postgresManager.addChecklistCatalogItem({
      nombre,
      categoria_id,
      orden,
    });
    console.log('✅ Ítem creado:', nuevoItem);
    res.status(201).json(nuevoItem);
  } catch (error) {
    console.error('❌ Error al crear ítem:', error);
    res
      .status(500)
      .json({ error: 'Error al crear ítem', details: error.message });
  }
});

// Eliminar ítem del catálogo (soft delete)
app.delete(
  '/api/checklist/items/:id',
  verificarAutenticacion,
  verificarAdmin,
  async (req, res) => {
    try {
      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      const resultado = await postgresManager.deleteChecklistCatalogItem(
        req.params.id
      );
      if (!resultado) {
        return res.status(404).json({ error: 'Ítem no encontrado' });
      }
      res.json({ success: true, message: 'Ítem eliminado correctamente' });
    } catch (error) {
      console.error('❌ Error al eliminar ítem:', error);
      res
        .status(500)
        .json({ error: 'Error al eliminar ítem', details: error.message });
    }
  }
);

// Obtener datos completos de checklist para todos los cuartos
app.get('/api/checklist/cuartos', async (req, res) => {
  try {
    console.log('📥 ========================================');
    console.log('📥 GET /api/checklist/cuartos');
    console.log('📥 Query params:', req.query);
    console.log('📥 postgresManager disponible:', !!postgresManager);
    console.log('📥 ========================================');

    if (!postgresManager) {
      console.log('📥 ⚠️ Sin conexión BD');
      return res.status(500).json({ error: 'Base de datos no disponible' });
    }

    // Intentar ejecutar migración si las tablas no existen
    try {
      await postgresManager.runChecklistMigration();
    } catch (migrationError) {
      console.warn(
        '📥 ⚠️ Migración ya ejecutada o error:',
        migrationError.message
      );
    }

    const filters = {};
    if (req.query.edificio_id) {
      filters.edificio_id = parseInt(req.query.edificio_id);
    }
    if (req.query.categoria_id) {
      filters.categoria_id = parseInt(req.query.categoria_id);
    }

    console.log('📥 Filtros aplicados:', filters);
    console.log('📥 Ejecutando getAllChecklistData...');

    const checklistData = await postgresManager.getAllChecklistData(filters);

    console.log('📥 ========================================');
    console.log(`📥 ✅ Datos obtenidos: ${checklistData.length} cuartos`);
    if (checklistData.length > 0) {
      console.log(
        '📥 Primer cuarto:',
        JSON.stringify(checklistData[0], null, 2)
      );
      console.log(
        '📥 Items del primer cuarto:',
        checklistData[0].items?.length || 0
      );
    } else {
      console.log('📥 ⚠️ No se encontraron cuartos con items');
    }
    console.log('📥 ========================================');

    res.json(checklistData);
  } catch (error) {
    console.error('📥 ❌ Error al obtener datos de checklist:', error);
    console.error('📥 Stack:', error.stack);
    res
      .status(500)
      .json({
        error: 'Error al obtener datos de checklist',
        details: error.message,
      });
  }
});

// Obtener datos de checklist para un cuarto específico
app.get('/api/checklist/cuartos/:id', async (req, res) => {
  try {
    console.log(`📥 GET /api/checklist/cuartos/${req.params.id}`);

    if (!postgresManager) {
      return res.status(500).json({ error: 'Base de datos no disponible' });
    }

    const cuartoId = parseInt(req.params.id);
    const items = await postgresManager.getChecklistByCuarto(cuartoId);

    if (items.length === 0) {
      return res
        .status(404)
        .json({ error: 'Cuarto no encontrado o sin ítems' });
    }

    // Agrupar en un solo objeto de cuarto
    const cuartoData = {
      cuarto_id: items[0].cuarto_id,
      numero: items[0].numero,
      estado_cuarto: items[0].estado_cuarto,
      edificio_id: items[0].edificio_id,
      edificio_nombre: items[0].edificio_nombre,
      items: items.map((row) => ({
        id: row.item_id,
        nombre: row.item_nombre,
        categoria: row.categoria_slug,
        categoria_id: row.categoria_id,
        categoria_nombre: row.categoria_nombre,
        estado: row.item_estado,
        observacion: row.observacion,
        foto_url: row.foto_url,
        ultimo_editor: row.ultimo_editor,
        fecha_ultima_edicion: row.fecha_ultima_edicion,
      })),
    };

    console.log(
      `✅ Datos de checklist para cuarto ${cuartoId}: ${cuartoData.items.length} ítems`
    );
    res.json(cuartoData);
  } catch (error) {
    console.error('❌ Error al obtener checklist del cuarto:', error);
    res
      .status(500)
      .json({
        error: 'Error al obtener checklist del cuarto',
        details: error.message,
      });
  }
});

// Actualizar estado de un ítem del checklist
app.put(
  '/api/checklist/cuartos/:cuartoId/items/:itemId',
  verificarAutenticacion,
  async (req, res) => {
    try {
      const cuartoId = parseInt(req.params.cuartoId);
      const itemId = parseInt(req.params.itemId);
      const { estado, observacion } = req.body;
      const usuarioId = req.usuario?.id;

      console.log(`📝 Actualizando ítem ${itemId} del cuarto ${cuartoId}:`, {
        estado,
        observacion,
      });

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      if (!estado) {
        return res.status(400).json({ error: 'El estado es requerido' });
      }

      const resultado = await postgresManager.updateChecklistItemEstado(
        cuartoId,
        itemId,
        estado,
        usuarioId,
        observacion
      );

      console.log('✅ Ítem actualizado:', resultado);
      res.json({ success: true, result: resultado });
    } catch (error) {
      console.error('❌ Error al actualizar ítem:', error);
      res
        .status(500)
        .json({ error: 'Error al actualizar ítem', details: error.message });
    }
  }
);

// Actualizar múltiples ítems a la vez
app.put(
  '/api/checklist/cuartos/:cuartoId/items',
  verificarAutenticacion,
  async (req, res) => {
    try {
      const cuartoId = parseInt(req.params.cuartoId);
      const { items } = req.body;
      const usuarioId = req.usuario?.id;

      console.log(
        `📝 Actualizando ${items?.length || 0} ítems del cuarto ${cuartoId}`
      );

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de ítems' });
      }

      const resultados = await postgresManager.updateChecklistItemsBulk(
        cuartoId,
        items,
        usuarioId
      );

      const exitosos = resultados.filter((r) => r.success).length;
      const fallidos = resultados.filter((r) => !r.success).length;

      console.log(
        `✅ Actualización masiva: ${exitosos} exitosos, ${fallidos} fallidos`
      );
      res.json({
        success: fallidos === 0,
        exitosos,
        fallidos,
        resultados,
      });
    } catch (error) {
      console.error('❌ Error en actualización masiva:', error);
      res
        .status(500)
        .json({
          error: 'Error en actualización masiva',
          details: error.message,
        });
    }
  }
);

// Obtener resumen de estados del checklist por cuarto
app.get('/api/checklist/cuartos/:id/resumen', async (req, res) => {
  try {
    const cuartoId = parseInt(req.params.id);
    console.log(`📥 GET /api/checklist/cuartos/${cuartoId}/resumen`);

    if (!postgresManager) {
      return res.status(500).json({ error: 'Base de datos no disponible' });
    }

    const resumen = await postgresManager.getChecklistResumenByCuarto(cuartoId);
    console.log(`✅ Resumen para cuarto ${cuartoId}:`, resumen);
    res.json(resumen);
  } catch (error) {
    console.error('❌ Error al obtener resumen:', error);
    res
      .status(500)
      .json({ error: 'Error al obtener resumen', details: error.message });
  }
});

// Obtener resumen general de todos los cuartos
app.get('/api/checklist/resumen', async (req, res) => {
  try {
    console.log('📥 GET /api/checklist/resumen');

    if (!postgresManager) {
      return res.status(500).json({ error: 'Base de datos no disponible' });
    }

    const resumen = await postgresManager.getChecklistResumenGeneral();
    console.log(`✅ Resumen general: ${resumen.length} cuartos`);
    res.json(resumen);
  } catch (error) {
    console.error('❌ Error al obtener resumen general:', error);
    res
      .status(500)
      .json({
        error: 'Error al obtener resumen general',
        details: error.message,
      });
  }
});

// ====================================
// RUTAS DE FOTOS DE CHECKLIST
// ====================================

// Configuración de multer para fotos de checklist (en memoria para UploadThing)
const uploadChecklistFotosMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB máximo para fotos
  },
  fileFilter: function (req, file, cb) {
    const extensionesPermitidas = [
      'png',
      'jpg',
      'jpeg',
      'gif',
      'webp',
      'heic',
      'heif',
    ];
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!extensionesPermitidas.includes(ext)) {
      cb(
        new Error(`Extensión .${ext} no permitida. Solo imágenes permitidas.`),
        false
      );
      return;
    }
    cb(null, true);
  },
});

// Obtener fotos de checklist por cuarto
app.get('/api/checklist/cuartos/:cuartoId/fotos', async (req, res) => {
  try {
    const cuartoId = parseInt(req.params.cuartoId);
    console.log(`📷 GET /api/checklist/cuartos/${cuartoId}/fotos`);

    if (!postgresManager) {
      return res.status(500).json({ error: 'Base de datos no disponible' });
    }

    // Ejecutar migración si no existe la tabla
    await postgresManager.runChecklistFotosMigration();

    const fotos = await postgresManager.getChecklistFotosByCuarto(cuartoId);
    console.log(`✅ ${fotos.length} fotos encontradas para cuarto ${cuartoId}`);
    res.json(fotos);
  } catch (error) {
    console.error('❌ Error al obtener fotos de checklist:', error);
    res
      .status(500)
      .json({ error: 'Error al obtener fotos', details: error.message });
  }
});

// Subir foto de checklist
app.post(
  '/api/checklist/cuartos/:cuartoId/fotos',
  verificarAutenticacion,
  uploadChecklistFotosMemory.single('foto'),
  async (req, res) => {
    try {
      const cuartoId = parseInt(req.params.cuartoId);
      const usuarioId = req.usuario?.id;
      const catalogItemId = req.body.catalog_item_id
        ? parseInt(req.body.catalog_item_id)
        : null;
      const notas = req.body.notas || null;

      console.log(`📷 Subiendo foto para cuarto ${cuartoId}`, {
        catalogItemId,
        notas,
      });

      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ninguna imagen' });
      }

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      // Ejecutar migración si no existe la tabla
      await postgresManager.runChecklistFotosMigration();

      console.log(
        `📤 Subiendo ${req.file.originalname} (${req.file.size} bytes) a UploadThing...`
      );
      // Sanitizar nombre de archivo (remover espacios y caracteres especiales)
      const ext = path.extname(req.file.originalname).toLowerCase();
      const timestamp = Date.now();
      const sanitizedFilename = `checklist_foto_${timestamp}${ext}`;
      console.log(
        `📷 Filename sanitizado: ${sanitizedFilename}, mimetype: ${req.file.mimetype}`
      );

      // Usar File global de Node.js en lugar de UTFile (workaround para UPLOAD_FAILED)
      const { Blob } = require('buffer');
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      const file = new File([blob], sanitizedFilename, {
        type: req.file.mimetype,
      });

      console.log(
        `📤 Iniciando upload a UploadThing (file size: ${file.size})...`
      );
      const uploadResult = await utapi.uploadFiles(file);

      if (uploadResult.error) {
        console.error('❌ Error subiendo a UploadThing:', uploadResult.error);
        return res.status(500).json({
          error: 'Error al subir imagen a almacenamiento',
          details: uploadResult.error.message,
        });
      }

      const { key, url } = uploadResult.data;
      console.log(`✅ Foto subida a UploadThing: ${url}`);

      // Guardar metadatos en base de datos
      const nuevaFoto = await postgresManager.createChecklistFoto({
        cuartoId,
        catalogItemId,
        fotoUrl: url,
        uploadthingKey: key,
        notas,
        usuarioId,
      });

      console.log('✅ Foto guardada en BD:', nuevaFoto.id);
      res.status(201).json(nuevaFoto);
    } catch (error) {
      console.error('❌ Error al subir foto de checklist:', error);
      res
        .status(500)
        .json({ error: 'Error al subir foto', details: error.message });
    }
  }
);

// Eliminar foto de checklist
app.delete(
  '/api/checklist/fotos/:id',
  verificarAutenticacion,
  async (req, res) => {
    try {
      const fotoId = parseInt(req.params.id);
      console.log(`📷 Eliminando foto de checklist ${fotoId}`);

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      // Obtener info de la foto antes de eliminar
      const foto = await postgresManager.getChecklistFotoById(fotoId);
      if (!foto) {
        return res.status(404).json({ error: 'Foto no encontrada' });
      }

      // Eliminar de base de datos
      const fotoEliminada = await postgresManager.deleteChecklistFoto(fotoId);

      // Eliminar de UploadThing si tiene key
      if (foto.uploadthing_key) {
        try {
          await utapi.deleteFiles(foto.uploadthing_key);
          console.log(
            '✅ Foto eliminada de UploadThing:',
            foto.uploadthing_key
          );
        } catch (utError) {
          console.warn('⚠️ Error eliminando de UploadThing:', utError.message);
        }
      }

      console.log(`✅ Foto ${fotoId} eliminada`);
      res.json({
        success: true,
        message: 'Foto eliminada correctamente',
        foto: fotoEliminada,
      });
    } catch (error) {
      console.error('❌ Error al eliminar foto de checklist:', error);
      res
        .status(500)
        .json({ error: 'Error al eliminar foto', details: error.message });
    }
  }
);

// ====================================
// RUTAS DE ADJUNTOS DE TAREAS (UploadThing)
// ====================================

// Configuración de multer para subida de archivos en MEMORIA (para serverless)
// Luego se suben a UploadThing usando UTApi
const uploadAdjuntosMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo
  },
  fileFilter: function (req, file, cb) {
    const extensionesPermitidas = [
      'pdf',
      'doc',
      'docx',
      'md',
      'txt',
      'csv',
      'xls',
      'xlsx',
      'xlsm',
      'png',
      'jpg',
      'jpeg',
      'gif',
      'webp',
      'zip',
      'rar',
      '7z',
      'tar',
      'gz',
    ];
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!extensionesPermitidas.includes(ext)) {
      cb(new Error(`Extensión .${ext} no permitida`), false);
      return;
    }
    cb(null, true);
  },
});

// Subir archivo adjunto a una tarea usando UploadThing (Server-side upload)
// El archivo se recibe via multer en memoria y luego se sube a UploadThing
app.post(
  '/api/tareas/:id/adjuntos',
  verificarAutenticacion,
  uploadAdjuntosMemory.single('archivo'),
  async (req, res) => {
    try {
      const tareaId = parseInt(req.params.id);
      const usuarioId = req.usuario?.id;

      console.log(`📎 Subiendo adjunto para tarea ${tareaId}`);

      // Verificar si hay archivo
      if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo' });
      }

      if (!postgresManager) {
        return res.status(500).json({ error: 'Base de datos no disponible' });
      }

      // Verificar que la tarea existe
      const tarea = await postgresManager.getTareaById(tareaId);
      if (!tarea) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
      }

      console.log(
        `📤 Subiendo ${req.file.originalname} (${req.file.size} bytes) a UploadThing...`
      );

      // Usar File global de Node.js en lugar de UTFile (workaround para UPLOAD_FAILED)
      const { Blob } = require('buffer');
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      const file = new File([blob], req.file.originalname, {
        type: req.file.mimetype,
      });

      // Subir a UploadThing usando UTApi
      const uploadResult = await utapi.uploadFiles(file);

      if (uploadResult.error) {
        console.error('❌ Error subiendo a UploadThing:', uploadResult.error);
        return res.status(500).json({
          error: 'Error al subir archivo a almacenamiento',
          details: uploadResult.error.message,
        });
      }

      const { key, url, name, size } = uploadResult.data;
      console.log(`✅ Archivo subido a UploadThing: ${url}`);

      // Obtener extensión
      const ext = path
        .extname(req.file.originalname)
        .toLowerCase()
        .replace('.', '');

      // Guardar metadatos en base de datos
      const query = `
            INSERT INTO tareas_adjuntos 
            (tarea_id, nombre_original, nombre_archivo, extension, mime_type, tamano_bytes, ruta_archivo, uploadthing_key, url, subido_por)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *, 
            (SELECT nombre FROM usuarios WHERE id = $10) as subido_por_nombre
        `;
      const values = [
        tareaId,
        req.file.originalname,
        key,
        ext,
        req.file.mimetype,
        req.file.size,
        url, // Guardamos la URL en ruta_archivo para compatibilidad
        key,
        url,
        usuarioId,
      ];

      const result = await postgresManager.pool.query(query, values);
      const nuevoAdjunto = result.rows[0];

      console.log(
        '✅ Adjunto guardado:',
        nuevoAdjunto.id,
        nuevoAdjunto.nombre_original
      );

      res.status(201).json(nuevoAdjunto);
    } catch (error) {
      console.error('❌ Error al subir adjunto:', error);
      res
        .status(500)
        .json({ error: 'Error al subir adjunto', details: error.message });
    }
  }
);

// Manejar rutas no encontradas (debe ir al final, después de todas las rutas)
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada', path: req.path });
});

// Exportar como función serverless para Vercel
// Con @vercel/node, podemos exportar la app de Express directamente
module.exports = app;
