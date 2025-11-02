#!/usr/bin/env node

/**
 * Script de migración de datos de SQLite a PostgreSQL
 * Uso: node scripts/migrate-sqlite-to-postgres.js
 */

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configuración de SQLite
const sqlitePath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../db/jwmantto.db');

// Configuración de PostgreSQL
const pgConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'jwmantto',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
    } : false
};

class DataMigrator {
    constructor() {
        this.sqliteDb = null;
        this.pgPool = null;
    }

    async initialize() {
        console.log('🚀 Iniciando migración de SQLite a PostgreSQL...\n');

        // Conectar a SQLite
        if (!fs.existsSync(sqlitePath)) {
            throw new Error(`❌ Base de datos SQLite no encontrada en: ${sqlitePath}`);
        }
        
        console.log('📂 Conectando a SQLite:', sqlitePath);
        this.sqliteDb = new Database(sqlitePath, { readonly: true });
        console.log('✅ Conectado a SQLite\n');

        // Conectar a PostgreSQL
        console.log('🐘 Conectando a PostgreSQL:', pgConfig.host);
        this.pgPool = new Pool(pgConfig);
        
        // Probar conexión
        const client = await this.pgPool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Conectado a PostgreSQL:', result.rows[0].now);
        client.release();
        console.log('');
    }

    async migrate() {
        try {
            await this.initialize();

            // Limpiar datos existentes en PostgreSQL (opcional)
            const limpiar = process.argv.includes('--clean');
            if (limpiar) {
                console.log('🧹 Limpiando datos existentes en PostgreSQL...');
                await this.cleanPostgres();
                console.log('✅ Datos limpiados\n');
            }

            // Migrar en orden de dependencias
            await this.migrateEdificios();
            await this.migrateCuartos();
            await this.migrateMantenimientos();

            console.log('\n✨ ¡Migración completada exitosamente!');
            await this.showStatistics();

        } catch (error) {
            console.error('❌ Error durante la migración:', error);
            throw error;
        } finally {
            await this.close();
        }
    }

    async cleanPostgres() {
        await this.pgPool.query('DELETE FROM mantenimientos');
        await this.pgPool.query('DELETE FROM cuartos');
        await this.pgPool.query('DELETE FROM edificios');
        
        // Resetear secuencias
        await this.pgPool.query('ALTER SEQUENCE mantenimientos_id_seq RESTART WITH 1');
        await this.pgPool.query('ALTER SEQUENCE cuartos_id_seq RESTART WITH 1');
        await this.pgPool.query('ALTER SEQUENCE edificios_id_seq RESTART WITH 1');
    }

    async migrateEdificios() {
        console.log('🏢 Migrando edificios...');
        
        const edificios = this.sqliteDb.prepare('SELECT * FROM edificios').all();
        console.log(`   Encontrados ${edificios.length} edificios`);

        for (const edificio of edificios) {
            await this.pgPool.query(
                'INSERT INTO edificios (id, nombre, descripcion, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
                [edificio.id, edificio.nombre, edificio.descripcion, edificio.created_at]
            );
        }

        // Actualizar secuencia
        if (edificios.length > 0) {
            const maxId = Math.max(...edificios.map(e => e.id));
            await this.pgPool.query(`ALTER SEQUENCE edificios_id_seq RESTART WITH ${maxId + 1}`);
        }

        console.log('✅ Edificios migrados\n');
    }

    async migrateCuartos() {
        console.log('🚪 Migrando cuartos...');
        
        const cuartos = this.sqliteDb.prepare('SELECT * FROM cuartos').all();
        console.log(`   Encontrados ${cuartos.length} cuartos`);

        for (const cuarto of cuartos) {
            // Mapear 'nombre' de SQLite a 'numero' de PostgreSQL
            await this.pgPool.query(
                'INSERT INTO cuartos (id, numero, edificio_id, descripcion, estado, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING',
                [
                    cuarto.id, 
                    cuarto.nombre || cuarto.numero, // SQLite usa 'nombre', PostgreSQL usa 'numero'
                    cuarto.edificio_id, 
                    cuarto.descripcion, 
                    cuarto.estado || 'disponible', // Valor por defecto si no existe
                    cuarto.created_at || cuarto.fecha_creacion // Compatibilidad de nombres
                ]
            );
        }

        // Actualizar secuencia
        if (cuartos.length > 0) {
            const maxId = Math.max(...cuartos.map(c => c.id));
            await this.pgPool.query(`ALTER SEQUENCE cuartos_id_seq RESTART WITH ${maxId + 1}`);
        }

        console.log('✅ Cuartos migrados\n');
    }

