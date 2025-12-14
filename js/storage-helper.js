/**
 * ========================================
 * Storage Helper - Funciones de Alto Nivel
 * ========================================
 * Funciones helper para facilitar el uso de IndexedDB
 * en el código existente sin cambios mayores
 */

import dbManager from './indexeddb-manager.js';

/**
 * Clase helper para operaciones de almacenamiento
 */
class StorageHelper {
    constructor() {
        this.dbManager = dbManager;
        this.ready = false;
        this.initPromise = null;
        this.indexedDBAvailable = true; // Flag para indicar si IndexedDB está disponible
    }

    /**
     * Inicializa el helper
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                await this.dbManager.init();

                // Realizar migración automática si es necesario
                const migrated = localStorage.getItem('__indexeddb_migrated__');
                if (migrated !== 'true') {
                    await this.dbManager.migrateFromLocalStorage();
                    localStorage.setItem('__indexeddb_migrated__', 'true');
                    console.log('✅ [StorageHelper] Migración automática completada');
                }

                this.indexedDBAvailable = true;
                console.log('✅ [StorageHelper] Helper inicializado con IndexedDB');
            } catch (error) {
                console.warn('⚠️ [StorageHelper] IndexedDB no disponible, usando fallbacks:', error.message);
                this.indexedDBAvailable = false;
            }

            this.ready = true;
            console.log('✅ [StorageHelper] Helper inicializado');
        })();

        return this.initPromise;
    }

    // ========================================
    // AUTENTICACIÓN
    // ========================================

    /**
     * Guarda los tokens de autenticación
     */
    async saveAuthTokens(tokens, persistent = true) {
        await this.init();

        if (!this.indexedDBAvailable) {
            console.warn('⚠️ [Auth] IndexedDB no disponible, tokens no guardados en IDB');
            return;
        }

        const { accessToken, refreshToken, tokenType = 'Bearer', expiresIn, sesionId } = tokens;

        try {
            await Promise.all([
                this.dbManager.setAuth('accessToken', accessToken, 'token', persistent),
                this.dbManager.setAuth('refreshToken', refreshToken, 'token', persistent),
                this.dbManager.setAuth('tokenType', tokenType, 'token', persistent),
                this.dbManager.setAuth('tokenExpiration', expiresIn, 'token', persistent),
                sesionId && this.dbManager.setAuth('sesionId', sesionId, 'token', persistent)
            ].filter(Boolean));

            console.log('✅ [Auth] Tokens guardados en IndexedDB');
        } catch (error) {
            console.warn('⚠️ [Auth] Error guardando tokens:', error.message);
        }
    }

    /**
     * Obtiene el token de acceso
     */
    async getAccessToken() {
        await this.init();
        if (!this.indexedDBAvailable) return null;
        try {
            return await this.dbManager.getAuth('accessToken');
        } catch (error) {
            console.warn('⚠️ [Auth] Error obteniendo token:', error.message);
            return null;
        }
    }

    /**
     * Obtiene el refresh token
     */
    async getRefreshToken() {
        await this.init();
        if (!this.indexedDBAvailable) return null;
        try {
            return await this.dbManager.getAuth('refreshToken');
        } catch (error) {
            console.warn('⚠️ [Auth] Error obteniendo refresh token:', error.message);
            return null;
        }
    }

    /**
     * Obtiene el tipo de token
     */
    async getTokenType() {
        await this.init();
        if (!this.indexedDBAvailable) return 'Bearer';
        try {
            const type = await this.dbManager.getAuth('tokenType');
            return type || 'Bearer';
        } catch (error) {
            console.warn('⚠️ [Auth] Error obteniendo tipo de token:', error.message);
            return 'Bearer';
        }
    }

    /**
     * Guarda el usuario actual
     */
    async saveCurrentUser(user, persistent = true) {
        await this.init();
        if (!this.indexedDBAvailable) {
            console.warn('⚠️ [Auth] IndexedDB no disponible, usuario no guardado en IDB');
            return;
        }
        try {
            await this.dbManager.setAuth('currentUser', user, 'user', persistent);

            if (user.id) {
                await this.dbManager.setAuth('usuarioActualId', user.id, 'user', persistent);
            }

            console.log('✅ [Auth] Usuario actual guardado:', user.username);
        } catch (error) {
            console.warn('⚠️ [Auth] Error guardando usuario:', error.message);
        }
    }

    /**
     * Obtiene el usuario actual
     */
    async getCurrentUser() {
        await this.init();
        if (!this.indexedDBAvailable) return null;
        try {
            return await this.dbManager.getAuth('currentUser');
        } catch (error) {
            console.warn('⚠️ [Auth] Error obteniendo usuario actual:', error.message);
            return null;
        }
    }

