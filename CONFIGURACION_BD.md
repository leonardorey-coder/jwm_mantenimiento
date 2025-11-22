# Configuración de Base de Datos PostgreSQL Local

## 📋 Información de Conexión

### Base de Datos Local (Desarrollo)

```bash
Host:     localhost
Puerto:   5432
Base de datos: jwmantto
Usuario:  leonardocruz
Contraseña: (vacía)
```

### String de Conexión Completo

```
postgresql://leonardocruz@localhost:5432/jwmantto
```

## 🔧 Configuración del Archivo `.env`

Copia el archivo `.env.example` a `.env` y verifica que tenga la siguiente configuración:

```bash
# Configuración de PostgreSQL Local
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jwmantto
DB_USER=leonardocruz
DB_PASSWORD=

# Pool de conexiones
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# SSL deshabilitado para desarrollo local
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=false
```

## ✅ Verificación de Conexión

### 1. Verificar que PostgreSQL esté corriendo

```bash
brew services list | grep postgresql
```

Si no está corriendo, iniciarlo:

```bash
brew services start postgresql@16
```

### 2. Probar conexión directa

```bash
psql -U leonardocruz -d jwmantto
```

### 3. Verificar tablas existentes

```sql
\dt
```

### 4. Verificar espacios comunes

```sql
SELECT id, nombre, tipo, edificio_id FROM espacios_comunes;
```

## 💾 Backups

### Crear un backup

```bash
/opt/homebrew/opt/postgresql@16/bin/pg_dump -U leonardocruz -d jwmantto -F p -f db/backup_jwmantto_$(date +%Y-%m-%d_%H-%M-%S).sql
```

### Restaurar desde backup

```bash
psql -U leonardocruz -d jwmantto -f db/backup_jwmantto_2025-11-20_21-47-11.sql
```

### Último backup disponible

- **Archivo**: `db/backup_jwmantto_2025-11-20_21-47-11.sql`
- **Tamaño**: 1.2 MB
- **Fecha**: 20 de noviembre de 2025, 21:47:11
- **Incluye**: Restaurante recién creado

## 🏗️ Estructura de la Base de Datos

### Tablas Principales

1. **edificios** - Edificios del hotel (Alfa, Bravo, Charly, Eco, Fox, Casa Maat)
2. **cuartos** - Habitaciones del hotel
3. **espacios_comunes** - Áreas comunes (Restaurante, Gimnasio, Piscina, etc.)
4. **mantenimientos** - Registros de mantenimiento
5. **usuarios** - Usuarios del sistema
6. **roles** - Roles de usuario

### Espacios Comunes Actuales

| ID | Nombre | Tipo | Edificio | Capacidad | Horario |
|----|--------|------|----------|-----------|---------|
| 6 | Restaurante | Restaurante | Alfa | 100 | 07:00 - 23:00 |

## 🚀 Comandos Útiles

### Listar todos los edificios

```sql
SELECT id, nombre FROM edificios ORDER BY id;
```

### Listar todos los espacios comunes

```sql
SELECT id, nombre, tipo, edificio_id, estado, capacidad 
FROM espacios_comunes 
ORDER BY id;
```

### Ver información completa de espacios comunes

```sql
SELECT * FROM vista_espacios_comunes_completa;
```

## 📝 Notas Importantes

- El archivo `.env` NO debe subirse a Git (está en `.gitignore`)
- Usa `.env.example` como plantilla para crear tu `.env` local
- La contraseña está vacía para desarrollo local
- SSL está deshabilitado para desarrollo local
- Para producción, usa configuración diferente con SSL habilitado
