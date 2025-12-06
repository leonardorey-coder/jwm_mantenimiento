# Manual Técnico JW Mantto (Esqueleto)

## 1. Introducción y Alcance
- Objetivo: PWA online/offline para gestión operativa de mantenimiento hotelero (habitaciones, espacios comunes, alertas, tareas, checklist y sábanas).
- Componentes: frontend PWA; API Node/Express (serverless en Vercel o servidor tradicional); PostgreSQL central; IndexedDB para modo offline y cola de sincronización.
- Público: desarrolladores (backend/frontend), DevOps (despliegue y DB), administradores funcionales (carga de catálogos estáticos).

## 2. Arquitectura General
- Flujo: Cliente PWA ↔ API REST ↔ PostgreSQL; IndexedDB para persistencia offline; fallback de datos mock en `api/index.js` si PostgreSQL no está disponible.
- Entornos soportados: local (`npm start` puerto 3001), Vercel serverless (funciones en `api/`), producción en servidor/VM con DB en la nube (Neon/Azure/AWS).
- Módulos core: autenticación JWT + refresh, gestión de usuarios/roles, edificios/cuartos, espacios comunes, mantenimientos/alertas, checklist, tareas y sábanas.
- Dependencias clave: `pg` (pool y migraciones auto), `jsonwebtoken`, Service Worker/Cache, IndexedDB (`indexeddb-manager.js`, `storage-helper.js`).

## 3. Preparación del Entorno
- Prerrequisitos: Node 16+, npm, PostgreSQL 13+ (servicio activo).
- Archivos clave: `api/` (funciones serverless), `db/` (schemas y migraciones), `js/` (app y módulos), `docs/` (manuales).
- Variables de entorno (`.env`, `.env.local`): DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL/DB_SSL_REJECT_UNAUTHORIZED, JWT_SECRET/JWT_EXPIRATION/REFRESH_TOKEN_EXPIRATION, PORT.
- Scripts de soporte: `scripts/setup-postgres.sh` (bootstrap .env + npm + creación DB), `scripts/start.sh` (arranque express), `scripts/vercel-setup.sh` (prepara entorno Vercel).
- Pasos rápidos: `cp .env.example .env` → editar credenciales → `npm install` → `psql -U <user> -d <db> -f db/schema-postgres-completo.sql` → `npm start` y probar `/api/health`.

## 4. Base de Datos Central (PostgreSQL)
- Configuración de conexión (`db/config.js`): soporta `DATABASE_URL` (parsea sslmode) o variables individuales; pool ajustable (max/min/idle/timeout); SSL opcional para nube.
- Esquemas disponibles: `db/schema-postgres-completo.sql` (full módulos, recomendado), `db/schema-postgres.sql` (básico edificios/cuartos/mantenimientos), `db/esquema_postgres_2025-11-11.sql` (histórico básico). Usar completo para ambientes nuevos; usar migraciones para BD existente.
- Migraciones/utilidades: `migration_*` (ej. `migration_dia_alerta_to_date.sql`, `migration_tareas_tab.sql`, `migration_checklist_schema.sql`), `mejora_usuarios_sesiones.sql` (auth/roles), `importar_datos_con_estados.sql` (seed cuartos/edificios con estados), `insertar_restaurante.sql` (espacios comunes), `schema_sabanas.sql` (módulo sábanas).
- Provisionamiento inicial paso a paso:
  1) Crear DB (`createdb jwmantto` o `psql -c "CREATE DATABASE jwmantto;"`).
  2) Aplicar esquema completo: `psql -U <user> -d jwmantto -f db/schema-postgres-completo.sql`.
  3) Ejecutar migraciones si vienes de versión previa: `psql -f db/migration_tareas_tab.sql`, `db/migration_checklist_schema.sql`, etc.
  4) Verificar con consultas rápidas: `\dt`, `SELECT * FROM configuracion_estados;`, `SELECT * FROM vista_cuartos_completa LIMIT 5;`, `SELECT * FROM vista_mantenimientos_completa LIMIT 5;`.
