# Desarrollo de APIs REST con Arquitectura en Capas

## Sistema de Mantenimiento de Habitaciones - JW Mantto

**Estudiante:** Juan Leonardo Cruz Flores  
**Proyecto:** Sistema de mantenimiento hotelero con arquitectura cliente-servidor  
**Fecha:** Noviembre 2025  
**Tecnologías:** Node.js, Express, PostgreSQL, JavaScript Vanilla

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura de 4 Capas](#arquitectura-de-4-capas)
3. [Capa 1: Frontend (Cliente)](#capa-1-frontend-cliente)
4. [Capa 2: APIs REST (Servidor)](#capa-2-apis-rest-servidor)
5. [Capa 3: Gestor de Base de Datos](#capa-3-gestor-de-base-de-datos)
6. [Capa 4: Base de Datos PostgreSQL](#capa-4-base-de-datos-postgresql)
7. [Flujo Completo de Datos](#flujo-completo-de-datos)
8. [Seguridad y Buenas Prácticas](#seguridad-y-buenas-prácticas)
9. [Conclusiones](#conclusiones)

---

## 1. Introducción

Este documento describe el desarrollo de una arquitectura de APIs REST modular para el sistema JW Mantto. Se implementó una separación clara de responsabilidades en 4 capas, siguiendo principios de diseño de software y buenas prácticas de la industria.

### Objetivos del Proyecto

1. ✅ Crear una arquitectura escalable y mantenible
2. ✅ Implementar APIs REST siguiendo estándares HTTP
3. ✅ Separar la lógica de negocio de la lógica de datos
4. ✅ Garantizar seguridad contra ataques SQL injection
5. ✅ Facilitar el trabajo en equipo mediante modularización

---

## 2. Arquitectura de 4 Capas

El sistema implementa una arquitectura en capas (Layered Architecture) que separa las responsabilidades:

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA 1: PRESENTACIÓN (Frontend)                            │
│  Archivos: index.html, app-loader.js, style.css            │
│  Responsabilidad: Interfaz de usuario y experiencia        │
│  Tecnologías: HTML5, JavaScript ES6+, CSS3                  │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/JSON (fetch API)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  CAPA 2: LÓGICA DE NEGOCIO (APIs REST)                      │
│  Archivos: api/edificios.js, api/cuartos.js,               │
│           api/mantenimientos.js, api/index.js               │
│  Responsabilidad: Endpoints, validación, transformación     │
│  Tecnologías: Express.js, Node.js                           │
└────────────────────┬────────────────────────────────────────┘
                     │ Llamadas a métodos (JavaScript)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  CAPA 3: ACCESO A DATOS (Database Manager)                  │
│  Archivo: db/postgres-manager.js                            │
│  Responsabilidad: Queries SQL, mapeo objeto-relacional      │
│  Tecnologías: pg (node-postgres)                            │
└────────────────────┬────────────────────────────────────────┘
                     │ SQL Queries (protocolo PostgreSQL)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  CAPA 4: PERSISTENCIA (Base de Datos)                       │
│  PostgreSQL                                                  │
│  Responsabilidad: Almacenamiento, transacciones, integridad │
│  Tecnologías: PostgreSQL 14+                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Capa 1: Frontend (Cliente)

### 3.1 Envío de Datos al Servidor

**Archivo:** `app-loader.js`

El frontend utiliza la API `fetch()` para comunicarse con el servidor mediante peticiones HTTP con formato JSON.

#### Ejemplo 1: Cargar Datos (GET)

```javascript
/**
 * Cargar todos los mantenimientos desde el servidor
 */
async function cargarDatos() {
  try {
    const API_BASE_URL = 'http://localhost:3001';

    // Petición HTTP GET
    const response = await fetch(`${API_BASE_URL}/api/mantenimientos`);

    // Validar respuesta
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    // Parsear JSON a objeto JavaScript
    const mantenimientos = await response.json();

    console.log('✅ Mantenimientos cargados:', mantenimientos.length);
    return mantenimientos;
  } catch (error) {
    console.error('❌ Error cargando datos:', error);
    throw error;
  }
}
```

**Flujo de datos:**

1. Cliente ejecuta `fetch()` con URL del endpoint
2. Navegador envía petición HTTP GET
3. Servidor procesa y devuelve JSON
4. Cliente parsea JSON a objetos JavaScript

#### Ejemplo 2: Crear Mantenimiento (POST)

```javascript
/**
 * Enviar formulario de nuevo mantenimiento
 */
async function manejarAgregarMantenimiento(event) {
  event.preventDefault();

  // 1. Extraer datos del formulario HTML
  const formData = new FormData(event.target);
  const datos = {
    cuarto_id: formData.get('cuarto_id'), // "5"
    tipo: formData.get('tipo'), // "normal"
    descripcion: formData.get('descripcion'), // "Reparar aire acondicionado"
    hora: formData.get('hora'), // "14:30"
    dia_alerta: formData.get('dia_alerta'), // "2025-11-15"
  };

  console.log('📝 Datos a enviar:', datos);

  try {
    // 2. Enviar petición HTTP POST con JSON en el body
    const response = await fetch(`${API_BASE_URL}/api/mantenimientos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Indica formato JSON
      },
      body: JSON.stringify(datos), // Convierte objeto JS → texto JSON
    });

    // 3. Validar respuesta
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al crear mantenimiento');
    }

    // 4. Obtener el mantenimiento creado (con ID generado)
    const nuevoMantenimiento = await response.json();
    console.log('✅ Creado:', nuevoMantenimiento);

    // 5. Actualizar interfaz
    await cargarDatos();
    mostrarCuartos();

    return nuevoMantenimiento;
  } catch (error) {
    console.error('❌ Error:', error);
    alert(`Error: ${error.message}`);
  }
}
```

**Petición HTTP enviada:**

```http
POST http://localhost:3001/api/mantenimientos HTTP/1.1
Host: localhost:3001
Content-Type: application/json
Content-Length: 125

{
  "cuarto_id": "5",
  "tipo": "normal",
  "descripcion": "Reparar aire acondicionado",
  "hora": "14:30",
  "dia_alerta": "2025-11-15"
}
```

#### Ejemplo 3: Eliminar Mantenimiento (DELETE)

```javascript
/**
 * Eliminar un mantenimiento existente
 */
async function eliminarMantenimientoInline(mantenimientoId, cuartoId) {
  console.log('🗑️ Eliminando mantenimiento:', mantenimientoId);

  // Confirmar acción destructiva
  if (!confirm('¿Está seguro de eliminar este mantenimiento?')) {
    return;
  }

  try {
    // Petición HTTP DELETE
    const response = await fetch(
      `${API_BASE_URL}/api/mantenimientos/${mantenimientoId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      throw new Error('Error al eliminar');
    }

    const result = await response.json();
    console.log('✅ Eliminado:', result);

    // Recargar datos
    await cargarDatos();
    mostrarCuartos();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

---

## 4. Capa 2: APIs REST (Servidor)

Las APIs están organizadas en módulos por recurso dentro de la carpeta `api/`.

### 4.1 Estructura de Archivos

```
api/
├── index.js              # Configurador principal de rutas
├── edificios.js          # CRUD de edificios
├── cuartos.js            # CRUD de cuartos
└── mantenimientos.js     # CRUD de mantenimientos + alertas
```

### 4.2 Configurador Principal

**Archivo:** `api/index.js`

```javascript
/**
 * Configurador central de todas las rutas API
 */
const edificiosRouter = require('./edificios');
const cuartosRouter = require('./cuartos');
const mantenimientosRouter = require('./mantenimientos');

function setupApiRoutes(app, dbManager) {
  console.log('📋 Configurando rutas de API...');

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbManager ? 'connected' : 'disconnected',
    });
  });

  // Registrar routers por recurso
  app.use('/api/edificios', edificiosRouter(dbManager));
  app.use('/api/cuartos', cuartosRouter(dbManager));
  app.use('/api/mantenimientos', mantenimientosRouter(dbManager));

  console.log('✅ Rutas de API configuradas');
}

module.exports = setupApiRoutes;
```

### 4.3 API de Mantenimientos (Completa)

    **Archivo:** `api/mantenimientos.js`

    Este módulo implementa todas las operaciones CRUD para mantenimientos.

    ```javascript
    const express = require('express');
    const router = express.Router();

    /**
     * Módulo de API para mantenimientos
     * @param {PostgresManager} dbManager - Gestor de base de datos
     */
    module.exports = (dbManager) => {

        // ==========================================
        // GET /api/mantenimientos
        // Obtener todos los mantenimientos
        // ==========================================
        router.get('/', async (req, res) => {
            try {
                if (!dbManager) {
                    return res.status(500).json({
                        error: 'Base de datos no disponible'
                    });
                }

                // Filtro opcional por cuarto
                const cuartoId = req.query.cuarto_id;

                // Llamar al gestor de base de datos
                const mantenimientos = await dbManager.getMantenimientos(cuartoId);

                // Devolver JSON
                res.json(mantenimientos);

            } catch (error) {
                console.error('Error al obtener mantenimientos:', error);
                res.status(500).json({
                    error: 'Error al obtener mantenimientos',
                    details: error.message
                });
            }
        });

        // ==========================================
        // GET /api/mantenimientos/:id
        // Obtener un mantenimiento específico
        // ==========================================
        router.get('/:id', async (req, res) => {
            try {
                const { id } = req.params;

                if (!dbManager) {
                    return res.status(500).json({
                        error: 'Base de datos no disponible'
                    });
                }

                const mantenimiento = await dbManager.getMantenimientoById(parseInt(id));

                if (!mantenimiento) {
                    return res.status(404).json({
                        error: 'Mantenimiento no encontrado'
                    });
                }

                res.json(mantenimiento);

            } catch (error) {
                console.error('Error:', error);
                res.status(500).json({
                    error: 'Error al obtener mantenimiento',
                    details: error.message
                });
            }
        });

        // ==========================================
        // POST /api/mantenimientos
        // Crear un nuevo mantenimiento
        // ==========================================
        router.post('/', async (req, res) => {
            try {
                // 1. Extraer datos del body (ya parseado por express.json())
                const {
                    cuarto_id,
                    descripcion,
                    tipo = 'normal',
                    hora,
                    dia_alerta
                } = req.body;

                console.log('📝 Creando mantenimiento:', {
                    cuarto_id, descripcion, tipo, hora, dia_alerta
                });

                // 2. Validar campos obligatorios
                if (!cuarto_id || !descripcion) {
                    return res.status(400).json({
                        error: 'Faltan campos obligatorios',
                        required: ['cuarto_id', 'descripcion']
                    });
                }

                // 3. Validar campos específicos de rutinas
                if (tipo === 'rutina' && !hora) {
                    return res.status(400).json({
                        error: 'La hora es obligatoria para mantenimientos tipo rutina'
                    });
                }

                if (!dbManager) {
                    return res.status(500).json({
                        error: 'Base de datos no disponible'
                    });
                }

                // 4. Procesar dia_alerta (convertir fecha a número de día)
                let diaAlertaNumero = null;
                if (dia_alerta) {
                    if (typeof dia_alerta === 'string' && dia_alerta.includes('-')) {
                        // "2025-11-15" → extraer "15"
                        const partes = dia_alerta.split('-');
                        diaAlertaNumero = parseInt(partes[2]);
                    } else {
                        diaAlertaNumero = parseInt(dia_alerta);
                    }
                }

                // 5. Preparar objeto de datos
                const dataMantenimiento = {
                    cuarto_id: parseInt(cuarto_id),
                    descripcion,
                    tipo,
                    hora: hora || null,
                    dia_alerta: diaAlertaNumero,
                    fecha_solicitud: new Date().toISOString().split('T')[0],
                    estado: 'pendiente'
                };

                // 6. Insertar en base de datos
                const nuevoMantenimiento = await dbManager.insertMantenimiento(
                    dataMantenimiento
                );

                console.log('✅ Mantenimiento creado:', nuevoMantenimiento);

                // 7. Devolver el registro creado con código 201 (Created)
                res.status(201).json(nuevoMantenimiento);

            } catch (error) {
                console.error('❌ Error al crear mantenimiento:', error);
                res.status(500).json({
                    error: 'Error al crear mantenimiento',
                    details: error.message
                });
            }
        });

        // ==========================================
        // PUT /api/mantenimientos/:id
        // Actualizar un mantenimiento existente
        // ==========================================
        router.put('/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { descripcion, hora, dia_alerta, tipo, estado } = req.body;
                const mantenimientoId = parseInt(id);

                console.log('✏️ Actualizando mantenimiento:', mantenimientoId);

                if (!dbManager) {
                    return res.status(500).json({
                        error: 'Base de datos no disponible'
                    });
                }

                // Procesar dia_alerta
                let diaAlertaNumero = null;
                if (dia_alerta) {
                    if (typeof dia_alerta === 'string' && dia_alerta.includes('-')) {
                        const partes = dia_alerta.split('-');
                        diaAlertaNumero = parseInt(partes[2]);
                    } else {
                        diaAlertaNumero = parseInt(dia_alerta);
                    }
                }

                // Crear objeto con campos a actualizar
                const camposActualizar = {};
                if (descripcion !== undefined) camposActualizar.descripcion = descripcion;
                if (hora !== undefined) camposActualizar.hora = hora || null;
                if (diaAlertaNumero !== null) camposActualizar.dia_alerta = diaAlertaNumero;
                if (tipo !== undefined) camposActualizar.tipo = tipo;
                if (estado !== undefined) camposActualizar.estado = estado;

                // Actualizar en base de datos
                await dbManager.updateMantenimiento(mantenimientoId, camposActualizar);

                res.json({
                    success: true,
                    message: 'Mantenimiento actualizado correctamente'
                });

            } catch (error) {
                console.error('❌ Error actualizando:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    details: error.message
                });
            }
        });

        // ==========================================
        // PATCH /api/mantenimientos/:id/emitir
        // Marcar una alerta como emitida
        // ==========================================
        router.patch('/:id/emitir', async (req, res) => {
            try {
                const { id } = req.params;
                const mantenimientoId = parseInt(id);

                console.log('📢 Marcando alerta como emitida:', mantenimientoId);

                if (!dbManager) {
                    return res.status(500).json({
                        error: 'Base de datos no disponible'
                    });
                }

                await dbManager.marcarAlertaEmitida(mantenimientoId);

                res.json({
                    success: true,
                    message: 'Alerta marcada como emitida'
                });

            } catch (error) {
                console.error('❌ Error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    details: error.message
                });
            }
        });

        // ==========================================
        // DELETE /api/mantenimientos/:id
        // Eliminar un mantenimiento
        // ==========================================
        router.delete('/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const mantenimientoId = parseInt(id);

                console.log('🗑️ Eliminando mantenimiento:', mantenimientoId);

                if (!dbManager) {
                    return res.status(500).json({
                        error: 'Base de datos no disponible'
                    });
                }

                await dbManager.deleteMantenimiento(mantenimientoId);

                res.json({
                    success: true,
                    message: 'Mantenimiento eliminado correctamente'
                });

            } catch (error) {
                console.error('❌ Error eliminando:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error interno del servidor',
                    details: error.message
                });
            }
        });

        return router;
    };

