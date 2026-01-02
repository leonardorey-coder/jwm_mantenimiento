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

      if (
        columnCheck.rows.length > 0 &&
        columnCheck.rows[0].data_type === 'integer'
      ) {
        console.log('🔄 Migrando dia_alerta de INTEGER a DATE...');

        // 1. Limpiar columna temporal si existe de intentos anteriores
        await this.pool.query(`
                    ALTER TABLE mantenimientos 
                    DROP COLUMN IF EXISTS dia_alerta_temp
                `);

        // 2. Eliminar vista que depende de dia_alerta (si existe)
        await this.pool.query(
          `DROP VIEW IF EXISTS vista_mantenimientos_completa CASCADE`
        );

        // 3. Agregar columna temporal
        await this.pool.query(
          `ALTER TABLE mantenimientos ADD COLUMN dia_alerta_temp DATE`
        );

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
        await this.pool.query(
          `ALTER TABLE mantenimientos DROP COLUMN dia_alerta`
        );

        // 6. Renombrar columna temporal
        await this.pool.query(
          `ALTER TABLE mantenimientos RENAME COLUMN dia_alerta_temp TO dia_alerta`
        );

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

      // Verificar si existe tabla tareas
      const tareasTableCheck = await this.pool.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'tareas'
            `);

      if (parseInt(tareasTableCheck.rows[0].count) === 0) {
        console.log('🔄 Creando tabla tareas...');
        await this.pool.query(`
                    CREATE TABLE IF NOT EXISTS tareas (
                        id SERIAL PRIMARY KEY,
                        titulo VARCHAR(255) NOT NULL,
                        descripcion TEXT,
                        estado VARCHAR(50) DEFAULT 'pendiente',
                        prioridad VARCHAR(50) DEFAULT 'media',
                        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        fecha_vencimiento DATE,
                        creado_por INTEGER REFERENCES usuarios(id),
                        asignado_a INTEGER REFERENCES usuarios(id),
                        ubicacion VARCHAR(255),
                        tags TEXT[],
                        archivos TEXT[]
                    )
                `);
        console.log('✅ Tabla tareas creada');
      }

      // Verificar si existe columna tarea_id en mantenimientos
      const tareaIdCheck = await this.pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'mantenimientos' 
                AND column_name = 'tarea_id'
            `);

      if (tareaIdCheck.rows.length === 0) {
        console.log('🔄 Agregando columna tarea_id a mantenimientos...');
        await this.pool.query(`
                    ALTER TABLE mantenimientos 
                    ADD COLUMN tarea_id INTEGER REFERENCES tareas(id) ON DELETE SET NULL
                `);
        console.log('✅ Columna tarea_id agregada');
      }

      // Verificar y crear roles faltantes (siempre, no solo cuando está vacía)
      const rolesCheck = await this.pool.query(`
                SELECT nombre FROM roles WHERE nombre IN ('ADMIN', 'SUPERVISOR', 'TECNICO')
            `);
      const rolesExistentes = new Set(
        rolesCheck.rows.map((r) => r.nombre.toUpperCase())
      );
      const rolesFaltantes = ['ADMIN', 'SUPERVISOR', 'TECNICO'].filter(
        (r) => !rolesExistentes.has(r)
      );

      // Migrar fecha_programada de DATE a TIMESTAMPTZ en sabanas_items
      // Esto permite guardar el timestamp completo con timezone
      // y que el frontend lo convierta a la zona horaria local del usuario
      const fechaProgramadaCheck = await this.pool.query(`
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'sabanas_items' 
                AND column_name = 'fecha_programada'
            `);

      if (
        fechaProgramadaCheck.rows.length > 0 &&
        fechaProgramadaCheck.rows[0].data_type === 'date'
      ) {
        console.log('🔄 Migrando fecha_programada de DATE a TIMESTAMPTZ...');

        // Convertir DATE a TIMESTAMPTZ (asumiendo medianoche UTC para fechas existentes)
        await this.pool.query(`
                    ALTER TABLE sabanas_items 
                    ALTER COLUMN fecha_programada TYPE TIMESTAMPTZ 
                    USING (fecha_programada::timestamp AT TIME ZONE 'UTC')
                `);

        console.log(
          '✅ Migración de fecha_programada completada (DATE → TIMESTAMPTZ)'
        );
      }

      if (rolesFaltantes.length > 0) {
        console.log(
          '🔄 Insertando roles faltantes:',
          rolesFaltantes.join(', ')
        );

        // Insertar cada rol faltante individualmente usando INSERT sin ID explícito
        for (const rolNombre of rolesFaltantes) {
          let descripcion, permisos;

          if (rolNombre === 'ADMIN') {
            descripcion = 'Administrador del sistema con acceso total';
            permisos = JSON.stringify({
              all: true,
              usuarios: true,
              exportar_excel: true,
              habitaciones: true,
              espacios: true,
              tareas: true,
              checklist: true,
              sabanas: true,
              alertas: true,
            });
          } else if (rolNombre === 'SUPERVISOR') {
            descripcion =
              'Supervisor con acceso a reportes y exportación (sin gestión de usuarios)';
            permisos = JSON.stringify({
              all: false,
              usuarios: false,
              exportar_excel: true,
              habitaciones: true,
              espacios: true,
              tareas: true,
              checklist: true,
              sabanas: true,
              alertas: true,
            });
          } else if (rolNombre === 'TECNICO') {
            descripcion =
              'Técnico de mantenimiento (sin usuarios ni exportación)';
            permisos = JSON.stringify({
              all: false,
              usuarios: false,
              exportar_excel: false,
              habitaciones: true,
              espacios: true,
              tareas: true,
              checklist: true,
              sabanas: false,
              alertas: true,
            });
          }

          await this.pool.query(
            `
                        INSERT INTO roles (nombre, descripcion, permisos) 
                        VALUES ($1, $2, $3::jsonb)
                        ON CONFLICT (nombre) DO NOTHING
                    `,
            [rolNombre, descripcion, permisos]
          );
          console.log(`✅ Rol ${rolNombre} insertado`);
        }
        console.log('✅ Roles faltantes insertados');
      } else {
        console.log(
          '✅ Todos los roles ya existen: ADMIN, SUPERVISOR, TECNICO'
        );
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
            )`,
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
    const estadosPermitidos = [
      'disponible',
      'ocupado',
      'mantenimiento',
      'fuera_servicio',
    ];
    if (!estadosPermitidos.includes(nuevoEstado)) {
      throw new Error(
        `Estado no válido. Debe ser uno de: ${estadosPermitidos.join(', ')}`
      );
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
      total: 0,
    };

    result.rows.forEach((row) => {
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
        color: '#4CAF50', // Verde
        colorHex: '4CAF50',
        colorRgb: 'rgb(76, 175, 80)',
        colorSecundario: '#E8F5E9', // Verde claro para fondo
        icono: '🟢',
        prioridad: 1,
        disponibleParaReserva: true,
      },
      ocupado: {
        valor: 'ocupado',
        label: 'Ocupado',
        descripcion: 'Huésped hospedado actualmente',
        color: '#2196F3', // Azul
        colorHex: '2196F3',
        colorRgb: 'rgb(33, 150, 243)',
        colorSecundario: '#E3F2FD', // Azul claro para fondo
        icono: '🔵',
        prioridad: 2,
        disponibleParaReserva: false,
      },
      mantenimiento: {
        valor: 'mantenimiento',
        label: 'Mantenimiento',
        descripcion: 'En proceso de limpieza o reparación',
        color: '#FF9800', // Naranja
        colorHex: 'FF9800',
        colorRgb: 'rgb(255, 152, 0)',
        colorSecundario: '#FFF3E0', // Naranja claro para fondo
        icono: '🟠',
        prioridad: 3,
        disponibleParaReserva: false,
      },
      fuera_servicio: {
        valor: 'fuera_servicio',
        label: 'Fuera de Servicio',
        descripcion: 'No disponible por remodelación o daños graves',
        color: '#616161', // Gris oscuro
        colorHex: '616161',
        colorRgb: 'rgb(97, 97, 97)',
        colorSecundario: '#F5F5F5', // Gris claro para fondo
        icono: '⚫',
        prioridad: 4,
        disponibleParaReserva: false,
      },
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
      estados: {},
    };

    Object.keys(configuracion).forEach((estado) => {
      resultado.estados[estado] = {
        ...configuracion[estado],
        cantidad: estadisticas[estado] || 0,
        porcentaje:
          estadisticas.total > 0
            ? (
                ((estadisticas[estado] || 0) / estadisticas.total) *
                100
              ).toFixed(1)
            : 0,
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
                COALESCE(e.nombre, e2.nombre) as edificio_nombre,
                ec.nombre as espacio_nombre,
                uc.nombre as usuario_creador_nombre,
                ua.nombre as usuario_asignado_nombre,
                ua.rol_id as usuario_asignado_rol_id,
                r.nombre as usuario_asignado_rol_nombre
            FROM mantenimientos m
            LEFT JOIN cuartos c ON m.cuarto_id = c.id
            LEFT JOIN edificios e ON c.edificio_id = e.id
            LEFT JOIN espacios_comunes ec ON m.espacio_comun_id = ec.id
            LEFT JOIN edificios e2 ON ec.edificio_id = e2.id
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
      data.dia_alerta || null, // Ahora acepta fecha completa YYYY-MM-DD
      data.prioridad || 'media',
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
    const currentQuery =
      'SELECT dia_alerta, hora FROM mantenimientos WHERE id = $1';
    const currentResult = await this.pool.query(currentQuery, [id]);
    const currentRecord = currentResult.rows[0];

    // Determinar si cambió la fecha o la hora
    const fechaCambio =
      currentRecord &&
      data.dia_alerta &&
      currentRecord.dia_alerta !== data.dia_alerta;
    const horaCambio =
      currentRecord && data.hora && currentRecord.hora !== data.hora;

    let query;
    let values;

    if (fechaCambio || horaCambio) {
      // Si cambió fecha u hora, resetear alerta_emitida a FALSE
      console.log(
        `🔄 Reseteando alerta_emitida para mantenimiento ${id} (fecha cambió: ${fechaCambio}, hora cambió: ${horaCambio})`
      );
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
      data.dia_alerta || null, // Fecha completa YYYY-MM-DD
      data.prioridad || 'media',
      id,
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
   * Usa la zona horaria de Los Cabos (America/Mazatlan) para comparar correctamente
   * @returns {Promise<number>} Número de alertas marcadas
   */
  async marcarAlertasPasadasComoEmitidas() {
    // Log de hora actual del servidor
    const horaServerQuery = `SELECT 
            NOW() as utc_now,
            (NOW() AT TIME ZONE 'America/Mazatlan') as mazatlan_now,
            (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE as fecha_hoy,
            (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::TIME as hora_actual
        `;
    const horaServerResult = await this.pool.query(horaServerQuery);
    const serverTime = horaServerResult.rows[0];
    console.log('🕐 Hora del servidor PostgreSQL:');
    console.log(`   - UTC: ${serverTime.utc_now}`);
    console.log(`   - Mazatlán: ${serverTime.mazatlan_now}`);
    console.log(`   - Fecha hoy (Mazatlán): ${serverTime.fecha_hoy}`);
    console.log(`   - Hora actual (Mazatlán): ${serverTime.hora_actual}`);

    // Primero, log de diagnóstico para ver qué alertas están pendientes
    const diagnosticQuery = `
            SELECT id, dia_alerta, hora, descripcion, alerta_emitida,
                (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE as fecha_hoy,
                (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::TIME as hora_actual
            FROM mantenimientos 
            WHERE tipo = 'rutina'
            AND (alerta_emitida = FALSE OR alerta_emitida IS NULL)
            AND dia_alerta IS NOT NULL
        `;
    const diagnosticResult = await this.pool.query(diagnosticQuery);
    console.log(
      `🔍 Diagnóstico: ${diagnosticResult.rows.length} alertas con alerta_emitida=FALSE:`
    );
    diagnosticResult.rows.forEach((r) => {
      const fechaHoy = r.fecha_hoy;
      const horaActual = r.hora_actual;
      // Comparar correctamente
      const fechaAlerta =
        typeof r.dia_alerta === 'object' && r.dia_alerta instanceof Date
          ? r.dia_alerta.toISOString().split('T')[0]
          : String(r.dia_alerta).split('T')[0];
      const fechaHoyStr =
        typeof fechaHoy === 'object' && fechaHoy instanceof Date
          ? fechaHoy.toISOString().split('T')[0]
          : String(fechaHoy).split('T')[0];

      const fechaPasada = fechaAlerta < fechaHoyStr;
      const mismaFecha = fechaAlerta === fechaHoyStr;
      const horaPasada = r.hora === null || r.hora <= horaActual;
      const esPasada = fechaPasada || (mismaFecha && horaPasada);

      console.log(
        `   - ID ${r.id}: fecha=${fechaAlerta} hora=${r.hora || 'NULL'} emitida=${r.alerta_emitida}`
      );
      console.log(
        `     → hoy=${fechaHoyStr} ahora=${horaActual} => fechaPasada=${fechaPasada} mismaFecha=${mismaFecha} horaPasada=${horaPasada} => ${esPasada ? '⏰ DEBE MARCARSE' : '⏳ aún futura'}`
      );
    });

    // Usar timezone de Los Cabos para comparar correctamente
    // Incluir alertas donde hora es NULL si la fecha ya pasó
    const query = `
            UPDATE mantenimientos 
            SET alerta_emitida = TRUE 
            WHERE tipo = 'rutina'
            AND (alerta_emitida = FALSE OR alerta_emitida IS NULL)
            AND dia_alerta IS NOT NULL
            AND (
                dia_alerta < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE
                OR (
                    dia_alerta = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE 
                    AND (hora IS NULL OR hora <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::TIME)
                )
            )
            RETURNING id, dia_alerta, hora, descripcion
        `;
    const result = await this.pool.query(query);
    const count = result.rows.length;

    if (count > 0) {
      console.log(`✅ Marcadas ${count} alertas pasadas como emitidas:`);
      result.rows.forEach((r) =>
        console.log(
          `   - ID ${r.id}: ${r.dia_alerta} ${r.hora || 'sin hora'} - ${r.descripcion?.substring(0, 30)}`
        )
      );
    } else {
      console.log('ℹ️ No hay alertas pasadas para marcar');
    }

    return count;
  }

  /**
   * Obtener mantenimientos pendientes de alerta
   * (útil para sistema de notificaciones)
   * Usa timezone de Los Cabos para comparar fechas correctamente
   */
  async getMantenimientosPendientesAlerta() {
    const query = `
            SELECT m.*, c.numero as cuarto_numero, e.nombre as edificio_nombre
            FROM mantenimientos m
            LEFT JOIN cuartos c ON m.cuarto_id = c.id
            LEFT JOIN edificios e ON c.edificio_id = e.id
            WHERE m.dia_alerta IS NOT NULL 
            AND m.alerta_emitida = FALSE
            AND (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE >= m.dia_alerta
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
            SELECT m.*, c.numero as cuarto_numero, e.nombre as edificio_nombre,
                   m.dia_alerta::TEXT as dia_alerta_str,
                   m.hora::TEXT as hora_str
            FROM mantenimientos m
            LEFT JOIN cuartos c ON m.cuarto_id = c.id
            LEFT JOIN edificios e ON c.edificio_id = e.id
            WHERE m.tipo = 'rutina'
            AND m.alerta_emitida = TRUE
        `;

    const params = [];

    if (fecha) {
      query += ` AND m.dia_alerta = $1::DATE`;
      params.push(fecha);
    }

    query += ` ORDER BY m.dia_alerta DESC, m.hora DESC`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Obtener alertas pendientes (no emitidas)
   * Solo retorna alertas que aún no han llegado a su hora programada
   * @returns {Promise<Array>} Array de alertas pendientes
   */
  async getAlertasPendientes() {
    // Alertas pendientes: NO emitidas Y cuya fecha/hora aún no ha pasado
    // Una alerta es pendiente si:
    // - fecha > hoy, O
    // - fecha = hoy Y (hora es null O hora > ahora)
    const query = `
            SELECT 
                m.*, 
                c.numero as cuarto_numero, 
                ec.nombre as espacio_nombre,
                COALESCE(e_cuarto.nombre, e_espacio.nombre) as edificio_nombre,
                m.dia_alerta::TEXT as dia_alerta_str,
                m.hora::TEXT as hora_str,
                (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE as fecha_hoy,
                (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::TIME as hora_actual
            FROM mantenimientos m
            LEFT JOIN cuartos c ON m.cuarto_id = c.id
            LEFT JOIN edificios e_cuarto ON c.edificio_id = e_cuarto.id
            LEFT JOIN espacios_comunes ec ON m.espacio_comun_id = ec.id
            LEFT JOIN edificios e_espacio ON ec.edificio_id = e_espacio.id
            WHERE m.tipo = 'rutina'
            AND (m.alerta_emitida = FALSE OR m.alerta_emitida IS NULL)
            AND m.dia_alerta IS NOT NULL
            AND (
                m.dia_alerta > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE
                OR (
                    m.dia_alerta = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::DATE 
                    AND m.hora IS NOT NULL
                    AND m.hora > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Mazatlan')::TIME
                )
            )
            ORDER BY m.dia_alerta ASC, m.hora ASC
        `;

    const result = await this.pool.query(query);
    console.log(
      `📝 getAlertasPendientes: Encontradas ${result.rows.length} alertas pendientes`
    );
    if (result.rows.length > 0) {
      result.rows.forEach((r) => {
        console.log(
          `   - ID ${r.id}: ${r.dia_alerta} ${r.hora || 'sin hora'} (hoy=${r.fecha_hoy} ahora=${r.hora_actual})`
        );
      });
    }
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
    const result = await this.pool.query(
      `
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
        `,
      [id]
    );

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

    const result = await this.pool.query(
      `
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
        `,
      [
        nombre,
        email,
        passwordHash,
        rolId,
        data.telefono || null,
        data.departamento || null,
        data.numero_empleado || null,
        data.notas_admin || null,
        data.foto_perfil_url || null,
        data.requiere_cambio_password ?? false,
      ]
    );

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

    const updatableFields = [
      'nombre',
      'email',
      'telefono',
      'departamento',
      'numero_empleado',
      'notas_admin',
      'foto_perfil_url',
      'activo',
      'requiere_cambio_password',
    ];

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
    await this.pool.query('SELECT dar_baja_usuario($1, $2, $3)', [
      id,
      motivo,
      adminId || null,
    ]);
    return this.getUsuarioById(id);
  }

  /**
   * Reactiva a un usuario dado de baja
   */
  async reactivarUsuario(id, adminId) {
    await this.pool.query('SELECT reactivar_usuario($1, $2)', [
      id,
      adminId || null,
    ]);
    return this.getUsuarioById(id);
  }

  /**
   * Desbloquea a un usuario bloqueado por intentos fallidos
   */
  async desbloquearUsuario(id, adminId) {
    await this.pool.query(
      `
            UPDATE usuarios
            SET bloqueado_hasta = NULL,
                intentos_fallidos = 0,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `,
      [id]
    );

    await this.pool.query(
      `
            INSERT INTO auditoria_usuarios (usuario_id, accion, descripcion, usuario_ejecutor_id)
            VALUES ($1, 'desbloqueo', 'Usuario desbloqueado manualmente por administrador', $2)
        `,
      [id, adminId || null]
    );

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
   * Soporta: número, string numérico, o nombre de rol (case-insensitive)
   */
  async resolveRolId(rol) {
    if (!rol && rol !== 0) {
      throw new Error('Rol requerido');
    }

    // Si es un número entero, verificar que existe y devolverlo
    if (typeof rol === 'number' && Number.isInteger(rol)) {
      const checkResult = await this.pool.query(
        'SELECT id FROM roles WHERE id = $1',
        [rol]
      );
      if (checkResult.rows.length) {
        return rol;
      }
      throw new Error(`Rol con ID ${rol} no existe`);
    }

    // Si es un string que representa un número, verificar que existe
    const numeric = parseInt(rol, 10);
    if (!Number.isNaN(numeric) && String(numeric) === String(rol).trim()) {
      const checkResult = await this.pool.query(
        'SELECT id FROM roles WHERE id = $1',
        [numeric]
      );
      if (checkResult.rows.length) {
        return numeric;
      }
      throw new Error(`Rol con ID ${numeric} no existe`);
    }

    // Buscar por nombre (case-insensitive)
    const rolNombre = rol.toString().trim().toUpperCase();
    console.log(`🔍 Buscando rol por nombre: "${rolNombre}"`);

    const result = await this.pool.query(
      'SELECT id FROM roles WHERE UPPER(nombre) = $1',
      [rolNombre]
    );

    if (!result.rows.length) {
      // Listar roles disponibles para el mensaje de error
      const rolesDisponibles = await this.pool.query(
        'SELECT nombre FROM roles'
      );
      const nombresRoles = rolesDisponibles.rows
        .map((r) => r.nombre)
        .join(', ');
      throw new Error(
        `Rol "${rol}" no válido. Roles disponibles: ${nombresRoles || 'ninguno'}`
      );
    }

    console.log(
      `✅ Rol "${rolNombre}" encontrado con ID: ${result.rows[0].id}`
    );
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
      waitingCount: this.pool.waitingCount,
    };
  }

  // ====================================
  // FUNCIONES DE SÁBANAS
  // ====================================

  async createSabana(data) {
    const {
      nombre,
      servicio_id,
      servicio_nombre,
      usuario_creador_id,
      notas,
      cuartos,
    } = data;

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
        notas || null,
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
            cuarto.fecha_programada || new Date().toISOString(), // Timestamp ISO para TIMESTAMPTZ
            cuarto.fecha_realizado || null,
            cuarto.responsable || null,
            cuarto.usuario_responsable_id || null,
            cuarto.observaciones || null,
            cuarto.realizado || false,
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
    const {
      fecha_realizado,
      responsable,
      usuario_responsable_id,
      observaciones,
      realizado,
    } = data;

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
      fecha_archivado: result.rows[0].fecha_archivado,
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
    const result = await this.pool.query(query, [
      servicioId,
      includeArchivadas,
    ]);
    return result.rows;
  }
  // =====================================
  // Gestión de Tareas
  // =====================================

  /**
   * Obtener tareas con filtros opcionales
   */
  async getTareas(filters = {}) {
    let query = `
            SELECT t.*, 
                   uc.nombre as creado_por_nombre,
                   ua.nombre as asignado_a_nombre,
                   ua.rol_id as asignado_a_rol_id,
                   r.nombre as asignado_a_rol_nombre,
                   (SELECT COUNT(*) FROM mantenimientos m WHERE m.tarea_id = t.id) as total_mantenimientos,
                   (SELECT COUNT(*) FROM mantenimientos m WHERE m.tarea_id = t.id AND m.estado = 'completado') as mantenimientos_completados,
                   (SELECT COUNT(*) FROM tareas_adjuntos ta WHERE ta.tarea_id = t.id) as total_adjuntos
            FROM tareas t
            LEFT JOIN usuarios uc ON t.creado_por = uc.id
            LEFT JOIN usuarios ua ON t.asignado_a = ua.id
            LEFT JOIN roles r ON ua.rol_id = r.id
            WHERE 1=1
        `;

    const params = [];
    let paramCount = 1;

    if (filters.estado) {
      query += ` AND t.estado = $${paramCount++}`;
      params.push(filters.estado);
    }

    if (filters.prioridad) {
      query += ` AND t.prioridad = $${paramCount++}`;
      params.push(filters.prioridad);
    }

    if (filters.asignado_a) {
      query += ` AND t.asignado_a = $${paramCount++}`;
      params.push(filters.asignado_a);
    }

    query += ' ORDER BY t.fecha_creacion DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Obtener una tarea por ID
   */
  async getTareaById(id) {
    const query = `
            SELECT t.*, 
                   uc.nombre as creado_por_nombre,
                   ua.nombre as asignado_a_nombre,
                   ua.rol_id as asignado_a_rol_id,
                   r.nombre as asignado_a_rol_nombre
            FROM tareas t
            LEFT JOIN usuarios uc ON t.creado_por = uc.id
            LEFT JOIN usuarios ua ON t.asignado_a = ua.id
            LEFT JOIN roles r ON ua.rol_id = r.id
            WHERE t.id = $1
        `;
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Crear una nueva tarea
   */
  async createTarea(data) {
    const query = `
            INSERT INTO tareas (
                titulo, descripcion, estado, prioridad, fecha_vencimiento, 
                creado_por, asignado_a, ubicacion, tags
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

    const values = [
      data.titulo,
      data.descripcion,
      data.estado || 'pendiente',
      data.prioridad || 'media',
      data.fecha_vencimiento || null,
      data.creado_por,
      data.asignado_a || null,
      data.ubicacion || null,
      data.tags || [],
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Actualizar una tarea existente
   */
  async updateTarea(id, data) {
    const campos = [];
    const valores = [];
    let contador = 1;

    if (data.titulo !== undefined) {
      campos.push(`titulo = $${contador++}`);
      valores.push(data.titulo);
    }
    if (data.descripcion !== undefined) {
      campos.push(`descripcion = $${contador++}`);
      valores.push(data.descripcion);
    }
    if (data.estado !== undefined) {
      campos.push(`estado = $${contador++}`);
      valores.push(data.estado);
    }
    if (data.prioridad !== undefined) {
      campos.push(`prioridad = $${contador++}`);
      valores.push(data.prioridad);
    }
    if (data.fecha_vencimiento !== undefined) {
      campos.push(`fecha_vencimiento = $${contador++}`);
      valores.push(data.fecha_vencimiento);
    }
    if (data.asignado_a !== undefined) {
      campos.push(`asignado_a = $${contador++}`);
      valores.push(data.asignado_a);
    }
    if (data.ubicacion !== undefined) {
      campos.push(`ubicacion = $${contador++}`);
      valores.push(data.ubicacion);
    }
    if (data.tags !== undefined) {
      campos.push(`tags = $${contador++}`);
      valores.push(data.tags);
    }

    if (campos.length === 0) return null;

    valores.push(id);
    const query = `
            UPDATE tareas
            SET ${campos.join(', ')}
            WHERE id = $${contador}
            RETURNING *
        `;

    const result = await this.pool.query(query, valores);
    return result.rows[0];
  }

  /**
   * Eliminar una tarea
   */
  async deleteTarea(id) {
    const query = 'DELETE FROM tareas WHERE id = $1 RETURNING *';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  // ============================================
  // MÉTODOS PARA CHECKLIST
  // ============================================

  /**
   * Ejecutar migración del esquema de checklist
   */
  async runChecklistMigration() {
    try {
      // Verificar si las tablas ya existen
      const tablesCheck = await this.pool.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('checklist_categorias', 'checklist_catalog_items', 'room_checklist_results')
            `);

      if (parseInt(tablesCheck.rows[0].count) >= 3) {
        console.log('✅ Tablas de checklist ya existen');
        return true;
      }

      console.log('📄 Creando tablas de checklist...');

      // Crear tabla de categorías
      await this.pool.query(`
                CREATE TABLE IF NOT EXISTS checklist_categorias (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL UNIQUE,
                    slug VARCHAR(50) NOT NULL UNIQUE,
                    icono VARCHAR(50) DEFAULT 'fa-layer-group',
                    activo BOOLEAN DEFAULT TRUE,
                    orden INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

      // Crear tabla de ítems del catálogo
      await this.pool.query(`
                CREATE TABLE IF NOT EXISTS checklist_catalog_items (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL,
                    categoria_id INTEGER REFERENCES checklist_categorias(id) ON DELETE SET NULL,
                    activo BOOLEAN DEFAULT TRUE,
                    orden INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

      // Crear tabla de resultados de checklist
      await this.pool.query(`
                CREATE TABLE IF NOT EXISTS room_checklist_results (
                    id SERIAL PRIMARY KEY,
                    cuarto_id INTEGER REFERENCES cuartos(id) ON DELETE CASCADE,
                    catalog_item_id INTEGER REFERENCES checklist_catalog_items(id) ON DELETE CASCADE,
                    nombre_snapshot VARCHAR(100),
                    categoria_id INTEGER REFERENCES checklist_categorias(id) ON DELETE SET NULL,
                    estado VARCHAR(20) NOT NULL DEFAULT 'bueno' CHECK (estado IN ('bueno', 'regular', 'malo')),
                    observacion TEXT,
                    foto_url TEXT,
                    ultimo_editor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(cuarto_id, catalog_item_id)
                )
            `);

      // Crear índices
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_checklist_results_cuarto ON room_checklist_results(cuarto_id)`
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_checklist_results_estado ON room_checklist_results(estado)`
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_checklist_catalog_categoria ON checklist_catalog_items(categoria_id)`
      );

      // Insertar categorías por defecto
      await this.pool.query(`
                INSERT INTO checklist_categorias (nombre, slug, icono, orden) VALUES
                ('Climatización', 'climatizacion', 'fa-temperature-half', 1),
                ('Electrónica', 'electronica', 'fa-plug', 2),
                ('Mobiliario', 'mobiliario', 'fa-couch', 3),
                ('Sanitarios', 'sanitarios', 'fa-shower', 4),
                ('Amenidades', 'amenidades', 'fa-concierge-bell', 5),
                ('Estructura', 'estructura', 'fa-door-open', 6)
                ON CONFLICT (slug) DO NOTHING
            `);

      // Insertar ítems del catálogo
      const itemsData = [
        { nombre: 'Aire acondicionado', categoria: 'climatizacion', orden: 1 },
        { nombre: 'Calefacción', categoria: 'climatizacion', orden: 2 },
        { nombre: 'Ventilación', categoria: 'climatizacion', orden: 3 },
        { nombre: 'Televisión', categoria: 'electronica', orden: 1 },
        { nombre: 'Teléfono', categoria: 'electronica', orden: 2 },
        { nombre: 'Control remoto', categoria: 'electronica', orden: 3 },
        { nombre: 'Iluminación', categoria: 'electronica', orden: 4 },
        { nombre: 'Sofá', categoria: 'mobiliario', orden: 1 },
        { nombre: 'Cama', categoria: 'mobiliario', orden: 2 },
        { nombre: 'Closet', categoria: 'mobiliario', orden: 3 },
        { nombre: 'Mesa de noche', categoria: 'mobiliario', orden: 4 },
        { nombre: 'Silla', categoria: 'mobiliario', orden: 5 },
        { nombre: 'Baño', categoria: 'sanitarios', orden: 1 },
        { nombre: 'Regadera', categoria: 'sanitarios', orden: 2 },
        { nombre: 'Lavabo', categoria: 'sanitarios', orden: 3 },
        { nombre: 'Inodoro', categoria: 'sanitarios', orden: 4 },
        { nombre: 'Minibar', categoria: 'amenidades', orden: 1 },
        { nombre: 'Caja fuerte', categoria: 'amenidades', orden: 2 },
        { nombre: 'Cafetera', categoria: 'amenidades', orden: 3 },
        { nombre: 'Ventanas', categoria: 'estructura', orden: 1 },
        { nombre: 'Cortinas', categoria: 'estructura', orden: 2 },
        { nombre: 'Puertas', categoria: 'estructura', orden: 3 },
        { nombre: 'Pisos', categoria: 'estructura', orden: 4 },
      ];

      for (const item of itemsData) {
        await this.pool.query(
          `
                    INSERT INTO checklist_catalog_items (nombre, categoria_id, orden)
                    SELECT $1, id, $2 FROM checklist_categorias WHERE slug = $3
                    ON CONFLICT DO NOTHING
                `,
          [item.nombre, item.orden, item.categoria]
        );
      }

      console.log('✅ Tablas de checklist creadas correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error en migración de checklist:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las categorías del checklist
   */
  async getChecklistCategorias() {
    const result = await this.pool.query(`
            SELECT id, nombre, slug, icono, activo, orden
            FROM checklist_categorias
            WHERE activo = TRUE
            ORDER BY orden, id
        `);
    return result.rows;
  }

  /**
   * Obtener todos los ítems del catálogo de checklist
   */
  async getChecklistCatalogItems(categoriaId = null) {
    let query = `
            SELECT 
                ci.id,
                ci.nombre,
                ci.categoria_id,
                ci.activo,
                ci.orden,
                cat.slug as categoria_slug,
                cat.nombre as categoria_nombre,
                cat.icono as categoria_icono
            FROM checklist_catalog_items ci
            LEFT JOIN checklist_categorias cat ON ci.categoria_id = cat.id
            WHERE ci.activo = TRUE
        `;

    const params = [];
    if (categoriaId) {
      query += ' AND ci.categoria_id = $1';
      params.push(categoriaId);
    }

    query += ' ORDER BY cat.orden, ci.orden, ci.id';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Agregar una nueva categoría al checklist
   */
  async addChecklistCategoria(data) {
    const slug =
      data.slug ||
      data.nombre
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const result = await this.pool.query(
      `
            INSERT INTO checklist_categorias (nombre, slug, icono, orden)
            VALUES ($1, $2, $3, COALESCE($4, (SELECT COALESCE(MAX(orden), 0) + 1 FROM checklist_categorias)))
            RETURNING *
        `,
      [data.nombre, slug, data.icono || 'fa-layer-group', data.orden]
    );

    return result.rows[0];
  }

  /**
   * Agregar un nuevo ítem al catálogo de checklist
   */
  async addChecklistCatalogItem(data) {
    const result = await this.pool.query(
      `
            INSERT INTO checklist_catalog_items (nombre, categoria_id, orden)
            VALUES ($1, $2, COALESCE($3, (SELECT COALESCE(MAX(orden), 0) + 1 FROM checklist_catalog_items WHERE categoria_id = $2)))
            RETURNING *
        `,
      [data.nombre, data.categoria_id, data.orden]
    );

    return result.rows[0];
  }

  /**
   * Obtener datos completos de checklist por cuarto con todos sus ítems
   */
  async getChecklistByCuarto(cuartoId) {
    const result = await this.pool.query(
      `
            SELECT 
                c.id as cuarto_id,
                c.numero,
                c.estado as estado_cuarto,
                e.id as edificio_id,
                e.nombre as edificio_nombre,
                ci.id as item_id,
                ci.nombre as item_nombre,
                ci.orden as item_orden,
                cat.id as categoria_id,
                cat.slug as categoria_slug,
                cat.nombre as categoria_nombre,
                cat.icono as categoria_icono,
                cat.orden as categoria_orden,
                COALESCE(rcr.estado, 'bueno') as item_estado,
                rcr.observacion,
                rcr.foto_url,
                rcr.updated_at as fecha_ultima_edicion,
                u.nombre as ultimo_editor
            FROM cuartos c
            LEFT JOIN edificios e ON c.edificio_id = e.id
            CROSS JOIN checklist_catalog_items ci
            LEFT JOIN checklist_categorias cat ON ci.categoria_id = cat.id
            LEFT JOIN room_checklist_results rcr ON rcr.cuarto_id = c.id AND rcr.catalog_item_id = ci.id
            LEFT JOIN usuarios u ON rcr.ultimo_editor_id = u.id
            WHERE c.id = $1 AND ci.activo = TRUE AND (cat.activo = TRUE OR cat.activo IS NULL)
            ORDER BY cat.orden, ci.orden
        `,
      [cuartoId]
    );

    return result.rows;
  }

  /**
   * Obtener datos completos de checklist para todos los cuartos
   */
  async getAllChecklistData(filters = {}) {
    console.log('[PostgresManager.getAllChecklistData] Iniciando...');
    console.log('[PostgresManager.getAllChecklistData] Filtros:', filters);

    let query = `
            SELECT 
                c.id as cuarto_id,
                c.numero,
                c.estado as estado_cuarto,
                e.id as edificio_id,
                e.nombre as edificio_nombre,
                ci.id as item_id,
                ci.nombre as item_nombre,
                ci.orden as item_orden,
                cat.id as categoria_id,
                cat.slug as categoria_slug,
                cat.nombre as categoria_nombre,
                cat.icono as categoria_icono,
                cat.orden as categoria_orden,
                COALESCE(rcr.estado, 'bueno') as item_estado,
                rcr.observacion,
                rcr.foto_url,
                rcr.updated_at as fecha_ultima_edicion,
                u.nombre as ultimo_editor
            FROM cuartos c
            LEFT JOIN edificios e ON c.edificio_id = e.id
            CROSS JOIN checklist_catalog_items ci
            LEFT JOIN checklist_categorias cat ON ci.categoria_id = cat.id
            LEFT JOIN room_checklist_results rcr ON rcr.cuarto_id = c.id AND rcr.catalog_item_id = ci.id
            LEFT JOIN usuarios u ON rcr.ultimo_editor_id = u.id
            WHERE ci.activo = TRUE AND (cat.activo = TRUE OR cat.activo IS NULL)
        `;

    const params = [];
    let paramCount = 1;

    if (filters.edificio_id) {
      query += ` AND c.edificio_id = $${paramCount++}`;
      params.push(filters.edificio_id);
    }

    if (filters.categoria_id) {
      query += ` AND ci.categoria_id = $${paramCount++}`;
      params.push(filters.categoria_id);
    }

    query += ' ORDER BY c.numero, cat.orden, ci.orden';

    console.log('[PostgresManager.getAllChecklistData] Query:', query);
    console.log('[PostgresManager.getAllChecklistData] Params:', params);

    const result = await this.pool.query(query, params);

    console.log(
      '[PostgresManager.getAllChecklistData] Filas obtenidas:',
      result.rows.length
    );
    if (result.rows.length > 0) {
      console.log(
        '[PostgresManager.getAllChecklistData] Primera fila:',
        result.rows[0]
      );
    }

    // Agrupar resultados por cuarto
    const cuartosMap = new Map();

    for (const row of result.rows) {
      if (!cuartosMap.has(row.cuarto_id)) {
        cuartosMap.set(row.cuarto_id, {
          cuarto_id: row.cuarto_id,
          numero: row.numero,
          estado_cuarto: row.estado_cuarto,
          edificio_id: row.edificio_id,
          edificio: row.edificio_nombre,
          edificio_nombre: row.edificio_nombre,
          ultimo_editor: null,
          fecha_ultima_edicion: null,
          items: [],
        });
      }

      const cuarto = cuartosMap.get(row.cuarto_id);

      cuarto.items.push({
        id: row.item_id,
        nombre: row.item_nombre,
        categoria: row.categoria_slug,
        categoria_id: row.categoria_id,
        categoria_nombre: row.categoria_nombre,
        estado: row.item_estado,
        observacion: row.observacion,
        foto_url: row.foto_url,
      });

      // Actualizar último editor si hay una fecha más reciente
      if (row.ultimo_editor && row.fecha_ultima_edicion) {
        if (
          !cuarto.fecha_ultima_edicion ||
          new Date(row.fecha_ultima_edicion) >
            new Date(cuarto.fecha_ultima_edicion)
        ) {
          cuarto.ultimo_editor = row.ultimo_editor;
          cuarto.fecha_ultima_edicion = row.fecha_ultima_edicion;
        }
      }
    }

    const resultado = Array.from(cuartosMap.values());
    console.log(
      '[PostgresManager.getAllChecklistData] Cuartos procesados:',
      resultado.length
    );
    if (resultado.length > 0) {
      console.log(
        '[PostgresManager.getAllChecklistData] Primer cuarto:',
        resultado[0].numero
      );
      console.log(
        '[PostgresManager.getAllChecklistData] Items del primer cuarto:',
        resultado[0].items?.length
      );
    }
    return resultado;
  }

  /**
   * Actualizar el estado de un ítem del checklist para un cuarto específico
   */
  async updateChecklistItemEstado(
    cuartoId,
    catalogItemId,
    estado,
    usuarioId,
    observacion = null
  ) {
    // Validar estado
    const estadosValidos = ['bueno', 'regular', 'malo'];
    if (!estadosValidos.includes(estado)) {
      throw new Error(
        `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}`
      );
    }

    // Obtener nombre del ítem del catálogo
    const itemQuery = await this.pool.query(
      'SELECT nombre, categoria_id FROM checklist_catalog_items WHERE id = $1',
      [catalogItemId]
    );

    if (itemQuery.rows.length === 0) {
      throw new Error('Ítem del catálogo no encontrado');
    }

    const item = itemQuery.rows[0];

    // Upsert del resultado
    const result = await this.pool.query(
      `
            INSERT INTO room_checklist_results 
                (cuarto_id, catalog_item_id, nombre_snapshot, categoria_id, estado, observacion, ultimo_editor_id, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            ON CONFLICT (cuarto_id, catalog_item_id) 
            DO UPDATE SET 
                estado = EXCLUDED.estado,
                observacion = EXCLUDED.observacion,
                ultimo_editor_id = EXCLUDED.ultimo_editor_id,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `,
      [
        cuartoId,
        catalogItemId,
        item.nombre,
        item.categoria_id,
        estado,
        observacion,
        usuarioId,
      ]
    );

    return result.rows[0];
  }

  /**
   * Actualizar múltiples ítems del checklist a la vez
   */
  async updateChecklistItemsBulk(cuartoId, items, usuarioId) {
    const results = [];

    for (const item of items) {
      try {
        const result = await this.updateChecklistItemEstado(
          cuartoId,
          item.catalog_item_id || item.id,
          item.estado,
          usuarioId,
          item.observacion
        );
        results.push({ success: true, item: result });
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          item_id: item.catalog_item_id || item.id,
        });
      }
    }

    return results;
  }

  /**
   * Obtener resumen de estados del checklist por cuarto
   */
  async getChecklistResumenByCuarto(cuartoId) {
    const result = await this.pool.query(
      `
            SELECT 
                COALESCE(rcr.estado, 'bueno') as estado,
                COUNT(*) as cantidad
            FROM checklist_catalog_items ci
            LEFT JOIN room_checklist_results rcr ON rcr.catalog_item_id = ci.id AND rcr.cuarto_id = $1
            WHERE ci.activo = TRUE
            GROUP BY COALESCE(rcr.estado, 'bueno')
        `,
      [cuartoId]
    );

    const resumen = { bueno: 0, regular: 0, malo: 0, total: 0 };

    for (const row of result.rows) {
      resumen[row.estado] = parseInt(row.cantidad);
      resumen.total += parseInt(row.cantidad);
    }

    return resumen;
  }

  /**
   * Obtener resumen general de checklist de todos los cuartos
   */
  async getChecklistResumenGeneral() {
    const result = await this.pool.query(`
            SELECT 
                c.id as cuarto_id,
                c.numero,
                e.nombre as edificio_nombre,
                COUNT(*) as total_items,
                SUM(CASE WHEN COALESCE(rcr.estado, 'bueno') = 'bueno' THEN 1 ELSE 0 END) as buenos,
                SUM(CASE WHEN rcr.estado = 'regular' THEN 1 ELSE 0 END) as regulares,
                SUM(CASE WHEN rcr.estado = 'malo' THEN 1 ELSE 0 END) as malos
            FROM cuartos c
            LEFT JOIN edificios e ON c.edificio_id = e.id
            CROSS JOIN checklist_catalog_items ci
            LEFT JOIN room_checklist_results rcr ON rcr.cuarto_id = c.id AND rcr.catalog_item_id = ci.id
            WHERE ci.activo = TRUE
            GROUP BY c.id, c.numero, e.nombre
            ORDER BY c.numero
        `);

    return result.rows;
  }

  /**
   * Eliminar una categoría del checklist (soft delete)
   */
  async deleteChecklistCategoria(categoriaId) {
    const result = await this.pool.query(
      `
            UPDATE checklist_categorias 
            SET activo = FALSE 
            WHERE id = $1 
            RETURNING *
        `,
      [categoriaId]
    );

    return result.rows[0];
  }

  /**
   * Eliminar un ítem del catálogo de checklist (soft delete)
   */
  async deleteChecklistCatalogItem(itemId) {
    const result = await this.pool.query(
      `
            UPDATE checklist_catalog_items 
            SET activo = FALSE 
            WHERE id = $1 
            RETURNING *
        `,
      [itemId]
    );

    return result.rows[0];
  }

  // ==========================================
  // CHECKLIST FOTOS
  // ==========================================

  /**
   * Ejecutar migración de tabla de fotos de checklist
   */
  async runChecklistFotosMigration() {
    try {
      // Verificar si la tabla ya existe
      const tableCheck = await this.pool.query(`
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'checklist_fotos'
            `);

      if (parseInt(tableCheck.rows[0].count) > 0) {
        console.log('✅ Tabla checklist_fotos ya existe');
        return;
      }

      console.log('🔄 Creando tabla checklist_fotos...');

      await this.pool.query(`
                CREATE TABLE IF NOT EXISTS checklist_fotos (
                    id SERIAL PRIMARY KEY,
                    cuarto_id INTEGER REFERENCES cuartos(id) ON DELETE CASCADE,
                    catalog_item_id INTEGER REFERENCES checklist_catalog_items(id) ON DELETE SET NULL,
                    foto_url TEXT NOT NULL,
                    uploadthing_key TEXT,
                    notas TEXT,
                    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
                    fecha_tomada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_checklist_fotos_cuarto ON checklist_fotos(cuarto_id)`
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_checklist_fotos_item ON checklist_fotos(catalog_item_id)`
      );
      await this.pool.query(
        `CREATE INDEX IF NOT EXISTS idx_checklist_fotos_fecha ON checklist_fotos(created_at DESC)`
      );

      console.log('✅ Tabla checklist_fotos creada');
    } catch (error) {
      console.error('⚠️ Error en migración de checklist_fotos:', error);
    }
  }

  /**
   * Crear una nueva foto de checklist
   */
  async createChecklistFoto({
    cuartoId,
    catalogItemId,
    fotoUrl,
    uploadthingKey,
    notas,
    usuarioId,
  }) {
    const result = await this.pool.query(
      `
            INSERT INTO checklist_fotos 
            (cuarto_id, catalog_item_id, foto_url, uploadthing_key, notas, usuario_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *,
            (SELECT nombre FROM usuarios WHERE id = $6) as usuario_nombre,
            (SELECT nombre FROM checklist_catalog_items WHERE id = $2) as item_nombre
        `,
      [
        cuartoId,
        catalogItemId || null,
        fotoUrl,
        uploadthingKey || null,
        notas || null,
        usuarioId || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Obtener fotos de checklist por cuarto
   */
  async getChecklistFotosByCuarto(cuartoId) {
    const result = await this.pool.query(
      `
            SELECT 
                cf.*,
                u.nombre as usuario_nombre,
                ci.nombre as item_nombre,
                cat.nombre as categoria_nombre
            FROM checklist_fotos cf
            LEFT JOIN usuarios u ON cf.usuario_id = u.id
            LEFT JOIN checklist_catalog_items ci ON cf.catalog_item_id = ci.id
            LEFT JOIN checklist_categorias cat ON ci.categoria_id = cat.id
            WHERE cf.cuarto_id = $1
            ORDER BY cf.created_at DESC
        `,
      [cuartoId]
    );

    return result.rows;
  }

  /**
   * Eliminar una foto de checklist
   */
  async deleteChecklistFoto(fotoId) {
    const result = await this.pool.query(
      `
            DELETE FROM checklist_fotos 
            WHERE id = $1 
            RETURNING *
        `,
      [fotoId]
    );

    return result.rows[0];
  }

  /**
   * Obtener una foto de checklist por ID
   */
  async getChecklistFotoById(fotoId) {
    const result = await this.pool.query(
      `
            SELECT 
                cf.*,
                u.nombre as usuario_nombre,
                ci.nombre as item_nombre
            FROM checklist_fotos cf
            LEFT JOIN usuarios u ON cf.usuario_id = u.id
            LEFT JOIN checklist_catalog_items ci ON cf.catalog_item_id = ci.id
            WHERE cf.id = $1
        `,
      [fotoId]
    );

    return result.rows[0];
  }
}

module.exports = PostgresManager;
