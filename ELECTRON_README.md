# Configuración de Variables de Entorno

Para ejecutar JW Mantto Desktop, crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# BASE DE DATOS NEON (PostgreSQL en la nube)
# Opción 1: URL de conexión completa (recomendado)
DATABASE_URL=postgresql://usuario:password@host.neon.tech/database?sslmode=require

# Opción 2: Parámetros individuales
# DB_HOST=host.neon.tech
# DB_PORT=5432
# DB_NAME=jwmantto
# DB_USER=usuario
# DB_PASSWORD=password
# DB_SSL=true

# JWT (Autenticación)
JWT_SECRET=tu-clave-secreta-super-segura
JWT_EXPIRES_IN=24h

# UPLOADTHING (Almacenamiento de archivos)
UPLOADTHING_TOKEN=tu-token-de-uploadthing

# ENTORNO
NODE_ENV=production
```

## Comandos

```bash
# Desarrollo
npm run electron:dev

# Empaquetar para Windows (instalador)
npm run dist

# Empaquetar portable (sin instalación)
npm run dist:portable
```
