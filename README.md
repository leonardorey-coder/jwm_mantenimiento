# Sistema de Gestión de Servicios Operativa de Mantenimiento (SGSOM) - JW Mantto

Sistema moderno de registro y gestión de mantenimiento de habitaciones para hoteles, construido como **PWA (Progressive Web App) con Node.js/Express + PostgreSQL**. Funciona online y offline, con **sincronización automática** cuando se recupera la conexión.

> 🎯 Arquitectura actualizada: PWA + PostgreSQL con soporte offline y sincronización diferida (cola de cambios en BD local del navegador).

## 🏷️ Nombre del Proyecto

- Nombre completo: **Sistema de Gestión de Servicios Operativa de Mantenimiento (SGSOM)**
- Nombre corto/alias: **JW Mantto**
- Contexto: **JW Marriott Resort & Spa — Estancia I**
- Entregable de esta implementación: **Backend (API REST y Base de Datos) + PWA online/offline**

## ✨ Características Principales

- 🏨 **Habitaciones y Espacios Comunes**: administración por edificio con estados y métricas
- 🔧 **Mantenimientos**: normal y rutina con prioridad, fecha/hora de alerta y emisión
- 🔔 **Alertas Programadas**: notificaciones, sonido, historial y emisión automática
- 🧾 **Checklist de inspecciones**: categorías/items, estados Bueno/Regular/Malo y progreso
- 📋 **Tareas y sábanas**: asignación, prioridades, timeline y control de servicios programados
- 👤 **Usuarios y roles**: ADMIN/SUPERVISOR/TECNICO con permisos UI y API
- 💾 **Offline-First**: IndexedDB (50+ MB) con cola de sincronización diferida
- 📱 **PWA**: instalable en móvil/escritorio con Service Worker y cache
- 🗄️ **PostgreSQL**: base central con migraciones automáticas desde Node
- 🔄 **Sincronización**: reintento automático al recuperar conectividad

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
# Edita .env con tus credenciales y secretos:
# DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL=true|false
# JWT_SECRET, JWT_EXPIRATION, REFRESH_TOKEN_EXPIRATION
```

### Configurar la base de datos (PostgreSQL)

```bash
# Crear base de datos (ejemplo)
psql -U postgres -c "CREATE DATABASE jwmantto;"

# Aplicar esquema completo
psql -U postgres -d jwmantto -f db/schema-postgres-completo.sql

# (Opcional) Migraciones según versión previa
# psql -U postgres -d jwmantto -f db/migration_tareas_tab.sql
# psql -U postgres -d jwmantto -f db/migration_checklist_schema.sql
```

### Ejecutar la Aplicación (PWA/API)

```bash
# Express local (usa js/server.js)
npm start

# O emular entorno serverless Vercel
npm run vercel:dev
```

Accede en `http://localhost:3001` (o `http://localhost:3000` con Vercel dev). Verifica `/api/health` y luego instala la PWA desde el navegador.

## 🧱 Arquitectura

- **Frontend (PWA)**: `index.html`, `css/style.css`, `js/app.js`, `manifest.json`, `sw.js`, módulos en `views/` (tareas, checklist, usuarios). Cache de recursos, estado global y consumo de API vía `fetchWithAuth`. Persistencia local con IndexedDB (cola de cambios y datos esenciales).
- **Backend (API REST)**:
  - Serverless Vercel: `api/index.js` (Express exportado como función) + `api/auth*.js` (JWT, roles).
  - Express local: `js/server.js` (usa el mismo `PostgresManager` que Vercel).
  - Conexión a PostgreSQL vía `pg`, migraciones automáticas en `db/postgres-manager.js`.
- **Base de datos**:
  - Central: PostgreSQL (producción/nube) con esquema completo (`db/schema-postgres-completo.sql`) y migraciones.
  - Local/offline: IndexedDB en navegador (`indexeddb-manager.js`, `storage-helper.js`).

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
├── api/                         # Funciones serverless (Vercel): index.js, auth.js, auth-routes.js
├── js/
│   ├── app.js                   # Lógica principal PWA (tabs, auth, estados)
│   ├── server.js                # Servidor Express local
│   └── sw.js                    # Service Worker (cache PWA)
├── views/                       # Módulos UI (tareas, checklist, usuarios, etc.)
├── db/
│   ├── postgres-manager.js      # Gestor PostgreSQL (pool, migraciones automáticas)
│   ├── schema-postgres-completo.sql  # Esquema completo recomendado
│   ├── migration_*.sql          # Migraciones y seeds (tareas, checklist, dia_alerta, etc.)
│   └── config.js                # Configuración de conexión
├── docs/                        # Documentación técnica y manuales de módulos
├── css/style.css                # Estilos generales
├── index.html                   # Interfaz principal (tabs PWA)
├── manifest.json                # Manifiesto PWA
├── package.json                 # Scripts y dependencias
└── sounds/, icons/              # Recursos estáticos
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