````

**Resumen de endpoints:**

| Método | Endpoint | Descripción | Capa DB |
|--------|----------|-------------|---------|
| GET | `/api/mantenimientos` | Listar todos | `getMantenimientos()` |
| GET | `/api/mantenimientos/:id` | Obtener uno | `getMantenimientoById()` |
| POST | `/api/mantenimientos` | Crear nuevo | `insertMantenimiento()` |
| PUT | `/api/mantenimientos/:id` | Actualizar | `updateMantenimiento()` |
| PATCH | `/api/mantenimientos/:id/emitir` | Marcar alerta | `marcarAlertaEmitida()` |
| DELETE | `/api/mantenimientos/:id` | Eliminar | `deleteMantenimiento()` |

---

## 5. Capa 3: Gestor de Base de Datos

**Archivo:** `db/postgres-manager.js`

Esta capa abstrae todas las operaciones de base de datos, proporcionando una interfaz limpia para las APIs.

### 5.1 Clase PostgresManager

```javascript
const { Pool } = require('pg');
const { dbConfig } = require('./config');

/**
 * Gestor de base de datos PostgreSQL
 * Proporciona métodos para operaciones CRUD
 */
class PostgresManager {
    constructor() {
        this.pool = null;  // Pool de conexiones
    }

    /**
     * Inicializar conexión a PostgreSQL
     */
    async initialize() {
        try {
            console.log('🔌 Inicializando PostgreSQL...');

            // Crear pool de conexiones
            this.pool = new Pool(dbConfig);

            // Manejar errores del pool
            this.pool.on('error', (err) => {
                console.error('❌ Error en pool PostgreSQL:', err);
            });

            // Probar conexión
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            console.log('✅ Conexión establecida:', result.rows[0].now);
            client.release();

            // Crear tablas si no existen
            await this.createTables();

            console.log('✅ PostgreSQL inicializado');
        } catch (error) {
            console.error('❌ Error inicializando PostgreSQL:', error);
            throw error;
        }
    }

    /**
     * Crear tablas si no existen
     */
    async createBasicTables() {
        const queries = [
            // Tabla edificios
            `CREATE TABLE IF NOT EXISTS edificios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL UNIQUE,
                descripcion TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,

            // Tabla cuartos
            `CREATE TABLE IF NOT EXISTS cuartos (
                id SERIAL PRIMARY KEY,
                numero VARCHAR(100) NOT NULL,
                edificio_id INTEGER NOT NULL,
                descripcion TEXT,
                estado VARCHAR(50) DEFAULT 'disponible',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (edificio_id) REFERENCES edificios(id)
                    ON DELETE CASCADE,
                UNIQUE (numero, edificio_id)
            )`,

            // Tabla mantenimientos
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
                FOREIGN KEY (cuarto_id) REFERENCES cuartos(id)
                    ON DELETE CASCADE
            )`
        ];

        // Ejecutar cada query
        for (const query of queries) {
            await this.pool.query(query);
        }
    }
````

### 5.2 Métodos de Lectura (SELECT)

```javascript
    /**
     * Obtener todos los edificios
     * @returns {Promise<Array>} Array de edificios
     */
    async getEdificios() {
        const result = await this.pool.query(
            'SELECT * FROM edificios ORDER BY nombre'
        );
        return result.rows;
    }

    /**
     * Obtener todos los cuartos con información del edificio
     * @returns {Promise<Array>} Array de cuartos con join
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
     * @param {number} id - ID del cuarto
     * @returns {Promise<Object|null>} Cuarto o null si no existe
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
     * @param {number|null} cuartoId - ID del cuarto (opcional)
     * @returns {Promise<Array>} Array de mantenimientos
     */
    async getMantenimientos(cuartoId = null) {
        let query = `
            SELECT m.*,
                   c.numero as cuarto_numero,
                   e.nombre as edificio_nombre
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
```

### 5.3 Método de Inserción (INSERT)

```javascript
    /**
     * Insertar un nuevo mantenimiento
     * @param {Object} data - Datos del mantenimiento
     * @param {number} data.cuarto_id - ID del cuarto
     * @param {string} data.descripcion - Descripción del mantenimiento
     * @param {string} data.tipo - Tipo: 'normal' o 'rutina'
     * @param {string} data.hora - Hora de la alerta (formato HH:MM)
     * @param {number} data.dia_alerta - Día del mes (1-31)
     * @returns {Promise<Object>} Mantenimiento creado
     */
    async insertMantenimiento(data) {
        // 1. Preparar query SQL con placeholders
        const query = `
            INSERT INTO mantenimientos (
                cuarto_id,
                descripcion,
                tipo,
                hora,
                dia_alerta
            ) VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        // 2. Preparar valores (protección contra SQL injection)
        const values = [
            data.cuarto_id,           // $1
            data.descripcion,         // $2
            data.tipo || 'normal',    // $3
            data.hora || null,        // $4
            data.dia_alerta || null   // $5
        ];

        console.log('📤 Ejecutando INSERT:', { query, values });

        // 3. Ejecutar query
        // La librería 'pg' sustituye $1, $2... de forma segura
        const result = await this.pool.query(query, values);

        console.log('📥 Resultado INSERT:', result.rows[0]);

        // 4. Obtener el registro completo con datos de tablas relacionadas
        if (result.rows[0]) {
            const fullQuery = `
                SELECT m.*,
                       c.numero as cuarto_numero,
                       e.nombre as edificio_nombre
                FROM mantenimientos m
                LEFT JOIN cuartos c ON m.cuarto_id = c.id
                LEFT JOIN edificios e ON c.edificio_id = e.id
                WHERE m.id = $1
            `;
            const fullResult = await this.pool.query(
                fullQuery,
                [result.rows[0].id]
            );

            console.log('📥 Registro completo:', fullResult.rows[0]);

            return fullResult.rows[0];
        }

        return result.rows[0];
    }
