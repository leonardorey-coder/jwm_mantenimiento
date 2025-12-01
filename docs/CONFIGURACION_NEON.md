# Configuración de Neon PostgreSQL

Guía para conectar y configurar la base de datos Neon PostgreSQL para el proyecto JW Mantto.

## 📋 Requisitos Previos

1. Cuenta en Neon: https://neon.tech
2. Base de datos creada en Neon (ejemplo: `jwm-sgsom-bdneon`)
3. PostgreSQL CLI instalado localmente (para aplicar el esquema)

## 🔗 Paso 1: Obtener la String de Conexión

1. Ve al dashboard de Neon: https://console.neon.tech
2. Selecciona tu proyecto: `jwm-sgsom-bdneon`
3. Ve a **Connection Details** o **Connection Strings**
4. Copia la string de conexión. Se ve así:

```
postgresql://usuario:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```

## 📝 Paso 2: Configurar Variables de Entorno

### Opción A: Usar DATABASE_URL (Recomendado)

Crea o edita tu archivo `.env`:

```bash
# String de conexión completa de Neon
DATABASE_URL=postgresql://usuario:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require

# Configuración JWT
JWT_SECRET=tu_secret_key_seguro
JWT_EXPIRATION=8h
REFRESH_TOKEN_EXPIRATION=7d

# Entorno
NODE_ENV=production
```

### Opción B: Configuración Individual

Si prefieres configurar cada parámetro por separado:

```bash
DB_HOST=ep-xxx-xxx.region.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=usuario
DB_PASSWORD=password
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

## 🗄️ Paso 3: Aplicar el Esquema

### Método 1: Usando el Script Automático (Recomendado)

```bash
# Con DATABASE_URL en .env
./scripts/aplicar-esquema-neon.sh

# O pasando la string directamente
./scripts/aplicar-esquema-neon.sh "postgresql://usuario:password@host:puerto/database?sslmode=require"
```

### Método 2: Usando psql Directamente

```bash
# Aplicar el esquema completo
psql "postgresql://usuario:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require" \
  -f db/schema-postgres-completo.sql
```

### Método 3: Usando pg_dump/psql con Variables de Entorno

Si tienes DATABASE_URL en tu `.env`:

```bash
source .env
psql "$DATABASE_URL" -f db/schema-postgres-completo.sql
```

## ✅ Paso 4: Verificar la Conexión

### Verificar que el esquema se aplicó correctamente:

```bash
# Conectar a Neon
psql "$DATABASE_URL"

# O si no tienes DATABASE_URL en .env:
psql "postgresql://usuario:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

Dentro de psql:

```sql
-- Ver todas las tablas
\dt

-- Verificar algunas tablas clave
SELECT COUNT(*) FROM edificios;
SELECT COUNT(*) FROM cuartos;
SELECT COUNT(*) FROM usuarios;
SELECT COUNT(*) FROM mantenimientos;

-- Salir
\q
```

### Probar la conexión desde Node.js:

```bash
# Iniciar la aplicación
npm start

# O en modo desarrollo
npm run dev
```

Deberías ver en la consola:
```
✅ Conexión a PostgreSQL establecida: [fecha/hora]
✅ Base de datos PostgreSQL inicializada correctamente
```

## 🌐 Paso 5: Configurar en Vercel (Producción)

1. Ve al dashboard de Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto: `jwm-mantenimiento`
3. Ve a **Settings** → **Environment Variables**
4. Agrega las variables:

```
DATABASE_URL=postgresql://usuario:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=tu_secret_key_seguro_produccion
NODE_ENV=production
```

5. Guarda los cambios
6. Redespliega la aplicación

## 🔄 Migración de Datos (Opcional)

Si tienes datos en tu base de datos local y quieres migrarlos a Neon:

```bash
# 1. Crear backup de la base de datos local
pg_dump -U leonardocruz -d jwmantto -F p -f db/backup_local.sql

# 2. Aplicar el esquema a Neon (si no lo has hecho)
./scripts/aplicar-esquema-neon.sh

# 3. Restaurar datos en Neon
psql "$DATABASE_URL" -f db/backup_local.sql
```

## 🐛 Solución de Problemas

### Error: "SSL connection required"

**Solución**: Asegúrate de incluir `?sslmode=require` en tu DATABASE_URL o configurar:

```bash
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
```

### Error: "Connection timeout"

**Solución**: 
- Verifica que la string de conexión sea correcta
- Verifica que tu IP esté permitida en Neon (si aplica)
- Aumenta el timeout:

```bash
DB_CONNECTION_TIMEOUT=5000
```

### Error: "password authentication failed"

**Solución**: 
- Verifica que la contraseña en DATABASE_URL sea correcta
- Asegúrate de que no haya caracteres especiales sin codificar en la URL

### Error: "database does not exist"

**Solución**: 
- Verifica el nombre de la base de datos en tu string de conexión
- En Neon, el nombre de la base de datos suele ser `neondb` por defecto

## 📚 Recursos Adicionales

- [Documentación de Neon](https://neon.tech/docs)
- [Guía de conexión de Neon](https://neon.tech/docs/connect/connect-from-any-app)
- [String de conexión de Neon](https://neon.tech/docs/connect/connection-string)

## ✅ Checklist de Configuración

- [ ] Base de datos creada en Neon
- [ ] String de conexión obtenida
- [ ] Variables de entorno configuradas (`.env` o Vercel)
- [ ] Esquema aplicado a Neon
- [ ] Conexión verificada con `psql`
- [ ] Aplicación conecta correctamente
- [ ] Variables configuradas en Vercel (producción)
- [ ] Despliegue en Vercel funciona correctamente

