# Manual Técnico JW Mantto

## 1. Introducción y Alcance

JW Mantto es una PWA para la operación de mantenimiento hotelero con soporte online/offline. Cubre habitaciones, espacios comunes, mantenimientos (normal/rutina), alertas programadas, checklist de inspecciones, tareas, sábanas y gestión de usuarios/roles.

- Componentes: frontend PWA, API Node/Express (serverless en Vercel o servidor tradicional), base central PostgreSQL, persistencia offline en IndexedDB.
- Público: desarrolladores (frontend/backend), DevOps/Infra (DB y despliegue), administradores funcionales (carga de catálogos estáticos y control de acceso).

## 2. Arquitectura General

- Flujo: Cliente PWA ↔ API REST ↔ PostgreSQL. IndexedDB almacena datos offline y cola de sincronización. Si la DB no está disponible, la API expone datos mock mínimos (`api/index.js`).
- Entornos: local (`npm start` puerto 3001), serverless Vercel (`api/`), producción en servidor/VM con DB en la nube (Neon/Azure/AWS).
- Módulos: auth JWT + refresh, usuarios/roles, edificios/cuartos, espacios comunes, mantenimientos/alertas, checklist, tareas, sábanas.
- Dependencias clave: `pg` (pool + migraciones auto), `jsonwebtoken`, Service Worker/Cache, IndexedDB (`indexeddb-manager.js`, `storage-helper.js`).

## 3. Preparación del Entorno

### 3.1 Prerrequisitos

- Node 16+ y npm.
- PostgreSQL 13+ corriendo y accesible.

### 3.2 Archivos relevantes

- API: `api/index.js`, `api/auth.js`, `api/auth-routes.js`.
- DB: `db/config.js`, `db/postgres-manager.js`, `db/schema-postgres-completo.sql`, migraciones `db/migration_*.sql`.
- Frontend: `index.html`, `css/style.css`, `js/app.js`, módulos en `views/`.
- Documentación: `docs/` (API, módulos, migraciones, diagramas).

### 3.3 Variables de entorno (`.env` / `.env.local`)