```

### 5.4 Método de Actualización (UPDATE)

```javascript
    /**
     * Actualizar un mantenimiento existente
     * @param {number} id - ID del mantenimiento
     * @param {Object} data - Campos a actualizar
     * @returns {Promise<Object>} Mantenimiento actualizado
     */
    async updateMantenimiento(id, data) {
        const query = `
            UPDATE mantenimientos
            SET descripcion = $1,
                hora = $2,
                dia_alerta = $3
            WHERE id = $4
            RETURNING *
        `;

        const values = [
            data.descripcion,
            data.hora,
            data.dia_alerta,
            id
        ];

        console.log('📤 Ejecutando UPDATE:', { query, values });

        const result = await this.pool.query(query, values);

        console.log('📥 Resultado UPDATE:', result.rows[0]);

        return result.rows[0];
    }
```

### 5.5 Método de Eliminación (DELETE)

```javascript
    /**
     * Eliminar un mantenimiento
     * @param {number} id - ID del mantenimiento
     * @returns {Promise<Object>} Mantenimiento eliminado
     */
    async deleteMantenimiento(id) {
        const query = 'DELETE FROM mantenimientos WHERE id = $1 RETURNING *';

        console.log('📤 Ejecutando DELETE para ID:', id);

        const result = await this.pool.query(query, [id]);

        console.log('📥 Registro eliminado:', result.rows[0]);

        return result.rows[0];
    }