    /**
     * Obtiene el ID del usuario actual
     */
    async getCurrentUserId() {
        await this.init();
        if (!this.indexedDBAvailable) return null;
        try {
            return await this.dbManager.getAuth('usuarioActualId');
        } catch (error) {
            console.warn('⚠️ [Auth] Error obteniendo ID de usuario:', error.message);
            return null;
        }
    }

    /**
     * Limpia los datos de autenticación
     */
    async clearAuth(persistent = true) {
        await this.init();
        if (!this.indexedDBAvailable) {
            console.warn('⚠️ [Auth] IndexedDB no disponible, limpieza omitida');
            return;
        }

        try {
            const authKeys = [
                'accessToken',
                'refreshToken',
                'tokenType',
                'tokenExpiration',
                'sesionId',
                'currentUser',
                'usuarioActualId'
            ];

            await Promise.all(
                authKeys.map(key => this.dbManager.deleteAuth(key))
            );

            console.log('✅ [Auth] Datos de autenticación limpiados');
        } catch (error) {
            console.warn('⚠️ [Auth] Error limpiando auth:', error.message);
        }
    }

    /**
     * Verifica si hay sesión activa
     */
    async hasActiveSession() {
        await this.init();
        const token = await this.getAccessToken();
        return token !== null;
    }

    // ========================================
    // DATOS DE LA APLICACIÓN
    // ========================================

    /**
     * Guarda los cuartos
     */
    async saveCuartos(cuartos) {
        await this.init();

        if (!Array.isArray(cuartos)) {
            console.error('❌ [StorageHelper] saveCuartos: se esperaba un array');
            return;
        }

        if (!this.indexedDBAvailable) {
            console.warn('⚠️ [Data] IndexedDB no disponible, cuartos no guardados en IDB');
            return { success: 0, errors: [] };
        }

        try {
            const result = await this.dbManager.setCuartos(cuartos);
            console.log(`✅ [Data] ${result.success} cuartos guardados en IndexedDB`);

            // También guardar en cache para acceso rápido
            await this.dbManager.setCache('ultimosCuartos', cuartos, 60);

            return result;
        } catch (error) {
            console.warn('⚠️ [Data] Error guardando cuartos:', error.message);
            return { success: 0, errors: [error] };
        }
    }

    /**
     * Obtiene todos los cuartos
     */
    async getCuartos() {
        await this.init();
        if (!this.indexedDBAvailable) return [];
        try {
            return await this.dbManager.getAll('cuartos');
        } catch (error) {
            console.warn('⚠️ [Data] Error obteniendo cuartos:', error.message);
            return [];
        }
    }

    /**
     * Guarda los edificios
     */
    async saveEdificios(edificios) {
        await this.init();

        if (!Array.isArray(edificios)) {
            console.error('❌ [StorageHelper] saveEdificios: se esperaba un array');
            return;
        }

        if (!this.indexedDBAvailable) {
            console.warn('⚠️ [Data] IndexedDB no disponible, edificios no guardados en IDB');
            return { success: 0, errors: [] };
        }

        try {
            const result = await this.dbManager.setEdificios(edificios);
            console.log(`✅ [Data] ${result.success} edificios guardados en IndexedDB`);

            await this.dbManager.setCache('ultimosEdificios', edificios, 60);

            return result;
        } catch (error) {
            console.warn('⚠️ [Data] Error guardando edificios:', error.message);
            return { success: 0, errors: [error] };
        }
    }

    /**
     * Obtiene todos los edificios
     */
    async getEdificios() {
        await this.init();
        if (!this.indexedDBAvailable) return [];
        try {
            return await this.dbManager.getAll('edificios');
        } catch (error) {
            console.warn('⚠️ [Data] Error obteniendo edificios:', error.message);
            return [];
        }
    }

    /**
     * Guarda los mantenimientos
     */
    async saveMantenimientos(mantenimientos) {
        await this.init();

        if (!Array.isArray(mantenimientos)) {
            console.error('❌ [StorageHelper] saveMantenimientos: se esperaba un array');
            return;
        }

        if (!this.indexedDBAvailable) {
            console.warn('⚠️ [Data] IndexedDB no disponible, mantenimientos no guardados en IDB');
            return { success: 0, errors: [] };
        }

        try {
            const result = await this.dbManager.setMantenimientos(mantenimientos);
            console.log(`✅ [Data] ${result.success} mantenimientos guardados en IndexedDB`);

            await this.dbManager.setCache('ultimosMantenimientos', mantenimientos, 60);

            return result;
        } catch (error) {
            console.warn('⚠️ [Data] Error guardando mantenimientos:', error.message);
            return { success: 0, errors: [error] };
        }
    }

