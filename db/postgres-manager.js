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
                console.log('✅ Las tablas ya existen, verificando migraciones...');
                await this.runMigrations();
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
     * Ejecutar migraciones necesarias
     */
    async runMigrations() {
        try {
            // Verificar si dia_alerta es INTEGER y necesita migración a DATE
            const columnCheck = await this.pool.query(`
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'mantenimientos' 
                AND column_name = 'dia_alerta'
            `);
            
            if (columnCheck.rows.length > 0 && columnCheck.rows[0].data_type === 'integer') {
                console.log('🔄 Migrando dia_alerta de INTEGER a DATE...');
                
                // 1. Limpiar columna temporal si existe de intentos anteriores
                await this.pool.query(`
                    ALTER TABLE mantenimientos 
                    DROP COLUMN IF EXISTS dia_alerta_temp
                `);
                
                // 2. Eliminar vista que depende de dia_alerta (si existe)
                await this.pool.query(`DROP VIEW IF EXISTS vista_mantenimientos_completa CASCADE`);
                
                // 3. Agregar columna temporal
                await this.pool.query(`ALTER TABLE mantenimientos ADD COLUMN dia_alerta_temp DATE`);
                
                // 4. Migrar datos existentes
                await this.pool.query(`
                    UPDATE mantenimientos 
                    SET dia_alerta_temp = MAKE_DATE(
                        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
                        EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
                        dia_alerta
                    )
                    WHERE dia_alerta IS NOT NULL 
                    AND dia_alerta BETWEEN 1 AND 31
                `);
                
                // 5. Eliminar columna antigua
                await this.pool.query(`ALTER TABLE mantenimientos DROP COLUMN dia_alerta`);
                
                // 6. Renombrar columna temporal
                await this.pool.query(`ALTER TABLE mantenimientos RENAME COLUMN dia_alerta_temp TO dia_alerta`);
                
                console.log('✅ Migración de dia_alerta completada (INTEGER → DATE)');
            }
            
            // Verificar si existe columna prioridad
            const prioridadCheck = await this.pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'mantenimientos' 
                AND column_name = 'prioridad'
            `);
            
            if (prioridadCheck.rows.length === 0) {
                console.log('🔄 Agregando columna prioridad...');
                await this.pool.query(`
                    ALTER TABLE mantenimientos 
                    ADD COLUMN prioridad VARCHAR(20) DEFAULT 'media' 
                    CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente'))
                `);
                console.log('✅ Columna prioridad agregada');
            }
            
            // Verificar si existe columna alerta_emitida
            const alertaEmitidaCheck = await this.pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'mantenimientos' 
                AND column_name = 'alerta_emitida'
            `);
            
            if (alertaEmitidaCheck.rows.length === 0) {
                console.log('🔄 Agregando columna alerta_emitida...');
                await this.pool.query(`
                    ALTER TABLE mantenimientos 
                    ADD COLUMN alerta_emitida BOOLEAN DEFAULT FALSE
                `);
                console.log('✅ Columna alerta_emitida agregada');
            }
            
        } catch (error) {
            console.error('⚠️ Error ejecutando migraciones:', error);
            // No lanzar error para no bloquear la aplicación
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
                prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_programada DATE,
                hora TIME,
                dia_alerta DATE,
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
            SELECT 
                m.*,
                c.numero as cuarto_numero,
                c.numero as cuarto_nombre,
                e.nombre as edificio_nombre,
                uc.nombre as usuario_creador_nombre,
                ua.nombre as usuario_asignado_nombre,
                ua.rol_id as usuario_asignado_rol_id,
                r.nombre as usuario_asignado_rol_nombre
            FROM mantenimientos m
            LEFT JOIN cuartos c ON m.cuarto_id = c.id
            LEFT JOIN edificios e ON c.edificio_id = e.id
            LEFT JOIN usuarios uc ON m.usuario_creador_id = uc.id
            LEFT JOIN usuarios ua ON m.usuario_asignado_id = ua.id
            LEFT JOIN roles r ON ua.rol_id = r.id
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
                cuarto_id, descripcion, tipo, hora, dia_alerta, prioridad
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        
        const values = [
            data.cuarto_id,
            data.descripcion,
            data.tipo || 'normal',
            data.hora || null,
            data.dia_alerta || null,  // Ahora acepta fecha completa YYYY-MM-DD
            data.prioridad || 'media'
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
     * Si se cambia dia_alerta u hora, resetea alerta_emitida a FALSE
     */
    async updateMantenimiento(id, data) {
        // Primero obtener el registro actual para comparar
        const currentQuery = 'SELECT dia_alerta, hora FROM mantenimientos WHERE id = $1';
        const currentResult = await this.pool.query(currentQuery, [id]);
        const currentRecord = currentResult.rows[0];
        
        // Determinar si cambió la fecha o la hora
        const fechaCambio = currentRecord && data.dia_alerta && currentRecord.dia_alerta !== data.dia_alerta;
        const horaCambio = currentRecord && data.hora && currentRecord.hora !== data.hora;
        
        let query;
        let values;
        
        if (fechaCambio || horaCambio) {
            // Si cambió fecha u hora, resetear alerta_emitida a FALSE
            console.log(`🔄 Reseteando alerta_emitida para mantenimiento ${id} (fecha cambió: ${fechaCambio}, hora cambió: ${horaCambio})`);
            query = `
                UPDATE mantenimientos 
                SET descripcion = $1, hora = $2, dia_alerta = $3, prioridad = $4, alerta_emitida = FALSE
                WHERE id = $5
                RETURNING *
            `;
        } else {
            // Si no cambió fecha/hora, actualizar normalmente
            query = `
                UPDATE mantenimientos 
                SET descripcion = $1, hora = $2, dia_alerta = $3, prioridad = $4
                WHERE id = $5
                RETURNING *
            `;
        }
        
        values = [
            data.descripcion,
            data.hora,
            data.dia_alerta || null,  // Fecha completa YYYY-MM-DD
            data.prioridad || 'media',
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
     * Marcar automáticamente como emitidas todas las alertas cuya fecha/hora ya pasó
     * @returns {Promise<number>} Número de alertas marcadas
     */
    async marcarAlertasPasadasComoEmitidas() {
        const query = `
            UPDATE mantenimientos 
            SET alerta_emitida = TRUE 
            WHERE tipo = 'rutina'
            AND alerta_emitida = FALSE
            AND dia_alerta IS NOT NULL
            AND hora IS NOT NULL
            AND (
                dia_alerta < CURRENT_DATE
                OR (dia_alerta = CURRENT_DATE AND hora < CURRENT_TIME)
            )
            RETURNING id
        `;
        const result = await this.pool.query(query);
        const count = result.rows.length;
        
        if (count > 0) {
            console.log(`✅ Marcadas ${count} alertas pasadas como emitidas:`, result.rows.map(r => r.id));
        }
        
        return count;
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
            AND CURRENT_DATE >= m.dia_alerta
            ORDER BY m.dia_alerta, m.fecha_creacion
        `;
        const result = await this.pool.query(query);
        return result.rows;
    }

    /**
     * Obtener alertas emitidas
     * @param {string} fecha - Fecha específica (YYYY-MM-DD) o null para todas
     * @returns {Promise<Array>} Array de alertas emitidas
     */
    async getAlertasEmitidas(fecha = null) {
        let query = `
            SELECT m.*, c.numero as cuarto_numero, e.nombre as edificio_nombre
            FROM mantenimientos m
            LEFT JOIN cuartos c ON m.cuarto_id = c.id
            LEFT JOIN edificios e ON c.edificio_id = e.id
            WHERE m.tipo = 'rutina'
            AND m.alerta_emitida = TRUE
        `;
        
        const params = [];
        
        if (fecha) {
            query += ` AND m.dia_alerta = $1`;
            params.push(fecha);
        }
        
        query += ` ORDER BY m.dia_alerta DESC, m.hora DESC`;
        
        const result = await this.pool.query(query, params);
        return result.rows;
    }

    /**
     * Obtener alertas pendientes (no emitidas)
     * @returns {Promise<Array>} Array de alertas pendientes
     */
    async getAlertasPendientes() {
        const query = `
            SELECT 
                m.*, 
                c.numero as cuarto_numero, 
                ec.nombre as espacio_nombre,
                COALESCE(e_cuarto.nombre, e_espacio.nombre) as edificio_nombre
            FROM mantenimientos m
            LEFT JOIN cuartos c ON m.cuarto_id = c.id
            LEFT JOIN edificios e_cuarto ON c.edificio_id = e_cuarto.id
            LEFT JOIN espacios_comunes ec ON m.espacio_comun_id = ec.id
            LEFT JOIN edificios e_espacio ON ec.edificio_id = e_espacio.id
            WHERE m.tipo = 'rutina'
            AND (m.alerta_emitida = FALSE OR m.alerta_emitida IS NULL)
            ORDER BY m.dia_alerta ASC, m.hora ASC
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

    // =====================================
    // Gestión de Usuarios
    // =====================================

    /**
     * Obtiene todos los usuarios con detalles de rol y sesiones
     * @param {boolean} includeInactive - Incluye usuarios dados de baja
     * @returns {Promise<Array>} Lista de usuarios
     */
    async getUsuarios(includeInactive = false) {
        const condition = includeInactive 
            ? '1=1'
            : 'u.activo = TRUE AND u.fecha_baja IS NULL';

        const query = `
            SELECT 
                u.id,
                u.nombre,
                u.email,
                u.telefono,
                u.departamento,
                u.numero_empleado,
                u.activo,
                u.fecha_registro,
                u.fecha_baja,
                u.motivo_baja,
                u.ultimo_acceso,
                u.foto_perfil_url,
                u.notas_admin,
                u.requiere_cambio_password,
                u.bloqueado_hasta,
                u.intentos_fallidos,
                r.id as rol_id,
                r.nombre as rol_nombre,
                COALESCE(s.total_sesiones, 0) as total_sesiones,
                s.ultima_sesion_login,
                s.ultima_sesion_logout,
                COALESCE(s.sesiones_activas, 0) as sesiones_activas
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            LEFT JOIN LATERAL (
                SELECT 
                    COUNT(*) FILTER (WHERE TRUE) as total_sesiones,
                    COUNT(*) FILTER (WHERE activa = TRUE) as sesiones_activas,
                    MAX(fecha_login) as ultima_sesion_login,
                    MAX(fecha_logout) as ultima_sesion_logout
                FROM sesiones_usuarios su
                WHERE su.usuario_id = u.id
            ) s ON TRUE
            WHERE ${condition}
            ORDER BY u.nombre ASC
        `;

        const result = await this.pool.query(query);
        return result.rows;
    }

    /**
     * Obtiene un usuario específico por ID
     * @param {number} id - ID del usuario
     * @returns {Promise<Object|null>} Usuario encontrado o null
     */
    async getUsuarioById(id) {
        const result = await this.pool.query(`
            SELECT 
                u.id,
                u.nombre,
                u.email,
                u.telefono,
                u.departamento,
                u.numero_empleado,
                u.activo,
                u.fecha_registro,
                u.fecha_baja,
                u.motivo_baja,
                u.ultimo_acceso,
                u.foto_perfil_url,
                u.notas_admin,
                u.requiere_cambio_password,
                r.id as rol_id,
                r.nombre as rol_nombre,
                COALESCE(s.total_sesiones, 0) as total_sesiones,
                s.ultima_sesion_login,
                s.ultima_sesion_logout,
                COALESCE(s.sesiones_activas, 0) as sesiones_activas
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            LEFT JOIN LATERAL (
                SELECT 
                    COUNT(*) FILTER (WHERE TRUE) as total_sesiones,
                    COUNT(*) FILTER (WHERE activa = TRUE) as sesiones_activas,
                    MAX(fecha_login) as ultima_sesion_login,
                    MAX(fecha_logout) as ultima_sesion_logout
                FROM sesiones_usuarios su
                WHERE su.usuario_id = u.id
            ) s ON TRUE
            WHERE u.id = $1
        `, [id]);

        return result.rows[0] || null;
    }

    /**
     * Obtiene el listado de roles disponibles
     * @returns {Promise<Array>}
     */
    async getRoles() {
        const result = await this.pool.query(`
            SELECT id, nombre, descripcion, permisos
            FROM roles
            ORDER BY nombre ASC
        `);
        return result.rows;
    }

    /**
     * Crea un nuevo usuario en la base de datos
     * @param {Object} data - Datos del nuevo usuario
     * @returns {Promise<Object>} Usuario creado
     */
    async createUsuario(data) {
        if (!data?.nombre || !data?.email || !data?.password || !data?.rol) {
            throw new Error('Nombre, email, password y rol son requeridos');
        }

        const trimmedPassword = data.password.trim();
        if (trimmedPassword.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        const nombre = data.nombre.trim();
        if (!nombre) {
            throw new Error('El nombre no puede estar vacío');
        }

        const email = data.email.trim().toLowerCase();
        if (!email) {
            throw new Error('El email no puede estar vacío');
        }

        const rolId = await this.resolveRolId(data.rol);
        const passwordHash = await this.hashPassword(trimmedPassword);

        const result = await this.pool.query(`
            INSERT INTO usuarios (
                nombre,
                email,
                password_hash,
                rol_id,
                telefono,
                departamento,
                numero_empleado,
                notas_admin,
                foto_perfil_url,
                activo,
                requiere_cambio_password
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, COALESCE($10, FALSE))
            RETURNING id
        `, [
            nombre,
            email,
            passwordHash,
            rolId,
            data.telefono || null,
            data.departamento || null,
            data.numero_empleado || null,
            data.notas_admin || null,
            data.foto_perfil_url || null,
            data.requiere_cambio_password ?? false
        ]);

        return this.getUsuarioById(result.rows[0].id);
    }

    /**
     * Actualiza la información de un usuario existente
     * @param {number} id - ID del usuario
     * @param {Object} data - Campos a actualizar
     */
    async updateUsuario(id, data = {}) {
        const updates = [];
        const values = [];
        let idx = 1;

        const updatableFields = ['nombre', 'email', 'telefono', 'departamento', 'numero_empleado', 'notas_admin', 'foto_perfil_url', 'activo', 'requiere_cambio_password'];

        updatableFields.forEach((field) => {
            if (data[field] !== undefined) {
                if (field === 'email') {
                    values.push(data[field].trim().toLowerCase());
                } else {
                    values.push(data[field]);
                }
                updates.push(`${field} = $${idx++}`);
            }
        });

        if (data.rol !== undefined) {
            const rolId = await this.resolveRolId(data.rol);
            values.push(rolId);
            updates.push(`rol_id = $${idx++}`);
        }

        if (data.password) {
            const trimmedPassword = data.password.trim();
            if (trimmedPassword.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }
            const passwordHash = await this.hashPassword(trimmedPassword);
            values.push(passwordHash);
            updates.push(`password_hash = $${idx++}`);
            updates.push('ultimo_cambio_password = CURRENT_TIMESTAMP');
        }

        if (!updates.length) {
            throw new Error('No hay cambios para actualizar');
        }

        values.push(id);

        const query = `
            UPDATE usuarios
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${idx}
            RETURNING id
        `;

        const result = await this.pool.query(query, values);

        if (!result.rows.length) {
            throw new Error('Usuario no encontrado');
        }

        return this.getUsuarioById(id);
    }

    /**
     * Da de baja (soft delete) a un usuario
     */
    async darBajaUsuario(id, motivo = 'Baja administrativa', adminId) {
        await this.pool.query(
            'SELECT dar_baja_usuario($1, $2, $3)',
            [id, motivo, adminId || null]
        );
        return this.getUsuarioById(id);
    }

    /**
     * Reactiva a un usuario dado de baja
     */
    async reactivarUsuario(id, adminId) {
        await this.pool.query(
            'SELECT reactivar_usuario($1, $2)',
            [id, adminId || null]
        );
        return this.getUsuarioById(id);
    }

    /**
     * Desbloquea a un usuario bloqueado por intentos fallidos
     */
    async desbloquearUsuario(id, adminId) {
        await this.pool.query(`
            UPDATE usuarios
            SET bloqueado_hasta = NULL,
                intentos_fallidos = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);

        await this.pool.query(`
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, usuario_ejecutor_id)
            VALUES ($1, 'desbloqueo', 'Usuario desbloqueado manualmente por administrador', $2)
        `, [id, adminId || null]);

        return this.getUsuarioById(id);
    }

    /**
     * Genera el hash seguro de una contraseña usando la función de Postgres
     */
    async hashPassword(plainPassword) {
        const password = plainPassword?.trim();
        if (!password) {
            throw new Error('La contraseña no puede estar vacía');
        }

        const result = await this.pool.query(
            'SELECT hashear_password($1) AS hash',
            [password]
        );
        return result.rows[0].hash;
    }

    /**
     * Resuelve el ID del rol a partir de nombre o ID
     */
    async resolveRolId(rol) {
        if (!rol && rol !== 0) {
            throw new Error('Rol requerido');
        }

        if (typeof rol === 'number' && Number.isInteger(rol)) {
            return rol;
        }

        const numeric = parseInt(rol, 10);
        if (!Number.isNaN(numeric)) {
            return numeric;
        }

        const result = await this.pool.query(
            'SELECT id FROM roles WHERE UPPER(nombre) = $1',
            [rol.toString().trim().toUpperCase()]
        );

        if (!result.rows.length) {
            throw new Error(`Rol no válido: ${rol}`);
        }

        return result.rows[0].id;
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

    // ====================================
    // FUNCIONES DE SÁBANAS
    // ====================================

    async createSabana(data) {
        const { nombre, servicio_id, servicio_nombre, usuario_creador_id, notas, cuartos } = data;
        
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            
            const querySabana = `
                INSERT INTO sabanas (nombre, servicio_id, servicio_nombre, usuario_creador_id, notas)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;
            const resultSabana = await client.query(querySabana, [
                nombre, 
                servicio_id, 
                servicio_nombre, 
                usuario_creador_id || null, 
                notas || null
            ]);
            
            const sabana = resultSabana.rows[0];
            
            if (cuartos && cuartos.length > 0) {
                const queryItems = `
                    INSERT INTO sabanas_items (
                        sabana_id, cuarto_id, habitacion, edificio, edificio_id, 
                        fecha_programada, fecha_realizado, responsable, 
                        usuario_responsable_id, observaciones, realizado
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `;
                
                for (const cuarto of cuartos) {
                    await client.query(queryItems, [
                        sabana.id,
                        cuarto.cuarto_id,
                        cuarto.habitacion,
                        cuarto.edificio,
                        cuarto.edificio_id || null,
                        cuarto.fecha_programada || new Date(),
                        cuarto.fecha_realizado || null,
                        cuarto.responsable || null,
                        cuarto.usuario_responsable_id || null,
                        cuarto.observaciones || null,
                        cuarto.realizado || false
                    ]);
                }
            }
            
            await client.query('COMMIT');
            return await this.getSabanaById(sabana.id);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getSabanas(includeArchivadas = false) {
        const query = `
            SELECT s.*, 
                   u.nombre as creador_nombre,
                   u.email as creador_email
            FROM sabanas s
            LEFT JOIN usuarios u ON s.usuario_creador_id = u.id
            WHERE s.archivada = $1 OR $2 = true
            ORDER BY s.fecha_creacion DESC
        `;
        const result = await this.pool.query(query, [false, includeArchivadas]);
        return result.rows;
    }

    async getSabanaById(id) {
        console.log('🔍 [DB] Buscando sábana con ID:', id);
        
        const querySabana = `
            SELECT s.*, 
                   u.nombre as creador_nombre,
                   u.email as creador_email
            FROM sabanas s
            LEFT JOIN usuarios u ON s.usuario_creador_id = u.id
            WHERE s.id = $1
        `;
        const resultSabana = await this.pool.query(querySabana, [id]);
        
        if (resultSabana.rows.length === 0) {
            console.log('❌ [DB] Sábana no encontrada con ID:', id);
            return null;
        }
        
        const sabana = resultSabana.rows[0];
        console.log('✅ [DB] Sábana encontrada:', sabana.nombre);
        
        const queryItems = `
            SELECT si.id,
                   si.sabana_id,
                   si.cuarto_id,
                   si.habitacion,
                   si.edificio as edificio,
                   si.edificio_id,
                   si.fecha_programada,
                   si.fecha_realizado,
                   si.responsable,
                   si.usuario_responsable_id,
                   si.observaciones,
                   si.realizado,
                   c.numero as cuarto_numero,
                   c.estado as cuarto_estado,
                   e.nombre as edificio_nombre,
                   u.nombre as responsable_nombre
            FROM sabanas_items si
            LEFT JOIN cuartos c ON si.cuarto_id = c.id
            LEFT JOIN edificios e ON si.edificio_id = e.id
            LEFT JOIN usuarios u ON si.usuario_responsable_id = u.id
            WHERE si.sabana_id = $1
            ORDER BY e.nombre, c.numero
        `;
        const resultItems = await this.pool.query(queryItems, [id]);
        
        sabana.items = resultItems.rows;
        console.log('📦 [DB] Items cargados:', resultItems.rows.length);
        
        return sabana;
    }

    async updateSabanaItem(itemId, data) {
        const { fecha_realizado, responsable, usuario_responsable_id, observaciones, realizado } = data;
        
        const campos = [];
        const valores = [];
        let contador = 1;
        
        if (fecha_realizado !== undefined) {
            campos.push(`fecha_realizado = $${contador++}`);
            valores.push(fecha_realizado);
        }
        if (responsable !== undefined) {
            campos.push(`responsable = $${contador++}`);
            valores.push(responsable);
        }
        if (usuario_responsable_id !== undefined) {
            campos.push(`usuario_responsable_id = $${contador++}`);
            valores.push(usuario_responsable_id);
        }
        if (observaciones !== undefined) {
            campos.push(`observaciones = $${contador++}`);
            valores.push(observaciones);
        }
        if (realizado !== undefined) {
            campos.push(`realizado = $${contador++}`);
            valores.push(realizado);
            
            if (realizado && !fecha_realizado) {
                campos.push(`fecha_realizado = $${contador++}`);
                valores.push(new Date());
            }
        }
        
        if (campos.length === 0) {
            throw new Error('No hay campos para actualizar');
        }
        
        valores.push(itemId);
        
        const query = `
            UPDATE sabanas_items
            SET ${campos.join(', ')}
            WHERE id = $${contador}
            RETURNING *
        `;
        
        const result = await this.pool.query(query, valores);
        return result.rows[0];
    }

    async archivarSabana(sabanaId) {
        console.log('🗄️ [DB] Archivando sábana ID:', sabanaId);
        
        const query = `
            UPDATE sabanas
            SET archivada = true,
                fecha_archivado = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await this.pool.query(query, [sabanaId]);
        
        if (result.rows.length === 0) {
            throw new Error(`Sábana con ID ${sabanaId} no encontrada`);
        }
        
        console.log('✅ [DB] Sábana archivada:', {
            id: result.rows[0].id,
            nombre: result.rows[0].nombre,
            archivada: result.rows[0].archivada,
            fecha_archivado: result.rows[0].fecha_archivado
        });
        
        return result.rows[0];
    }

    async getSabanasArchivadas() {
        const query = `
            SELECT s.*, 
                   u.nombre as creador_nombre,
                   u.email as creador_email,
                   COUNT(si.id) as total_items,
                   COUNT(CASE WHEN si.realizado = true THEN 1 END) as items_completados,
                   CASE 
                       WHEN COUNT(si.id) > 0 THEN 
                           ROUND((COUNT(CASE WHEN si.realizado = true THEN 1 END)::numeric / COUNT(si.id)::numeric) * 100, 2)
                       ELSE 0
                   END as progreso_porcentaje
            FROM sabanas s
            LEFT JOIN usuarios u ON s.usuario_creador_id = u.id
            LEFT JOIN sabanas_items si ON si.sabana_id = s.id
            WHERE s.archivada = true
            GROUP BY s.id, u.nombre, u.email
            ORDER BY s.fecha_archivado DESC, s.fecha_creacion DESC
        `;
        const result = await this.pool.query(query);
        console.log('📚 Sábanas archivadas encontradas:', result.rows.length);
        return result.rows;
    }

    async deleteSabana(sabanaId) {
        const query = 'DELETE FROM sabanas WHERE id = $1';
        await this.pool.query(query, [sabanaId]);
    }

    async getSabanasByServicio(servicioId, includeArchivadas = false) {
        const query = `
            SELECT s.*, 
                   u.nombre as creador_nombre,
                   u.email as creador_email
            FROM sabanas s
            LEFT JOIN usuarios u ON s.usuario_creador_id = u.id
            WHERE s.servicio_id = $1 AND (s.archivada = false OR $2 = true)
            ORDER BY s.fecha_creacion DESC
        `;
        const result = await this.pool.query(query, [servicioId, includeArchivadas]);
        return result.rows;
    }
}

module.exports = PostgresManager;
