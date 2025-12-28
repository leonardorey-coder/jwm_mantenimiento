// Cargar primero .env (configuración de producción/por defecto)
require('dotenv').config();

// Detectar NODE_ENV después de cargar .env
// Si es 'development', cargar .env.local para sobrescribir con valores de desarrollo
const fs = require('fs');
const path = require('path');
const envLocalPath = path.join(__dirname, '..', '.env.local');

const nodeEnvFromEnv = process.env.NODE_ENV;

if (nodeEnvFromEnv === 'development' && fs.existsSync(envLocalPath)) {
    require('dotenv').config({ path: envLocalPath, override: true });
}

let isLocal = process.env.NODE_ENV === 'development';
let dbConfig = {};

// Construir configuración desde variables de entorno (funciona para ambos entornos)
if (isLocal) {
    // En desarrollo, usar variables de .env.local (POSTGRES_* o DB_*)
    dbConfig = {
        host: process.env.POSTGRES_HOST || process.env.PGHOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || process.env.DB_PORT || '5432'),
        database: process.env.POSTGRES_DATABASE || process.env.PGDATABASE || process.env.DB_NAME || 'jwmantto',
        user: process.env.POSTGRES_USER || process.env.PGUSER || process.env.DB_USER || 'leonardocruz',
        password: process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
        max: parseInt(process.env.DB_POOL_MAX || '20'),
        min: parseInt(process.env.DB_POOL_MIN || '2'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
        ssl: false
    };
} else {
    // En producción, usar DATABASE_URL si está disponible
    if (process.env.DATABASE_URL) {
        try {
            const { parse } = require('pg-connection-string');
            const parsed = parse(process.env.DATABASE_URL);

            dbConfig = {
                host: parsed.host,
                port: parseInt(parsed.port || '5432'),
                database: parsed.database,
                user: parsed.user,
                password: parsed.password,
                ssl: parsed.ssl === 'true' || parsed.sslmode === 'require' ? {
                    rejectUnauthorized: false
                } : false,
                max: parseInt(process.env.DB_POOL_MAX || '20'),
                min: parseInt(process.env.DB_POOL_MIN || '2'),
                idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
                connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000')
            };
        } catch (error) {
            // Error parseando DATABASE_URL, usar configuración individual
        }
    }

    // Si no hay DATABASE_URL en producción, usar variables individuales
    if (!dbConfig.host || !dbConfig.database) {
        dbConfig = {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            max: parseInt(process.env.DB_POOL_MAX || '20'),
            min: parseInt(process.env.DB_POOL_MIN || '2'),
            idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
            connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
            ssl: process.env.DB_SSL === 'true' ? {
                rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
            } : false
        };
    }
}

// Validar que los parámetros críticos estén configurados
function validateConfig() {
    const requiredParams = ['host', 'database', 'user', 'password'];
    const missing = requiredParams.filter(param => !dbConfig[param]);
    return missing.length === 0;
}

// Mostrar configuración (ocultando la contraseña) - solo en desarrollo
function displayConfig() {
    if (process.env.NODE_ENV !== 'production') {
        console.log('Configuración de PostgreSQL:');
        console.log(`   Host: ${dbConfig.host}`);
        console.log(`   Puerto: ${dbConfig.port}`);
        console.log(`   Base de datos: ${dbConfig.database}`);
        console.log(`   Usuario: ${dbConfig.user}`);
        console.log(`   SSL: ${dbConfig.ssl ? 'Habilitado' : 'Deshabilitado'}`);
        console.log(`   Pool máximo: ${dbConfig.max} conexiones`);
    }
}

module.exports = {
    dbConfig,
    validateConfig,
    displayConfig
};