- **Datos estáticos (edificios, espacios, roles, estados)**:
  - Roles y permisos: `PostgresManager.runMigrations()` inserta ADMIN/SUPERVISOR/TECNICO si faltan. Verificar con `SELECT * FROM roles;`.
  - Estados con colores: vienen en `configuracion_estados` desde el esquema completo; si se editan, asegurar consistencia con UI (colores/hex/icono).
  - Edificios y cuartos: cargar con `db/importar_datos_con_estados.sql` (incluye `estado_aleatorio()` y `setval`). Para ediciones manuales: `INSERT INTO edificios (nombre, descripcion) VALUES ('Alfa','Principal') ON CONFLICT (nombre) DO NOTHING;` Ajustar secuencia: `SELECT setval('edificios_id_seq',(SELECT MAX(id) FROM edificios));`.
  - Espacios comunes: usar `db/insertar_restaurante.sql` como ejemplo; verificar vista `vista_espacios_comunes_completa`.
  - Sábanas/checklist/tareas: crear registros base con sus scripts (`schema_sabanas.sql`, seeds de checklist si aplican). Mantener integridad referencial (FK a usuarios/edificios).
  - Buenas prácticas para datos “en frío”: ejecutar en transacción (`BEGIN; ... COMMIT;`), usar `ON CONFLICT` para catálogos, respetar unicidad `edificios.nombre` y `cuartos (numero, edificio_id)`, actualizar vistas si se recrean tablas.
- Operación y mantenimiento:
  - Backups/restauración: ver `CONFIGURACION_BD.md`; `pg_dump -U <user> -d jwmantto -F p -f db/backup_jwmantto_<fecha>.sql`; restaurar con `psql -f`.
  - Troubleshooting: si columna `dia_alerta` sigue en INTEGER, correr `migration_dia_alerta_to_date.sql` o dejar que `runMigrations()` lo haga. Revisar `/api/health` para estado DB (`database: connected|disconnected`).
  - Performance y pool: ajustar `DB_POOL_MAX/MIN` según carga; habilitar `DB_SSL=true` en nube con `DB_SSL_REJECT_UNAUTHORIZED` según proveedor.

## 5. Base de Datos Offline (IndexedDB)
- Objetivo: operar 100% offline con persistencia local y sincronización diferida al recuperar conectividad.
- Stores principales (`indexeddb-manager.js`): `auth`, `usuarios`, `edificios`, `cuartos`, `mantenimientos`, `cache`, `sync_queue` (cola de operaciones), índices por `id`, `estado`, `dia_alerta`, etc.
- Flujo: acciones CRUD agregan operaciones a `sync_queue` cuando no hay red; al volver online, `storage-helper.processSyncQueue(apiBaseUrl)` reintenta contra la API y marca completadas.
- Mantenimiento: limpiar datos caducos con `cleanExpiredCache`; para reset local, vaciar stores o usar opción de limpieza en devtools Application → IndexedDB. Capacidad típica 50+ MB por navegador; requiere permisos de almacenamiento persistente si aplica.
- Nota histórica: existe modo Electron/SQLite legacy (`docs/README_OFFLINE.md`); la arquitectura actual prioriza PWA + IndexedDB y sincronización con PostgreSQL.

## 6. Backend / API REST (Node/Express serverless)
- Entrypoint `api/index.js`: CORS abierto, JSON body parser, inicialización lazy de `PostgresManager` (auto-run de `createTables` + `runMigrations`), fallback de datos mock si no hay DB.
- Autenticación y seguridad:
  - JWT/refresh (`api/auth.js`, `api/auth-routes.js`); middlewares `verificarAutenticacion`, `verificarAdmin`, `verificarSupervisor`.
  - Estados de sesión obligatoria, bloqueo y cambio de contraseña forzado (`requiere_cambio_password` verificado en frontend y endpoint `/api/auth/cambiar-password-obligatorio`).
