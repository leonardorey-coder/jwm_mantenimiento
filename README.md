# Sistema de Gestión de Servicios Operativa de Mantenimiento (SGSOM) - JW Mantto

Sistema moderno de registro y gestión de mantenimiento de habitaciones para hoteles, construido como **PWA (Progressive Web App) con Node.js/Express + PostgreSQL**. Funciona online y offline, con **sincronización automática** cuando se recupera la conexión.

> 🎯 Arquitectura actualizada: PWA + PostgreSQL con soporte offline y sincronización diferida (cola de cambios en BD local del navegador).

## 🏷️ Nombre del Proyecto

- Nombre completo: **Sistema de Gestión de Servicios Operativa de Mantenimiento (SGSOM)**
- Nombre corto/alias: **JW Mantto**
- Contexto: **JW Marriott Resort & Spa — Estancia I**
- Entregable de esta implementación: **Backend (API REST y Base de Datos) + PWA online/offline**

## ✨ Características Principales

- 🏨 **Gestión de Habitaciones y Espacios Comunes**: Administra habitaciones y áreas comunes por edificios
- 🔧 **Mantenimientos**: Registro de mantenimientos normales y rutinas programadas
- 🔔 **Alertas Programadas**: Sistema de notificaciones automáticas
- 💾 **Offline-First**: Operación 100% offline (datos y acciones quedan en cola)
- 📱 **PWA**: Instalable en móviles y equipos de escritorio vía navegador
- 🗄️ **Base de datos central**: PostgreSQL (nube/servidor)
- 🧰 **BD local (offline)**: IndexedDB con 50+ MB de capacidad
- 🔄 **Sincronización**: Reintento automático al recuperar conectividad
- ⚡ **Alto rendimiento**: Migración completa a IndexedDB para mejor escalabilidad

## 🎯 Objetivo General

Diseñar e implementar un sistema web (PWA) para la gestión operativa de mantenimiento de habitaciones y edificios del hotel, con soporte online/offline, alertas programadas y sincronización confiable hacia una base de datos central en PostgreSQL.

## 🎯 Objetivos Específicos

- Proveer una interfaz web intuitiva y responsive para la gestión rápida de edificios, habitaciones, espacios comunes y mantenimientos.
- Implementar un CRUD completo para habitaciones, espacios comunes y mantenimientos con estados y tipos (normal/rutina).
- Incorporar un sistema de alertas programadas con notificaciones, sonido e historial.
- Operar en modo offline con IndexedDB y sincronización diferida al recuperar conexión.
- Centralizar datos en PostgreSQL para acceso multiusuario y escalabilidad.

## 🚀 Inicio Rápido

### Prerrequisitos

- **Node.js** v16 o superior
- **npm** (incluido con Node.js)
- **PostgreSQL** 13+ (local o en la nube)

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/leonardorey-coder/jwm_mantenimiento.git
cd jwm_mantenimiento

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales de PostgreSQL:
# DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL=true|false
```

### Configurar la base de datos (PostgreSQL)

```bash
# Crear base de datos (ejemplo)
psql -U postgres -c "CREATE DATABASE jwmantto;"

# Cargar el esquema
psql -U postgres -d jwmantto -f db/schema-postgres.sql
```

### Ejecutar la Aplicación (PWA)

```bash
npm start
```

Accede desde el navegador en: `http://localhost:3001`. Desde ahí puedes instalar la PWA.

## 🧱 Arquitectura

- **Frontend (PWA)**: `index.html`, `script.js`, `style.css`, `manifest.json`, `sw.js`
  - Cache de recursos estáticos con Service Worker
  - Persistencia local con IndexedDB (cola de cambios y datos esenciales)
- **Backend (API REST)**: `server.js` en Node.js/Express
  - Exposición de endpoints para edificios, cuartos y mantenimientos
  - Conexión a PostgreSQL vía `pg` (node-postgres)
- **Base de datos**:
  - Central: PostgreSQL (producción/nube)
  - Local: IndexedDB (modo offline)

## 📐 Requerimientos del Sistema

### Funcionales
- CRUD de edificios (nombre único), habitaciones, espacios comunes y mantenimientos.
- Estados de la habitación y espacios comunes: disponible, ocupado, mantenimiento, fuera de servicio.
- Tipos de mantenimiento: normal (correctivo) y rutina (preventivo); estados y prioridades.
- Alertas programadas por fecha y hora, notificaciones y registro de emisión.
- Búsqueda, filtrado y actualización dinámica desde la UI.

### No funcionales
- PWA instalable con Service Worker (caching, actualización en segundo plano).
- Operación offline-first con IndexedDB y cola de sincronización.
- API REST sobre Node.js/Express con CORS y validaciones.
- Persistencia central en PostgreSQL (concurrencia y transacciones).
- Despliegue en entorno local o nube; configuración por `.env`.

