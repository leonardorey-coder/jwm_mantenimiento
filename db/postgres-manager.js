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
