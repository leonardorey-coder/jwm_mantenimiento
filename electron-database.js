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
     * Insertar datos reales del hotel
     */
    async insertInitialData() {
        // Verificar si ya hay datos
        const edificiosCount = this.db.prepare('SELECT COUNT(*) as count FROM edificios').get().count;
        
        if (edificiosCount > 0) {
            console.log('📋 Datos existentes encontrados, omitiendo inserción inicial');
            return;
        }

        console.log('📝 Insertando datos reales del hotel...');

        // Edificios reales del hotel
        const insertEdificio = this.db.prepare('INSERT INTO edificios (nombre, descripcion) VALUES (?, ?)');
        insertEdificio.run('Alfa', 'Edificio Alfa');
        insertEdificio.run('Bravo', 'Edificio Bravo');
        insertEdificio.run('Charly', 'Edificio Charly');
        insertEdificio.run('Eco', 'Edificio Eco');
        insertEdificio.run('Fox', 'Edificio Fox');
        insertEdificio.run('Casa Maat', 'Casa Maat');

        // Cuartos reales - obtener IDs de edificios
        const edificios = this.db.prepare('SELECT * FROM edificios').all();
        const edificioMap = {};
        edificios.forEach(e => edificioMap[e.nombre] = e.id);

        const insertCuarto = this.db.prepare('INSERT INTO cuartos (nombre, numero, edificio_id, estado, descripcion) VALUES (?, ?, ?, ?, ?)');
        
        // Datos reales de cuartos del hotel
        const cuartosReales = [
            // Edificio Alfa
            ['A101', '101', 'Alfa', '17/7/2024'], ['A102', '102', 'Alfa', null], ['A103', '103', 'Alfa', null],
            ['A104', '104', 'Alfa', null], ['A105', '105', 'Alfa', null], ['A106', '106', 'Alfa', null],
            ['S-A201', '201', 'Alfa', null], ['A202', '202', 'Alfa', null], ['A203', '203', 'Alfa', null],
            ['A204', '204', 'Alfa', null], ['A205', '205', 'Alfa', null], ['A206', '206', 'Alfa', null],
            ['A207', '207', 'Alfa', null], ['S-A208', '208', 'Alfa', null], ['A302', '302', 'Alfa', null],
            ['A303', '303', 'Alfa', null], ['A304', '304', 'Alfa', null], ['A305', '305', 'Alfa', null],
            ['A306', '306', 'Alfa', null], ['S-A301', '301', 'Alfa', null], ['S-A307', '307', 'Alfa', null],
            ['A401', '401', 'Alfa', null], ['A402', '402', 'Alfa', null], ['A403', '403', 'Alfa', null],
            ['A404', '404', 'Alfa', null], ['A405', '405', 'Alfa', null], ['A406', '406', 'Alfa', null],
            ['S-A401', '401s', 'Alfa', null], ['S-A407', '407s', 'Alfa', null], ['A501', '501', 'Alfa', null],
            ['A502', '502', 'Alfa', null], ['A503', '503', 'Alfa', null], ['A504', '504', 'Alfa', null],
            ['A505', '505', 'Alfa', null], ['A506', '506', 'Alfa', null], ['S-A501', '501s', 'Alfa', null],
            ['S-A507', '507s', 'Alfa', null],
            
            // Edificio Bravo (muestra)
            ['B101', '101', 'Bravo', null], ['B102', '102', 'Bravo', null], ['B103', '103', 'Bravo', null],
            ['B104', '104', 'Bravo', null], ['B105', '105', 'Bravo', '10/9/2024'], ['B106', '106', 'Bravo', null],
            ['B107', '107', 'Bravo', null], ['B108', '108', 'Bravo', null], ['B109', '109', 'Bravo', null],
            ['B110', '110', 'Bravo', null], ['B111', '111', 'Bravo', null], ['B112', '112', 'Bravo', null],
            ['B113', '113', 'Bravo', null], ['B114', '114', 'Bravo', null], ['B115', '115', 'Bravo', null],
            ['B201', '201', 'Bravo', null], ['B202', '202', 'Bravo', null], ['B203', '203', 'Bravo', '27/10/2024'],
            ['B204', '204', 'Bravo', null], ['B205', '205', 'Bravo', null], ['B206', '206', 'Bravo', null],
            ['B207', '207', 'Bravo', null], ['B208', '208', 'Bravo', null], ['B210', '210', 'Bravo', null],
            ['B211', '211', 'Bravo', null], ['B212', '212', 'Bravo', null], ['B213', '213', 'Bravo', null],
            ['B214', '214', 'Bravo', null], ['B215', '215', 'Bravo', null], ['B301', '301', 'Bravo', null],
            ['B302', '302', 'Bravo', null], ['B303', '303', 'Bravo', null], ['B304', '304', 'Bravo', null],
            ['B305', '305', 'Bravo', null], ['B306', '306', 'Bravo', null], ['B308', '308', 'Bravo', null],
            ['B309', '309', 'Bravo', null], ['B310', '310', 'Bravo', null], ['B311', '311', 'Bravo', null],
            ['B312', '312', 'Bravo', null], ['B313', '313', 'Bravo', null], ['B315', '315', 'Bravo', null],
            ['B401', '401', 'Bravo', null], ['B402', '402', 'Bravo', null], ['B403', '403', 'Bravo', null],
            ['B404', '404', 'Bravo', null], ['B405', '405', 'Bravo', null], ['B406', '406', 'Bravo', null],
            ['B407', '407', 'Bravo', null], ['B408', '408', 'Bravo', null], ['B409', '409', 'Bravo', null],
            ['B410', '410', 'Bravo', null], ['B411', '411', 'Bravo', null], ['B412', '412', 'Bravo', null],
            ['B413', '413', 'Bravo', null], ['B414', '414', 'Bravo', null], ['B415', '415', 'Bravo', null],
            
            // Edificio Charly
            ['C101', '101', 'Charly', null], ['C102', '102', 'Charly', null], ['C103', '103', 'Charly', null],
            ['C104', '104', 'Charly', null], ['C105', '105', 'Charly', null], ['C106', '106', 'Charly', null],
            ['C107', '107', 'Charly', null], ['C108', '108', 'Charly', null], ['C109', '109', 'Charly', null],
            ['C110', '110', 'Charly', null], ['C111', '111', 'Charly', null], ['C112', '112', 'Charly', '11/12/2024'],
            ['C113', '113', 'Charly', null], ['C201', '201', 'Charly', null], ['C202', '202', 'Charly', null]
        ];

        // Insertar cuartos reales
        cuartosReales.forEach(([nombre, numero, edificio, descripcion]) => {
            insertCuarto.run(nombre, numero, edificioMap[edificio], 'disponible', descripcion);
        });

        // Mantenimientos reales de la base de datos original
        const insertMantenimiento = this.db.prepare(`
            INSERT INTO mantenimientos (cuarto_id, tipo, descripcion, fecha_solicitud, estado, hora, dia_alerta) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        // Obtener algunos cuartos para los mantenimientos
        const cuartosInsertados = this.db.prepare('SELECT * FROM cuartos LIMIT 10').all();
        
        // Mantenimientos reales
        const mantenimientosReales = [
            [cuartosInsertados[0]?.id, 'normal', 'FOCOS FUNDIDOS', '2025-04-22', 'pendiente'],
            [cuartosInsertados[1]?.id, 'normal', 'Cerrar valvulas', '2025-04-22', 'pendiente'],
            [cuartosInsertados[2]?.id, 'normal', 'Foco fundido', '2025-04-22', 'pendiente'],
            [cuartosInsertados[3]?.id, 'normal', 'Foco fundido', '2025-04-22', 'pendiente'],
            [cuartosInsertados[4]?.id, 'rutina', 'Limpieza profunda semanal', null, 'pendiente', '09:00', '2025-07-25'],
            [cuartosInsertados[5]?.id, 'rutina', 'Revisión rutinaria de aires acondicionados', null, 'pendiente', '10:00', '2025-07-26'],
            [cuartosInsertados[6]?.id, 'rutina', 'Inspección de baño y plomería', null, 'pendiente', '14:30', '2025-07-26']
        ];

        mantenimientosReales.forEach(([cuarto_id, tipo, descripcion, fecha, estado, hora = null, dia_alerta = null]) => {
            if (cuarto_id) {
                insertMantenimiento.run(cuarto_id, tipo, descripcion, fecha, estado, hora, dia_alerta);
            }
        });

        const totalCuartos = this.db.prepare('SELECT COUNT(*) as count FROM cuartos').get().count;
        const totalEdificios = this.db.prepare('SELECT COUNT(*) as count FROM edificios').get().count;
        const totalMantenimientos = this.db.prepare('SELECT COUNT(*) as count FROM mantenimientos').get().count;
        
        console.log('✅ Datos reales del hotel insertados correctamente');
        console.log(`📊 ${totalEdificios} edificios, ${totalCuartos} cuartos, ${totalMantenimientos} mantenimientos`);
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
