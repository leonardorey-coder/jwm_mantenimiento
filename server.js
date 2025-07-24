const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const DatabaseManager = require('./db/better-sqlite-manager');

const app = express();
const PORT = process.env.PORT || 3001; // Cambiado a 3001 para coincidir con Electron

// Inicializar base de datos SQLite
let dbManager;

// Inicializar la aplicación
async function initializeApp() {
    console.log('🚀 Iniciando aplicación servidor...');
    console.log('📁 Directorio de trabajo:', __dirname);
    console.log('🌐 Puerto configurado:', PORT);
    
    try {
        console.log('🗄️ Inicializando base de datos SQLite...');
        dbManager = new DatabaseManager();
        await dbManager.initialize();
        console.log('✅ Base de datos SQLite inicializada correctamente');
    } catch (error) {
        console.error('❌ Error inicializando la base de datos:', error);
        console.log('🔄 Continuando sin base de datos SQLite - usando datos mock');
        dbManager = null; // Indica que no tenemos base de datos disponible
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
        { id: 1, nombre: 'Edificio A', descripcion: 'Edificio principal' },
        { id: 2, nombre: 'Edificio B', descripcion: 'Edificio secundario' }
    ],
    cuartos: [
        { id: 1, numero: '101', edificio_id: 1, edificio_nombre: 'Edificio A', estado: 'ocupado' },
        { id: 2, numero: '102', edificio_id: 1, edificio_nombre: 'Edificio A', estado: 'libre' },
        { id: 3, numero: '201', edificio_id: 2, edificio_nombre: 'Edificio B', estado: 'mantenimiento' }
    ],
    mantenimientos: [
        {
            id: 1,
            cuarto_id: 1,
            tipo: 'limpieza',
            descripcion: 'Limpieza general',
            fecha_solicitud: '2024-07-21',
            estado: 'pendiente',
            cuarto_numero: '101'
        }
    ]
};

// ====================================
// RUTAS DE LA API
// ====================================

// Obtener edificios
app.get('/api/edificios', async (req, res) => {
    try {
        if (dbManager) {
            const edificios = await dbManager.getEdificios();
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
        if (dbManager) {
            const cuartos = await dbManager.getCuartos();
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
        if (dbManager) {
            const cuarto = await dbManager.getCuartoById(req.params.id);
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
        if (dbManager) {
            const cuartoId = req.query.cuarto_id;
            const mantenimientos = await dbManager.getMantenimientos(cuartoId);
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
        const { cuarto_id, descripcion, tipo = 'normal', hora, dia_alerta } = req.body;
        
        console.log('📝 Creando mantenimiento:', { cuarto_id, descripcion, tipo, hora, dia_alerta });
        
        if (dbManager) {
            // Usar insertMantenimiento en lugar de createMantenimiento
            const dataMantenimiento = {
                cuarto_id: parseInt(cuarto_id),
                descripcion,
                tipo,
                hora: hora || null,
                dia_alerta: dia_alerta || null,
                fecha_solicitud: new Date().toISOString().split('T')[0],
                estado: 'pendiente'
            };
            
            const nuevoMantenimiento = await dbManager.insertMantenimiento(dataMantenimiento);
            console.log('✅ Mantenimiento SQLite creado:', nuevoMantenimiento);
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
        const { descripcion, hora, dia_alerta } = req.body;
        const mantenimientoId = parseInt(id);
        
        console.log('✏️ Actualizando mantenimiento:', mantenimientoId, { descripcion, hora, dia_alerta });
        
        if (dbManager) {
            await dbManager.updateMantenimiento(mantenimientoId, {
                descripcion,
                hora: hora || null,
                dia_alerta: dia_alerta || null
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
        
        if (dbManager) {
            await dbManager.marcarAlertaEmitida(mantenimientoId);
            
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
        
        if (dbManager) {
            await dbManager.deleteMantenimiento(mantenimientoId);
            
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

// Endpoint para procesar formularios (simular procesar.php)
app.post('/procesar', async (req, res) => {
    try {
        const { accion } = req.body;
        
        if (accion === 'agregar_mantenimiento') {
            const result = await dbManager.addMantenimiento(req.body);
            
            // Redirigir de vuelta al index con mensaje de éxito
            res.redirect('/?success=1');
        } else {
            res.status(400).json({ error: 'Acción no válida' });
        }
    } catch (error) {
        console.error('Error en procesar:', error);
        res.redirect('/?error=1');
    }
});

// Endpoint para obtener datos PHP (simular obtener_cuarto.php, etc.)
app.get('/obtener_cuarto.php', async (req, res) => {
    try {
        const cuartos = await dbManager.getCuartos();
        res.json(cuartos);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

app.get('/obtener_mantenimiento.php', async (req, res) => {
    try {
        const cuartoId = req.query.cuarto_id;
        const mantenimientos = await dbManager.getMantenimientos(cuartoId);
        res.json(mantenimientos);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

// Servir index.php como archivo estático (necesitaremos convertirlo a HTML)
app.get('/index.php', (req, res) => {
    // Por ahora redirigir al index.html
    res.redirect('/');
});

// Ruta principal - servir la página principal
app.get('/', (req, res) => {
    // Servir index.html para PWA/Electron
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Fallback al index.php si no existe index.html
        res.sendFile(path.join(__dirname, 'index.php'));
    }
});

// ====================================
// SERVIDOR
// ====================================

// Manejar cierre graceful
process.on('SIGINT', () => {
    console.log('Cerrando servidor...');
    if (dbManager) {
        dbManager.close();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Cerrando servidor...');
    if (dbManager) {
        dbManager.close();
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
        console.log('📊 Estado de la base de datos:', dbManager ? 'SQLite conectado' : 'Modo mock');
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