### Flujo Offline y Sincronización

1. En **modo offline**, las operaciones de creación/edición/eliminación se escriben en IndexedDB y se encolan.
2. Al **recuperar conectividad** (Background Sync o al reabrir la app), se reintentan los `POST/PUT/DELETE` pendientes contra la API REST.
3. **Resolución de conflictos**: por defecto, se prioriza el estado confirmado por el servidor (estrategia “última escritura del servidor gana”). Esta política puede ajustarse según necesidades del negocio.

## 📁 Estructura del Proyecto

```
jwm_mant_cuartos/
├── server.js                    # Servidor Express + API REST + estáticos PWA
├── db/
│   ├── postgres-manager.js      # Gestor PostgreSQL (pg)
│   └── schema-postgres.sql      # Esquema para PostgreSQL
├── index.html                   # Interfaz principal (PWA)
├── script.js                    # Lógica del frontend
├── style.css                    # Estilos
├── sw.js                        # Service Worker (PWA)
├── manifest.json                # Manifiesto PWA
├── package.json                 # Scripts y dependencias
├── docs/
│   └── MIGRACION_POSTGRES.md    # Detalles de la migración a PostgreSQL
├── icons/                       # Iconos para PWA
└── sounds/                      # Sonidos de notificaciones
```

## 🛠️ Tecnologías

### Backend
- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **pg (node-postgres)** - Conector PostgreSQL
- **dotenv** - Variables de entorno
- **CORS** - Control de acceso entre orígenes

### Frontend
- **HTML5 + CSS3 + JavaScript** - Interfaz nativa
- **Service Worker** - Funcionalidad offline
- **Cache Storage** - Recursos estáticos
- **IndexedDB** - Base de datos local (50+ MB) con índices y transacciones
- **Notification API** - Alertas del sistema
- **PWA** - Instalable en dispositivos móviles y escritorio

> 💡 **Migración a IndexedDB**: Se migró de localStorage a IndexedDB para mayor capacidad (50+ MB vs 5-10 MB), mejor rendimiento (operaciones asíncronas), búsquedas eficientes con índices, y soporte para cola de sincronización offline. Ver [MIGRACION_INDEXEDDB.md](./MIGRACION_INDEXEDDB_RESUMEN.md) para más detalles.

## 📡 API REST

El servidor expone los siguientes endpoints:

### Edificios
```
GET    /api/edificios              # Listar todos los edificios
```

### Habitaciones
```
# Nota: En el código actual las rutas usan /api/cuartos (alias de habitaciones).
GET    /api/cuartos                # Listar todas las habitaciones
GET    /api/cuartos/:id            # Obtener una habitación específica
```

### Espacios Comunes (planificado)
```
# Se adicionará gestión equivalente a habitaciones:
# GET    /api/espacios
# GET    /api/espacios/:id
# POST   /api/espacios
# PUT    /api/espacios/:id
# DELETE /api/espacios/:id
```

### Mantenimientos
```
GET    /api/mantenimientos         # Listar mantenimientos (opcional: ?cuarto_id=X)
POST   /api/mantenimientos         # Crear nuevo mantenimiento
PUT    /api/mantenimientos/:id     # Actualizar mantenimiento
DELETE /api/mantenimientos/:id     # Eliminar mantenimiento
PATCH  /api/mantenimientos/:id/emitir  # Marcar alerta como emitida
```

### Ejemplo de Request

```javascript
// Crear un nuevo mantenimiento
fetch('http://localhost:3001/api/mantenimientos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cuarto_id: 1, // ID de la habitación (nombre de campo actual en la API)
    descripcion: 'Reparar aire acondicionado',
    tipo: 'normal'  // o 'rutina' para alertas programadas
  })
});
```

## 💾 Base de Datos

### PostgreSQL (Central)

- **Configuración**: vía `.env` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`)
- **Esquema**: ver `db/schema-postgres.sql`
- **Inicialización**: consulta `docs/MIGRACION_POSTGRES.md` para pasos de setup y migración

### BD Local (Offline)

- **Motor**: IndexedDB (en el navegador)
- **Uso**: almacenamiento de datos esenciales y cola de operaciones para sincronizar
- **Sincronización**: al recuperar conexión, se reintentan las operaciones pendientes contra la API

## 🔔 Sistema de Notificaciones

### Alertas Programadas

1. Crear un mantenimiento de tipo `rutina` con:
   - `dia_alerta`: Fecha (YYYY-MM-DD)
   - `hora`: Hora (HH:MM)
   - `descripcion`: Mensaje de la alerta

2. La aplicación verificará periódicamente si hay alertas pendientes.

3. Cuando llegue el momento programado:
   - Se muestra una notificación del sistema
   - Se reproduce un sonido de alerta
   - Se marca como `emitida` en la base de datos

## 🌐 Uso como PWA (Progressive Web App)

### Instalar en el navegador

1. Abre la aplicación en Chrome/Edge: `http://localhost:3001`
2. Haz clic en el icono de instalación en la barra de direcciones
3. La app se instalará como aplicación independiente