```

### 5.6 Métodos Especiales

```javascript
    /**
     * Marcar alerta como emitida
     * @param {number} id - ID del mantenimiento
     * @returns {Promise<Object>} Mantenimiento actualizado
     */
    async marcarAlertaEmitida(id) {
        const query = `
            UPDATE mantenimientos
            SET alerta_emitida = TRUE,
                fecha_emision = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        const result = await this.pool.query(query, [id]);
        return result.rows[0];
    }

    /**
     * Obtener mantenimientos pendientes de alerta
     * Útil para sistema de notificaciones
     * @returns {Promise<Array>} Mantenimientos pendientes
     */
    async getMantenimientosPendientesAlerta() {
        const query = `
            SELECT m.*,
                   c.numero as cuarto_numero,
                   e.nombre as edificio_nombre
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
     * Cerrar pool de conexiones
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            console.log('🔌 Pool PostgreSQL cerrado');
        }
    }
}

module.exports = PostgresManager;
```

---

## 6. Capa 4: Base de Datos PostgreSQL

### 6.1 Esquema de Tablas

```sql
-- Tabla edificios
CREATE TABLE edificios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla cuartos
CREATE TABLE cuartos (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(100) NOT NULL,
    edificio_id INTEGER NOT NULL,
    descripcion TEXT,
    estado VARCHAR(50) DEFAULT 'disponible',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (edificio_id) REFERENCES edificios(id) ON DELETE CASCADE,
    UNIQUE (numero, edificio_id)
);

