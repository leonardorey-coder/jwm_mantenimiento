const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const DatabaseManager = require('./db/better-sqlite-manager');

const app = express();
const PORT = process.env.PORT || 3000;

// Inicializar base de datos SQLite
let dbManager;

// Inicializar la aplicación
async function initializeApp() {
    try {
        dbManager = new DatabaseManager();
        await dbManager.initialize();
        console.log('Base de datos SQLite inicializada correctamente');
    } catch (error) {
        console.error('Error inicializando la base de datos:', error);
        console.log('Continuando sin base de datos SQLite - usando datos mock');
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
            // Usar datos mock
            res.json(mockData.edificios);
        }
    } catch (error) {
        console.error('Error al obtener edificios:', error);
        res.json(mockData.edificios); // Fallback a datos mock
    }
});

// Obtener cuartos
app.get('/api/cuartos', async (req, res) => {
    try {
        if (dbManager) {
            const cuartos = await dbManager.getCuartos();
            res.json(cuartos);
        } else {
            // Usar datos mock
            res.json(mockData.cuartos);
        }
    } catch (error) {
        console.error('Error al obtener cuartos:', error);
        res.json(mockData.cuartos); // Fallback a datos mock
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
            // Buscar en datos mock
            const cuarto = mockData.cuartos.find(c => c.id == req.params.id);
            if (!cuarto) {
                return res.status(404).json({ error: 'Cuarto no encontrado' });
            }
            res.json(cuarto);
        }
    } catch (error) {
        console.error('Error al obtener cuarto:', error);
        const cuarto = mockData.cuartos.find(c => c.id == req.params.id);
        if (cuarto) {
            res.json(cuarto);
        } else {
            res.status(404).json({ error: 'Cuarto no encontrado' });
        }
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
            // Usar datos mock
            let mantenimientos = mockData.mantenimientos;
            if (req.query.cuarto_id) {
                mantenimientos = mantenimientos.filter(m => m.cuarto_id == req.query.cuarto_id);
            }
            res.json(mantenimientos);
        }
    } catch (error) {
        console.error('Error al obtener mantenimientos:', error);
        let mantenimientos = mockData.mantenimientos;
        if (req.query.cuarto_id) {
            mantenimientos = mantenimientos.filter(m => m.cuarto_id == req.query.cuarto_id);
        }
        res.json(mantenimientos);
    }
});

// Agregar mantenimiento
app.post('/api/mantenimientos', async (req, res) => {
    try {
        const { cuarto_id, descripcion, tipo = 'normal', hora, dia_alerta } = req.body;
        
        console.log('📝 Creando mantenimiento:', { cuarto_id, descripcion, tipo, hora, dia_alerta });
        
        if (dbManager) {
            const nuevoMantenimiento = await dbManager.createMantenimiento(cuarto_id, descripcion, tipo, hora, dia_alerta);
            res.status(201).json(nuevoMantenimiento);
        } else {
            // Simular creación en datos mock con estructura completa
            const cuarto = mockData.cuartos.find(c => c.id == cuarto_id);
            const edificio = cuarto ? mockData.edificios.find(e => e.id === cuarto.edificio_id) : null;
            
            const nuevoMantenimiento = {
                id: mockData.mantenimientos.length + 1,
                cuarto_id: parseInt(cuarto_id),
                descripcion,
                tipo,
                hora: hora || null,
                dia_alerta: dia_alerta || null,
                fecha_registro: new Date().toISOString(),
                fecha_solicitud: new Date().toISOString().split('T')[0],
                estado: 'pendiente',
                cuarto_numero: cuarto?.numero || 'N/A',
                cuarto_nombre: cuarto?.numero || `Cuarto ${cuarto_id}`,
                edificio_nombre: edificio?.nombre || 'Edificio Desconocido'
            };
            
            mockData.mantenimientos.push(nuevoMantenimiento);
            
            console.log('✅ Mantenimiento mock creado:', nuevoMantenimiento);
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
        const { descripcion, hora, dia_alerta } = req.body;
        const mantenimientoId = parseInt(id);
        
        console.log('✏️ Actualizando mantenimiento:', mantenimientoId, { descripcion, hora, dia_alerta });
        
        if (dbManager) {
            await dbManager.updateMantenimiento(mantenimientoId, {
                descripcion,
                hora: hora || null,
                dia_alerta: dia_alerta || null
            });
        } else {
            // Actualizar en datos mock
            const mantenimiento = mockData.mantenimientos.find(m => m.id === mantenimientoId);
            if (mantenimiento) {
                mantenimiento.descripcion = descripcion;
                mantenimiento.hora = hora || null;
                mantenimiento.dia_alerta = dia_alerta || null;
                console.log('✅ Mantenimiento mock actualizado:', mantenimiento);
            } else {
                console.log('⚠️ Mantenimiento mock no encontrado para actualizar:', mantenimientoId);
                return res.status(404).json({ 
                    success: false, 
                    message: 'Mantenimiento no encontrado' 
                });
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Mantenimiento actualizado correctamente' 
        });
        
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
        } else {
            // Marcar en datos mock (agregar field fecha_emision)
            const mantenimiento = mockData.mantenimientos.find(m => m.id === mantenimientoId);
            if (mantenimiento) {
                mantenimiento.fecha_emision = new Date().toISOString();
                mantenimiento.emitida = true;
                console.log('✅ Alerta mock marcada como emitida:', mantenimiento);
            } else {
                console.log('⚠️ Mantenimiento mock no encontrado para marcar:', mantenimientoId);
                return res.status(404).json({ 
                    success: false, 
                    message: 'Mantenimiento no encontrado' 
                });
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Alerta marcada como emitida' 
        });
        
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
        } else {
            // Eliminar de datos mock
            const index = mockData.mantenimientos.findIndex(m => m.id === mantenimientoId);
            if (index !== -1) {
                const eliminado = mockData.mantenimientos.splice(index, 1)[0];
                console.log('✅ Mantenimiento mock eliminado:', eliminado);
            } else {
                console.log('⚠️ Mantenimiento mock no encontrado:', mantenimientoId);
                return res.status(404).json({ 
                    success: false, 
                    message: 'Mantenimiento no encontrado' 
                });
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Mantenimiento eliminado correctamente' 
        });
        
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
initializeApp().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
        console.log('JW Mantto - Sistema local de mantenimiento iniciado');
    });
}).catch(error => {
    console.error('Error iniciando la aplicación:', error);
    process.exit(1);
});
