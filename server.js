const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const PostgresManager = require('./db/postgres-manager');

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializar base de datos PostgreSQL
let postgresManager;

// Inicializar la aplicación
async function initializeApp() {
    console.log('🚀 Iniciando aplicación servidor...');
    console.log('📁 Directorio de trabajo:', __dirname);
    console.log('🌐 Puerto configurado:', PORT);
    
    try {
        console.log('🗄️ Inicializando base de datos PostgreSQL...');
        postgresManager = new PostgresManager();
        await postgresManager.initialize();
        console.log('✅ Base de datos PostgreSQL inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando la base de datos:', error);
        console.log('🔄 Continuando sin base de datos PostgreSQL - usando datos mock');
        postgresManager = null; // Indica que no tenemos base de datos disponible
    }
}

// Configuración de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta específica para el root que evite caché
app.get('/', (req, res) => {
    console.log('📄 Sirviendo index.html con headers no-cache');
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': false,
        'Last-Modified': false
    });
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Headers anti-caché para todos los archivos .js
app.get('*.js', (req, res, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
});

// Headers anti-caché para todos los archivos .css
app.get('*.css', (req, res, next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Type': 'text/css'
    });
    next();
});

// Middleware para logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
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
        },
        {
            id: 3,
            cuarto_id: 1,
            tipo: 'rutina',
            descripcion: 'Inspección de seguridad',
            hora: '10:00:00',
            dia_alerta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            nivel_alerta: 'alta',
            fecha_registro: new Date().toISOString(),
            estado: 'pendiente',
            cuarto_numero: '101',
            cuarto_nombre: '101'
        },
        {
            id: 4,
            cuarto_id: 1,
            tipo: 'normal',
            descripcion: 'Revisión de plomería en baño',
            fecha_registro: new Date().toISOString(),
            estado: 'pendiente',
            cuarto_numero: '101',
            cuarto_nombre: '101'
        },
        {
            id: 5,
            cuarto_id: 2,
            tipo: 'normal',
            descripcion: 'Limpieza profunda',
            fecha_registro: new Date().toISOString(),
            estado: 'pendiente',
            cuarto_numero: '102',
            cuarto_nombre: '102'
        }
    ]
};

// ====================================
// RUTAS DE LA API
// ====================================

// Obtener edificios
app.get('/api/edificios', async (req, res) => {
    try {
        if (postgresManager) {
            const edificios = await postgresManager.getEdificios();
            res.json(edificios);
        } else {
            console.error('❌ Base de datos no disponible');
            res.status(500).json({ error: 'Base de datos no disponible' });
        }
    } catch (error) {
        console.error('Error al obtener edificios:', error);
        res.status(500).json({ error: 'Error al obtener edificios', details: error.message });
    }
});

// Obtener cuartos
app.get('/api/cuartos', async (req, res) => {
    try {
        if (postgresManager) {
            const cuartos = await postgresManager.getCuartos();
            res.json(cuartos);
        } else {
            console.error('❌ Base de datos no disponible');
            res.status(500).json({ error: 'Base de datos no disponible' });
        }
    } catch (error) {
        console.error('Error al obtener cuartos:', error);
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
            console.error('❌ Base de datos no disponible');
            res.status(500).json({ error: 'Base de datos no disponible' });
        }
    } catch (error) {
        console.error('Error al obtener cuarto:', error);
        res.status(500).json({ error: 'Error al obtener cuarto', details: error.message });
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
            console.error('❌ Base de datos no disponible');
            res.status(500).json({ error: 'Base de datos no disponible' });
        }
    } catch (error) {
        console.error('Error al obtener mantenimientos:', error);
        res.status(500).json({ error: 'Error al obtener mantenimientos', details: error.message });
    }
});

// Agregar mantenimiento
app.post('/api/mantenimientos', async (req, res) => {
    try {
        const { cuarto_id, descripcion, tipo = 'normal', hora, dia_alerta, nivel_alerta } = req.body;
        
        console.log('📝 Creando mantenimiento:', { cuarto_id, descripcion, tipo, hora, dia_alerta, nivel_alerta });
        
        if (postgresManager) {
            // Usar insertMantenimiento en lugar de createMantenimiento
            const dataMantenimiento = {
                cuarto_id: parseInt(cuarto_id),
                descripcion,
                tipo,
                hora: hora || null,
                dia_alerta: dia_alerta || null,
                nivel_alerta: nivel_alerta || null,
                fecha_solicitud: new Date().toISOString().split('T')[0],
                estado: 'pendiente'
            };
            
            const nuevoMantenimiento = await postgresManager.insertMantenimiento(dataMantenimiento);
            console.log('✅ Mantenimiento creado:', nuevoMantenimiento);
            res.status(201).json(nuevoMantenimiento);
        } else {
            console.error('❌ Base de datos no disponible');
            res.status(500).json({ error: 'Base de datos no disponible' });
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
        const { descripcion, hora, dia_alerta, nivel_alerta } = req.body;
        const mantenimientoId = parseInt(id);
        
        console.log('✏️ Actualizando mantenimiento:', mantenimientoId, { descripcion, hora, dia_alerta, nivel_alerta });
        
        if (postgresManager) {
            await postgresManager.updateMantenimiento(mantenimientoId, {
                descripcion,
                hora: hora || null,
                dia_alerta: dia_alerta || null,
                nivel_alerta: nivel_alerta || null
            });
            
            res.json({ 
                success: true, 
                message: 'Mantenimiento actualizado correctamente' 
            });
        } else {
            console.error('❌ Base de datos no disponible');
            res.status(500).json({ error: 'Base de datos no disponible' });
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
            console.error('❌ Base de datos no disponible');
            res.status(500).json({ error: 'Base de datos no disponible' });
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
            console.error('❌ Base de datos no disponible');
            res.status(500).json({ error: 'Base de datos no disponible' });
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
// RUTAS PARA SERVIR LA APLICACIÓN WEB
// ====================================

// Ruta principal - servir la página principal
app.get('/', (req, res) => {
    // Servir index.html para PWA
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Archivo index.html no encontrado');
    }
});

// ====================================
// SERVIDOR
// ====================================

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('Cerrando servidor...');
    if (postgresManager) {
        postgresManager.close();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Cerrando servidor...');
    if (postgresManager) {
        postgresManager.close();
    }
    process.exit(0);
});

// Inicializar y arrancar servidor
console.log('🎯 Iniciando proceso de arranque del servidor...');
initializeApp().then(() => {
    console.log('🔌 Intentando iniciar servidor en puerto:', PORT);
    
    const server = app.listen(PORT, () => {
        console.log('✅ Servidor ejecutándose en http://localhost:' + PORT);
        console.log('🏨 JW Mantto - Sistema local de mantenimiento iniciado');
        console.log('📊 Estado de la base de datos:', postgresManager ? 'PostgreSQL conectado' : 'Modo mock');
        console.log('📄 Archivos estáticos servidos desde:', __dirname);
    });
    
    server.on('error', (error) => {
        console.error('❌ Error del servidor:', error);
        if (error.code === 'EADDRINUSE') {
            console.error('🚫 Puerto', PORT, 'ya está en uso');
            console.log('💡 Solución: Ejecutar "lsof -ti:' + PORT + ' | xargs kill -9" para liberar el puerto');
        }
    });
    
}).catch(error => {
    console.error('💥 Error crítico iniciando la aplicación:', error);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
});
