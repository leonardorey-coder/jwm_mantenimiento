/**
 * Módulo de base de datos offline para Electron
 * Maneja SQLite directamente sin servidor Express
 */

let Database; // Carga lazy del módulo

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class ElectronDatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
    }
    
    /**
     * Cargar el módulo better-sqlite3 (lazy loading)
     */
    loadDatabase() {
        if (!Database) {
            try {
                console.log('📦 Cargando módulo better-sqlite3...');
                Database = require('better-sqlite3');
                console.log('✅ Módulo better-sqlite3 cargado exitosamente');
            } catch (error) {
                console.error('❌ Error al cargar better-sqlite3:', error.message);
                console.error('📋 Stack:', error.stack);
                throw new Error(`No se pudo cargar better-sqlite3: ${error.message}`);
            }
        }
        return Database;
    }

    /**
     * Inicializar la base de datos
     */
    async init() {
        try {
            console.log('📁 Inicializando base de datos...');
            console.log('📋 __dirname:', __dirname);
            console.log('📋 __filename:', __filename);
            
            // Cargar el módulo better-sqlite3 con lazy loading
            const DB = this.loadDatabase();
            
            // Verificar que better-sqlite3 se cargó correctamente
            try {
                const testDb = new DB(':memory:');
                testDb.close();
                console.log('✅ better-sqlite3 módulo funciona correctamente');
            } catch (error) {
                console.error('❌ Error con mejor-sqlite3:', error.message);
                throw new Error('No se puede usar el módulo better-sqlite3: ' + error.message);
            }
            
            // Ruta de la base de datos en el directorio de la aplicación
            const userDataPath = app.getPath('userData');
            const dbPath = path.join(userDataPath, 'finest_mant_cuartos.db');
            
            console.log('📁 userData path:', userDataPath);
            console.log('📁 DB path:', dbPath);
            
            // Asegurar que el directorio existe
            const dbDir = path.dirname(dbPath);
            if (!fs.existsSync(dbDir)) {
                console.log('📁 Creando directorio:', dbDir);
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            // Conectar a la base de datos
            console.log('🔗 Conectando a base de datos...');
            this.db = new DB(dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            
            console.log('✅ Conexión exitosa a base de datos');
            
            // Crear tablas si no existen
            await this.createTables();
            
            // Insertar datos iniciales si es la primera vez
            await this.insertInitialData();
            
            this.isInitialized = true;
            console.log('✅ Base de datos inicializada correctamente');
            console.log('📊 Estado final - isInitialized:', this.isInitialized, 'db exists:', !!this.db);
            
            return true;
        } catch (error) {
            console.error('❌ Error inicializando base de datos:', error);
            console.error('📋 Error stack:', error.stack);
            this.isInitialized = false;
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
        
        // TODOS los cuartos reales del hotel (298 cuartos completos)
        const cuartosReales = [
            // Edificio Alfa (37 cuartos)
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
            
            // Edificio Bravo (57 cuartos)
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
            
            // Edificio Charly (49 cuartos)
            ['C101', '101', 'Charly', null], ['C102', '102', 'Charly', null], ['C103', '103', 'Charly', null],
            ['C104', '104', 'Charly', null], ['C105', '105', 'Charly', null], ['C106', '106', 'Charly', null],
            ['C107', '107', 'Charly', null], ['C108', '108', 'Charly', null], ['C109', '109', 'Charly', null],
            ['C110', '110', 'Charly', null], ['C111', '111', 'Charly', null], ['C112', '112', 'Charly', '11/12/2024'],
            ['C113', '113', 'Charly', null], ['C201', '201', 'Charly', null], ['C202', '202', 'Charly', null],
            ['C203', '203', 'Charly', null], ['C204', '204', 'Charly', null], ['C205', '205', 'Charly', null],
            ['C206', '206', 'Charly', null], ['C207', '207', 'Charly', null], ['C208', '208', 'Charly', null],
            ['C209', '209', 'Charly', null], ['C210', '210', 'Charly', null], ['C211', '211', 'Charly', null],
            ['C212', '212', 'Charly', null], ['C213', '213', 'Charly', null], ['C214', '214', 'Charly', null],
            ['C301', '301', 'Charly', null], ['C302', '302', 'Charly', null], ['C303', '303', 'Charly', null],
            ['C304', '304', 'Charly', null], ['C305', '305', 'Charly', null], ['C306', '306', 'Charly', null],
            ['C307', '307', 'Charly', null], ['C308', '308', 'Charly', null], ['C309', '309', 'Charly', null],
            ['C310', '310', 'Charly', null], ['C311', '311', 'Charly', null], ['C312', '312', 'Charly', null],
            ['C313', '313', 'Charly', null], ['C314', '314', 'Charly', null], ['C401', '401', 'Charly', null],
            ['C402', '402', 'Charly', null], ['C403', '403', 'Charly', null], ['C404', '404', 'Charly', null],
            ['C405', '405', 'Charly', null], ['C406', '406', 'Charly', null], ['C407', '407', 'Charly', null],
            ['C408', '408', 'Charly', null], ['C409', '409', 'Charly', null], ['C410', '410', 'Charly', null],
            ['C411', '411', 'Charly', null], ['C412', '412', 'Charly', null], ['C413', '413', 'Charly', null],
            ['C414', '414', 'Charly', null],
            
            // Edificio Eco (48 cuartos)
            ['E101', '101', 'Eco', null], ['E102', '102', 'Eco', null], ['E103', '103', 'Eco', null],
            ['E104', '104', 'Eco', null], ['E105', '105', 'Eco', null], ['E106', '106', 'Eco', null],
            ['E107', '107', 'Eco', '25/07/2024'], ['E108', '108', 'Eco', null], ['E109', '109', 'Eco', null],
            ['E110', '110', 'Eco', '22/07/2024'], ['E111', '111', 'Eco', null], ['E112', '112', 'Eco', null],
            ['E113', '113', 'Eco', null], ['E201', '201', 'Eco', null], ['E202', '202', 'Eco', null],
            ['E203', '203', 'Eco', null], ['E204', '204', 'Eco', null], ['E205', '205', 'Eco', null],
            ['E206', '206', 'Eco', null], ['E207', '207', 'Eco', null], ['E208', '208', 'Eco', null],
            ['E209', '209', 'Eco', null], ['E210', '210', 'Eco', null], ['E211', '211', 'Eco', null],
            ['E212', '212', 'Eco', null], ['E301', '301', 'Eco', null], ['E302', '302', 'Eco', null],
            ['E303', '303', 'Eco', null], ['E304', '304', 'Eco', null], ['E305', '305', 'Eco', null],
            ['E306', '306', 'Eco', null], ['E307', '307', 'Eco', null], ['E308', '308', 'Eco', null],
            ['E309', '309', 'Eco', null], ['E310', '310', 'Eco', null], ['E311', '311', 'Eco', null],
            ['E312', '312', 'Eco', null], ['E401', '401', 'Eco', null], ['E402', '402', 'Eco', null],
            ['E403', '403', 'Eco', null], ['E404', '404', 'Eco', null], ['E405', '405', 'Eco', null],
            ['E406', '406', 'Eco', null], ['E407', '407', 'Eco', null], ['E408', '408', 'Eco', null],
            ['E409', '409', 'Eco', null], ['E410', '410', 'Eco', null], ['E411', '411', 'Eco', null],
            ['E412', '412', 'Eco', null],
            
            // Edificio Fox (56 cuartos)
            ['F101', '101', 'Fox', null], ['F102', '102', 'Fox', null], ['F103', '103', 'Fox', null],
            ['F104', '104', 'Fox', null], ['F105', '105', 'Fox', '16/12/2024'], ['F106', '106', 'Fox', '19/12/2024'],
            ['F107', '107', 'Fox', '05/10/2024'], ['F108', '108', 'Fox', null], ['F109', '109', 'Fox', null],
            ['F110', '110', 'Fox', null], ['F111', '111', 'Fox', null], ['F112', '112', 'Fox', null],
            ['F113', '113', 'Fox', '29/10/2024'], ['S-F114', '114', 'Fox', null], ['F201', '201', 'Fox', null],
            ['F202', '202', 'Fox', null], ['F203', '203', 'Fox', null], ['F204', '204', 'Fox', null],
            ['F205', '205', 'Fox', null], ['F206', '206', 'Fox', null], ['F207', '207', 'Fox', null],
            ['F208', '208', 'Fox', null], ['F209', '209', 'Fox', null], ['F210', '210', 'Fox', null],
            ['F211', '211', 'Fox', '23/11/2024'], ['F212', '212', 'Fox', null], ['F213', '213', 'Fox', null],
            ['S-F214', '214', 'Fox', null], ['F301', '301', 'Fox', null], ['F302', '302', 'Fox', null],
            ['F303', '303', 'Fox', null], ['F304', '304', 'Fox', null], ['F305', '305', 'Fox', null],
            ['F306', '306', 'Fox', null], ['F307', '307', 'Fox', null], ['F308', '308', 'Fox', null],
            ['F309', '309', 'Fox', null], ['F310', '310', 'Fox', null], ['F311', '311', 'Fox', null],
            ['F312', '312', 'Fox', null], ['F313', '313', 'Fox', null], ['S-F314', '314', 'Fox', null],
            ['F401', '401', 'Fox', null], ['F402', '402', 'Fox', null], ['F403', '403', 'Fox', null],
            ['F404', '404', 'Fox', null], ['F405', '405', 'Fox', null], ['F406', '406', 'Fox', null],
            ['F407', '407', 'Fox', null], ['F408', '408', 'Fox', null], ['F409', '409', 'Fox', null],
            ['F410', '410', 'Fox', null], ['F411', '411', 'Fox', null], ['F412', '412', 'Fox', null],
            ['F413', '413', 'Fox', null], ['S-F414', '414', 'Fox', null],
            
            // Casa Maat (47 cuartos)
            ['G101', '101', 'Casa Maat', '12/06/2024'], ['G102', '102', 'Casa Maat', '20/07/2024'],
            ['G103', '103', 'Casa Maat', '13/06/2024'], ['G104', '104', 'Casa Maat', '04/09/2024'],
            ['G105', '105', 'Casa Maat', '05/07/2024'], ['G106', '106', 'Casa Maat', '02/07/2024'],
            ['G107', '107', 'Casa Maat', '05/09/2024'], ['G108', '108', 'Casa Maat', '10/07/2024'],
            ['G109', '109', 'Casa Maat', '13/06/2024'], ['G110', '110', 'Casa Maat', '17/06/2024'],
            ['S-G111', '111', 'Casa Maat', '27/08/2024'], ['G201', '201', 'Casa Maat', '18/08/2024'],
            ['G202', '202', 'Casa Maat', '10/10/2024'], ['G203', '203', 'Casa Maat', '16/08/2024'],
            ['G204', '204', 'Casa Maat', '15/08/2024'], ['S-G408', '408', 'Casa Maat', '01/11/2024'],
            ['G206', '206', 'Casa Maat', '12/09/2024'], ['G207', '207', 'Casa Maat', '08/11/2024'],
            ['G208', '208', 'Casa Maat', '28/11/2024'], ['G209', '209', 'Casa Maat', '16/01/2025'],
            ['G210', '210', 'Casa Maat', '23/01/2025'], ['G211', '211', 'Casa Maat', '03/12/2024'],
            ['G212', '212', 'Casa Maat', null], ['S-G213', '213', 'Casa Maat', '02/08/2024'],
            ['G301', '301', 'Casa Maat', '03/02/2025'], ['G302', '302', 'Casa Maat', '22/02/2025'],
            ['G303', '303', 'Casa Maat', null], ['G304', '304', 'Casa Maat', '04/09/2024'],
            ['G305', '305', 'Casa Maat', '05/07/2024'], ['G306', '306', 'Casa Maat', '05/09/2024'],
            ['G308', '308', 'Casa Maat', '15/08/2024'], ['G309', '309', 'Casa Maat', null],
            ['G310', '310', 'Casa Maat', null], ['G401', '401', 'Casa Maat', '02/07/2024'],
            ['G402', '402', 'Casa Maat', '17/06/2024'], ['G403', '403', 'Casa Maat', '13/06/2024'],
            ['G404', '404', 'Casa Maat', '07/07/2024'], ['G405', '405', 'Casa Maat', '27/08/2024'],
            ['G406', '406', 'Casa Maat', '16/08/2024'], ['G407', '407', 'Casa Maat', '15/08/2024'],
            ['G408', '408', 'Casa Maat', '28/11/2024'], ['G409', '409', 'Casa Maat', null],
            ['G501', '501', 'Casa Maat', '08/11/2024'], ['G502', '502', 'Casa Maat', null],
            ['G503', '503', 'Casa Maat', '03/12/2024'], ['G504', '504', 'Casa Maat', null],
            ['S-G505', '505', 'Casa Maat', '03/12/2024']
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
        console.log(`🏨 Distribución por edificio:`);
        const distribucion = this.db.prepare(`
            SELECT e.nombre, COUNT(c.id) as total 
            FROM edificios e 
            LEFT JOIN cuartos c ON e.id = c.edificio_id 
            GROUP BY e.id, e.nombre 
            ORDER BY e.nombre
        `).all();
        distribucion.forEach(d => console.log(`   - ${d.nombre}: ${d.total} cuartos`));
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
            INSERT INTO mantenimientos (cuarto_id, tipo, descripcion, hora, dia_alerta, fecha_solicitud, fecha_registro)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        // Usar la fecha local para la solicitud y el registro
        const ahora = new Date();
        const fecha_solicitud = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
        const fecha_registro_iso = ahora.toISOString();

        // FIX: Ajustar dia_alerta para evitar problemas de zona horaria.
        // El input date de HTML envía 'YYYY-MM-DD', que JS interpreta como UTC.
        // Al convertirlo a Date, puede retroceder un día. Lo tratamos como texto.
        let diaAlertaCorregido = null;
        if (dia_alerta) {
            // Aseguramos que la fecha se mantenga como se seleccionó, sin conversiones.
            diaAlertaCorregido = dia_alerta;
        }

        const result = this.db.prepare(query).run(
            cuarto_id,
            tipo || 'normal',
            descripcion,
            hora || null,
            diaAlertaCorregido,
            fecha_solicitud,
            fecha_registro_iso
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
            SET alerta_emitida = 1, fecha_emision = ?
            WHERE id = ?
        `;
        const fecha_emision_iso = new Date().toISOString();
        const result = this.db.prepare(query).run(fecha_emision_iso, id);
        
        if (result.changes === 0) {
            throw new Error('Alerta no encontrada');
        }
        
        return this.getMantenimientoById(id);
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
