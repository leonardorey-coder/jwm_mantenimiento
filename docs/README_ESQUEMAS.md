# Esquemas de Base de Datos - JW Mantto

Este directorio contiene los esquemas de base de datos para el sistema JW Mantto.

## 📁 Archivos Disponibles

### Esquemas PostgreSQL

1. **`esquema_postgres_2025-11-11.sql`** (Básico)
   - Esquema básico con las tablas principales
   - Edificios, Cuartos, Mantenimientos
   - Gestión de estados con colores
   - Ideal para instalación inicial simple

2. **`esquema_completo_2025-11-11.sql`** (Completo) ⭐ **RECOMENDADO**
   - Esquema completo según diagrama de clases
   - Incluye todas las funcionalidades:
     - ✅ Usuarios y roles
     - ✅ Espacios comunes
     - ✅ Inspecciones y checklists
     - ✅ Evidencias multimedia
     - ✅ Firmas digitales
     - ✅ Vistas y funciones SQL
     - ✅ Triggers automáticos

3. **`migracion_esquema_completo_2025-11-11.sql`** (Migración)
   - Script de migración para actualizar base de datos existente
   - Preserva datos existentes
   - Agrega nuevas tablas y campos
   - **Usar este si ya tienes datos en la BD**

### Esquemas SQLite (Legacy)

- `schema.sql` - Esquema básico para SQLite
- `finest_mant_cuartos.sql` - Esquema antiguo

## 🚀 Instalación

### Opción 1: Instalación Nueva (Base de Datos Vacía)

Si estás instalando el sistema por primera vez:

```bash
# 1. Crear la base de datos
createdb jwmantto

# 2. Aplicar el esquema completo
psql -U postgres -d jwmantto -f esquema_completo_2025-11-11.sql
```

### Opción 2: Migración (Base de Datos Existente)

Si ya tienes una base de datos con datos:

```bash
# 1. IMPORTANTE: Hacer backup primero
pg_dump -U postgres jwmantto > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Aplicar la migración
psql -U postgres -d jwmantto -f migracion_esquema_completo_2025-11-11.sql
```

### Opción 3: Instalación Básica

Si solo necesitas las funcionalidades básicas:

```bash
# Aplicar esquema básico
psql -U postgres -d jwmantto -f esquema_postgres_2025-11-11.sql
```

## ✅ Verificación de Instalación

Después de aplicar el esquema, verifica que todo esté correcto:

```sql
-- Conectar a la base de datos
psql -U postgres -d jwmantto

-- Ver todas las tablas
\dt

-- Ver estadísticas de cuartos
SELECT * FROM obtener_estadisticas_cuartos();

-- Ver cuartos con información completa
SELECT * FROM vista_cuartos_completa LIMIT 5;

-- Ver mantenimientos completos
SELECT * FROM vista_mantenimientos_completa LIMIT 5;

-- Verificar configuración de estados
SELECT * FROM configuracion_estados;
```

## 📊 Estructura del Esquema Completo

### Tablas Principales

| Tabla                   | Descripción                | Registros Iniciales |
| ----------------------- | -------------------------- | ------------------- |
| `configuracion_estados` | Estados con colores        | 4 estados           |
| `roles`                 | Roles del sistema          | 3 roles             |
| `usuarios`              | Usuarios del sistema       | 1 admin             |
| `edificios`             | Edificios del hotel        | 4 edificios         |
| `cuartos`               | Habitaciones               | 5 ejemplos          |
| `espacios_comunes`      | Áreas comunes              | 5 ejemplos          |
| `mantenimientos`        | Registros de mantenimiento | 0                   |
| `inspecciones`          | Inspecciones realizadas    | 0                   |
| `checklists`            | Listas de verificación     | 0                   |
| `checklist_items`       | Items de checklists        | 0                   |
| `evidencias`            | Evidencias multimedia      | 0                   |
| `firmas_digitales`      | Firmas digitales           | 0                   |

### Vistas Disponibles

- `vista_cuartos_completa` - Cuartos con colores y edificio
- `vista_espacios_comunes_completa` - Espacios con colores y edificio
- `vista_mantenimientos_completa` - Mantenimientos con toda la info
- `vista_inspecciones_completa` - Inspecciones con contadores

### Funciones SQL

- `calcular_progreso_checklist(checklist_id)` - Calcula % de progreso
- `obtener_estadisticas_cuartos()` - Estadísticas de estados de cuartos
- `obtener_estadisticas_espacios_comunes()` - Estadísticas de espacios

## 🔧 Configuración de la Aplicación

Después de aplicar el esquema, configura tu archivo `.env`:

```env
# Configuración de PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jwmantto
DB_USER=postgres
DB_PASSWORD=tu_password_aqui

# Pool de conexiones
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# SSL (para producción en la nube)
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
```