    /**
     * Obtiene todos los mantenimientos
     */
    async getMantenimientos() {
        await this.init();
        if (!this.indexedDBAvailable) return [];
        try {
            return await this.dbManager.getAll('mantenimientos');
        } catch (error) {
            console.warn('⚠️ [Data] Error obteniendo mantenimientos:', error.message);
            return [];
        }
    }

    /**
     * Guarda los usuarios
     */
    async saveUsuarios(usuarios) {
        await this.init();

        if (!Array.isArray(usuarios)) {
            console.error('❌ [StorageHelper] saveUsuarios: se esperaba un array');
            return;
        }

        if (!this.indexedDBAvailable) {
            console.warn('⚠️ [Data] IndexedDB no disponible, usuarios no guardados en IDB');
            return { success: 0, errors: [] };
        }

        try {
            const result = await this.dbManager.setUsuarios(usuarios);
            console.log(`✅ [Data] ${result.success} usuarios guardados en IndexedDB`);

            await this.dbManager.setCache('ultimosUsuarios', usuarios, 60);

            return result;
        } catch (error) {
            console.warn('⚠️ [Data] Error guardando usuarios:', error.message);
            return { success: 0, errors: [error] };
        }
    }

    /**
     * Obtiene todos los usuarios
     */
    async getUsuarios() {
        await this.init();
        if (!this.indexedDBAvailable) return [];
        try {
            return await this.dbManager.getAll('usuarios');
        } catch (error) {
            console.warn('⚠️ [Data] Error obteniendo usuarios:', error.message);
            return [];
        }
    }

    /**
     * Guarda todos los datos de la aplicación
     */
    async saveAllData(data) {
        await this.init();

        const { cuartos, edificios, mantenimientos, usuarios } = data;

        const results = await Promise.allSettled([
            cuartos && this.saveCuartos(cuartos),
            edificios && this.saveEdificios(edificios),
            mantenimientos && this.saveMantenimientos(mantenimientos),
            usuarios && this.saveUsuarios(usuarios)
        ].filter(Boolean));

        const successful = results.filter(r => r.status === 'fulfilled').length;
        console.log(`✅ [Data] ${successful}/${results.length} operaciones completadas`);

        return results;
    }

    /**
     * Obtiene todos los datos de la aplicación
     */
    async getAllData() {
        await this.init();

        const [cuartos, edificios, mantenimientos, usuarios] = await Promise.all([
            this.getCuartos(),
            this.getEdificios(),
            this.getMantenimientos(),
            this.getUsuarios()
        ]);

        return { cuartos, edificios, mantenimientos, usuarios };
    }

    /**
     * Intenta cargar datos desde IndexedDB (modo offline)
     */
    async loadOfflineData() {
        await this.init();

        console.log('🔄 [StorageHelper] Cargando datos offline desde IndexedDB...');

        const data = await this.getAllData();

        const hasData = data.cuartos.length > 0 ||
            data.edificios.length > 0 ||
            data.mantenimientos.length > 0 ||
            data.usuarios.length > 0;

        if (hasData) {
            console.log('✅ [StorageHelper] Datos offline cargados:', {
                cuartos: data.cuartos.length,
                edificios: data.edificios.length,
                mantenimientos: data.mantenimientos.length,
                usuarios: data.usuarios.length
            });
        } else {
            console.log('⚠️ [StorageHelper] No hay datos offline disponibles');
        }

        return { hasData, data };
    }

    // ========================================
    // PREFERENCIAS Y CONFIGURACIÓN
    // ========================================

    /**
     * Guarda el tema
     */
    async saveTheme(theme) {
        await this.init();
        await this.dbManager.setCache('theme', theme, 525600); // 1 año
        console.log(`✅ [Config] Tema guardado: ${theme}`);
    }

    /**
     * Obtiene el tema
     */
    async getTheme() {
        await this.init();
        const theme = await this.dbManager.getCache('theme');
        return theme || 'light';
    }

    /**
     * Guarda una preferencia
     */
    async savePreference(key, value) {
        await this.init();
        await this.dbManager.setCache(`pref_${key}`, value, 525600); // 1 año
    }

    /**
     * Obtiene una preferencia
     */
    async getPreference(key) {
        await this.init();
        return await this.dbManager.getCache(`pref_${key}`);
    }