- Dominios de API (permisos):
  - Auth: login/refresh/logout/me/contacto/solicitar-acceso/cambiar-password-obligatorio.
  - Usuarios/Roles (solo ADMIN): `/api/auth/usuarios`, `/api/usuarios/roles`, alta/edición, desactivar/activar/desbloquear (`mapUsuarioErrorStatus` maneja 400/404/409).
  - Edificios y cuartos: `/api/edificios`, `/api/cuartos`, `/api/cuartos/:id` (PUT estado con validación `disponible|ocupado|mantenimiento|fuera_servicio`).
  - Mantenimientos/alertas: CRUD `/api/mantenimientos`; `dia_alerta` DATE y `hora` TIME; reset de `alerta_emitida` al cambiar fecha/hora; marca automática de alertas pasadas (`marcarAlertasPasadasComoEmitidas`).
  - Espacios comunes: plan/guía en `docs/README_ESPACIOS_COMUNES.md` (mismos estados y mantenimientos específicos).
  - Tareas: tabla `tareas` (estados `pendiente|en_progreso|completada|cancelada`, prioridades `baja|media|alta|urgente`); ver `db/migration_tareas_tab.sql` y `docs/README_TAREAS.md`.
  - Checklist: categorías/items e inspecciones; migración `migration_checklist_schema.sql`; API documentada en `docs/README_CHECKLIST.md`.
  - Sábanas: endpoints planeados en `docs/README_SABANAS.md` con esquema `schema_sabanas.sql`.
  - Alertas emitidas y pendientes: métodos `getMantenimientosPendientesAlerta`, `getAlertasEmitidas` (comparación TZ America/Mazatlan).
- Errores: uso de validaciones server-side, status mapping para usuarios, logs detallados en consola. Fallback mock para edificios/cuartos/usuarios cuando DB no está disponible.

## 7. Frontend PWA
- Estructura: `index.html` + `css/style.css` + `js/app.js`; manifest PWA + service worker para cache. Carga condicional de módulos (habitaciones, espacios, checklist, tareas, sábanas).
- Estado/Helpers: `AppState` (usuario, tab actual, catálogos, filtros), `fetchWithAuth` (gestiona tokens y refresh), `applyRolePermissions` (muestra/oculta `.admin-only`/`.supervisor-only`), `initializeTheme` (tema light/dark), `logout`.
- Tabs y módulos:
  - Habitaciones/Edificios: grid con estados y colores (`getConfiguracionEstados`), filtros y métricas; actualización de estado vía API PUT.
  - Espacios comunes: tarjetas con paginación y filtros por edificio/estado/tipo; mantenimientos asociados.
  - Mantenimientos/Alertas: creación tipo normal/rutina con `dia_alerta`/`hora`/`prioridad`; panel de alertas recientes y emisión.
  - Checklist: categorías/items, paginación por edificio/cuarto, estados Bueno/Regular/Malo, progreso; usa API checklist.
  - Tareas: tarjetas con servicios múltiples, timeline y modales; estados/prioridades y asignación de responsables.
  - Sábanas: tabla lazy (lotes de 30), marcado de servicios con timestamp, observaciones e historial.
  - Usuarios/Roles: tab admin para CRUD, activación/bloqueo, asignación de roles.
- UX y permisos: rol ADMIN/SUPERVISOR/TECNICO modifica visibilidad y acciones; skeletons para carga inicial; tema claro/oscuro persistido.
- Offline: sincronización con IndexedDB para datos base y cola de operaciones; reintentos automáticos; fallback a mock si no hay DB server (limitado).

## 8. Seguridad y Cumplimiento
- Tokens: guardados en localStorage o sessionStorage según “recordarme”; refresh automático en 401; limpieza en logout o fallo de refresh.
- Roles/permisos: ADMIN (todo, usuarios/exportar), SUPERVISOR (reportes/exportar, sin usuarios), TECNICO (operativo sin exportar ni usuarios). UI respeta roles.
- Datos sensibles: no versionar `.env`; usar HTTPS y `DB_SSL=true` en nube; rotar `JWT_SECRET`; proteger backups.
- Auditoría/soporte: usuario admin de contacto definido en `docs/README_JWT_AUTH.md`; sesiones y bloqueos gestionados en DB.

