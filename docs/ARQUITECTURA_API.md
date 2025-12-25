# Arquitectura API - JW Mantto

## Estructura Modular de APIs

La aplicación ahora utiliza una arquitectura modular donde las APIs REST están organizadas por recursos en una carpeta dedicada.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     ARQUITECTURA COMPLETA                    │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   NAVEGADOR      │
│   (Cliente)      │
│                  │
│  • index.html    │
│  • app-loader.js │
│  • style.css     │
└────────┬─────────┘
         │
         │ HTTP/JSON
         │ fetch()
         ▼
┌────────────────────────────────────────────────────────────┐
│                      SERVER.JS                              │
│                  (Servidor Express)                         │
│                                                             │
│  • Middleware (CORS, JSON, Static files)                   │
│  • Logging                                                 │
│  • Rutas estáticas (/, *.js)                              │
└────────┬───────────────────────────────────────────────────┘
         │
         │ require('./api')
         ▼
┌────────────────────────────────────────────────────────────┐
│                     API/INDEX.JS                            │
│                 (Configurador de rutas)                     │
│                                                             │
│  • setupApiRoutes(app, dbManager)                          │
│  • Health check endpoint                                   │
└────┬──────────────┬──────────────┬──────────────┬──────────┘
     │              │              │              │
     ▼              ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│Edificios │ │ Cuartos  │ │Mantenim. │ │ Future   │
│   API    │ │   API    │ │   API    │ │Resources │
│          │ │          │ │          │ │          │
│edificios.│ │cuartos.js│ │mantenim. │ │  ...     │
│   js     │ │          │ │   js     │ │          │
└────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────┘
     │            │            │
     │            │            │ Operaciones CRUD
     └────────────┴────────────┴───────────────────┐
                                                   ▼
                              ┌────────────────────────────────┐
                              │   DB/POSTGRES-MANAGER.JS       │
                              │   (Gestor de Base de Datos)    │
                              │                                │
                              │  • getEdificios()              │
                              │  • getCuartos()                │
                              │  • getMantenimientos()         │
                              │  • insertMantenimiento()       │
                              │  • updateMantenimiento()       │
                              │  • deleteMantenimiento()       │
                              │  • marcarAlertaEmitida()       │
                              └────────┬───────────────────────┘
                                       │
                                       │ SQL Queries
                                       ▼
                              ┌────────────────────┐
                              │    PostgreSQL      │
                              │   Base de Datos    │
                              │                    │
                              │  • edificios       │
                              │  • cuartos         │
                              │  • mantenimientos  │
                              └────────────────────┘
```

## Estructura de Carpetas

```
jwm_mant_cuartos/
│
├── api/                          # 📁 Nueva carpeta de APIs
│   ├── index.js                  # ⚙️  Configurador principal
│   ├── edificios.js              # 🏢 API de edificios
│   ├── cuartos.js                # 🚪 API de cuartos
│   ├── mantenimientos.js         # 🔧 API de mantenimientos
│   └── README.md                 # 📖 Documentación de APIs
│
├── db/                           # 📁 Capa de base de datos
│   ├── postgres-manager.js       # Gestor PostgreSQL
│   ├── config.js                 # Configuración DB
│   └── schema-postgres.sql       # Esquema de tablas
│
├── docs/                         # 📁 Documentación
│   ├── ARQUITECTURA_API.md       # Este archivo
│   └── ...
│
├── server.js                     # 🌐 Servidor Express (simplificado)
├── index.html                    # 📄 Interfaz de usuario
├── app-loader.js                 # 🔌 Cliente API (Frontend)
├── style.css                     # 🎨 Estilos
└── package.json                  # 📦 Dependencias
```

## Flujo de Datos

### 1. Obtener Datos (GET)

```
Usuario hace click
       ↓
app-loader.js llama fetch('/api/cuartos')
       ↓
server.js → api/index.js → api/cuartos.js
       ↓
cuartos.js → router.get('/')
       ↓
dbManager.getCuartos()
       ↓
PostgreSQL ejecuta SELECT
       ↓
Retorna JSON con datos
       ↓
app-loader.js renderiza en HTML
```

### 2. Crear Mantenimiento (POST)

```
Usuario llena formulario y envía
       ↓
app-loader.js:manejarAgregarMantenimiento()
       ↓
fetch('/api/mantenimientos', {method: 'POST', body: {...}})
       ↓
server.js → api/mantenimientos.js
       ↓
mantenimientos.js → router.post('/')
       ↓
Validaciones de datos
       ↓
dbManager.insertMantenimiento(datos)
       ↓
PostgreSQL ejecuta INSERT
       ↓
Retorna nuevo registro con ID
       ↓
app-loader.js recarga datos y actualiza UI
```

### 3. Eliminar Mantenimiento (DELETE)

```
Usuario hace click en botón eliminar
       ↓
Confirmación (confirm dialog)
       ↓
fetch('/api/mantenimientos/:id', {method: 'DELETE'})
       ↓
server.js → api/mantenimientos.js
       ↓
mantenimientos.js → router.delete('/:id')
       ↓
dbManager.deleteMantenimiento(id)
       ↓
PostgreSQL ejecuta DELETE
       ↓
Retorna {success: true}
       ↓