    // ========================================
    // COLA DE SINCRONIZACIÓN OFFLINE
    // ========================================

    /**
     * Agrega una operación a la cola de sincronización
     */
    async addToSyncQueue(type, endpoint, method, data) {
        await this.init();

        const operation = {
            type,
            endpoint,
            method,
            data,
            retries: 0,
            maxRetries: 3
        };

        await this.dbManager.addToSyncQueue(operation);
        console.log(`✅ [Sync] Operación agregada a la cola: ${type}`);
    }

    /**
     * Procesa la cola de sincronización
     */
    async processSyncQueue(apiBaseUrl) {
        await this.init();

        const operations = await this.dbManager.getPendingSyncOperations();

        if (operations.length === 0) {
            console.log('✅ [Sync] No hay operaciones pendientes');
            return { success: 0, failed: 0 };
        }

        console.log(`🔄 [Sync] Procesando ${operations.length} operaciones pendientes...`);

        let success = 0;
        let failed = 0;

        for (const operation of operations) {
            try {
                const token = await this.getAccessToken();
                const response = await fetch(`${apiBaseUrl}${operation.endpoint}`, {
                    method: operation.method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(operation.data)
                });

                if (response.ok) {
                    await this.dbManager.markSyncOperationComplete(operation.id);
                    success++;
                    console.log(`✅ [Sync] Operación completada: ${operation.type}`);
                } else {
                    failed++;
                    console.error(`❌ [Sync] Error en operación ${operation.type}:`, response.status);
                }
            } catch (error) {
                failed++;
                console.error(`❌ [Sync] Error procesando ${operation.type}:`, error);
            }
        }

        console.log(`✅ [Sync] Sincronización completada: ${success} exitosas, ${failed} fallidas`);

        return { success, failed, total: operations.length };
    }

    // ========================================
    // MANTENIMIENTO
    // ========================================

    /**
     * Limpia datos expirados
     */
    async cleanExpiredData() {
        await this.init();

        const cacheDeleted = await this.dbManager.cleanExpiredCache();
        const syncDeleted = await this.dbManager.cleanCompletedSyncOperations();

        console.log(`🧹 [Maintenance] Limpieza completada: ${cacheDeleted} cache, ${syncDeleted} sync`);

        return { cacheDeleted, syncDeleted };
    }

    /**
     * Obtiene estadísticas de almacenamiento
     */
    async getStorageStats() {
        await this.init();
        return await this.dbManager.getStats();
    }

    /**
     * Exporta todos los datos (backup)
     */
    async exportBackup() {
        await this.init();
        const data = await this.dbManager.exportData();

        // Crear blob para descarga
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Crear link de descarga
        const a = document.createElement('a');
        a.href = url;
        a.download = `jwm-backup-${new Date().toISOString()}.json`;
        a.click();

        URL.revokeObjectURL(url);

        console.log('✅ [Backup] Datos exportados');
    }

    /**
     * Limpia todos los datos
     */
    async clearAllData() {
        await this.init();

        const confirmed = window.electronSafeConfirm ? window.electronSafeConfirm('¿Estás seguro de que quieres eliminar todos los datos locales?') : confirm('¿Estás seguro de que quieres eliminar todos los datos locales?');
        if (!confirmed) return false;

        await this.dbManager.clearAll();
        console.log('🧹 [Maintenance] Todos los datos han sido eliminados');

        return true;
    }

    // ========================================
    // UTILIDADES
    // ========================================

    /**
     * Verifica si IndexedDB está disponible
     */
    isIndexedDBAvailable() {
        return 'indexedDB' in window;
    }

    /**
     * Obtiene el tamaño estimado del almacenamiento
     */
    async getStorageEstimate() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            return await navigator.storage.estimate();
        }
        return null;
    }

    /**
     * Muestra información de almacenamiento
     */
    async showStorageInfo() {
        const stats = await this.getStorageStats();
        const estimate = await this.getStorageEstimate();

        console.group('📊 [Storage Info]');
        console.log('IndexedDB Stats:', stats);
        if (estimate) {
            console.log('Storage Estimate:', {
                usage: `${(estimate.usage / 1024 / 1024).toFixed(2)} MB`,
                quota: `${(estimate.quota / 1024 / 1024).toFixed(2)} MB`,
                percent: `${((estimate.usage / estimate.quota) * 100).toFixed(2)}%`
            });
        }
        console.groupEnd();

        return { stats, estimate };
    }
}

// Instancia global
const storageHelper = new StorageHelper();

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.storageHelper = storageHelper;
}

export default storageHelper;