- DB: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`.
- JWT: `JWT_SECRET`, `JWT_EXPIRATION`, `REFRESH_TOKEN_EXPIRATION`.
- App: `PORT` (3001 por defecto), `NODE_ENV`.
- Alternativa: `DATABASE_URL` (parsing automático de SSL).

### 3.4 Arranque rápido

```bash
cp .env.example .env        # editar credenciales
npm install
psql -U <user> -d <db> -f db/schema-postgres-completo.sql
npm start                   # abrir http://localhost:3001 y /api/health
```

### 3.5 Scripts útiles

- `scripts/setup-postgres.sh`: crea `.env`, instala npm, crea DB.
- `scripts/vercel-setup.sh`: prepara entorno para Vercel.
- `scripts/start.sh`: arranque express local.

## 4. Base de Datos Central (PostgreSQL)

### 4.1 Configuración

- `db/config.js` soporta `DATABASE_URL` o variables individuales; pool ajustable (max/min/idle/timeout); SSL opcional para nube.
- Mostrar config y validar en logs (`validateConfig`, `displayConfig`).

### 4.2 Esquemas disponibles

- `db/schema-postgres-completo.sql` (recomendado): usuarios/roles, edificios/cuartos, espacios comunes, mantenimientos, checklist, tareas, sábanas, vistas y funciones.
- `db/schema-postgres-completo-2025-12-04.sql`: igual que el completo pero con datos iniciales listos (roles, admin Fidel, edificios, espacios comunes y cuartos completos con estados).
- `db/schema-postgres.sql` / `db/esquema_postgres_2025-11-11.sql`: básicos (edificios, cuartos, mantenimientos).
- Migraciones complementarias: `migration_dia_alerta_to_date.sql`, `migration_tareas_tab.sql`, `migration_checklist_schema.sql`, `mejora_usuarios_sesiones.sql`.

### 4.3 Provisionamiento paso a paso

1. Crear la base: `createdb jwmantto` o `psql -c "CREATE DATABASE jwmantto;"`.
2. Aplicar esquema completo: `psql -U <user> -d jwmantto -f db/schema-postgres-completo.sql`.
3. Migrar si vienes de versión previa: ejecutar `db/migration_*.sql` necesarios.
4. Verificar: `\dt`, `SELECT * FROM configuracion_estados;`, `SELECT * FROM vista_cuartos_completa LIMIT 5;`, `SELECT * FROM vista_mantenimientos_completa LIMIT 5;`.

### 4.4 Datos estáticos (edificios, espacios, roles, estados)

- Roles/permisos: `PostgresManager.runMigrations()` inserta ADMIN/SUPERVISOR/TECNICO si faltan. Verificar con `SELECT * FROM roles;`.
- Estados con colores: vienen precargados en `configuracion_estados`; mantener consistencia con UI (colores/hex/icono).
- Edificios y cuartos:
  - Semilla rápida: `psql -f db/importar_datos_con_estados.sql` (usa función `estado_aleatorio()` y ajusta secuencias).
  - Inserción manual: `INSERT INTO edificios (nombre, descripcion) VALUES ('Alfa','Principal') ON CONFLICT (nombre) DO NOTHING;`
  - Ajustar secuencia tras inserts manuales: `SELECT setval('edificios_id_seq',(SELECT MAX(id) FROM edificios));`
- Espacios comunes:
  - Ejemplo: `db/insertar_restaurante.sql` (restaurante en edificio Alfa). Reutilizar como plantilla para otros espacios.
  - Consultar vista: `SELECT * FROM vista_espacios_comunes_completa;`.
- Sábanas/checklist/tareas:
  - `db/schema_sabanas.sql` crea tablas de sábanas.
  - `migration_checklist_schema.sql` para checklist (categorías/items/inspecciones).
  - `migration_tareas_tab.sql` para tareas (estados y prioridades).

### 4.5 Buenas prácticas al editar “en frío”

- Ejecutar en transacción (`BEGIN; ... COMMIT;`).
- Usar `ON CONFLICT` en catálogos (roles, estados, edificios).
- Respetar unicidad: `edificios.nombre`, `cuartos (numero, edificio_id)`.
- Mantener integridad: FK activos (`cuarto_id`, `edificio_id`, `usuario_asignado_id`, etc.).
- Si se recrean tablas, revisar vistas dependientes (`DROP VIEW ... CASCADE` y recrear).

### 4.6 Backups y restauración

- Backup: `pg_dump -U <user> -d jwmantto -F p -f db/backup_jwmantto_$(date +%F_%H-%M).sql`
- Restaurar: `psql -U <user> -d jwmantto -f db/backup_jwmantto_<fecha>.sql`
- Referencia local: `CONFIGURACION_BD.md` (ejemplo de conexión y backup).

### 4.7 Troubleshooting DB

- Columna `dia_alerta` en INTEGER: aplicar `migration_dia_alerta_to_date.sql` o dejar que `runMigrations()` lo haga.
- DB no disponible: revisar servicio/credenciales/SSL; `/api/health` expone estado `database: connected|disconnected`.
- Pool: ajustar `DB_POOL_MAX/MIN` según carga; en nube habilitar `DB_SSL=true` y `DB_SSL_REJECT_UNAUTHORIZED` según proveedor.

## 5. Base de Datos Offline (IndexedDB)

### 5.1 Diseño

- Stores principales (`indexeddb-manager.js`): `auth`, `usuarios`, `edificios`, `cuartos`, `mantenimientos`, `cache`, `sync_queue`.
- Índices: por `id`, `estado`, `dia_alerta`, etc. (ver `docs/MIGRACION_INDEXEDDB.md` y `docs/GUIA_RAPIDA_INDEXEDDB.md`).

### 5.2 Flujo de sincronización

- En offline, las operaciones CRUD se guardan en stores y en `sync_queue`.
- Al recuperar conectividad, `storage-helper.processSyncQueue(apiBaseUrl)` reintenta las operaciones contra la API y marca completadas.
- Estrategia de conflictos: última escritura confirmada por servidor gana (se puede ajustar en cliente).

### 5.3 Mantenimiento

- Limpiar caché expirada: `cleanExpiredCache`.
- Reset local: borrar stores desde DevTools (Application → IndexedDB) o limpiar vía helper si existe.
- Capacidad: típicamente 50+ MB por navegador; solicitar almacenamiento persistente si aplica.
- Nota legacy: existe modo Electron/SQLite (`docs/README_OFFLINE.md`), pero la arquitectura vigente usa PWA + IndexedDB + PostgreSQL.

## 6. Backend / API REST (Node/Express serverless)

### 6.1 Entrypoint y middleware

- `api/index.js`: CORS abierto, `express.json/urlencoded`, inicialización perezosa de `PostgresManager` (crea tablas básicas y ejecuta migraciones).
- Si no hay DB, responde con datos mock para edificios/cuartos/usuarios.

### 6.2 Autenticación y seguridad

- JWT + refresh (`api/auth.js`, `api/auth-routes.js`).
- Middlewares: `verificarAutenticacion`, `verificarAdmin`, `verificarSupervisor`.
- Cambio de contraseña obligatorio: `requiere_cambio_password` verificado en frontend y endpoint `/api/auth/cambiar-password-obligatorio`.

### 6.3 Endpoints principales (resumen)

- Auth: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/auth/contacto-admin`, `POST /api/auth/solicitar-acceso`, `POST /api/auth/cambiar-password-obligatorio`.
- Usuarios/Roles (ADMIN): `GET /api/auth/usuarios`, `GET /api/usuarios/roles`, `POST /api/usuarios`, `PUT /api/usuarios/:id`, `POST /api/usuarios/:id/desactivar`, `/activar`, `/desbloquear`.
- Edificios/Cuartos: `GET /api/edificios`; `GET /api/cuartos`; `GET /api/cuartos/:id`; `PUT /api/cuartos/:id` (estado válido: disponible|ocupado|mantenimiento|fuera_servicio).
- Mantenimientos/Alertas: `GET /api/mantenimientos[?cuarto_id=X]`; `POST /api/mantenimientos`; `PUT /api/mantenimientos/:id`; `DELETE /api/mantenimientos/:id`; `PATCH /api/mantenimientos/:id/emitir`. Lógica de `dia_alerta` DATE y `alerta_emitida` con TZ America/Mazatlan.
- Espacios comunes: plan en `docs/README_ESPACIOS_COMUNES.md` (mismos estados y mantenimientos específicos).
- Tareas: tabla `tareas` (estados `pendiente|en_progreso|completada|cancelada`, prioridades `baja|media|alta|urgente`), ver `db/migration_tareas_tab.sql` y `docs/README_TAREAS.md`.
- Checklist: categorías/items/inspecciones (`migration_checklist_schema.sql`, `docs/README_CHECKLIST.md`).
- Sábanas: endpoints planeados en `docs/README_SABANAS.md` y esquema `schema_sabanas.sql`.
- Health: `GET /api/health` (status y DB).