-- Tabla mantenimientos
CREATE TABLE mantenimientos (
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
);

-- Índices para optimizar queries
CREATE INDEX idx_cuartos_edificio ON cuartos(edificio_id);
CREATE INDEX idx_mantenimientos_cuarto ON mantenimientos(cuarto_id);
CREATE INDEX idx_mantenimientos_tipo ON mantenimientos(tipo);
CREATE INDEX idx_mantenimientos_alerta ON mantenimientos(dia_alerta, alerta_emitida);
```

### 6.2 Ejemplo de Query SQL Ejecutado

Cuando el usuario crea un mantenimiento:

```sql
-- 1. INSERT ejecutado por insertMantenimiento()
INSERT INTO mantenimientos (
    cuarto_id, descripcion, tipo, hora, dia_alerta
) VALUES (5, 'Reparar aire acondicionado', 'normal', '14:30', 15)
RETURNING *;

-- Resultado:
-- id: 42
-- cuarto_id: 5
-- descripcion: 'Reparar aire acondicionado'
-- tipo: 'normal'
-- hora: '14:30:00'
-- dia_alerta: 15
-- fecha_creacion: '2025-11-10 15:23:45'
-- estado: 'pendiente'
-- alerta_emitida: false

-- 2. SELECT con JOIN para obtener datos completos
SELECT m.*, c.numero as cuarto_numero, e.nombre as edificio_nombre
FROM mantenimientos m
LEFT JOIN cuartos c ON m.cuarto_id = c.id
LEFT JOIN edificios e ON c.edificio_id = e.id
WHERE m.id = 42;