    async migrateMantenimientos() {
        console.log('🔧 Migrando mantenimientos...');
        
        const mantenimientos = this.sqliteDb.prepare('SELECT * FROM mantenimientos').all();
        console.log(`   Encontrados ${mantenimientos.length} mantenimientos`);

        for (const mant of mantenimientos) {
            // Mapear campos de SQLite a PostgreSQL
            // En SQLite dia_alerta puede ser una fecha completa, necesitamos extraer solo el día
            let diaAlerta = null;
            if (mant.dia_alerta) {
                const fecha = new Date(mant.dia_alerta);
                if (!isNaN(fecha.getTime())) {
                    diaAlerta = fecha.getDate(); // Extraer solo el día (1-31)
                }
            }
            
            await this.pgPool.query(
                `INSERT INTO mantenimientos 
                (id, cuarto_id, descripcion, tipo, estado, fecha_creacion, fecha_programada, 
                 hora, dia_alerta, alerta_emitida, usuario_creador, notas) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
                ON CONFLICT (id) DO NOTHING`,
                [
                    mant.id, 
                    mant.cuarto_id, 
                    mant.descripcion, 
                    mant.tipo || 'normal',
                    mant.estado || 'pendiente', // Valor por defecto
                    mant.fecha_creacion || mant.fecha_registro, // SQLite usa 'fecha_registro'
                    mant.fecha_programada || null,
                    mant.hora || null,
                    diaAlerta, // Día extraído de la fecha
                    mant.alerta_emitida ? true : false, // SQLite usa INTEGER (0/1), PostgreSQL usa BOOLEAN
                    mant.usuario_creador || 'sistema',
                    mant.notas || null
                ]
            );
        }

        // Actualizar secuencia
        if (mantenimientos.length > 0) {
            const maxId = Math.max(...mantenimientos.map(m => m.id));
            await this.pgPool.query(`ALTER SEQUENCE mantenimientos_id_seq RESTART WITH ${maxId + 1}`);
        }

        console.log('✅ Mantenimientos migrados\n');
    }

    async showStatistics() {
        console.log('📊 Estadísticas de migración:');
        
        const edificios = await this.pgPool.query('SELECT COUNT(*) FROM edificios');
        const cuartos = await this.pgPool.query('SELECT COUNT(*) FROM cuartos');
        const mantenimientos = await this.pgPool.query('SELECT COUNT(*) FROM mantenimientos');

        console.log(`   Edificios: ${edificios.rows[0].count}`);
        console.log(`   Cuartos: ${cuartos.rows[0].count}`);
        console.log(`   Mantenimientos: ${mantenimientos.rows[0].count}`);
    }

    async close() {
        if (this.sqliteDb) {
            this.sqliteDb.close();
            console.log('\n🔌 Conexión SQLite cerrada');
        }
        if (this.pgPool) {
            await this.pgPool.end();
            console.log('🔌 Conexión PostgreSQL cerrada');
        }
    }
}

// Ejecutar migración
if (require.main === module) {
    const migrator = new DataMigrator();
    
    console.log('╔════════════════════════════════════════════╗');
    console.log('║  Migración SQLite → PostgreSQL             ║');
    console.log('║  JW Mantto - Sistema de Mantenimiento     ║');
    console.log('╚════════════════════════════════════════════╝\n');
    
    console.log('💡 Opciones:');
    console.log('   --clean : Limpiar datos existentes en PostgreSQL\n');

    migrator.migrate()
        .then(() => {
            console.log('\n👋 ¡Hasta luego!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Error fatal:', error.message);
            process.exit(1);
        });
}

module.exports = DataMigrator;
