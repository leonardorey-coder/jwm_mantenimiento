/**
 * API de Mantenimientos
 * Endpoints para gestionar mantenimientos y alertas
 */

const express = require('express');
const router = express.Router();

module.exports = (dbManager) => {
    /**
     * GET /api/mantenimientos
     * Obtener todos los mantenimientos (con filtro opcional por cuarto)
     */
    router.get('/', async (req, res) => {
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
            res.status(500).json({ 
                error: 'Error al obtener mantenimientos', 
                details: error.message 
            });
        }
    });

    /**
     * GET /api/mantenimientos/:id
     * Obtener un mantenimiento específico por ID
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (dbManager) {
                const mantenimiento = await dbManager.getMantenimientoById(parseInt(id));
                
                if (!mantenimiento) {
                    return res.status(404).json({ error: 'Mantenimiento no encontrado' });
                }
                
                res.json(mantenimiento);
            } else {
                console.error('❌ Base de datos no disponible');
                res.status(500).json({ error: 'Base de datos no disponible' });
            }
        } catch (error) {
            console.error('Error al obtener mantenimiento:', error);
            res.status(500).json({ 
                error: 'Error al obtener mantenimiento', 
                details: error.message 
            });
        }
    });

    /**
     * POST /api/mantenimientos
     * Crear un nuevo mantenimiento
     */
    router.post('/', async (req, res) => {
        try {
            const { cuarto_id, descripcion, tipo = 'normal', hora, dia_alerta } = req.body;
            
            console.log('📝 Creando mantenimiento:', { cuarto_id, descripcion, tipo, hora, dia_alerta });
            
            // Validaciones
            if (!cuarto_id || !descripcion) {
                return res.status(400).json({ 
                    error: 'Faltan campos obligatorios', 
                    required: ['cuarto_id', 'descripcion'] 
                });
            }

            if (tipo === 'rutina' && !hora) {
                return res.status(400).json({ 
                    error: 'La hora es obligatoria para mantenimientos de tipo rutina' 
                });
            }
            
            if (dbManager) {
                // Convertir dia_alerta de fecha completa a solo el día (1-31)
                let diaAlertaNumero = null;
                if (dia_alerta) {
                    if (typeof dia_alerta === 'string' && dia_alerta.includes('-')) {
                        // Si es una fecha completa "2025-10-30", extraer solo el día del string
                        const partes = dia_alerta.split('-');
                        diaAlertaNumero = parseInt(partes[2]); // El día es la tercera parte
                    } else {
                        // Si ya es un número, usarlo directamente
                        diaAlertaNumero = parseInt(dia_alerta);
                    }
                }
                
                // Crear el objeto de datos del mantenimiento
                const dataMantenimiento = {
                    cuarto_id: parseInt(cuarto_id),
                    descripcion,
                    tipo,
                    hora: hora || null,
                    dia_alerta: diaAlertaNumero,
                    fecha_solicitud: new Date().toISOString().split('T')[0],
                    estado: 'pendiente'
                };
                
                const nuevoMantenimiento = await dbManager.insertMantenimiento(dataMantenimiento);
                console.log('✅ Mantenimiento creado:', nuevoMantenimiento);
                res.status(201).json(nuevoMantenimiento);
            } else {
                console.error('❌ Base de datos no disponible');
                res.status(500).json({ error: 'Base de datos no disponible' });
            }
        } catch (error) {
            console.error('❌ Error al crear mantenimiento:', error);
            res.status(500).json({ 
                error: 'Error al crear mantenimiento', 
                details: error.message 
            });
        }
    });

    /**
     * PUT /api/mantenimientos/:id
     * Actualizar un mantenimiento existente
     */
    router.put('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { descripcion, hora, dia_alerta, tipo, estado } = req.body;
            const mantenimientoId = parseInt(id);
            
            console.log('✏️ Actualizando mantenimiento:', mantenimientoId, { descripcion, hora, dia_alerta, tipo, estado });
            
            if (dbManager) {
                // Convertir dia_alerta de fecha completa a solo el día (1-31)
                let diaAlertaNumero = null;
                if (dia_alerta) {
                    if (typeof dia_alerta === 'string' && dia_alerta.includes('-')) {
                        // Si es una fecha completa "2025-10-30", extraer solo el día del string
                        const partes = dia_alerta.split('-');
                        diaAlertaNumero = parseInt(partes[2]); // El día es la tercera parte
                    } else {
                        // Si ya es un número, usarlo directamente
                        diaAlertaNumero = parseInt(dia_alerta);
                    }
                }
                
                // Crear objeto con solo los campos que se van a actualizar
                const camposActualizar = {};
                if (descripcion !== undefined) camposActualizar.descripcion = descripcion;
                if (hora !== undefined) camposActualizar.hora = hora || null;
                if (diaAlertaNumero !== null) camposActualizar.dia_alerta = diaAlertaNumero;
                if (tipo !== undefined) camposActualizar.tipo = tipo;
                if (estado !== undefined) camposActualizar.estado = estado;
                
                await dbManager.updateMantenimiento(mantenimientoId, camposActualizar);
                
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

    /**
     * PATCH /api/mantenimientos/:id/emitir
     * Marcar una alerta como emitida
     */
    router.patch('/:id/emitir', async (req, res) => {
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

    /**
     * DELETE /api/mantenimientos/:id
     * Eliminar un mantenimiento
     */
    router.delete('/:id', async (req, res) => {
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

    return router;
};