-- Resultado completo:
-- {
--   id: 42,
--   cuarto_id: 5,
--   descripcion: 'Reparar aire acondicionado',
--   tipo: 'normal',
--   hora: '14:30:00',
--   dia_alerta: 15,
--   fecha_creacion: '2025-11-10T15:23:45.000Z',
--   estado: 'pendiente',
--   cuarto_numero: '301',
--   edificio_nombre: 'Edificio B'
-- }
```

---

## 7. Flujo Completo de Datos

### Ejemplo: Crear un Mantenimiento

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUARIO                                                   │
│    Llena formulario:                                         │
│    - Cuarto: "301"                                          │
│    - Descripción: "Reparar aire acondicionado"              │
│    - Tipo: "normal"                                         │
│    Hace click en "Registrar"                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FRONTEND (app-loader.js)                                 │
│                                                              │
│    const datos = {                                          │
│      cuarto_id: 5,                                          │
│      descripcion: "Reparar aire acondicionado",             │
│      tipo: "normal"                                         │
│    };                                                       │
│                                                              │
│    fetch('http://localhost:3001/api/mantenimientos', {      │
│      method: 'POST',                                        │
│      headers: {'Content-Type': 'application/json'},         │
│      body: JSON.stringify(datos)                            │
│    })                                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP POST
                     │ Content-Type: application/json
                     │ Body: {"cuarto_id":5,"descripcion":"..."}
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SERVER (server.js)                                        │
│                                                              │
│    app.use(express.json()) ← Parsea JSON automáticamente   │
│    setupApiRoutes(app, dbManager)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Enruta a /api/mantenimientos
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. API (api/mantenimientos.js)                              │
│                                                              │
│    router.post('/', async (req, res) => {                   │
│      // Extraer datos                                       │
│      const { cuarto_id, descripcion, tipo } = req.body;     │
│                                                              │
│      // Validar                                             │
│      if (!cuarto_id || !descripcion) {                      │
│        return res.status(400).json({error: '...'});         │
│      }                                                       │
│                                                              │
│      // Preparar datos                                      │
│      const data = {                                         │
│        cuarto_id: parseInt(cuarto_id),                      │
│        descripcion,                                         │
│        tipo: tipo || 'normal'                               │
│      };                                                     │
│                                                              │
│      // Insertar en BD                                      │
│      const nuevo = await dbManager.insertMantenimiento(data);│
│                                                              │
│      // Devolver resultado                                  │
│      res.status(201).json(nuevo);                           │
│    })                                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Llama método con objeto JS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. DATABASE MANAGER (db/postgres-manager.js)                │
│                                                              │
│    async insertMantenimiento(data) {                        │
│      // Preparar query SQL                                  │
│      const query = `                                        │
│        INSERT INTO mantenimientos                           │
│        (cuarto_id, descripcion, tipo)                       │
│        VALUES ($1, $2, $3)                                  │
│        RETURNING *                                          │
│      `;                                                     │
│                                                              │
│      // Parámetros seguros                                  │
│      const values = [                                       │
│        data.cuarto_id,     // $1 → 5                        │
│        data.descripcion,   // $2 → "Reparar..."            │
│        data.tipo          // $3 → "normal"                  │
│      ];                                                     │
│                                                              │
│      // Ejecutar                                            │
│      const result = await this.pool.query(query, values);   │
│                                                              │
│      // Obtener registro completo con JOIN                  │
│      const fullQuery = `                                    │
│        SELECT m.*, c.numero, e.nombre                       │
│        FROM mantenimientos m                                │
│        LEFT JOIN cuartos c ON m.cuarto_id = c.id            │
│        LEFT JOIN edificios e ON c.edificio_id = e.id        │
│        WHERE m.id = $1                                      │
│      `;                                                     │
│      const full = await this.pool.query(                    │
│        fullQuery,                                           │
│        [result.rows[0].id]                                  │
│      );                                                     │
│                                                              │
│      return full.rows[0];                                   │
│    }                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Ejecuta SQL
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. POSTGRESQL                                                │
│                                                              │
│    -- Query recibido:                                       │
│    INSERT INTO mantenimientos                               │
│    (cuarto_id, descripcion, tipo)                           │
│    VALUES (5, 'Reparar aire acondicionado', 'normal')       │
│    RETURNING *;                                             │
│                                                              │
│    -- PostgreSQL ejecuta:                                   │
│    1. Valida constraints (FOREIGN KEY, NOT NULL)            │
│    2. Inserta fila en disco                                 │
│    3. Genera ID autoincremental (42)                        │
│    4. Aplica defaults (fecha_creacion, estado)              │
│    5. Retorna fila insertada                                │
│                                                              │
│    -- Resultado:                                            │
│    {                                                        │
│      id: 42,                                                │
│      cuarto_id: 5,                                          │
│      descripcion: 'Reparar aire acondicionado',             │
│      tipo: 'normal',                                        │
│      estado: 'pendiente',                                   │
│      fecha_creacion: '2025-11-10T15:23:45.000Z',            │
│      hora: null,                                            │
│      dia_alerta: null,                                      │
│      alerta_emitida: false                                  │
│    }                                                        │
│                                                              │
│    -- Segundo query (JOIN):                                 │
│    SELECT m.*, c.numero as cuarto_numero,                   │
│           e.nombre as edificio_nombre                       │
│    FROM mantenimientos m                                    │
│    LEFT JOIN cuartos c ON m.cuarto_id = c.id                │
│    LEFT JOIN edificios e ON c.edificio_id = e.id            │
│    WHERE m.id = 42;                                         │
│                                                              │
│    -- Resultado con datos relacionados:                     │
│    {                                                        │
│      id: 42,                                                │
│      cuarto_id: 5,                                          │
│      descripcion: 'Reparar aire acondicionado',             │
│      tipo: 'normal',                                        │
│      estado: 'pendiente',                                   │
│      fecha_creacion: '2025-11-10T15:23:45.000Z',            │
│      cuarto_numero: '301',                                  │
│      edificio_nombre: 'Edificio B'                          │
│    }                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Retorna objeto JS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. RESPUESTA DE VUELTA                                       │
│                                                              │
│    PostgreSQL → postgres-manager (rows[0])                  │
│              → api/mantenimientos (res.json())              │
│              → server.js (HTTP Response)                    │
│              → Frontend (response.json())                   │
│                                                              │
│    Frontend recibe:                                         │
│    {                                                        │
│      "id": 42,                                              │
│      "cuarto_id": 5,                                        │
│      "descripcion": "Reparar aire acondicionado",           │
│      "tipo": "normal",                                      │
│      "estado": "pendiente",                                 │
│      "fecha_creacion": "2025-11-10T15:23:45.000Z",          │
│      "cuarto_numero": "301",                                │
│      "edificio_nombre": "Edificio B"                        │
│    }                                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. ACTUALIZACIÓN DE INTERFAZ                                │
│                                                              │
│    // Frontend actualiza la UI                              │
│    await cargarDatos();                                     │
│    mostrarCuartos();                                        │
│    mostrarMantenimientos();                                 │
│                                                              │
│    // Usuario ve el nuevo mantenimiento en pantalla        │
│    ✅ "Mantenimiento registrado exitosamente"              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Seguridad y Buenas Prácticas

### 8.1 Protección contra SQL Injection

**❌ INCORRECTO (Vulnerable):**

```javascript
// NUNCA hacer esto
const query = `INSERT INTO mantenimientos VALUES (${data.id}, '${data.desc}')`;
await this.pool.query(query);
```

**✅ CORRECTO (Seguro):**

```javascript
// Usar parámetros preparados
const query = `INSERT INTO mantenimientos VALUES ($1, $2)`;
const values = [data.id, data.desc];
await this.pool.query(query, values);
```

La librería `pg` escapa automáticamente los valores, evitando ataques de inyección SQL.

### 8.2 Validación de Datos

```javascript
// Validar en la capa de API
if (!cuarto_id || !descripcion) {
  return res.status(400).json({
    error: 'Faltan campos obligatorios',
    required: ['cuarto_id', 'descripcion'],
  });
}