### 6.4 Errores y validaciones

- `mapUsuarioErrorStatus` mapea 400/404/409 según validaciones o duplicados (23505).
- Validación de estados de cuartos y prioridades/estados de mantenimientos.
- Logs en consola para diagnósticos; fallback mock cuando no hay DB.

## 7. Frontend PWA

### 7.1 Estructura

- Base: `index.html`, `css/style.css`, `js/app.js`, `manifest.json`, `sw.js`.
- Módulos en `views/` (tareas, checklist, usuarios) y JS auxiliares.

### 7.2 Estado y utilidades

- `AppState`: usuario actual, tab activo, catálogos, filtros, paginación, checklist filtradas, inspecciones recientes.
- `fetchWithAuth`: añade token y refresca en 401; redirige a login en fallo.
- `applyRolePermissions`: controla `.admin-only` y `.supervisor-only`.
- `initializeTheme`, `logout`, `loadInitialData`, `loadTabData`.

### 7.3 Módulos funcionales

- Habitaciones/Edificios: grid con colores de estado (`getConfiguracionEstados`), métricas y filtros; cambio de estado vía API.
- Espacios comunes: tarjetas con filtros por edificio/estado/tipo y mantenimientos asociados.
- Mantenimientos/Alertas: creación normal o rutina con `dia_alerta`/`hora`/`prioridad`; panel de alertas recientes; reseteo de `alerta_emitida` si cambia fecha/hora.
- Checklist: categorías/items, estados Bueno/Regular/Malo, filtros por edificio/cuarto/categoría/estado, progreso y paginación.
- Tareas: tarjetas con servicios múltiples, prioridades, timeline y modales de edición/asignación.
- Sábanas: tabla lazy (lotes de 30), marcado de servicios con timestamp, observaciones, historial.
- Usuarios/Roles: CRUD admin, activación/bloqueo/desbloqueo, asignación de roles.

### 7.4 Offline y UX

- IndexedDB para datos base y cola de operaciones; reintento automático.
- Skeletons y loaders en tabs; tema claro/oscuro persistido; visibilidad condicionada por rol.

## 8. Seguridad y Cumplimiento