## 9. Despliegue y Operaciones
- Local: `npm start` (puerto 3001), `npm run dev` si existe script, `npm run vercel:dev` para emular serverless. Ver `/api/health`.
- Vercel: seguir `README_VERCEL.md`; funciones en `api/` expuestas como endpoints; configurar env vars en dashboard (DATABASE_URL, JWT_SECRET, NODE_ENV=production).
- DB en nube: ver `docs/CONFIGURACION_NEON.md` y `docs/MIGRACION_POSTGRES.md`; usar `DB_SSL=true` y certificados según proveedor; ejecutar `schema-postgres-completo.sql` remoto.
- Monitoreo: healthcheck `/api/health`; logs de Vercel/servidor; revisar conexión DB y migraciones automáticas en arranque.
- Jobs: `marcarAlertasPasadasComoEmitidas` puede ejecutarse programado (cron externo) o en flujo de API según necesidad.

## 10. Datos de Ejemplo y Carga Inicial
- Cuartos/Edificios: `psql -f db/importar_datos_con_estados.sql` (incluye estados aleatorios y `setval`).
- Espacios comunes: usar `db/insertar_restaurante.sql` como plantilla; luego `SELECT * FROM vista_espacios_comunes_completa;`.
- Roles/Usuarios: `runMigrations()` inserta roles base; para admin inicial ver `db/README_USUARIOS_SESIONES.md` (usuario/contraseña de arranque, pgcrypto).
- Sábanas/Checklist/Tareas: aplicar `schema_sabanas.sql` y seeds correspondientes; checklist tiene `migration_checklist_schema.sql`; tareas vía `migration_tareas_tab.sql` con inserts opcionales.
- Verificación: conteos `SELECT COUNT(*) FROM edificios/cuarts/espacios_comunes/mantenimientos/tareas/checklists;`; probar API `/api/edificios`, `/api/cuartos`, `/api/mantenimientos`.

## 11. Pruebas y QA
- Manuales: login/refresh/logout; CRUD cuartos y cambios de estado; mantenimientos normal/rutina con emisión de alertas; checklist (crear/consultar); tareas (crear/editar/asignar); sábanas (marcar servicio); usuarios (alta/baja/bloqueo).
- Offline: desconectar red, crear/editar registros, verificar persistencia en IndexedDB y reintento al reconectar.
- Smoke API: usar curl/Postman con token para `/api/edificios`, `/api/cuartos`, `/api/mantenimientos`, `/api/usuarios` (admin), `/api/health`.
- Roles/UX: validar visibilidad `.admin-only` y `.supervisor-only`; probar tema light/dark.

## 12. Soporte y Troubleshooting
- Errores comunes: DB no disponible → revisar env/servicio y `/api/health`; token expirado → refrescar/rehacer login; CORS (ya abierto) verificar headers en cliente; puerto 3001 ocupado → matar proceso (`lsof -ti:3001 | xargs kill -9`).
- Rotaciones: cambiar contraseña admin en DB y notificar; rotar `JWT_SECRET` implica invalidar tokens activos (forzar relogin).
- Limpieza local: borrar caches y IndexedDB desde DevTools o usar helper de limpieza si existe; relanzar app.
- Acceso/soporte: usar `/api/auth/solicitar-acceso` y contacto admin documentado en `docs/README_JWT_AUTH.md`.

## 13. Anexos
- Diagramas: `docs/DIAGRAMA_BD_COMPLETO.md`, `docs/ESQUEMA_BD_COMPLETO.md`, `docs/RESUMEN_APIS_VISUAL.md`.
- Glosario sugerido: entidades (usuarios, roles, edificios, cuartos, espacios_comunes, mantenimientos, tareas, checklist, sábanas) y estados/colores.
- Histórico de cambios: `MIGRACION_INDEXEDDB_RESUMEN.md`, `CAMBIOS_API_MODULAR.md`, `CAMBIOS_ESPACIOS_COMUNES.md`, `CAMBIOS_FRONTEND_APLICADOS.md`.
