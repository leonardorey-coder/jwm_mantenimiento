# Migración de SQLite a PostgreSQL - JW Mantto

Este documento proporciona instrucciones detalladas para migrar el sistema JW Mantto de SQLite a PostgreSQL, permitiendo el uso tanto en entornos locales como en la nube.

## 📋 Tabla de Contenidos

- [¿Por qué PostgreSQL?](#por-qué-postgresql)
- [Requisitos Previos](#requisitos-previos)
- [Configuración Local](#configuración-local)
- [Configuración en la Nube](#configuración-en-la-nube)
- [Migración de Datos](#migración-de-datos)
- [Solución de Problemas](#solución-de-problemas)

## ¿Por qué PostgreSQL?

PostgreSQL ofrece varias ventajas sobre SQLite para este proyecto:

- ✅ **Acceso concurrente**: Múltiples usuarios pueden conectarse simultáneamente
- ✅ **Escalabilidad**: Mejor rendimiento con grandes volúmenes de datos
- ✅ **Flexibilidad**: Puede ejecutarse tanto en local como en la nube
- ✅ **Características avanzadas**: Mejor manejo de transacciones, índices, y tipos de datos
- ✅ **Cloud-ready**: Compatible con Azure, AWS, Heroku, Railway, etc.

## 📦 Requisitos Previos

### Para desarrollo local:

1. **Node.js** (versión 14 o superior)
2. **PostgreSQL** instalado localmente

#### Instalación de PostgreSQL en macOS:

```bash
# Usando Homebrew
brew install postgresql@15

# Iniciar el servicio
brew services start postgresql@15

# Verificar instalación
psql --version
```

#### Instalación de PostgreSQL en Windows:

1. Descargar el instalador desde [postgresql.org](https://www.postgresql.org/download/windows/)
2. Ejecutar el instalador y seguir los pasos
3. Recordar la contraseña del usuario `postgres`

#### Instalación de PostgreSQL en Linux (Ubuntu/Debian):

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Iniciar el servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 🔧 Configuración Local

### 1. Instalar dependencias de Node.js

```bash
npm install
```

Esto instalará las nuevas dependencias:

- `pg` - Driver de PostgreSQL para Node.js
- `dotenv` - Gestión de variables de entorno

### 2. Crear la base de datos

```bash
# Conectarse a PostgreSQL (macOS/Linux)
psql postgres

# En Windows, usar pgAdmin o:
psql -U postgres
```

Dentro de la consola de PostgreSQL:

```sql
-- Crear base de datos
CREATE DATABASE jwmantto;

-- Crear usuario (opcional, si no quieres usar el usuario postgres)
CREATE USER jwmantto_user WITH PASSWORD 'tu_password_seguro';

-- Dar permisos al usuario
GRANT ALL PRIVILEGES ON DATABASE jwmantto TO jwmantto_user;

-- Salir
\q
```

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y edítalo con tus credenciales:

```bash
cp .env.example .env
```

Edita el archivo `.env`:

```env
# Configuración PostgreSQL Local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jwmantto
DB_USER=postgres
DB_PASSWORD=tu_password
DB_SSL=false

# Puerto de la aplicación
PORT=3001
NODE_ENV=development
```

### 4. Crear el esquema de base de datos

```bash
# Conectarse a la base de datos
psql -U postgres -d jwmantto

# Ejecutar el esquema
\i db/schema-postgres.sql

# Verificar que las tablas se crearon
\dt

# Salir
\q
```

O puedes ejecutarlo directamente:

```bash
psql -U postgres -d jwmantto -f db/schema-postgres.sql
```

### 5. Iniciar la aplicación

```bash
npm start
```

La aplicación se conectará automáticamente a PostgreSQL y estará lista para usar.

## ☁️ Configuración en la Nube

PostgreSQL puede desplegarse en varios proveedores de nube. A continuación se muestran las configuraciones para los más populares:

### Azure Database for PostgreSQL

1. **Crear el servicio en Azure Portal**:
   - Ir a "Create a resource" → "Databases" → "Azure Database for PostgreSQL"
   - Seleccionar "Flexible Server"
   - Configurar el servidor y crear la base de datos

2. **Configurar firewall**:
   - En "Connection security", agregar tu IP o permitir servicios de Azure

3. **Configurar variables de entorno**:

```env
DB_HOST=tu-servidor.postgres.database.azure.com
DB_PORT=5432
DB_NAME=jwmantto
DB_USER=tu_usuario@tu-servidor
DB_PASSWORD=tu_password_seguro
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

4. **Ejecutar el esquema**:

```bash
psql "host=tu-servidor.postgres.database.azure.com port=5432 dbname=jwmantto user=tu_usuario@tu-servidor password=tu_password sslmode=require" -f db/schema-postgres.sql
```

### AWS RDS PostgreSQL

1. **Crear instancia RDS**:
   - Ir a RDS Console → "Create database"
   - Seleccionar PostgreSQL
   - Configurar la instancia

2. **Configurar Security Group**:
   - Permitir tráfico en el puerto 5432 desde tu IP

3. **Configurar variables de entorno**:

```env
DB_HOST=tu-instancia.abc123.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=jwmantto
DB_USER=postgres
DB_PASSWORD=tu_password_seguro
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

### Heroku Postgres

1. **Crear aplicación y agregar addon**:

```bash
heroku create tu-app
heroku addons:create heroku-postgresql:mini
```

2. **Obtener credenciales**:

```bash
heroku config:get DATABASE_URL
```

3. **Modificar config.js** para soportar `DATABASE_URL`:

```javascript
// Si existe DATABASE_URL (Heroku), usarla
if (process.env.DATABASE_URL) {
  const { parse } = require('pg-connection-string');
  const config = parse(process.env.DATABASE_URL);
  dbConfig.host = config.host;
  dbConfig.port = config.port;
  dbConfig.database = config.database;
  dbConfig.user = config.user;
  dbConfig.password = config.password;
  dbConfig.ssl = { rejectUnauthorized: false };
}
```

### Railway / Render

Estos servicios suelen proporcionar las credenciales automáticamente:

1. **Crear proyecto y agregar PostgreSQL**
2. **Copiar las variables de entorno** proporcionadas
3. **Configurar el archivo .env**:

```env
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=contraseña_generada
DB_SSL=true
```

## 🔄 Migración de Datos

Si ya tienes datos en SQLite y quieres migrarlos a PostgreSQL:

### 1. Asegúrate de tener ambas bases de datos configuradas

- SQLite: Archivo existente en `db/jwmantto.db`
- PostgreSQL: Base de datos configurada y con esquema creado

### 2. Ejecutar el script de migración

```bash
# Migración básica (preserva datos existentes en PostgreSQL)
node scripts/migrate-sqlite-to-postgres.js

# Migración limpia (borra datos existentes en PostgreSQL primero)
node scripts/migrate-sqlite-to-postgres.js --clean
```

### 3. Verificar la migración

```bash
# Conectarse a PostgreSQL
psql -U postgres -d jwmantto

# Verificar cantidad de registros
SELECT 'edificios' as tabla, COUNT(*) FROM edificios
UNION ALL
SELECT 'cuartos', COUNT(*) FROM cuartos
UNION ALL
SELECT 'mantenimientos', COUNT(*) FROM mantenimientos;

# Salir
\q
```

## 🐛 Solución de Problemas

### Error: "password authentication failed"

**Solución**: Verifica que el usuario y contraseña en `.env` sean correctos.

```bash
# Resetear contraseña en PostgreSQL
psql postgres
ALTER USER postgres WITH PASSWORD 'nueva_password';
\q
```

### Error: "database does not exist"

**Solución**: Crear la base de datos manualmente:

```bash
psql postgres
CREATE DATABASE jwmantto;
\q
```

### Error: "Connection timeout"

**Solución**:

- Verifica que PostgreSQL esté corriendo: `brew services list` (macOS)
- Verifica el puerto: `lsof -i :5432`
- Ajusta `DB_CONNECTION_TIMEOUT` en `.env`

### Error: "SSL connection required"

**Solución**: Si tu servidor PostgreSQL requiere SSL:

```env
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

Para desarrollo local sin SSL:

```env
DB_SSL=false
```

### Error: "too many clients"

**Solución**: Reducir el tamaño del pool en `.env`:

```env
DB_POOL_MAX=10
DB_POOL_MIN=2
```

### La aplicación sigue usando SQLite

**Solución**: Verifica que estés usando el gestor correcto en `server.js`:

```javascript
const PostgresManager = require('./db/postgres-manager');
```

No:

```javascript
const DatabaseManager = require('./db/better-sqlite-manager');
```

## 🔍 Verificación del Estado

Para verificar que PostgreSQL está funcionando correctamente:

```bash
# Conectarse a la base de datos
psql -U postgres -d jwmantto

# Ver todas las tablas
\dt

# Ver datos de ejemplo
SELECT * FROM edificios;
SELECT * FROM cuartos LIMIT 5;
SELECT * FROM mantenimientos LIMIT 5;

# Ver información de conexiones activas
SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'jwmantto';

# Salir
\q
```

## 📊 Comandos Útiles de PostgreSQL

```bash
# Listar bases de datos
\l

# Conectarse a una base de datos
\c jwmantto

# Listar tablas
\dt

# Describir una tabla
\d mantenimientos

# Ver usuarios
\du

# Ejecutar un archivo SQL
\i ruta/al/archivo.sql

# Ver consultas en ejecución
SELECT * FROM pg_stat_activity;

# Ayuda
\?

# Salir
\q
```

## 🚀 Despliegue en Producción

### Consideraciones importantes:

1. **Variables de entorno**: Nunca subas el archivo `.env` a Git
2. **SSL**: Siempre usa SSL en producción (`DB_SSL=true`)
3. **Contraseñas**: Usa contraseñas fuertes y seguras
4. **Backups**: Configura backups automáticos en tu proveedor de nube
5. **Pool de conexiones**: Ajusta según tu carga esperada
6. **Monitoreo**: Configura alertas de rendimiento y disponibilidad

### Scripts NPM útiles:

```json
{
  "scripts": {
    "start": "node server.js",
    "migrate": "node scripts/migrate-sqlite-to-postgres.js",
    "migrate:clean": "node scripts/migrate-sqlite-to-postgres.js --clean"
  }
}
```

## 📚 Recursos Adicionales

- [Documentación oficial de PostgreSQL](https://www.postgresql.org/docs/)
- [node-postgres (pg) documentation](https://node-postgres.com/)
- [Azure Database for PostgreSQL](https://azure.microsoft.com/en-us/services/postgresql/)
- [AWS RDS PostgreSQL](https://aws.amazon.com/rds/postgresql/)

## 🆘 Soporte

Si encuentras problemas no cubiertos en esta guía, verifica:

1. Los logs de la aplicación (`console` al iniciar el servidor)
2. Los logs de PostgreSQL (ubicación varía según el sistema operativo)
3. Las configuraciones en `.env`

---

**¡La migración a PostgreSQL está completa!** Ahora puedes disfrutar de una base de datos más robusta y flexible para tu sistema de mantenimiento JW Mantto. 🎉
