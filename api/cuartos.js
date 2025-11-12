/**
 * API de Cuartos
 * Endpoints para gestionar cuartos/habitaciones
 */

const express = require('express');
const router = express.Router();

module.exports = (dbManager) => {
    /**
     * GET /api/cuartos
     * Obtener todos los cuartos
     */
    router.get('/', async (req, res) => {
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
            res.status(500).json({ 
                error: 'Error al obtener cuartos', 
                details: error.message 
            });
        }
    });

    /**
     * GET /api/cuartos/:id
     * Obtener un cuarto específico por ID
     */
    router.get('/:id', async (req, res) => {
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
            res.status(500).json({ 
                error: 'Error al obtener cuarto', 
                details: error.message 
            });
        }
    });

    /**
     * POST /api/cuartos
     * Crear un nuevo cuarto
     */
    router.post('/', async (req, res) => {
        try {
            const { numero, nombre, edificio_id, descripcion } = req.body;
            
            if (!numero || !edificio_id) {
                return res.status(400).json({ 
                    error: 'Faltan campos obligatorios', 
                    required: ['numero', 'edificio_id'] 
                });
            }
            
            if (dbManager) {
                const nuevoCuarto = await dbManager.createCuarto({
                    numero,
                    nombre: nombre || numero,
                    edificio_id: parseInt(edificio_id),
                    descripcion: descripcion || null
                });
                
                console.log('✅ Cuarto creado:', nuevoCuarto);
                res.status(201).json(nuevoCuarto);
            } else {
                console.error('❌ Base de datos no disponible');
                res.status(500).json({ error: 'Base de datos no disponible' });
            }
        } catch (error) {
            console.error('Error al crear cuarto:', error);
            res.status(500).json({ 
                error: 'Error al crear cuarto', 
                details: error.message 
            });
        }
    });

    /**
     * PUT /api/cuartos/:id
     * Actualizar un cuarto existente
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { numero, nombre, edificio_id, descripcion } = req.body;
            
            if (dbManager) {
                await dbManager.updateCuarto(parseInt(id), {
                    numero,
                    nombre,
                    edificio_id: edificio_id ? parseInt(edificio_id) : undefined,
                    descripcion
                });
                
                res.json({ 
                    success: true, 
                    message: 'Cuarto actualizado correctamente' 
                });
            } else {
                console.error('❌ Base de datos no disponible');
                res.status(500).json({ error: 'Base de datos no disponible' });
            }
        } catch (error) {
            console.error('Error al actualizar cuarto:', error);
            res.status(500).json({ 
                error: 'Error al actualizar cuarto', 
                details: error.message 
            });
        }
    });

    /**
     * DELETE /api/cuartos/:id
     * Eliminar un cuarto
     */
    router.delete('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (dbManager) {
                await dbManager.deleteCuarto(parseInt(id));
                
                res.json({ 
                    success: true, 
                    message: 'Cuarto eliminado correctamente' 
                });
            } else {
                console.error('❌ Base de datos no disponible');
                res.status(500).json({ error: 'Base de datos no disponible' });
            }
        } catch (error) {
            console.error('Error al eliminar cuarto:', error);
            res.status(500).json({ 
                error: 'Error al eliminar cuarto', 
                details: error.message 
            });
        }
    });

    // ==========================================
    // ENDPOINTS PARA GESTIÓN DE ESTADOS
    // ==========================================

    /**
     * PATCH /api/cuartos/:id/estado
     * Actualizar el estado de un cuarto
     * 
     * Estados permitidos:
     * - disponible: Cuarto limpio y listo para ocupar
     * - ocupado: Huésped hospedado actualmente
     * - mantenimiento: En proceso de limpieza o reparación
     * - fuera_servicio: No disponible por remodelación o daños graves
     */
    router.patch('/:id/estado', async (req, res) => {
        try {
            const { id } = req.params;
            const { estado } = req.body;
            
            console.log(`🔄 Cambiando estado del cuarto ${id} a: ${estado}`);
            
            // Validar que se envió el estado
            if (!estado) {
                return res.status(400).json({ 
                    error: 'El campo "estado" es obligatorio',
                    estadosPermitidos: ['disponible', 'ocupado', 'mantenimiento', 'fuera_servicio']
                });
            }
            
            if (!dbManager) {
                return res.status(500).json({ error: 'Base de datos no disponible' });
            }
            
            // Actualizar estado
            const cuartoActualizado = await dbManager.updateEstadoCuarto(
                parseInt(id), 
                estado
            );
            
            console.log(`✅ Estado actualizado:`, cuartoActualizado);
            
            res.json({ 
                success: true, 
                message: `Estado cambiado a "${estado}" correctamente`,
                cuarto: cuartoActualizado
            });
            
        } catch (error) {
            console.error('❌ Error actualizando estado:', error);
            res.status(400).json({ 
                error: 'Error al actualizar estado', 
                details: error.message 
            });
        }
    });

    /**
     * GET /api/cuartos/estado/:estado
     * Obtener cuartos filtrados por estado específico
     */
    router.get('/estado/:estado', async (req, res) => {
        try {
            const { estado } = req.params;
            
            console.log(`🔍 Buscando cuartos con estado: ${estado}`);
            
            if (!dbManager) {
                return res.status(500).json({ error: 'Base de datos no disponible' });
            }
            
            const cuartos = await dbManager.getCuartosPorEstado(estado);
            
            console.log(`✅ Encontrados ${cuartos.length} cuartos con estado "${estado}"`);
            
            res.json({
                estado,
                total: cuartos.length,
                cuartos
            });
            
        } catch (error) {
            console.error('Error al filtrar cuartos por estado:', error);
            res.status(500).json({ 
                error: 'Error al filtrar cuartos', 
                details: error.message 
            });
        }
    });

    /**
     * GET /api/cuartos/estadisticas/estados
     * Obtener estadísticas de estados de todos los cuartos
     * 
     * Retorna contadores y porcentajes por cada estado
     */
    router.get('/estadisticas/estados', async (req, res) => {
        try {
            console.log('📊 Obteniendo estadísticas de estados');
            
            if (!dbManager) {
                return res.status(500).json({ error: 'Base de datos no disponible' });
            }
            
            const estadisticas = await dbManager.getEstadisticasEstados();
            
            console.log('✅ Estadísticas obtenidas:', estadisticas);
            
            res.json({
                success: true,
                estadisticas
            });
            
        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            res.status(500).json({ 
                error: 'Error al obtener estadísticas', 
                details: error.message 
            });
        }
    });

    /**
     * GET /api/cuartos/configuracion/estados
     * Obtener configuración de estados con colores e información
     * 
     * Retorna la configuración completa de cada estado incluyendo:
     * - Color principal y secundario
     * - Icono
     * - Descripción
     * - Prioridad
     */
    router.get('/configuracion/estados', async (req, res) => {
        try {
            console.log('🎨 Obteniendo configuración de estados con colores');
            
            if (!dbManager) {
                return res.status(500).json({ error: 'Base de datos no disponible' });
            }
            
            const configuracion = dbManager.getConfiguracionEstados();
            
            console.log('✅ Configuración obtenida');
            
            res.json({
                success: true,
                estados: configuracion,
                version: '1.0',
                descripcion: 'Configuración de estados de cuartos con paleta de colores'
            });
            
        } catch (error) {
            console.error('Error al obtener configuración:', error);
            res.status(500).json({ 
                error: 'Error al obtener configuración', 
                details: error.message 
            });
        }
    });

    /**
     * GET /api/cuartos/dashboard/estados
     * Obtener estadísticas completas con colores para dashboard
     * 
     * Combina estadísticas de uso con configuración de colores
     * Ideal para renderizar dashboards visuales
     */
    router.get('/dashboard/estados', async (req, res) => {
        try {
            console.log('📊🎨 Obteniendo dashboard completo de estados');
            
            if (!dbManager) {
                return res.status(500).json({ error: 'Base de datos no disponible' });
            }
            
            const dashboard = await dbManager.getEstadisticasConColores();
            
            console.log('✅ Dashboard generado:', {
                total: dashboard.total,
                estados: Object.keys(dashboard.estados).length
            });
            
            res.json({
                success: true,
                dashboard,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('Error al generar dashboard:', error);
            res.status(500).json({ 
                error: 'Error al generar dashboard', 
                details: error.message 
            });
        }
    });

    return router;
};

