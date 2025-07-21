const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');

// Configuración de la base de datos SQLite
class DatabaseManager {
    constructor() {
        // Determinar la ubicación de la base de datos según el entorno
        this.dbPath = this.getDatabasePath();
        this.db = null;
        this.initialize();
    }

    getDatabasePath() {
        const isDev = process.env.NODE_ENV === 'development';
        
        if (isDev) {
            // En desarrollo, usar la carpeta local
            return path.join(__dirname, 'jwmantto.db');
        } else {
            // En producción, usar carpeta de usuario
            const userDataPath = os.homedir();
            const appDataDir = path.join(userDataPath, '.jwmantto');
            
            // Crear directorio si no existe
            if (!fs.existsSync(appDataDir)) {
                fs.mkdirSync(appDataDir, { recursive: true });
            }
            
            return path.join(appDataDir, 'jwmantto.db');
        }
    }

    initialize() {
        return new Promise((resolve, reject) => {
            try {
                // Crear directorio db si no existe
                const dbDir = path.dirname(this.dbPath);
                if (!fs.existsSync(dbDir)) {
                    fs.mkdirSync(dbDir, { recursive: true });
                }

                // Conectar a la base de datos
                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err) {
                        console.error('Error conectando a SQLite:', err);
                        reject(err);
                        return;
                    }
                    
                    console.log(`Base de datos SQLite inicializada en: ${this.dbPath}`);
                    
                    // Crear tablas si no existen
                    this.createTables().then(() => {
                        resolve();
                    }).catch(reject);
                });
            } catch (error) {
                console.error('Error inicializando base de datos:', error);
                reject(error);
            }
        });
    }

    createTables() {
        return new Promise((resolve, reject) => {
            // Ejecutar creación de tablas secuencialmente
            this.db.serialize(() => {
                // Crear tabla edificios
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS edificios (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nombre TEXT NOT NULL UNIQUE,
                        descripcion TEXT,
                        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // Crear tabla cuartos
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS cuartos (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nombre TEXT NOT NULL,
                        descripcion TEXT,
                        edificio_id INTEGER NOT NULL,
                        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (edificio_id) REFERENCES edificios(id) ON DELETE CASCADE,
                        UNIQUE(nombre, edificio_id)
                    )
                `);

                // Crear tabla mantenimientos
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS mantenimientos (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        cuarto_id INTEGER NOT NULL,
                        descripcion TEXT NOT NULL,
                        tipo TEXT NOT NULL DEFAULT 'normal',
                        hora TIME,
                        dia_alerta DATE,
                        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                        alerta_emitida INTEGER DEFAULT 0,
                        fecha_emision DATETIME,
                        FOREIGN KEY (cuarto_id) REFERENCES cuartos(id) ON DELETE CASCADE
                    )
                `, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    // Verificar y actualizar estructura de tabla si es necesaria
                    this.updateTableStructure().then(() => {
                        // Insertar datos iniciales
                        this.insertInitialData().then(resolve).catch(reject);
                    }).catch(reject);
                });
            });
        });
    }

    updateTableStructure() {
        return new Promise((resolve, reject) => {
            // Verificar si existen las columnas alerta_emitida y fecha_emision
            this.db.get("PRAGMA table_info(mantenimientos)", (err, info) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Obtener todas las columnas
                this.db.all("PRAGMA table_info(mantenimientos)", (err, columns) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    const columnNames = columns.map(col => col.name);
                    let needsUpdate = false;
                    
                    if (!columnNames.includes('alerta_emitida')) {
                        this.db.run("ALTER TABLE mantenimientos ADD COLUMN alerta_emitida INTEGER DEFAULT 0", (err) => {
                            if (err && !err.message.includes('duplicate column name')) {
                                console.error('Error añadiendo columna alerta_emitida:', err);
                            }
                        });
                        needsUpdate = true;
                    }
                    
                    if (!columnNames.includes('fecha_emision')) {
                        this.db.run("ALTER TABLE mantenimientos ADD COLUMN fecha_emision DATETIME", (err) => {
                            if (err && !err.message.includes('duplicate column name')) {
                                console.error('Error añadiendo columna fecha_emision:', err);
                            }
                        });
                        needsUpdate = true;
                    }
                    
                    if (needsUpdate) {
                        console.log('Estructura de tabla actualizada para notificaciones');
                    }
                    
                    resolve();
                });
            });
        });
    }

    insertInitialData() {
        return new Promise((resolve, reject) => {
            // Verificar si ya hay datos
            this.db.get('SELECT COUNT(*) as count FROM edificios', (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (row.count === 0) {
                    console.log('Insertando datos iniciales de la base real...');
                    
                    // Datos reales de la base MySQL
                    const edificios = [
                        ['Alfa', 'Edificio Alfa'],
                        ['Bravo', 'Edificio Bravo'], 
                        ['Charly', 'Edificio Charly'],
                        ['Eco', 'Edificio Eco'],
                        ['Fox', 'Edificio Fox'],
                        ['Casa Maat', 'Casa Maat']
                    ];

                    // Cuartos reales organizados por edificio (301 total)
                    const cuartos = [
                        // Edificio Alfa (ID: 1) - 37 cuartos
                        ['A101', null, 1], ['A102', null, 1], ['A103', '17/7/2024', 1], ['A104', null, 1], ['A105', null, 1], ['A106', null, 1],
                        ['S-A201', null, 1], ['A202', null, 1], ['A203', null, 1], ['A204', null, 1], ['A205', null, 1], ['A206', null, 1], ['A207', null, 1], ['S-A208', null, 1],
                        ['A302', null, 1], ['A303', null, 1], ['A304', null, 1], ['A305', null, 1], ['A306', null, 1], ['S-A301', null, 1], ['S-A307', null, 1],
                        ['A401', null, 1], ['A402', null, 1], ['A403', null, 1], ['A404', null, 1], ['A405', null, 1], ['A406', null, 1], ['S-A401', null, 1], ['S-A407', null, 1],
                        ['A501', null, 1], ['A502', null, 1], ['A503', null, 1], ['A504', null, 1], ['A505', null, 1], ['A506', null, 1], ['S-A501', null, 1], ['S-A507', null, 1],
                        
                        // Edificio Bravo (ID: 2) - 58 cuartos  
                        ['B101', null, 2], ['B102', null, 2], ['B103', null, 2], ['B104', null, 2], ['B105', '10/9/2024', 2], ['B106', null, 2], ['B107', null, 2], ['B108', null, 2], ['B109', null, 2], ['B110', null, 2], ['B111', null, 2], ['B112', null, 2], ['B113', null, 2], ['B114', null, 2], ['B115', null, 2],
                        ['B201', null, 2], ['B202', null, 2], ['B203', '27/10/2024', 2], ['B204', null, 2], ['B205', null, 2], ['B206', null, 2], ['B207', null, 2], ['B208', null, 2], ['B210', null, 2], ['B211', null, 2], ['B212', null, 2], ['B213', null, 2], ['B214', null, 2], ['B215', null, 2],
                        ['B301', null, 2], ['B302', null, 2], ['B303', null, 2], ['B304', null, 2], ['B305', null, 2], ['B306', null, 2], ['B308', null, 2], ['B309', null, 2], ['B310', null, 2], ['B311', null, 2], ['B312', null, 2], ['B313', null, 2], ['B315', null, 2],
                        ['B401', null, 2], ['B402', null, 2], ['B403', null, 2], ['B404', null, 2], ['B405', null, 2], ['B406', null, 2], ['B407', null, 2], ['B408', null, 2], ['B409', null, 2], ['B410', null, 2], ['B411', null, 2], ['B412', null, 2], ['B413', null, 2], ['B414', null, 2], ['B415', null, 2],
                        
                        // Edificio Charly (ID: 3) - 55 cuartos
                        ['C101', null, 3], ['C102', null, 3], ['C103', null, 3], ['C104', null, 3], ['C105', null, 3], ['C106', null, 3], ['C107', null, 3], ['C108', null, 3], ['C109', null, 3], ['C110', null, 3], ['C111', null, 3], ['C112', '11/12/2024', 3], ['C113', null, 3],
                        ['C201', null, 3], ['C202', null, 3], ['C203', null, 3], ['C204', null, 3], ['C205', null, 3], ['C206', null, 3], ['C207', null, 3], ['C208', null, 3], ['C209', null, 3], ['C210', null, 3], ['C211', null, 3], ['C212', null, 3], ['C213', null, 3], ['C214', null, 3],
                        ['C301', null, 3], ['C302', null, 3], ['C303', null, 3], ['C304', null, 3], ['C305', null, 3], ['C306', null, 3], ['C307', null, 3], ['C308', null, 3], ['C309', null, 3], ['C310', null, 3], ['C311', null, 3], ['C312', null, 3], ['C313', null, 3], ['C314', null, 3],
                        ['C401', null, 3], ['C402', null, 3], ['C403', null, 3], ['C404', null, 3], ['C405', null, 3], ['C406', null, 3], ['C407', null, 3], ['C408', null, 3], ['C409', null, 3], ['C410', null, 3], ['C411', null, 3], ['C412', null, 3], ['C413', null, 3], ['C414', null, 3],
                        
                        // Edificio Eco (ID: 4) - 49 cuartos
                        ['E101', null, 4], ['E102', null, 4], ['E103', null, 4], ['E104', null, 4], ['E105', null, 4], ['E106', null, 4], ['E107', '25/07/2024', 4], ['E108', null, 4], ['E109', null, 4], ['E110', '22/07/2024', 4], ['E111', null, 4], ['E112', null, 4], ['E113', null, 4],
                        ['E201', null, 4], ['E202', null, 4], ['E203', null, 4], ['E204', null, 4], ['E205', null, 4], ['E206', null, 4], ['E207', null, 4], ['E208', null, 4], ['E209', null, 4], ['E210', null, 4], ['E211', null, 4], ['E212', null, 4],
                        ['E301', null, 4], ['E302', null, 4], ['E303', null, 4], ['E304', null, 4], ['E305', null, 4], ['E306', null, 4], ['E307', null, 4], ['E308', null, 4], ['E309', null, 4], ['E310', null, 4], ['E311', null, 4], ['E312', null, 4],
                        ['E401', null, 4], ['E402', null, 4], ['E403', null, 4], ['E404', null, 4], ['E405', null, 4], ['E406', null, 4], ['E407', null, 4], ['E408', null, 4], ['E409', null, 4], ['E410', null, 4], ['E411', null, 4], ['E412', null, 4],
                        
                        // Edificio Fox (ID: 5) - 56 cuartos
                        ['F101', null, 5], ['F102', null, 5], ['F103', null, 5], ['F104', null, 5], ['F105', '16/12/2024', 5], ['F106', '19/12/2024', 5], ['F107', '05/10/2024', 5], ['F108', null, 5], ['F109', null, 5], ['F110', null, 5], ['F111', null, 5], ['F112', null, 5], ['F113', '29/10/2024', 5], ['S-F114', null, 5],
                        ['F201', null, 5], ['F202', null, 5], ['F203', null, 5], ['F204', null, 5], ['F205', null, 5], ['F206', null, 5], ['F207', null, 5], ['F208', null, 5], ['F209', null, 5], ['F210', null, 5], ['F211', '23/11/2024', 5], ['F212', null, 5], ['F213', null, 5], ['S-F214', null, 5],
                        ['F301', null, 5], ['F302', null, 5], ['F303', null, 5], ['F304', null, 5], ['F305', null, 5], ['F306', null, 5], ['F307', null, 5], ['F308', null, 5], ['F309', null, 5], ['F310', null, 5], ['F311', null, 5], ['F312', null, 5], ['F313', null, 5], ['S-F314', null, 5],
                        ['F401', null, 5], ['F402', null, 5], ['F403', null, 5], ['F404', null, 5], ['F405', null, 5], ['F406', null, 5], ['F407', null, 5], ['F408', null, 5], ['F409', null, 5], ['F410', null, 5], ['F411', null, 5], ['F412', null, 5], ['F413', null, 5], ['S-F414', null, 5],
                        
                        // Casa Maat (ID: 6) - 46 cuartos
                        ['G101', '12/06/2024', 6], ['G102', '20/07/2024', 6], ['G103', '13/06/2024', 6], ['G104', '04/09/2024', 6], ['G105', '05/07/2024', 6], ['G106', '02/07/2024', 6], ['G107', '05/09/2024', 6], ['G108', '10/07/2024', 6], ['G109', '13/06/2024', 6], ['G110', '17/06/2024', 6], ['S-G111', '27/08/2024', 6],
                        ['G201', '18/08/2024', 6], ['G202', '10/10/2024', 6], ['G203', '16/08/2024', 6], ['G204', '15/08/2024', 6], ['S-G408', '01/11/2024', 6], ['G206', '12/09/2024', 6], ['G207', '08/11/2024', 6], ['G208', '28/11/2024', 6], ['G209', '16/01/2025', 6], ['G210', '23/01/2025', 6], ['G211', '03/12/2024', 6], ['G212', null, 6], ['S-G213', '02/08/2024', 6],
                        ['G301', '03/02/2025', 6], ['G302', '22/02/2025', 6], ['G303', null, 6], ['G304', '04/09/2024', 6], ['G305', '05/07/2024', 6], ['G306', '05/09/2024', 6], ['G308', '15/08/2024', 6], ['G309', null, 6], ['G310', null, 6],
                        ['G401', '02/07/2024', 6], ['G402', '17/06/2024', 6], ['G403', '13/06/2024', 6], ['G404', '07/07/2024', 6], ['G405', '27/08/2024', 6], ['G406', '16/08/2024', 6], ['G407', '15/08/2024', 6], ['G408', '28/11/2024', 6], ['G409', null, 6],
                        ['G501', '08/11/2024', 6], ['G502', null, 6], ['G503', '03/12/2024', 6], ['G504', null, 6], ['S-G505', '03/12/2024', 6]
                    ];

                    this.db.serialize(() => {
                        // Insertar edificios con manejo de errores
                        const stmtEdificio = this.db.prepare('INSERT OR IGNORE INTO edificios (nombre, descripcion) VALUES (?, ?)');
                        edificios.forEach(([nombre, descripcion]) => {
                            stmtEdificio.run(nombre, descripcion);
                        });
                        stmtEdificio.finalize();

                        // Insertar cuartos
                        const stmtCuarto = this.db.prepare('INSERT OR IGNORE INTO cuartos (nombre, descripcion, edificio_id) VALUES (?, ?, ?)');
                        cuartos.forEach(([nombre, descripcion, edificio_id]) => {
                            stmtCuarto.run(nombre, descripcion, edificio_id);
                        });
                        stmtCuarto.finalize(() => {
                            console.log('Insertando mantenimientos reales...');
                            
                            // Mantenimientos reales de la base MySQL 
                            // Nota: Los IDs de cuarto se calculan basándose en el orden de inserción
                            const mantenimientos = [
                                [3, 'FOCOS FUNDIDOS', 'normal', null, null, '2025-04-22 19:31:45'], // A103
                                [1, 'Cerrar valvulas', 'normal', null, null, '2025-04-22 20:15:27'], // A101  
                                [1, 'Foco fundido', 'normal', null, null, '2025-04-22 20:16:17'], // A101
                                [4, 'Foco fundido', 'normal', null, null, '2025-04-22 20:16:36']  // A104
                            ];
                            
                            const stmtMantenimiento = this.db.prepare('INSERT OR IGNORE INTO mantenimientos (cuarto_id, descripcion, tipo, hora, dia_alerta, fecha_registro) VALUES (?, ?, ?, ?, ?, ?)');
                            mantenimientos.forEach(([cuarto_id, descripcion, tipo, hora, dia_alerta, fecha_registro]) => {
                                stmtMantenimiento.run(cuarto_id, descripcion, tipo, hora, dia_alerta, fecha_registro);
                            });
                            
                            stmtMantenimiento.finalize(() => {
                                console.log('Datos reales de la base MySQL insertados correctamente - Total: 301 cuartos, 6 edificios');
                                resolve();
                            });
                        });
                    });
                } else {
                    console.log('Los datos iniciales ya existen, omitiendo inserción');
                    resolve();
                }
            });
        });
    }

    // Métodos para obtener datos (convertidos a async/await con Promises)
    getEdificios() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM edificios ORDER BY id ASC', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getCuartos() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT c.*, e.nombre as edificio 
                FROM cuartos c 
                JOIN edificios e ON c.edificio_id = e.id 
                ORDER BY e.nombre, c.nombre
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getCuartoById(id) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM cuartos WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    getMantenimientos(cuartoId = null) {
        return new Promise((resolve, reject) => {
            let query, params;
            
            if (cuartoId) {
                query = 'SELECT * FROM mantenimientos WHERE cuarto_id = ? ORDER BY fecha_registro DESC';
                params = [cuartoId];
            } else {
                query = `
                    SELECT m.*, c.nombre as cuarto_nombre, e.nombre as edificio_nombre
                    FROM mantenimientos m
                    JOIN cuartos c ON m.cuarto_id = c.id
                    JOIN edificios e ON c.edificio_id = e.id
                    ORDER BY m.fecha_registro DESC
                `;
                params = [];
            }
            
            this.db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Método para insertar datos
    insertMantenimiento(data) {
        return new Promise((resolve, reject) => {
            const { cuarto_id, descripcion, tipo, hora, dia_alerta } = data;
            const query = `
                INSERT INTO mantenimientos (cuarto_id, descripcion, tipo, hora, dia_alerta)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [cuarto_id, descripcion, tipo, hora, dia_alerta], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    updateMantenimiento(id, data) {
        return new Promise((resolve, reject) => {
            const { descripcion, hora, dia_alerta } = data;
            const query = `
                UPDATE mantenimientos 
                SET descripcion = ?, hora = ?, dia_alerta = ?
                WHERE id = ?
            `;
            
            this.db.run(query, [descripcion, hora, dia_alerta, id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    deleteMantenimiento(id) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM mantenimientos WHERE id = ?';
            
            this.db.run(query, [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    // Marcar alerta como emitida
    marcarAlertaEmitida(id) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE mantenimientos 
                SET alerta_emitida = 1, fecha_emision = datetime('now', 'localtime')
                WHERE id = ?
            `;
            
            this.db.run(query, [id], function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    }

    // Método para cerrar la conexión
    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = DatabaseManager;