- Tokens en localStorage o sessionStorage según “recordarme”; refresh automático; limpieza en logout o fallo de refresh.
- Roles: ADMIN (todo, usuarios/exportar), SUPERVISOR (reportes/exportar, sin usuarios), TECNICO (operativo sin exportar ni usuarios).
- Protección de secretos: no versionar `.env`; usar HTTPS y `DB_SSL=true` en nube; rotar `JWT_SECRET`; proteger backups.
- Contacto admin y soporte documentado en `docs/README_JWT_AUTH.md`.

## 9. Despliegue y Operaciones

### 9.1 Local

- `npm start` (3001) o `npm run vercel:dev` para emular serverless. Revisar `/api/health`.

### 9.2 Vercel

- Seguir `README_VERCEL.md`; funciones en `api/` expuestas como endpoints.
- Configurar env vars en dashboard (DATABASE_URL, JWT_SECRET, NODE_ENV=production, etc.).

### 9.3 DB en la nube

- Ver `docs/CONFIGURACION_NEON.md` y `docs/MIGRACION_POSTGRES.md`.
- Usar `DB_SSL=true` y ajustar `DB_SSL_REJECT_UNAUTHORIZED` según proveedor; aplicar `schema-postgres-completo.sql` remoto.

### 9.4 Monitoreo y jobs

- Healthcheck: `/api/health`.
- Logs: Vercel o servidor; revisar mensajes de inicialización de DB/migraciones.
- Jobs: programar ejecución de `marcarAlertasPasadasComoEmitidas` (cron externo) si se requiere fuera de flujo interactivo.

## 10. Datos de Ejemplo y Carga Inicial

- Cuartos/Edificios: `psql -f db/importar_datos_con_estados.sql` (estados aleatorios + `setval`).
- Espacios comunes: usar `db/insertar_restaurante.sql` como plantilla; luego `SELECT * FROM vista_espacios_comunes_completa;`.
- Roles/Usuarios: `runMigrations()` inserta roles base; para admin inicial ver `db/README_USUARIOS_SESIONES.md` (crea usuario y hash vía pgcrypto).
- Sábanas/Checklist/Tareas: aplicar `schema_sabanas.sql`, `migration_checklist_schema.sql`, `migration_tareas_tab.sql`; agregar seeds propios según operación.
- Verificación post-carga: conteos `SELECT COUNT(*) FROM edificios/cuarto...` y pruebas de API `/api/edificios`, `/api/cuartos`, `/api/mantenimientos`.

## 11. Pruebas y QA

- Manuales: login/refresh/logout; CRUD cuartos y cambio de estado; mantenimientos normal/rutina con alertas; checklist (crear/consultar); tareas (crear/editar/asignar); sábanas (marcar servicio); usuarios (alta/baja/bloqueo).
- Offline: desconectar red, crear/editar registros, verificar persistencia en IndexedDB y reintento al reconectar.
- Smoke API (curl/Postman con JWT): `/api/edificios`, `/api/cuartos`, `/api/mantenimientos`, `/api/usuarios` (admin), `/api/health`.
- Roles/UX: validar visibilidad `.admin-only` y `.supervisor-only`; probar tema light/dark.

## 12. Soporte y Troubleshooting

- DB no disponible: revisar servicio/env/SSL y `/api/health`; si falla, la API usa mock (solo para dev).
- Token expirado: refrescar o relogin; limpiar storage si hay inconsistencia.
- CORS: ya abierto en `api/index.js`; verificar headers en cliente si se usan dominios distintos.
- Puerto ocupado: `lsof -ti:3001 | xargs kill -9`.
- Rotación: cambiar contraseña admin en DB; rotar `JWT_SECRET` invalida sesiones (forzar relogin).
- Limpieza local: borrar cache/IndexedDB desde DevTools o helper de limpieza si disponible.

## 13. Anexos

- Diagramas: `docs/DIAGRAMA_BD_COMPLETO.md`, `docs/ESQUEMA_BD_COMPLETO.md`, `docs/RESUMEN_APIS_VISUAL.md`.
- Glosario sugerido: entidades (usuarios, roles, edificios, cuartos, espacios_comunes, mantenimientos, tareas, checklist, sábanas) y estados/colores.
- Histórico de cambios: `MIGRACION_INDEXEDDB_RESUMEN.md`, `CAMBIOS_API_MODULAR.md`, `CAMBIOS_ESPACIOS_COMUNES.md`, `CAMBIOS_FRONTEND_APLICADOS.md`.
