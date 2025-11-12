const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { dbConfig, validateConfig, displayConfig } = require('./config');

/**
 * Gestor de base de datos PostgreSQL
 * Soporta tanto instalación local como en la nube (Azure, AWS, etc.)
 */
class PostgresManager {
    constructor() {
        this.pool = null;
    }

    /**
     * Inicializa la conexión a PostgreSQL
     */
    async initialize() {
        try {
            console.log('🔌 Inicializando conexión a PostgreSQL...');
            
            // Validar configuración
            validateConfig();
            displayConfig();
            
            // Crear pool de conexiones
            this.pool = new Pool(dbConfig);
            
            // Manejar errores del pool
            this.pool.on('error', (err) => {
                console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
            });
            
            // Probar conexión
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            console.log('✅ Conexión a PostgreSQL establecida:', result.rows[0].now);
            client.release();
            
            // Crear tablas si no existen
            await this.createTables();
            
            console.log('✅ Base de datos PostgreSQL inicializada correctamente');
        } catch (error) {
            console.error('❌ Error inicializando PostgreSQL:', error);
            throw error;
        }
    }

    /**
     * Crea las tablas si no existen
     */
    async createTables() {
        try {
            // Verificar si las tablas ya existen
            const result = await this.pool.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('edificios', 'cuartos', 'mantenimientos')
            `);
            
            const tablesExist = parseInt(result.rows[0].count) === 3;
            
            if (tablesExist) {
                console.log('✅ Las tablas ya existen, no se ejecutará el esquema');
                return;
            }
            
            // Si no existen, crear las tablas básicas (sin DROP ni INSERT)
            console.log('📄 Creando tablas en la base de datos...');
            await this.createBasicTables();
            console.log('✅ Esquema de base de datos creado');
        } catch (error) {
            console.error('❌ Error creando tablas:', error);
            // No lanzar error, las tablas pueden ya existir
        }
    }

    /**
     * Crea las tablas básicas si no existe el archivo de esquema
     */
    async createBasicTables() {
        const queries = [
            `CREATE TABLE IF NOT EXISTS edificios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL UNIQUE,
                descripcion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS cuartos (
                id SERIAL PRIMARY KEY,
                numero VARCHAR(100) NOT NULL,
                edificio_id INTEGER NOT NULL,
                descripcion TEXT,
                estado VARCHAR(50) DEFAULT 'disponible',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (edificio_id) REFERENCES edificios(id) ON DELETE CASCADE,
                UNIQUE (numero, edificio_id)
            )`,
            `CREATE TABLE IF NOT EXISTS mantenimientos (
                id SERIAL PRIMARY KEY,
                cuarto_id INTEGER NOT NULL,
                descripcion TEXT NOT NULL,
                tipo VARCHAR(50) DEFAULT 'normal',
                estado VARCHAR(50) DEFAULT 'pendiente',
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_programada DATE,
                hora TIME,
                dia_alerta INTEGER,
                alerta_emitida BOOLEAN DEFAULT FALSE,
                usuario_creador VARCHAR(100) DEFAULT 'sistema',
                notas TEXT,
                FOREIGN KEY (cuarto_id) REFERENCES cuartos(id) ON DELETE CASCADE
            )`
        ];

        for (const query of queries) {
            await this.pool.query(query);
        }
    }

    /**
     * Obtener todos los edificios
     */
    async getEdificios() {
        const result = await this.pool.query(
            'SELECT * FROM edificios ORDER BY nombre'
        );
        return result.rows;
    }

    /**
     * Obtener todos los cuartos con información del edificio
     */
    async getCuartos() {
        const query = `
            SELECT c.*, e.nombre as edificio_nombre 
            FROM cuartos c 
            LEFT JOIN edificios e ON c.edificio_id = e.id 
            ORDER BY e.nombre, c.numero
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    /**
     * Obtener un cuarto específico por ID
     */
    async getCuartoById(id) {
        const query = `
            SELECT c.*, e.nombre as edificio_nombre 
            FROM cuartos c 
            LEFT JOIN edificios e ON c.edificio_id = e.id 
            WHERE c.id = $1
        `;
        const result = await this.pool.query(query, [id]);
        return result.rows[0] || null;
    }

    /**
     * Actualizar el estado de un cuarto
     * @param {number} id - ID del cuarto
     * @param {string} nuevoEstado - Nuevo estado del cuarto
     * @returns {Promise<Object>} Cuarto actualizado
     */
    async updateEstadoCuarto(id, nuevoEstado) {
        // Validar estados permitidos
        const estadosPermitidos = ['disponible', 'ocupado', 'mantenimiento', 'fuera_servicio'];
        if (!estadosPermitidos.includes(nuevoEstado)) {
            throw new Error(`Estado no válido. Debe ser uno de: ${estadosPermitidos.join(', ')}`);
        }
        
        const query = `
            UPDATE cuartos 
            SET estado = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;
        
        const result = await this.pool.query(query, [nuevoEstado, id]);
        
        if (result.rows.length === 0) {
            throw new Error('Cuarto no encontrado');
        }
        
        // Obtener el cuarto completo con información del edificio
        return await this.getCuartoById(id);
    }

    /**
     * Obtener cuartos filtrados por estado
     * @param {string} estado - Estado a filtrar
     * @returns {Promise<Array>} Array de cuartos con ese estado
     */
    async getCuartosPorEstado(estado) {
        const query = `
            SELECT c.*, e.nombre as edificio_nombre 
            FROM cuartos c 
            LEFT JOIN edificios e ON c.edificio_id = e.id 
            WHERE c.estado = $1
            ORDER BY e.nombre, c.numero
        `;
        const result = await this.pool.query(query, [estado]);
        return result.rows;
    }

    /**
     * Obtener estadísticas de estados de cuartos
     * @returns {Promise<Object>} Objeto con contadores por estado
     */
    async getEstadisticasEstados() {
        const query = `
            SELECT 
                estado,
                COUNT(*) as cantidad,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as porcentaje
            FROM cuartos
            GROUP BY estado
            ORDER BY cantidad DESC
        `;
        const result = await this.pool.query(query);
        
        // Convertir a objeto con formato { disponible: 10, ocupado: 5, ... }
        const estadisticas = {
            disponible: 0,
            ocupado: 0,
            mantenimiento: 0,
            fuera_servicio: 0,
            total: 0
        };
        
        result.rows.forEach(row => {
            estadisticas[row.estado] = parseInt(row.cantidad);
            estadisticas.total += parseInt(row.cantidad);
        });
        
        return estadisticas;
    }

    /**
     * Obtener configuración de estados con colores
     * @returns {Object} Objeto con estados y sus propiedades (color, label, icono)
     */
    getConfiguracionEstados() {
        return {
            disponible: {
                valor: 'disponible',
                label: 'Disponible',
                descripcion: 'Cuarto limpio y listo para ocupar',
                color: '#4CAF50',        // Verde
                colorHex: '4CAF50',
                colorRgb: 'rgb(76, 175, 80)',
                colorSecundario: '#E8F5E9',  // Verde claro para fondo
                icono: '🟢',
                prioridad: 1,
                disponibleParaReserva: true
            },
            ocupado: {
                valor: 'ocupado',
                label: 'Ocupado',
                descripcion: 'Huésped hospedado actualmente',
                color: '#2196F3',        // Azul
                colorHex: '2196F3',
                colorRgb: 'rgb(33, 150, 243)',
                colorSecundario: '#E3F2FD',  // Azul claro para fondo
                icono: '🔵',
                prioridad: 2,
                disponibleParaReserva: false
            },
            mantenimiento: {
                valor: 'mantenimiento',
                label: 'Mantenimiento',
                descripcion: 'En proceso de limpieza o reparación',
                color: '#FF9800',        // Naranja
                colorHex: 'FF9800',
                colorRgb: 'rgb(255, 152, 0)',
                colorSecundario: '#FFF3E0',  // Naranja claro para fondo
                icono: '🟠',
                prioridad: 3,
                disponibleParaReserva: false
            },
            fuera_servicio: {
                valor: 'fuera_servicio',
                label: 'Fuera de Servicio',
                descripcion: 'No disponible por remodelación o daños graves',
                color: '#616161',        // Gris oscuro
                colorHex: '616161',
                colorRgb: 'rgb(97, 97, 97)',
                colorSecundario: '#F5F5F5',  // Gris claro para fondo
                icono: '⚫',
                prioridad: 4,
                disponibleParaReserva: false
            }
        };
    }

    /**
     * Obtener estadísticas detalladas con colores
     * @returns {Promise<Object>} Estadísticas con información de colores
     */
    async getEstadisticasConColores() {
        const estadisticas = await this.getEstadisticasEstados();
        const configuracion = this.getConfiguracionEstados();
        
        // Combinar estadísticas con configuración de colores
        const resultado = {
            total: estadisticas.total,
            estados: {}
        };
        
        Object.keys(configuracion).forEach(estado => {
            resultado.estados[estado] = {
                ...configuracion[estado],
                cantidad: estadisticas[estado] || 0,
                porcentaje: estadisticas.total > 0 
                    ? ((estadisticas[estado] || 0) / estadisticas.total * 100).toFixed(1)
                    : 0
            };
        });
        
        return resultado;
    }

    /**
     * Obtener mantenimientos, opcionalmente filtrados por cuarto
     */
    async getMantenimientos(cuartoId = null) {
        let query = `
            SELECT m.*, c.numero as cuarto_numero, e.nombre as edificio_nombre
            FROM mantenimientos m
            LEFT JOIN cuartos c ON m.cuarto_id = c.id
            LEFT JOIN edificios e ON c.edificio_id = e.id
        `;
        
        let params = [];
        if (cuartoId) {
            query += ' WHERE m.cuarto_id = $1';
            params.push(cuartoId);
        }
        
        query += ' ORDER BY m.fecha_creacion DESC';
        
        const result = await this.pool.query(query, params);
        return result.rows;
    }

    /**
     * Insertar un nuevo mantenimiento
     */
    async insertMantenimiento(data) {
        const query = `
            INSERT INTO mantenimientos (
                cuarto_id, descripcion, tipo, hora, dia_alerta
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        
        const values = [
            data.cuarto_id,
            data.descripcion,
            data.tipo || 'normal',
            data.hora || null,
            data.dia_alerta || null
        ];
        
        const result = await this.pool.query(query, values);
        
        // Obtener el registro completo con joins
        if (result.rows[0]) {
            const fullQuery = `
                SELECT m.*, c.numero as cuarto_numero, e.nombre as edificio_nombre
                FROM mantenimientos m
                LEFT JOIN cuartos c ON m.cuarto_id = c.id
                LEFT JOIN edificios e ON c.edificio_id = e.id
                WHERE m.id = $1
            `;
            const fullResult = await this.pool.query(fullQuery, [result.rows[0].id]);
            return fullResult.rows[0];
        }
        
        return result.rows[0];
    }

    /**
     * Actualizar un mantenimiento existente
     */
    async updateMantenimiento(id, data) {
        const query = `
            UPDATE mantenimientos 
            SET descripcion = $1, hora = $2, dia_alerta = $3
            WHERE id = $4
            RETURNING *
        `;
        
        const values = [
            data.descripcion,
            data.hora,
            data.dia_alerta,
            id
        ];
        
        const result = await this.pool.query(query, values);
        return result.rows[0];
    }

    /**
     * Eliminar un mantenimiento
     */
    async deleteMantenimiento(id) {
        const query = 'DELETE FROM mantenimientos WHERE id = $1 RETURNING *';
        const result = await this.pool.query(query, [id]);
        return result.rows[0];
    }

    /**
     * Marcar alerta como emitida
     */
    async marcarAlertaEmitida(id) {
        const query = `
            UPDATE mantenimientos 
            SET alerta_emitida = TRUE 
            WHERE id = $1
            RETURNING *
        `;
        const result = await this.pool.query(query, [id]);
        return result.rows[0];
    }

    /**
     * Obtener mantenimientos pendientes de alerta
     * (útil para sistema de notificaciones)
     */
    async getMantenimientosPendientesAlerta() {
        const query = `
            SELECT m.*, c.numero as cuarto_numero, e.nombre as edificio_nombre
            FROM mantenimientos m
            LEFT JOIN cuartos c ON m.cuarto_id = c.id
            LEFT JOIN edificios e ON c.edificio_id = e.id
            WHERE m.dia_alerta IS NOT NULL 
            AND m.alerta_emitida = FALSE
            AND EXTRACT(DAY FROM CURRENT_DATE) >= m.dia_alerta
            ORDER BY m.dia_alerta, m.fecha_creacion
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    /**
     * Resetear alertas emitidas al inicio de mes
     * (puede ejecutarse mediante un cron job)
     */
    async resetearAlertasMensuales() {
        const query = `
            UPDATE mantenimientos 
            SET alerta_emitida = FALSE 
            WHERE dia_alerta IS NOT NULL 
            AND alerta_emitida = TRUE
            RETURNING COUNT(*) as resetted
        `;
        const result = await this.pool.query(query);
        return result.rows[0];
    }

    /**
     * Cerrar todas las conexiones del pool
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Pool de conexiones PostgreSQL cerrado');
        }
    }

    /**
     * Obtener información del estado del pool
     */
    getPoolStatus() {
        if (!this.pool) {
            return { connected: false };
        }
        
        return {
            connected: true,
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount
        };
    }
}

module.exports = PostgresManager;
