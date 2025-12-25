# Database Schema Files

## Active Schema Files

### schema-postgres.sql

**Status:** ⚠️ DEPRECATED - Contains sample data that may not be current  
**Use:** For reference only

### esquema_postgres_2025-11-11.sql

**Status:** ✅ CURRENT - Clean schema without sample data  
**Use:** This is the authoritative schema file for the database structure  
**Exported:** 2025-11-11

## Recommendation

To reduce duplication and maintenance overhead, consider:

1. Using `esquema_postgres_2025-11-11.sql` as the single source of truth
2. Archiving or removing `schema-postgres.sql`
3. Keeping sample data in a separate file (e.g., `sample_data.sql`) if needed

## Schema Files Overview

- **esquema_postgres_2025-11-11.sql** - Current schema definition
- **schema-postgres.sql** - Older version with embedded sample data
- **checklist_schema_proposal.sql** - Proposed checklist feature schema
- **finest_mant_cuartos.sql** - Initial database setup
- **migration\_\*.sql** - Schema migration files for specific features
- **insertar\_\*.sql** - Data insertion scripts
- **importar_datos_con_estados.sql** - Data import with state handling
- **mejora_usuarios_sesiones.sql** - User and session improvements
