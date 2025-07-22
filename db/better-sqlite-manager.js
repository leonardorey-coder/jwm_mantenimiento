const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuración de la base de datos SQLite con better-sqlite3
class DatabaseManager {
    constructor() {
        // Determinar la ubicación de la base de datos según el entorno
        this.dbPath = this.getDatabasePath();
        this.db = null;
    }

    getDatabasePath() {
        const isDev = process.env.NODE_ENV === 'development';
        
        if (isDev) {
            // En desarrollo, usar la carpeta local
            return path.join(__dirname, 'jwmantto.db');
        } else {
            // En producción, usar directorio de datos del usuario
            const userDataPath = path.join(os.homedir(), '.jwmantto');
            
            // Crear el directorio si no existe
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true });
            }
            
            return path.join(userDataPath, 'jwmantto.db');
        }
    }

    async initialize() {
        try {
            console.log('Base de datos SQLite inicializada en:', this.dbPath);
            
            // Abrir la base de datos
            this.db = new Database(this.dbPath);
            
            // Habilitar claves foráneas
            this.db.exec('PRAGMA foreign_keys = ON');
            
            // Crear tablas si no existen
            await this.createTables();
            
            // Insertar datos iniciales si no existen
            await this.insertInitialData();
            
            console.log('Base de datos SQLite inicializada correctamente');
        } catch (error) {
            console.error('Error inicializando la base de datos:', error);
            throw error;
        }
    }

    createTables() {
        // Crear tabla edificios
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS edificios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Crear tabla cuartos
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS cuartos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero TEXT NOT NULL,
                edificio_id INTEGER NOT NULL,
                descripcion TEXT,
                estado TEXT DEFAULT 'disponible',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (edificio_id) REFERENCES edificios(id)
            )
        `);

        // Crear tabla mantenimientos
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS mantenimientos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cuarto_id INTEGER NOT NULL,
                descripcion TEXT NOT NULL,
                tipo TEXT DEFAULT 'normal',
                estado TEXT DEFAULT 'pendiente',
                fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_programada DATE,
                hora TIME,
                dia_alerta INTEGER,
                alerta_emitida BOOLEAN DEFAULT FALSE,
                usuario_creador TEXT DEFAULT 'sistema',
                notas TEXT,
                FOREIGN KEY (cuarto_id) REFERENCES cuartos(id)
            )
        `);
    }

    insertInitialData() {
        // Verificar si ya existen datos
        const countEdificios = this.db.prepare('SELECT COUNT(*) as count FROM edificios').get();
        
        if (countEdificios.count > 0) {
            console.log('Los datos iniciales ya existen, omitiendo inserción');
            return;
        }

        // Insertar edificios de ejemplo
        const insertEdificio = this.db.prepare('INSERT INTO edificios (nombre, descripcion) VALUES (?, ?)');
        
        const edificios = [
            ['Torre Principal', 'Edificio principal del hotel'],
            ['Torre Norte', 'Torre norte con vista al mar'],
            ['Torre Sur', 'Torre sur con vista a la ciudad'],
            ['Villas', 'Villas independientes']
        ];

        for (const edificio of edificios) {
            insertEdificio.run(...edificio);
        }

        // Insertar cuartos de ejemplo
        const insertCuarto = this.db.prepare('INSERT INTO cuartos (numero, edificio_id, descripcion, estado) VALUES (?, ?, ?, ?)');
        
        const cuartos = [
            // Torre Principal
            ['101', 1, 'Suite presidencial', 'disponible'],
            ['102', 1, 'Suite ejecutiva', 'disponible'],
            ['103', 1, 'Habitación estándar', 'disponible'],
            ['201', 1, 'Suite junior', 'disponible'],
            ['202', 1, 'Habitación estándar', 'disponible'],
            
            // Torre Norte
            ['N101', 2, 'Suite con vista al mar', 'disponible'],
            ['N102', 2, 'Habitación premium', 'disponible'],
            ['N201', 2, 'Suite familiar', 'disponible'],
            
            // Torre Sur
            ['S101', 3, 'Suite ejecutiva', 'disponible'],
            ['S102', 3, 'Habitación estándar', 'disponible'],
            ['S201', 3, 'Suite junior', 'disponible'],
            
            // Villas
            ['V01', 4, 'Villa privada 1', 'disponible'],
            ['V02', 4, 'Villa privada 2', 'disponible']
        ];

        for (const cuarto of cuartos) {
            insertCuarto.run(...cuarto);
        }
    }

    // Métodos para obtener datos
    getEdificios() {
        return this.db.prepare('SELECT * FROM edificios ORDER BY nombre').all();
    }

    getCuartos() {
        const query = `
            SELECT c.*, e.nombre as edificio_nombre 
            FROM cuartos c 
            LEFT JOIN edificios e ON c.edificio_id = e.id 
            ORDER BY e.nombre, c.numero
        `;
        return this.db.prepare(query).all();
    }

    getCuartoById(id) {
        const query = `
            SELECT c.*, e.nombre as edificio_nombre 
            FROM cuartos c 
            LEFT JOIN edificios e ON c.edificio_id = e.id 
            WHERE c.id = ?
        `;
        return this.db.prepare(query).get(id);
    }

    getMantenimientos(cuartoId = null) {
        let query = `
            SELECT m.*, c.numero as cuarto_numero, e.nombre as edificio_nombre
            FROM mantenimientos m
            LEFT JOIN cuartos c ON m.cuarto_id = c.id
            LEFT JOIN edificios e ON c.edificio_id = e.id
        `;
        
        if (cuartoId) {
            query += ' WHERE m.cuarto_id = ?';
            return this.db.prepare(query + ' ORDER BY m.fecha_creacion DESC').all(cuartoId);
        }
        
        return this.db.prepare(query + ' ORDER BY m.fecha_creacion DESC').all();
    }

    insertMantenimiento(data) {
        const insert = this.db.prepare(`
            INSERT INTO mantenimientos (
                cuarto_id, descripcion, tipo, hora, dia_alerta
            ) VALUES (?, ?, ?, ?, ?)
        `);
        
        const result = insert.run(
            data.cuarto_id,
            data.descripcion,
            data.tipo || 'normal',
            data.hora || null,
            data.dia_alerta || null
        );
        
        return result.lastInsertRowid;
    }

    updateMantenimiento(id, data) {
        const update = this.db.prepare(`
            UPDATE mantenimientos 
            SET descripcion = ?, hora = ?, dia_alerta = ?
            WHERE id = ?
        `);
        
        return update.run(
            data.descripcion,
            data.hora,
            data.dia_alerta,
            id
        );
    }

    deleteMantenimiento(id) {
        const deleteStmt = this.db.prepare('DELETE FROM mantenimientos WHERE id = ?');
        return deleteStmt.run(id);
    }

    marcarAlertaEmitida(id) {
        const update = this.db.prepare('UPDATE mantenimientos SET alerta_emitida = TRUE WHERE id = ?');
        return update.run(id);
    }

    // Método para cerrar la base de datos
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = DatabaseManager;