### Acceso Remoto con ngrok (opcional)

```bash
# Instalar ngrok (https://ngrok.com/download)

# Con el servidor corriendo, ejecuta:
ngrok http 3001

# Obtendrás una URL pública:
# https://abcd1234.ngrok.io
```

## 📦 Scripts npm Disponibles

```json
{
  "start": "node server.js"
}
```

## 🔧 Desarrollo

### Debugging

- **Logs**: Revisa la consola del servidor Node.js
- **Base de datos**: Usa `psql` para inspeccionar PostgreSQL
- **PWA**: Usa DevTools (Application → Service Workers/Storage) para revisar Cache/IndexedDB

## 📄 Documentación Adicional

### 📊 Base de Datos
- **[Esquema BD Completo](./docs/ESQUEMA_BD_COMPLETO.md)** - Documentación detallada del esquema completo v2.0
- **[Diagrama BD Completo](./docs/DIAGRAMA_BD_COMPLETO.md)** - Diagrama visual de relaciones y estructura
- **[Diagrama de Clases](./docs/DIAGRAMA_CLASES.md)** - Diseño orientado a objetos del sistema
- **[README Esquemas](./db/README_ESQUEMAS.md)** - Guía de instalación y uso de esquemas SQL
- [Migración a PostgreSQL](./docs/MIGRACION_POSTGRES.md) - Migración y configuración de PostgreSQL

### 🌐 APIs y Arquitectura
- **[Arquitectura API](./docs/ARQUITECTURA_API.md)** - Documentación de la arquitectura modular
- **[API Gestión de Estados](./docs/API_GESTION_ESTADOS.md)** - Sistema de estados con colores
- [Ejemplos Dashboard Colores](./docs/EJEMPLOS_DASHBOARD_COLORES.md) - Ejemplos visuales de dashboard
- [Desarrollo de APIs](./docs/REPORTE_DESARROLLO_APIS_COMPLETO.md) - Reporte completo de desarrollo
- [Resumen Visual APIs](./docs/RESUMEN_APIS_VISUAL.md) - Resumen visual de endpoints

## 🐛 Solución de Problemas

### Error: Puerto 3001 en uso

```bash
# Encontrar y matar el proceso
lsof -ti:3001 | xargs kill -9
```

### Error: Base de datos no disponible (PostgreSQL)

1. Verifica que PostgreSQL esté corriendo (por ejemplo en macOS: `brew services list`)
2. Revisa credenciales en `.env` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`)
3. Prueba conexión manual: `psql -U <usuario> -d <base> -h <host> -p <puerto>`
4. Confirma que ejecutaste `db/schema-postgres.sql`

## 🔭 Backlog (Próximos pasos)

- Exportación a Excel (mantenimientos, cuartos, edificios).
- Sistema de autenticación y roles (admin, técnico, supervisor).
- WebSockets para actualización en tiempo real.

## 📝 Changelog

### v2.0.0 (9 de noviembre de 2025)
- ✅ Migración a **PWA + PostgreSQL**
- ✅ Modo **offline-first** con **BD local (IndexedDB)** y sincronización diferida
- ✅ Documentación de setup y migración a PostgreSQL

### v1.1.0 (26 de octubre de 2025)
- ✅ Migración completa de PHP/MySQL a Node.js/SQLite
- ✅ API REST completa implementada
- ✅ Eliminados archivos PHP legacy
- ✅ Sistema de notificaciones mejorado
- ✅ Modo offline funcional (inicial)

### v1.0.0
- 🎉 Versión inicial con PHP/MySQL

## 👥 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/mi-feature`)
3. Commit de tus cambios (`git commit -m 'feat: agrega mi feature'`)
4. Push a la rama (`git push origin feature/mi-feature`)
5. Abre un Pull Request

## 📜 Licencia

Este proyecto es privado y está desarrollado para JW Marriott Los Cabos.

## 👤 Créditos y roles

- Backend (API REST y Base de Datos): **Juan Leonardo Cruz Flores**
- Entidad: **JW Marriott Los Cabos - Gerencia de Mantenimiento**
- Proyecto: **Sistema de Gestión de Servicios Operativa de Mantenimiento (SGSOM)**

## 👨‍💻 Autor

**JW Marriott - Gerencia de Mantenimiento**

---

**⚡ Powered by Node.js + PWA + PostgreSQL**