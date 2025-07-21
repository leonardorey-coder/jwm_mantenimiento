const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const DatabaseManager = require('./db/sqlite-manager');

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
        process.exit(1);
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
// RUTAS DE LA API PARA SQLite
// ====================================

// Obtener edificios
app.get('/api/edificios', async (req, res) => {
    try {
        const edificios = await dbManager.getEdificios();
        res.json(edificios);
    } catch (error) {
        console.error('Error al obtener edificios:', error);
        res.status(500).json({ error: 'Error al obtener edificios' });
    }
});

// Obtener cuartos
app.get('/api/cuartos', async (req, res) => {
    try {
        const cuartos = await dbManager.getCuartos();
        res.json(cuartos);
    } catch (error) {
        console.error('Error al obtener cuartos:', error);
        res.status(500).json({ error: 'Error al obtener cuartos' });
    }
});

// Obtener cuarto específico
app.get('/api/cuartos/:id', async (req, res) => {
    try {
        const cuarto = await dbManager.getCuartoById(req.params.id);
        if (!cuarto) {
            return res.status(404).json({ error: 'Cuarto no encontrado' });
        }
        res.json(cuarto);
    } catch (error) {
        console.error('Error al obtener cuarto:', error);
        res.status(500).json({ error: 'Error al obtener cuarto' });
    }
});

// Obtener mantenimientos
app.get('/api/mantenimientos', async (req, res) => {
    try {
        const cuartoId = req.query.cuarto_id;
        const mantenimientos = await dbManager.getMantenimientos(cuartoId);
        res.json(mantenimientos);
    } catch (error) {
        console.error('Error al obtener mantenimientos:', error);
        res.status(500).json({ error: 'Error al obtener mantenimientos' });
    }
});

// Agregar mantenimiento
app.post('/api/mantenimientos', async (req, res) => {
    try {
        const { cuarto_id, descripcion, tipo = 'normal', hora, dia_alerta } = req.body;
        
        if (!cuarto_id || !descripcion) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cuarto ID y descripción son requeridos' 
            });
        }
        
        const id = await dbManager.insertMantenimiento({
            cuarto_id: parseInt(cuarto_id),
            descripcion,
            tipo,
            hora: hora || null,
            dia_alerta: dia_alerta || null
        });
        
        res.json({ 
            success: true, 
            id, 
            message: 'Mantenimiento agregado correctamente' 
        });
        
    } catch (error) {
        console.error('Error agregando mantenimiento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Actualizar mantenimiento
app.put('/api/mantenimientos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion, hora, dia_alerta } = req.body;
        
        await dbManager.updateMantenimiento(parseInt(id), {
            descripcion,
            hora: hora || null,
            dia_alerta: dia_alerta || null
        });
        
        res.json({ 
            success: true, 
            message: 'Mantenimiento actualizado correctamente' 
        });
        
    } catch (error) {
        console.error('Error actualizando mantenimiento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Marcar alerta como emitida
app.patch('/api/mantenimientos/:id/emitir', async (req, res) => {
    try {
        const { id } = req.params;
        
        await dbManager.marcarAlertaEmitida(parseInt(id));
        
        res.json({ 
            success: true, 
            message: 'Alerta marcada como emitida' 
        });
        
    } catch (error) {
        console.error('Error marcando alerta como emitida:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Eliminar mantenimiento
app.delete('/api/mantenimientos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await dbManager.deleteMantenimiento(parseInt(id));
        
        res.json({ 
            success: true, 
            message: 'Mantenimiento eliminado correctamente' 
        });
        
    } catch (error) {
        console.error('Error eliminando mantenimiento:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
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
    // Por ahora servir el index.php directamente
    res.sendFile(path.join(__dirname, 'index.php'));
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