// Validar tipos de datos
const cuartoIdNumero = parseInt(cuarto_id);
if (isNaN(cuartoIdNumero)) {
  return res.status(400).json({
    error: 'cuarto_id debe ser un número',
  });
}
```

### 8.3 Manejo de Errores

```javascript
try {
  const resultado = await dbManager.insertMantenimiento(data);
  res.status(201).json(resultado);
} catch (error) {
  console.error('Error:', error);

  // No exponer detalles técnicos en producción
  res.status(500).json({
    error: 'Error al crear mantenimiento',
    // details: error.message  // Solo en desarrollo
  });
}
```

### 8.4 Pool de Conexiones

```javascript
// Usar pool en lugar de conexiones individuales
this.pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'jwmantto',
  user: 'postgres',
  password: 'password',
  max: 20, // Máximo de conexiones simultáneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 8.5 Transacciones para Operaciones Múltiples

```javascript
async crearMantenimientoConLog(data) {
    const client = await this.pool.connect();

    try {
        await client.query('BEGIN');

        // Insertar mantenimiento
        const mantResult = await client.query(
            'INSERT INTO mantenimientos (...) VALUES (...) RETURNING *',
            [...]
        );

        // Insertar log de auditoría
        await client.query(
            'INSERT INTO logs (accion, tabla, registro_id) VALUES ($1, $2, $3)',
            ['INSERT', 'mantenimientos', mantResult.rows[0].id]
        );

        await client.query('COMMIT');

        return mantResult.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
```