app-loader.js recarga datos y actualiza UI
```

## Endpoints por Módulo

### api/edificios.js

| Método | Endpoint             | Descripción                 |
| ------ | -------------------- | --------------------------- |
| GET    | `/api/edificios`     | Obtener todos los edificios |
| GET    | `/api/edificios/:id` | Obtener edificio específico |

### api/cuartos.js

| Método | Endpoint           | Descripción               |
| ------ | ------------------ | ------------------------- |
| GET    | `/api/cuartos`     | Obtener todos los cuartos |
| GET    | `/api/cuartos/:id` | Obtener cuarto específico |
| POST   | `/api/cuartos`     | Crear nuevo cuarto        |
| PUT    | `/api/cuartos/:id` | Actualizar cuarto         |
| DELETE | `/api/cuartos/:id` | Eliminar cuarto           |

### api/mantenimientos.js

| Método | Endpoint                          | Descripción                      |
| ------ | --------------------------------- | -------------------------------- |
| GET    | `/api/mantenimientos`             | Obtener todos los mantenimientos |
| GET    | `/api/mantenimientos?cuarto_id=X` | Filtrar por cuarto               |
| GET    | `/api/mantenimientos/:id`         | Obtener mantenimiento específico |
| POST   | `/api/mantenimientos`             | Crear nuevo mantenimiento        |
| PUT    | `/api/mantenimientos/:id`         | Actualizar mantenimiento         |
| PATCH  | `/api/mantenimientos/:id/emitir`  | Marcar alerta como emitida       |
| DELETE | `/api/mantenimientos/:id`         | Eliminar mantenimiento           |

## Ventajas de la Arquitectura Modular

### ✅ Separación de Responsabilidades

- Cada módulo maneja un recurso específico
- Fácil de entender y mantener
- Código más limpio y organizado

### ✅ Escalabilidad

- Agregar nuevos recursos es simple: crear nuevo archivo en `api/`
- No modifica el código existente
- Sigue principio Open/Closed

### ✅ Reutilización

- Los módulos pueden ser reutilizados en otros proyectos
- Cada endpoint es independiente
- Fácil testing unitario

### ✅ Mantenibilidad

- Bugs son más fáciles de localizar
- Cambios en un recurso no afectan otros
- Documentación por módulo

### ✅ Trabajo en Equipo

- Diferentes desarrolladores pueden trabajar en diferentes módulos
- Menos conflictos en Git
- División clara de tareas

## Comparación: Antes vs Después

### ANTES (Monolítico)

```javascript
// server.js - 384 líneas con TODO mezclado

app.get('/api/edificios', async (req, res) => { ... });
app.get('/api/cuartos', async (req, res) => { ... });
app.post('/api/cuartos', async (req, res) => { ... });
app.get('/api/mantenimientos', async (req, res) => { ... });
app.post('/api/mantenimientos', async (req, res) => { ... });
app.put('/api/mantenimientos/:id', async (req, res) => { ... });
app.delete('/api/mantenimientos/:id', async (req, res) => { ... });
// ... 200+ líneas más
```

**Problemas:**

- ❌ Difícil de navegar
- ❌ Todo en un archivo
- ❌ Difícil de testear
- ❌ Mezcla lógica de negocios con configuración

### DESPUÉS (Modular)

```
server.js          → 151 líneas - Solo configuración
api/index.js       → 30 líneas  - Enrutador principal
api/edificios.js   → 60 líneas  - Lógica de edificios
api/cuartos.js     → 160 líneas - Lógica de cuartos
api/mantenimientos.js → 250 líneas - Lógica de mantenimientos
```

**Ventajas:**

- ✅ Cada archivo con propósito único
- ✅ Fácil de navegar
- ✅ Fácil de testear módulo por módulo
- ✅ Separación clara de responsabilidades

## Cómo Agregar un Nuevo Recurso

### Ejemplo: Agregar API de "Empleados"

1. **Crear archivo `api/empleados.js`:**

```javascript
const express = require('express');
const router = express.Router();

module.exports = (dbManager) => {
  // GET /api/empleados
  router.get('/', async (req, res) => {
    try {
      if (dbManager) {
        const empleados = await dbManager.getEmpleados();
        res.json(empleados);
      } else {
        res.status(500).json({ error: 'BD no disponible' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/empleados
  router.post('/', async (req, res) => {
    // ... lógica de creación
  });

  return router;
};
```

2. **Agregar al `api/index.js`:**

```javascript
const empleadosRouter = require('./empleados');

function setupApiRoutes(app, dbManager) {
  // ... rutas existentes
  app.use('/api/empleados', empleadosRouter(dbManager));
}
```

3. **¡Listo!** Tu nuevo recurso ya está disponible en `/api/empleados`

## Testing

### Estructura de Tests (Futuro)

```
tests/
├── api/
│   ├── edificios.test.js
│   ├── cuartos.test.js
│   └── mantenimientos.test.js
└── integration/
    └── api-flow.test.js
```

### Ejemplo de Test Unitario

```javascript
const request = require('supertest');
const app = require('../server');

describe('API de Cuartos', () => {
  test('GET /api/cuartos retorna array', async () => {
    const response = await request(app).get('/api/cuartos').expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /api/cuartos crea nuevo cuarto', async () => {
    const nuevoCuarto = {
      numero: '999',
      edificio_id: 1,
    };

    const response = await request(app)
      .post('/api/cuartos')
      .send(nuevoCuarto)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.numero).toBe('999');
  });
});
```

## Próximos Pasos

1. ✅ **Modularización completada**
2. ⏳ Agregar tests unitarios
3. ⏳ Agregar validación de datos con Joi/Yup
4. ⏳ Implementar autenticación JWT
5. ⏳ Agregar rate limiting
6. ⏳ Documentar con Swagger/OpenAPI
7. ⏳ Agregar logs estructurados (Winston)
8. ⏳ Implementar caché (Redis)

## Recursos Adicionales

- 📖 Ver `api/README.md` para documentación detallada de endpoints
- 🔧 Ver `db/postgres-manager.js` para métodos de base de datos
- 📝 Ver ejemplos de uso en la documentación de cada módulo

---

**Fecha de creación:** 2025-11-10  
**Última actualización:** 2025-11-10  
**Versión:** 1.0
