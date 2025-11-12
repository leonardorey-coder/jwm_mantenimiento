# 🔄 Migración a PostgreSQL Completada

## ✅ Cambios Realizados

Se ha migrado exitosamente el proyecto de SQLite a PostgreSQL. A continuación, el resumen de cambios:

### Nuevos Archivos Creados

1. **`db/postgres-manager.js`** - Gestor de base de datos PostgreSQL con pool de conexiones
2. **`db/config.js`** - Configuración centralizada de la base de datos
3. **`db/schema-postgres.sql`** - Esquema de base de datos adaptado para PostgreSQL
4. **`scripts/migrate-sqlite-to-postgres.js`** - Script para migrar datos de SQLite a PostgreSQL
5. **`scripts/setup-postgres.sh`** - Script de configuración automática
6. **`.env.example`** - Plantilla de variables de entorno
7. **`docs/README_POSTGRES.md`** - Documentación completa de PostgreSQL

### Archivos Modificados

1. **`package.json`** - Se agregaron las dependencias:
   - `pg` (node-postgres) - Driver de PostgreSQL
   - `dotenv` - Gestión de variables de entorno

2. **`server.js`** - Actualizado para usar PostgresManager en lugar de SQLiteManager

### Configuración de Variables de Entorno

El proyecto ahora utiliza variables de entorno para la configuración de la base de datos. Copia el archivo `.env.example` a `.env` y configura tus credenciales:

```bash
cp .env.example .env
```

## 🚀 Inicio Rápido

### Opción 1: Configuración Automática (Recomendado)

```bash
# Ejecutar el script de configuración
./scripts/setup-postgres.sh
```

Este script:
- ✅ Verifica que PostgreSQL esté instalado
- ✅ Instala las dependencias de Node.js
- ✅ Crea el archivo `.env` con tus credenciales
- ✅ Crea la base de datos
- ✅ Ejecuta el esquema SQL
- ✅ Opcionalmente migra datos desde SQLite

### Opción 2: Configuración Manual

1. **Instalar dependencias**:
```bash
npm install
```

2. **Configurar variables de entorno**:
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

3. **Crear base de datos**:
```bash
psql postgres
CREATE DATABASE jwmantto;
\q
```

4. **Ejecutar esquema**:
```bash
psql -U postgres -d jwmantto -f db/schema-postgres.sql
```

5. **Iniciar aplicación**:
```bash
npm start
```

## 📊 Migración de Datos Existentes

Si tienes datos en SQLite y quieres migrarlos a PostgreSQL:

```bash
# Migración simple
node scripts/migrate-sqlite-to-postgres.js

# Migración limpia (borra datos existentes en PostgreSQL primero)
node scripts/migrate-sqlite-to-postgres.js --clean
```

## 🌐 Configuración para la Nube

El sistema ahora soporta despliegue en la nube. Ejemplos de configuración:

### Azure Database for PostgreSQL

```env
DB_HOST=tu-servidor.postgres.database.azure.com
DB_USER=tu_usuario@tu-servidor
DB_PASSWORD=tu_password
DB_SSL=true
```

### AWS RDS PostgreSQL

```env
DB_HOST=tu-instancia.abc123.us-east-1.rds.amazonaws.com
DB_USER=postgres
DB_PASSWORD=tu_password
DB_SSL=true
```

### Heroku, Railway, Render

```env
DB_HOST=containers-us-west-xxx.railway.app
DB_USER=postgres
DB_PASSWORD=contraseña_generada
DB_SSL=true
```

## 📖 Documentación Completa

Para instrucciones detalladas, consulta: **[docs/README_POSTGRES.md](docs/README_POSTGRES.md)**

Incluye:
- 📋 Requisitos previos
- 🔧 Configuración paso a paso
- ☁️ Despliegue en diferentes proveedores de nube
- 🔄 Migración de datos
- 🐛 Solución de problemas
- 📊 Comandos útiles de PostgreSQL

## 🔐 Seguridad

⚠️ **IMPORTANTE**: El archivo `.env` contiene credenciales sensibles y ya está incluido en `.gitignore`. **NUNCA** lo subas a Git.

## 🆕 Nuevas Características

Con PostgreSQL ahora puedes:

- ✅ **Acceso concurrente**: Múltiples usuarios simultáneos
- ✅ **Mayor rendimiento**: Mejor manejo de grandes volúmenes
- ✅ **Escalabilidad**: Fácil transición a la nube
- ✅ **Transacciones robustas**: Mayor integridad de datos
- ✅ **Índices optimizados**: Consultas más rápidas

## 🛠️ Estructura de la Base de Datos

### Tablas Principales

1. **edificios**
   - id (SERIAL PRIMARY KEY)
   - nombre (VARCHAR)
   - descripcion (TEXT)
   - created_at (TIMESTAMP)

2. **cuartos**
   - id (SERIAL PRIMARY KEY)
   - numero (VARCHAR)
   - edificio_id (INTEGER → edificios.id)
   - descripcion (TEXT)
   - estado (VARCHAR)
   - created_at (TIMESTAMP)

3. **mantenimientos**
   - id (SERIAL PRIMARY KEY)
   - cuarto_id (INTEGER → cuartos.id)
   - descripcion (TEXT)
   - tipo (VARCHAR: 'normal' | 'rutina')
   - estado (VARCHAR: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado')
   - fecha_creacion (TIMESTAMP)
   - fecha_programada (DATE)
   - hora (TIME)
   - dia_alerta (INTEGER)
   - alerta_emitida (BOOLEAN)
   - usuario_creador (VARCHAR)
   - notas (TEXT)

## 🧪 Verificación

Para verificar que todo funciona correctamente:

```bash
# Iniciar el servidor
npm start

# Deberías ver:
# 🔧 Configuración de PostgreSQL:
#    Host: localhost
#    Puerto: 5432
#    Base de datos: jwmantto
#    ...
# ✅ Conexión a PostgreSQL establecida
# ✅ Base de datos PostgreSQL inicializada correctamente
# ✅ Servidor ejecutándose en http://localhost:3001
```

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs del servidor
2. Consulta la sección de "Solución de Problemas" en `docs/README_POSTGRES.md`
3. Verifica las variables de entorno en `.env`
4. Comprueba que PostgreSQL esté corriendo: `brew services list` (macOS)

## 📝 Comandos Útiles

```bash
# Ver estado de PostgreSQL (macOS)
brew services list

# Conectarse a la base de datos
psql -U postgres -d jwmantto

# Ver tablas
\dt

# Ver datos
SELECT * FROM edificios;
SELECT * FROM cuartos;
SELECT * FROM mantenimientos;

# Salir
\q
```

## 🎯 Próximos Pasos

Ahora que tienes PostgreSQL configurado, puedes:

1. ✅ Ejecutar la aplicación localmente
2. ✅ Desplegar en la nube (Azure, AWS, Heroku, etc.)
3. ✅ Configurar backups automáticos
4. ✅ Implementar monitoreo y alertas
5. ✅ Escalar según tus necesidades

---

**¡Migración a PostgreSQL completada exitosamente!** 🎉

Para cualquier duda, consulta la documentación completa en `docs/README_POSTGRES.md`.
