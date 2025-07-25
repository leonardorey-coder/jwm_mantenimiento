/**
 * Módulo de base de datos offline para Electron
 * Maneja SQLite directamente sin servidor Express
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class ElectronDatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Inicializar la base de datos
     */
    async init() {
        try {
            // Ruta de la base de datos en el directorio de la aplicación
            const userDataPath = app.getPath('userData');
            const dbPath = path.join(userDataPath, 'finest_mant_cuartos.db');
            
            console.log('📁 Inicializando base de datos en:', dbPath);
            
            // Asegurar que el directorio existe
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            // Conectar a la base de datos
            this.db = new Database(dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            
            // Crear tablas si no existen
            await this.createTables();
            
            // Insertar datos iniciales si es la primera vez
            await this.insertInitialData();
            
            this.isInitialized = true;
            console.log('✅ Base de datos inicializada correctamente');
            
            return true;
        } catch (error) {
            console.error('❌ Error inicializando base de datos:', error);
            throw error;
        }
    }

    /**
     * Crear las tablas necesarias
     */
    async createTables() {
        const schemas = [
            `CREATE TABLE IF NOT EXISTS edificios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            `CREATE TABLE IF NOT EXISTS cuartos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                numero TEXT,
                edificio_id INTEGER NOT NULL,
                estado TEXT DEFAULT 'disponible',
                descripcion TEXT,
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (edificio_id) REFERENCES edificios(id)
            )`,
            
            `CREATE TABLE IF NOT EXISTS mantenimientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cuarto_id INTEGER NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'normal',
                descripcion TEXT NOT NULL,
                fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_solicitud DATE,
                estado TEXT DEFAULT 'pendiente',
                hora TIME,
                dia_alerta DATE,
                alerta_emitida INTEGER DEFAULT 0,
                fecha_emision DATETIME,
                FOREIGN KEY (cuarto_id) REFERENCES cuartos(id)
            )`
        ];

        for (const schema of schemas) {
            this.db.exec(schema);
        }

        console.log('✅ Tablas creadas/verificadas');
    }

    /**
     * Insertar datos iniciales si las tablas están vacías
     */
    async insertInitialData() {
        // Verificar si ya hay datos
        const edificiosCount = this.db.prepare('SELECT COUNT(*) as count FROM edificios').get().count;
        
        if (edificiosCount > 0) {
            console.log('📋 Datos existentes encontrados, omitiendo inserción inicial');
            return;
        }

        console.log('📝 Insertando datos iniciales...');

        // Insertar edificios
        const insertEdificio = this.db.prepare('INSERT INTO edificios (nombre, descripcion) VALUES (?, ?)');
        insertEdificio.run('Edificio A', 'Edificio principal del hotel');
        insertEdificio.run('Edificio B', 'Edificio secundario del hotel');
        insertEdificio.run('Edificio C', 'Torre ejecutiva');

        // Insertar cuartos
        const insertCuarto = this.db.prepare('INSERT INTO cuartos (nombre, numero, edificio_id, estado, descripcion) VALUES (?, ?, ?, ?, ?)');
        
        // Edificio A - Cuartos 101-120
        for (let i = 101; i <= 120; i++) {
            insertCuarto.run(`Habitación ${i}`, i.toString(), 1, 'disponible', `Habitación estándar ${i}`);
        }
        
        // Edificio B - Cuartos 201-230
        for (let i = 201; i <= 230; i++) {
            insertCuarto.run(`Habitación ${i}`, i.toString(), 2, 'disponible', `Habitación superior ${i}`);
        }
        
        // Edificio C - Cuartos 301-315
        for (let i = 301; i <= 315; i++) {
            insertCuarto.run(`Suite ${i}`, i.toString(), 3, 'disponible', `Suite ejecutiva ${i}`);
        }

        // Insertar algunos mantenimientos de ejemplo
        const insertMantenimiento = this.db.prepare(`
            INSERT INTO mantenimientos (cuarto_id, tipo, descripcion, fecha_solicitud, estado, hora, dia_alerta) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const hoy = new Date().toISOString().split('T')[0];
        const manana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        insertMantenimiento.run(1, 'normal', 'Limpieza general de habitación', hoy, 'pendiente', null, null);
        insertMantenimiento.run(3, 'normal', 'Reparar aire acondicionado', hoy, 'en_proceso', null, null);
        insertMantenimiento.run(5, 'rutina', 'Revisión rutinaria de minibar', null, 'pendiente', '10:00', manana);
        insertMantenimiento.run(7, 'rutina', 'Inspección de baño', null, 'pendiente', '14:30', manana);
        insertMantenimiento.run(2, 'rutina', 'Limpieza profunda', null, 'pendiente', '09:00', hoy);

        console.log('✅ Datos iniciales insertados');
    }

    /**
     * Obtener todos los cuartos con información de edificio
     */
    getCuartos() {
        const query = `
            SELECT c.*, e.nombre as edificio_nombre 
            FROM cuartos c 
            JOIN edificios e ON c.edificio_id = e.id 
            ORDER BY e.nombre, c.nombre
        `;
        return this.db.prepare(query).all();
    }

    /**
     * Obtener todos los edificios
     */
    getEdificios() {
        return this.db.prepare('SELECT * FROM edificios ORDER BY nombre').all();
    }

    /**
     * Obtener todos los mantenimientos con información de cuarto y edificio
     */
    getMantenimientos() {
        const query = `
            SELECT m.*, 
                   c.nombre as cuarto_nombre, 
                   c.numero as cuarto_numero,
                   e.nombre as edificio_nombre
            FROM mantenimientos m
            JOIN cuartos c ON m.cuarto_id = c.id
            JOIN edificios e ON c.edificio_id = e.id
            ORDER BY m.fecha_registro DESC
        `;
        return this.db.prepare(query).all();
    }

    /**
     * Crear un nuevo mantenimiento
     */
    createMantenimiento(data) {
        const { cuarto_id, tipo, descripcion, hora, dia_alerta } = data;
        
        const query = `
            INSERT INTO mantenimientos (cuarto_id, tipo, descripcion, hora, dia_alerta, fecha_solicitud)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const fecha_solicitud = new Date().toISOString().split('T')[0];
        
        const result = this.db.prepare(query).run(
            cuarto_id,
            tipo || 'normal',
            descripcion,
            hora || null,
            dia_alerta || null,
            fecha_solicitud
        );

        // Retornar el mantenimiento completo
        return this.getMantenimientoById(result.lastInsertRowid);
    }

    /**
     * Obtener un mantenimiento por ID con información completa
     */
    getMantenimientoById(id) {
        const query = `
            SELECT m.*, 
                   c.nombre as cuarto_nombre, 
                   c.numero as cuarto_numero,
                   e.nombre as edificio_nombre
            FROM mantenimientos m
            JOIN cuartos c ON m.cuarto_id = c.id
            JOIN edificios e ON c.edificio_id = e.id
            WHERE m.id = ?
        `;
        return this.db.prepare(query).get(id);
    }

    /**
     * Actualizar un mantenimiento
     */
    updateMantenimiento(id, data) {
        const fields = [];
        const values = [];
        
        ['descripcion', 'hora', 'dia_alerta', 'estado'].forEach(field => {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        });
        
        if (fields.length === 0) {
            throw new Error('No hay campos para actualizar');
        }
        
        values.push(id);
        
        const query = `UPDATE mantenimientos SET ${fields.join(', ')} WHERE id = ?`;
        const result = this.db.prepare(query).run(...values);
        
        if (result.changes === 0) {
            throw new Error('Mantenimiento no encontrado');
        }
        
        return this.getMantenimientoById(id);
    }

    /**
     * Eliminar un mantenimiento
     */
    deleteMantenimiento(id) {
        const result = this.db.prepare('DELETE FROM mantenimientos WHERE id = ?').run(id);
        
        if (result.changes === 0) {
            throw new Error('Mantenimiento no encontrado');
        }
        
        return { success: true, message: 'Mantenimiento eliminado correctamente' };
    }

    /**
     * Marcar alerta como emitida
     */
    markAlertAsEmitted(id) {
        const query = `
            UPDATE mantenimientos 
            SET alerta_emitida = 1, fecha_emision = CURRENT_TIMESTAMP 
            WHERE id = ?
        `;
        const result = this.db.prepare(query).run(id);
        
        if (result.changes === 0) {
            throw new Error('Alerta no encontrada');
        }
        
        return { success: true, message: 'Alerta marcada como emitida' };
    }

    /**
     * Cerrar la conexión a la base de datos
     */
    close() {
        if (this.db) {
            this.db.close();
            this.isInitialized = false;
            console.log('🔒 Base de datos cerrada');
        }
    }

    /**
     * Verificar si la base de datos está inicializada
     */
    isReady() {
        return this.isInitialized && this.db;
    }
}

// Exportar una instancia singleton
module.exports = new ElectronDatabaseManager();
