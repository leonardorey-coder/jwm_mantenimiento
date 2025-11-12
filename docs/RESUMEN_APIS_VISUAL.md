# 🎯 Resumen Visual: Desarrollo de APIs REST

## 📊 Diagrama de Flujo Completo

```
USUARIO REGISTRA MANTENIMIENTO
         │
         ▼
┌────────────────────────────────────────────────────┐
│ 1️⃣ FRONTEND (JavaScript)                          │
│                                                     │
│  const datos = {                                   │
│    cuarto_id: 5,                                   │
│    descripcion: "Reparar AC",                      │
│    tipo: "normal"                                  │
│  };                                                │
│                                                     │
│  fetch('/api/mantenimientos', {                    │
│    method: 'POST',                                 │
│    body: JSON.stringify(datos)                     │
│  })                                                │
└───────────────────┬────────────────────────────────┘
                    │
                    │ HTTP POST + JSON
                    ▼
┌────────────────────────────────────────────────────┐
│ 2️⃣ API REST (api/mantenimientos.js)               │
│                                                     │
│  router.post('/', async (req, res) => {            │
│    // ✅ Validar datos                             │
│    if (!req.body.cuarto_id) {                      │
│      return res.status(400).json({...});           │
│    }                                               │
│                                                     │
│    // 🔄 Procesar datos                            │
│    const data = {                                  │
│      cuarto_id: parseInt(req.body.cuarto_id),      │
│      descripcion: req.body.descripcion,            │
│      tipo: req.body.tipo || 'normal'               │
│    };                                              │
│                                                     │
│    // 💾 Llamar a BD                               │
│    const nuevo = await dbManager                   │
│                  .insertMantenimiento(data);       │
│                                                     │
│    // 📤 Responder                                 │
│    res.status(201).json(nuevo);                    │
│  })                                                │
└───────────────────┬────────────────────────────────┘
                    │
                    │ Objeto JavaScript
                    ▼
┌────────────────────────────────────────────────────┐
│ 3️⃣ GESTOR BD (db/postgres-manager.js)             │
│                                                     │
│  async insertMantenimiento(data) {                 │
│    // 📝 Preparar SQL seguro                       │
│    const query = `                                 │
│      INSERT INTO mantenimientos                    │
│      (cuarto_id, descripcion, tipo)                │
│      VALUES ($1, $2, $3)                           │
│      RETURNING *                                   │
│    `;                                              │
│                                                     │
│    // 🛡️ Parámetros seguros                        │
│    const values = [                                │
│      data.cuarto_id,    // $1                      │
│      data.descripcion,  // $2                      │
│      data.tipo         // $3                       │
│    ];                                              │
│                                                     │
│    // ⚡ Ejecutar                                   │
│    const result = await                            │
│      this.pool.query(query, values);               │
│                                                     │
│    return result.rows[0];                          │
│  }                                                 │
└───────────────────┬────────────────────────────────┘
                    │
                    │ SQL Query
                    ▼
┌────────────────────────────────────────────────────┐
│ 4️⃣ POSTGRESQL                                      │
│                                                     │
│  INSERT INTO mantenimientos                        │
│    (cuarto_id, descripcion, tipo)                  │
│  VALUES (5, 'Reparar AC', 'normal')                │
│  RETURNING *;                                      │
│                                                     │
│  ↓ Ejecuta                                         │
│  ↓ Genera ID: 42                                   │
│  ↓ Aplica defaults                                 │
│                                                     │
│  Retorna:                                          │
│  {                                                 │
│    id: 42,                                         │
│    cuarto_id: 5,                                   │
│    descripcion: "Reparar AC",                      │
│    tipo: "normal",                                 │
│    fecha_creacion: "2025-11-10T15:23:45"           │
│  }                                                 │
└───────────────────┬────────────────────────────────┘
                    │
                    │ Resultado
                    ▼
         RESPUESTA DE VUELTA
                    ▼
              USUARIO VE
         "✅ Mantenimiento creado"
```

---

## 🗂️ Estructura de Archivos Creados

```
📁 jwm_mant_cuartos/
│
├── 📁 api/                          ⭐ NUEVA CARPETA
│   ├── 📄 index.js                  → Configurador principal
│   ├── 📄 edificios.js              → API de edificios (2 endpoints)
│   ├── 📄 cuartos.js                → API de cuartos (5 endpoints)
│   ├── 📄 mantenimientos.js         → API de mantenimientos (6 endpoints)
│   └── 📄 README.md                 → Documentación
│
├── 📁 db/
│   ├── 📄 postgres-manager.js       → Gestor de base de datos
│   ├── 📄 config.js                 → Configuración
│   └── 📄 schema-postgres.sql       → Esquema SQL
│
├── 📄 server.js                     → Servidor Express (simplificado)
├── 📄 app-loader.js                 → Frontend que consume APIs
└── 📄 index.html                    → Interfaz de usuario
```

---

## 📋 Endpoints Implementados

### Mantenimientos

