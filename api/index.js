/**
 * API Routes Index
 * Centraliza todas las rutas de la API
 */

const edificiosRouter = require('./edificios');
const cuartosRouter = require('./cuartos');
const mantenimientosRouter = require('./mantenimientos');

/**
 * Configurar todas las rutas de la API
 * @param {Express} app - Instancia de Express
 * @param {Object} dbManager - Instancia del gestor de base de datos
 */
function setupApiRoutes(app, dbManager) {
    console.log('📋 Configurando rutas de API...');
    
    // Ruta de health check
    app.get('/api/health', (req, res) => {
        res.json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            database: dbManager ? 'connected' : 'disconnected'
        });
    });
    
    // Configurar rutas de recursos
    app.use('/api/edificios', edificiosRouter(dbManager));
    app.use('/api/cuartos', cuartosRouter(dbManager));
    app.use('/api/mantenimientos', mantenimientosRouter(dbManager));
    
    console.log('✅ Rutas de API configuradas correctamente');
}

module.exports = setupApiRoutes;