## 📝 Datos de Ejemplo

El esquema completo incluye datos de ejemplo:

### Usuarios por Defecto

| Email              | Rol   | Contraseña          |
| ------------------ | ----- | ------------------- |
| admin@jwmantto.com | ADMIN | (debe configurarse) |

**IMPORTANTE:** Cambiar la contraseña del admin después de la instalación.

### Estados Predefinidos

| Estado         | Color      | Icono     | Descripción            |
| -------------- | ---------- | --------- | ---------------------- |
| disponible     | 🟢 Verde   | `#4CAF50` | Listo para ocupar      |
| ocupado        | 🔵 Azul    | `#2196F3` | Huésped hospedado      |
| mantenimiento  | 🟠 Naranja | `#FF9800` | En limpieza/reparación |
| fuera_servicio | ⚫ Gris    | `#616161` | No disponible          |

### Edificios de Ejemplo

1. Torre Principal (5 pisos)
2. Torre Norte (4 pisos)
3. Torre Sur (4 pisos)
4. Villas (1 piso)

### Espacios Comunes de Ejemplo

1. Gimnasio Principal
2. Piscina Infinity
3. Restaurante Gourmet
4. Salón de Eventos
5. Spa & Wellness

## 🔄 Actualización del Esquema

Si necesitas actualizar el esquema en el futuro:

```bash
# 1. Backup
pg_dump -U postgres jwmantto > backup_antes_actualizacion.sql

# 2. Aplicar nueva migración
psql -U postgres -d jwmantto -f nueva_migracion.sql

# 3. Verificar
psql -U postgres -d jwmantto -c "\dt"
```

## 🛠️ Mantenimiento

### Backup Regular

```bash
# Backup completo
pg_dump -U postgres jwmantto > backup_jwmantto_$(date +%Y%m%d).sql

# Backup solo esquema
pg_dump -U postgres --schema-only jwmantto > esquema_backup.sql

# Backup solo datos
pg_dump -U postgres --data-only jwmantto > datos_backup.sql
```

### Restauración

```bash
# Restaurar desde backup
psql -U postgres -d jwmantto < backup_jwmantto_20251111.sql
```

### Limpieza de Datos de Ejemplo

Si quieres eliminar los datos de ejemplo después de la instalación:

```sql
-- Eliminar datos de ejemplo (mantener estructura)
DELETE FROM firmas_digitales;
DELETE FROM evidencias;
DELETE FROM checklist_items;
DELETE FROM checklists;
DELETE FROM inspecciones;
DELETE FROM mantenimientos;
DELETE FROM espacios_comunes;
DELETE FROM cuartos;
DELETE FROM edificios WHERE id > 0;

-- Mantener configuración de estados y roles
-- NO eliminar: configuracion_estados, roles
```

## 📚 Documentación Adicional

- [Esquema Completo](../docs/ESQUEMA_BD_COMPLETO.md) - Documentación detallada
- [Diagrama de Clases](../docs/DIAGRAMA_CLASES.md) - Diseño del sistema
- [API Gestión Estados](../docs/API_GESTION_ESTADOS.md) - Endpoints de estados
- [Arquitectura API](../docs/ARQUITECTURA_API.md) - Arquitectura general

## ⚠️ Notas Importantes

1. **Backup antes de migrar**: Siempre haz backup antes de aplicar migraciones
2. **Probar en desarrollo**: Prueba los scripts en un entorno de desarrollo primero
3. **Contraseñas**: Cambia las contraseñas por defecto inmediatamente
4. **Permisos**: Asegúrate de tener permisos de superusuario en PostgreSQL
5. **Versión**: Estos esquemas están diseñados para PostgreSQL 12+

## 🐛 Solución de Problemas

### Error: "database does not exist"

```bash
# Crear la base de datos primero
createdb jwmantto
```

### Error: "permission denied"

```bash
# Usar usuario con permisos
psql -U postgres -d jwmantto -f esquema.sql
```

### Error: "relation already exists"

El esquema ya está aplicado. Si necesitas reinstalar:

```bash
# Opción 1: Eliminar y recrear
dropdb jwmantto
createdb jwmantto
psql -U postgres -d jwmantto -f esquema_completo_2025-11-11.sql

# Opción 2: Usar migración
psql -U postgres -d jwmantto -f migracion_esquema_completo_2025-11-11.sql
```

### Verificar Integridad

```sql
-- Verificar claves foráneas
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- Verificar índices
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## 📞 Soporte

Si encuentras problemas:

1. Revisa los logs de PostgreSQL
2. Verifica la versión de PostgreSQL (`SELECT version();`)
3. Consulta la documentación en `/docs`
4. Revisa el archivo de configuración `.env`

---

**Última actualización:** 2025-11-11  
**Versión del esquema:** 2.0.0