Endpoints principales (base `/api`):

- **Auth**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/solicitar-acceso`, `POST /auth/cambiar-password-obligatorio`.
- **Usuarios/Roles (ADMIN)**: `GET /auth/usuarios`, `GET /usuarios/roles`, `POST /usuarios`, `PUT /usuarios/:id`, `POST /usuarios/:id/desactivar|activar|desbloquear`.
- **Edificios/Cuartos**: `GET /edificios`; `GET /cuartos`; `GET /cuartos/:id`; `PUT /cuartos/:id` (cambio de estado con validación).
- **Mantenimientos/Alertas**: `GET /mantenimientos[?cuarto_id=X]`; `POST /mantenimientos`; `PUT /mantenimientos/:id`; `DELETE /mantenimientos/:id`; `PATCH /mantenimientos/:id/emitir` (marcar alerta emitida).
- **Checklist**: categorías/items/inspecciones (ver `docs/README_CHECKLIST.md`).
- **Tareas**: CRUD y filtros de tareas (ver `docs/README_TAREAS.md`, tabla `tareas` con estados/prioridades).
- **Espacios comunes**: endpoints planificados en `docs/README_ESPACIOS_COMUNES.md` (mismos estados y mantenimientos específicos).
- **Sábanas**: diseñados en `docs/README_SABANAS.md` (esquema `schema_sabanas.sql`).
- **Health**: `GET /health` (estado del servicio y DB).

## 💾 Base de Datos

### PostgreSQL (Central)

- Configuración: `.env` o `.env.local` con `DB_HOST/PORT/NAME/USER/PASSWORD/SSL` o `DATABASE_URL`; `db/config.js` parsea SSL y muestra la config (oculta password).
- Inicialización: `db/schema-postgres-completo.sql` (recomendado). Migraciones adicionales en `db/migration_*.sql` (tareas, checklist, dia_alerta, etc.).
- Auto-migraciones: `db/postgres-manager.js` ejecuta `runMigrations()` al iniciar la API (agrega columnas, roles base, tabla tareas, etc.).
- Seeds de datos estáticos: `db/importar_datos_con_estados.sql` (edificios/cuartos con estados), `db/insertar_restaurante.sql` (espacio común ejemplo), `schema_sabanas.sql` (módulo sábanas).
- Backups: ver `CONFIGURACION_BD.md` para ejemplos de `pg_dump`/`psql`.

### BD Local (Offline)

- Motor: IndexedDB (en navegador). Stores: auth, usuarios, edificios, cuartos, mantenimientos, cache, `sync_queue`.
- Sincronización: las operaciones pendientes se reintentan al recuperar conexión (`storage-helper.processSyncQueue`).

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

- `npm start` → servidor Express local (`js/server.js`).
- `npm run dev` → Express en modo development.
- `npm run vercel:dev` → entorno Vercel local (funciones en `api/`).
- `npm run setup:postgres` → asistente de configuración y `.env` rápido.

## 🔧 Desarrollo

### Debugging

- **Logs**: Revisa la consola del servidor Node.js
- **Base de datos**: Usa `psql` para inspeccionar PostgreSQL
- **PWA**: Usa DevTools (Application → Service Workers/Storage) para revisar Cache/IndexedDB

## 📄 Documentación Adicional

- **[Manual Técnico JW Mantto](./Manual%20T%C3%A9cnico%20JW%20Mantto.md)** - Guía completa por módulos (arquitectura, BD, API, offline).

### 📊 Base de Datos
- **[Esquema BD Completo](./docs/ESQUEMA_BD_COMPLETO.md)** - Documentación detallada del esquema completo v2.0
- **[Diagrama BD Completo](./docs/DIAGRAMA_BD_COMPLETO.md)** - Diagrama visual de relaciones y estructura
- **[Diagrama de Clases](./docs/DIAGRAMA_CLASES.md)** - Diseño orientado a objetos del sistema
- **[README Esquemas](./db/README_ESQUEMAS.md)** - Guía de instalación y uso de esquemas SQL
- [Migración a PostgreSQL](./docs/MIGRACION_POSTGRES.md) - Migración y configuración de PostgreSQL
- [Migración IndexedDB](./docs/MIGRACION_INDEXEDDB.md) y [GUIA_RAPIDA_INDEXEDDB](./docs/GUIA_RAPIDA_INDEXEDDB.md) - Detalles de la base local offline

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

- Exportación a Excel/CSV (mantenimientos, cuartos, edificios, checklist, tareas).
- Endpoints y UI completos para espacios comunes (CRUD + mantenimientos específicos).
- Automatizar cron de alertas (marcar emitidas) y notificaciones push.
- WebSockets/Server-Sent Events para actualización en tiempo real.

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
