/**
 * API de Edificios
 * Endpoints para gestionar edificios
 */

const express = require('express');
const router = express.Router();

module.exports = (dbManager) => {
    /**
     * GET /api/edificios
     * Obtener todos los edificios
     */
    router.get('/', async (req, res) => {
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
            res.status(500).json({ 
                error: 'Error al obtener edificios', 
                details: error.message 
            });
        }
    });

    /**
     * GET /api/edificios/:id
     * Obtener un edificio específico por ID
     */
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            
            if (dbManager) {
                const edificio = await dbManager.getEdificioById(parseInt(id));
                
                if (!edificio) {
                    return res.status(404).json({ error: 'Edificio no encontrado' });
                }
                
                res.json(edificio);
            } else {
                console.error('❌ Base de datos no disponible');
                res.status(500).json({ error: 'Base de datos no disponible' });
            }
        } catch (error) {
            console.error('Error al obtener edificio:', error);
            res.status(500).json({ 
                error: 'Error al obtener edificio', 
                details: error.message 
            });
        }
    });

    return router;
};