---

## 9. Conclusiones

### 9.1 Logros Alcanzados

1. ✅ **Arquitectura Modular**: Código organizado en capas con responsabilidades claras
2. ✅ **APIs REST Estándar**: Endpoints siguiendo convenciones HTTP y REST
3. ✅ **Separación de Responsabilidades**: Frontend, APIs, BD en capas independientes
4. ✅ **Seguridad**: Protección contra SQL injection mediante parámetros preparados
5. ✅ **Escalabilidad**: Fácil agregar nuevos recursos y endpoints
6. ✅ **Mantenibilidad**: Código limpio, documentado y fácil de entender
7. ✅ **Reutilización**: Módulos independientes reutilizables

### 9.2 Tecnologías Utilizadas

| Capa     | Tecnología         | Propósito                |
| -------- | ------------------ | ------------------------ |
| Frontend | JavaScript ES6+    | Lógica del cliente       |
| Frontend | Fetch API          | Peticiones HTTP          |
| API      | Node.js            | Runtime de JavaScript    |
| API      | Express.js         | Framework web            |
| BD       | pg (node-postgres) | Cliente PostgreSQL       |
| BD       | PostgreSQL         | Base de datos relacional |

### 9.3 Ventajas de esta Arquitectura

**1. Separación de Responsabilidades**

- Cada capa tiene un propósito único
- Cambios en una capa no afectan otras
- Más fácil de testear

**2. Escalabilidad**

- Agregar nuevos endpoints es trivial
- Cada módulo puede escalar independientemente
- Preparado para microservicios

**3. Mantenibilidad**

- Código organizado y predecible
- Fácil localizar y corregir bugs
- Documentación clara por módulo

**4. Trabajo en Equipo**

- Múltiples desarrolladores pueden trabajar simultáneamente
- Menos conflictos en Git
- División clara de tareas

### 9.4 Comparación: Antes vs Después

| Aspecto             | Antes (Monolítico) | Después (Modular) |
| ------------------- | ------------------ | ----------------- |
| Líneas en server.js | 384                | 152 (-60%)        |
| Archivos API        | 1                  | 4 módulos         |
| Mantenibilidad      | ⭐⭐               | ⭐⭐⭐⭐⭐        |
| Escalabilidad       | ⭐⭐⭐             | ⭐⭐⭐⭐⭐        |
| Testabilidad        | ⭐⭐               | ⭐⭐⭐⭐⭐        |

### 9.5 Aprendizajes Clave

1. **Middleware**: `express.json()` es esencial para parsear JSON
2. **Async/Await**: Simplifica el manejo de promesas
3. **Pool de Conexiones**: Más eficiente que conexiones individuales
4. **Parámetros Preparados**: Protegen contra SQL injection
5. **Separación de Capas**: Facilita mantenimiento y testing

### 9.6 Próximos Pasos

1. ⏳ Implementar tests unitarios y de integración
2. ⏳ Agregar autenticación JWT
3. ⏳ Documentar con Swagger/OpenAPI
4. ⏳ Implementar rate limiting
5. ⏳ Agregar validación con Joi/Yup
6. ⏳ Implementar logs estructurados con Winston
7. ⏳ Agregar caché con Redis

---

## Referencias

- [Express.js Documentation](https://expressjs.com/)
- [node-postgres Documentation](https://node-postgres.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [REST API Best Practices](https://restfulapi.net/)
- [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

---

**Elaborado por:** Juan Leonardo Cruz Flores  
**Institución:** [Tu institución]  
**Programa:** [Tu programa académico]  
**Fecha:** Noviembre 2025  
**Versión:** 1.0
