require('dotenv').config();

/**
 * Configuración de conexión a PostgreSQL
 * Soporta tanto entorno local como en la nube (Neon, Azure, AWS, etc.)
 */
let dbConfig = {
    // Configuración por defecto (local)
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'jwmantto',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    
    // Configuración del pool de conexiones
    max: parseInt(process.env.DB_POOL_MAX || '20'), // Máximo de conexiones en el pool
    min: parseInt(process.env.DB_POOL_MIN || '2'),  // Mínimo de conexiones en el pool
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 segundos
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'), // 2 segundos
    
    // SSL para conexiones en la nube (Azure, AWS, Neon, etc.)
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false
};

// Si existe DATABASE_URL (Neon, Heroku, Railway, etc.), usarla
if (process.env.DATABASE_URL) {
    try {
        const { parse } = require('pg-connection-string');
        const parsed = parse(process.env.DATABASE_URL);
        
        dbConfig = {
            ...dbConfig,
            host: parsed.host,
            port: parseInt(parsed.port || '5432'),
            database: parsed.database,
            user: parsed.user,
            password: parsed.password,
            ssl: parsed.ssl === 'true' || parsed.sslmode === 'require' ? {
                rejectUnauthorized: false
            } : false
        };
        
        console.log('🔗 Usando DATABASE_URL para conexión');
    } catch (error) {
        console.warn('⚠️ Error parseando DATABASE_URL, usando configuración individual:', error.message);
    }
}

// Validar que los parámetros críticos estén configurados
function validateConfig() {
    const requiredParams = ['host', 'database', 'user', 'password'];
    const missing = requiredParams.filter(param => !dbConfig[param]);
    
    if (missing.length > 0) {
        console.warn(`⚠️ Parámetros de configuración faltantes: ${missing.join(', ')}`);
        console.warn('Usando valores por defecto para desarrollo local');
    }
    
    return missing.length === 0;
}

// Mostrar configuración (ocultando la contraseña)
function displayConfig() {
    console.log('🔧 Configuración de PostgreSQL:');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Puerto: ${dbConfig.port}`);
    console.log(`   Base de datos: ${dbConfig.database}`);
    console.log(`   Usuario: ${dbConfig.user}`);
    console.log(`   SSL: ${dbConfig.ssl ? 'Habilitado' : 'Deshabilitado'}`);
    console.log(`   Pool máximo: ${dbConfig.max} conexiones`);
}

module.exports = {
    dbConfig,
    validateConfig,
    displayConfig
};