| Método | Endpoint | Frontend | API | BD Method |
|--------|----------|----------|-----|-----------|
| 🔍 GET | `/api/mantenimientos` | `fetch()` | `router.get('/')` | `getMantenimientos()` |
| 🔍 GET | `/api/mantenimientos/:id` | `fetch()` | `router.get('/:id')` | `getMantenimientoById()` |
| ➕ POST | `/api/mantenimientos` | `fetch({method:'POST'})` | `router.post('/')` | `insertMantenimiento()` |
| ✏️ PUT | `/api/mantenimientos/:id` | `fetch({method:'PUT'})` | `router.put('/:id')` | `updateMantenimiento()` |
| 🔔 PATCH | `/api/mantenimientos/:id/emitir` | `fetch({method:'PATCH'})` | `router.patch('/:id/emitir')` | `marcarAlertaEmitida()` |
| 🗑️ DELETE | `/api/mantenimientos/:id` | `fetch({method:'DELETE'})` | `router.delete('/:id')` | `deleteMantenimiento()` |

### Cuartos

| Método | Endpoint | BD Method |
|--------|----------|-----------|
| 🔍 GET | `/api/cuartos` | `getCuartos()` |
| 🔍 GET | `/api/cuartos/:id` | `getCuartoById()` |
| ➕ POST | `/api/cuartos` | `createCuarto()` |
| ✏️ PUT | `/api/cuartos/:id` | `updateCuarto()` |
| 🗑️ DELETE | `/api/cuartos/:id` | `deleteCuarto()` |

### Edificios

| Método | Endpoint | BD Method |
|--------|----------|-----------|
| 🔍 GET | `/api/edificios` | `getEdificios()` |
| 🔍 GET | `/api/edificios/:id` | `getEdificioById()` |

---

## 🔐 Seguridad Implementada

### SQL Injection Prevention

```javascript
// ❌ VULNERABLE
const query = `INSERT INTO mantenimientos VALUES (${id}, '${desc}')`;

// ✅ SEGURO (Implementado)
const query = `INSERT INTO mantenimientos VALUES ($1, $2)`;
const values = [id, desc];
await pool.query(query, values);
```

### Validación de Datos

```javascript
// En api/mantenimientos.js
if (!cuarto_id || !descripcion) {
    return res.status(400).json({ 
        error: 'Faltan campos obligatorios' 
    });
}

if (tipo === 'rutina' && !hora) {
    return res.status(400).json({ 
        error: 'La hora es obligatoria para rutinas' 
    });
}
```

---

## 📈 Métricas del Proyecto

### Antes de la Refactorización

```
server.js: 384 líneas
├── Configuración: ~50 líneas
├── APIs mezcladas: ~250 líneas  ❌ Difícil mantener
├── Rutas estáticas: ~50 líneas
└── Código repetido: ~34 líneas
```

### Después de la Refactorización

```
server.js: 152 líneas (-60%)
├── Configuración: ~50 líneas
├── Setup APIs: ~10 líneas
└── Rutas estáticas: ~50 líneas

api/edificios.js: 60 líneas
api/cuartos.js: 160 líneas
api/mantenimientos.js: 251 líneas
api/index.js: 37 líneas

Total modular: 660 líneas
Organizado por recurso ✅
Fácil de mantener ✅
```

---

## 🔄 Conversión de Datos

### JSON → JavaScript → SQL → PostgreSQL

```
┌─────────────────────────────────────────────────────┐
│ FRONTEND (JSON string)                              │
│ "{"cuarto_id":"5","descripcion":"Reparar AC"}"      │
└────────────────┬────────────────────────────────────┘
                 │
                 │ JSON.parse() / express.json()
                 ▼
┌─────────────────────────────────────────────────────┐
│ JAVASCRIPT (Objeto)                                 │
│ { cuarto_id: "5", descripcion: "Reparar AC" }       │
└────────────────┬────────────────────────────────────┘
                 │
                 │ Validación + Transformación
                 ▼
┌─────────────────────────────────────────────────────┐
│ JAVASCRIPT (Procesado)                              │
│ { cuarto_id: 5, descripcion: "Reparar AC" }         │
└────────────────┬────────────────────────────────────┘
                 │
                 │ pg.query(sql, values)
                 ▼
┌─────────────────────────────────────────────────────┐
│ SQL (Query preparado)                               │
│ INSERT INTO mantenimientos                          │
│   (cuarto_id, descripcion)                          │
│ VALUES ($1, $2)                                     │
│ -- $1=5, $2='Reparar AC'                            │
└────────────────┬────────────────────────────────────┘
                 │
                 │ PostgreSQL ejecuta
                 ▼
┌─────────────────────────────────────────────────────┐
│ POSTGRESQL (Almacenado)                             │
│ Tabla: mantenimientos                               │
│ ┌────┬───────────┬─────────────┬─────────────────┐ │
│ │ id │ cuarto_id │ descripcion │ fecha_creacion  │ │
│ ├────┼───────────┼─────────────┼─────────────────┤ │
│ │ 42 │     5     │ Reparar AC  │ 2025-11-10 ...  │ │
│ └────┴───────────┴─────────────┴─────────────────┘ │
└────────────────┬────────────────────────────────────┘
                 │
                 │ RETURNING * → result.rows[0]
                 ▼
┌─────────────────────────────────────────────────────┐
│ JAVASCRIPT (Objeto retornado)                       │
│ {                                                   │
│   id: 42,                                           │
│   cuarto_id: 5,                                     │
│   descripcion: "Reparar AC",                        │
│   fecha_creacion: "2025-11-10T15:23:45.000Z"        │
│ }                                                   │
└────────────────┬────────────────────────────────────┘
                 │
                 │ res.json()
                 ▼
┌─────────────────────────────────────────────────────┐
│ JSON (Respuesta HTTP)                               │
│ {"id":42,"cuarto_id":5,"descripcion":"Reparar AC"} │
└────────────────┬────────────────────────────────────┘
                 │
                 │ response.json()
                 ▼
┌─────────────────────────────────────────────────────┐
│ FRONTEND (JavaScript)                               │
│ const nuevo = await response.json();                │
│ console.log(nuevo.id); // 42                        │
└─────────────────────────────────────────────────────┘
```

---

## 🎓 Conceptos Clave Aplicados

### 1. Arquitectura en Capas (Layered Architecture)
- ✅ Presentación (Frontend)
- ✅ Lógica de Negocio (APIs)
- ✅ Acceso a Datos (Database Manager)
- ✅ Persistencia (PostgreSQL)

### 2. REST API Principles
- ✅ Recursos identificados por URLs
- ✅ Métodos HTTP estándar (GET, POST, PUT, DELETE)
- ✅ Respuestas con códigos de estado apropiados
- ✅ Formato JSON para datos

### 3. Separación de Responsabilidades (SoC)
- ✅ Cada módulo tiene un propósito único
- ✅ Bajo acoplamiento entre capas
- ✅ Alta cohesión dentro de módulos

### 4. Inyección de Dependencias
```javascript
// La API recibe dbManager como parámetro
module.exports = (dbManager) => {
    router.post('/', async (req, res) => {
        await dbManager.insertMantenimiento(data);
    });
};
```

### 5. Async/Await Pattern
```javascript
// Código síncrono en apariencia, asíncrono en ejecución
async function crear() {
    const resultado = await dbManager.insert(data);
    return resultado;
}
```

---

## 📝 Código de Ejemplo Completo

### Frontend → API → BD (Todo el flujo)

```javascript
// ========================================
// 1. FRONTEND (app-loader.js)
// ========================================
async function crearMantenimiento() {
    const datos = {
        cuarto_id: 5,
        descripcion: "Reparar aire acondicionado",
        tipo: "normal"
    };
    
    const response = await fetch('http://localhost:3001/api/mantenimientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    });
    
    const nuevo = await response.json();
    console.log('Creado:', nuevo);
    return nuevo;
}

// ========================================
// 2. API (api/mantenimientos.js)
// ========================================
router.post('/', async (req, res) => {
    const { cuarto_id, descripcion, tipo } = req.body;
    
    // Validar
    if (!cuarto_id || !descripcion) {
        return res.status(400).json({ error: 'Faltan campos' });
    }
    
    // Preparar
    const data = {
        cuarto_id: parseInt(cuarto_id),
        descripcion,
        tipo: tipo || 'normal'
    };
    
    // Insertar
    const nuevo = await dbManager.insertMantenimiento(data);
    
    // Responder
    res.status(201).json(nuevo);
});

// ========================================
// 3. DATABASE MANAGER (db/postgres-manager.js)
// ========================================
async insertMantenimiento(data) {
    const query = `
        INSERT INTO mantenimientos (cuarto_id, descripcion, tipo)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    
    const values = [data.cuarto_id, data.descripcion, data.tipo];
    
    const result = await this.pool.query(query, values);
    
    return result.rows[0];
}

// ========================================
// 4. POSTGRESQL
// ========================================
-- Query ejecutado:
INSERT INTO mantenimientos (cuarto_id, descripcion, tipo)
VALUES (5, 'Reparar aire acondicionado', 'normal')
RETURNING *;

-- Retorna:
-- { id: 42, cuarto_id: 5, descripcion: '...', ... }
```

---

## ✅ Checklist de Implementación

- [x] Crear carpeta `api/`
- [x] Modularizar endpoints por recurso
- [x] Implementar `postgres-manager.js`
- [x] Conectar APIs con Database Manager
- [x] Validar datos en APIs
- [x] Usar parámetros preparados en SQL
- [x] Implementar manejo de errores
- [x] Documentar endpoints
- [x] Probar todos los endpoints
- [x] Crear documentación técnica

---

## 🚀 Resultado Final

### Antes
❌ Código monolítico  
❌ Todo en un archivo  
❌ Difícil de mantener  
❌ Difícil de escalar  

### Después
✅ Arquitectura modular  
✅ Separación por recursos  
✅ Fácil de mantener  
✅ Fácil de escalar  
✅ Preparado para crecimiento  

---

**Documento creado para fines académicos**  
**Proyecto:** JW Mantto - Sistema de Mantenimiento Hotelero  
**Fecha:** Noviembre 2025

