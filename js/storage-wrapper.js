/**
 * ========================================
 * Storage Wrapper - Compatibilidad con localStorage/sessionStorage
 * ========================================
 * Proporciona una API compatible con localStorage usando IndexedDB
 * Permite migración gradual sin romper código existente
 */

import dbManager from './indexeddb-manager.js';

/**
 * Wrapper que emula la API de localStorage/sessionStorage usando IndexedDB
 */
class StorageWrapper {
  constructor(persistent = true) {
    this.persistent = persistent;
    this.storageType = persistent ? 'localStorage' : 'sessionStorage';
    this.prefix = persistent ? 'ls_' : 'ss_';
    this.cache = new Map(); // Cache en memoria para acceso sincrónico
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Inicializa el wrapper y carga datos en cache
   */
  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      await dbManager.ensureReady();

      // Cargar todos los datos de auth en cache
      const authData = await dbManager.getAll('auth');
      authData.forEach((item) => {
        if (item.persistent === this.persistent) {
          this.cache.set(item.key, item.value);
        }
      });

      // Cargar datos de cache
      const cacheData = await dbManager.getAll('cache');
      cacheData.forEach((item) => {
        // Verificar si no ha expirado
        if (!item.expiresAt || Date.now() < item.expiresAt) {
          this.cache.set(item.key, item.value);
        }
      });

      this.initialized = true;
      console.log(
        `✅ [StorageWrapper] ${this.storageType} inicializado con ${this.cache.size} elementos`
      );
    })();

    return this.initPromise;
  }

  /**
   * Asegura que el wrapper esté inicializado
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
    }
  }

  /**
   * setItem - Compatible con localStorage.setItem()
   * Modo sincrónico con persistencia asíncrona
   */
  setItem(key, value) {
    // Guardar en cache inmediatamente (sincrónico)
    this.cache.set(key, value);

    // Persistir en IndexedDB (asíncrono, no bloqueante)
    this.persistItem(key, value).catch((error) => {
      console.error(`❌ [StorageWrapper] Error persistiendo ${key}:`, error);
    });
  }

  /**
   * Persiste un item en IndexedDB
   */
  async persistItem(key, value) {
    await this.ensureInitialized();

    // Determinar si es un token/auth o datos generales
    const authKeys = [
      'accessToken',
      'refreshToken',
      'tokenType',
      'tokenExpiration',
      'sesionId',
      'currentUser',
      'usuarioActualId',
    ];

    if (authKeys.includes(key)) {
      await dbManager.setAuth(key, value, 'token', this.persistent);
    } else {
      await dbManager.setCache(key, value, 10080); // 1 semana
    }
  }

  /**
   * getItem - Compatible con localStorage.getItem()
   * Modo sincrónico con fallback a IndexedDB
   */
  getItem(key) {
    // Primero buscar en cache (sincrónico)
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Si no está en cache, intentar cargar de IndexedDB de forma asíncrona
    // pero devolver null inmediatamente (comportamiento de localStorage)
    this.loadItemFromDB(key);
    return null;
  }

  /**
   * Carga un item desde IndexedDB al cache
   */
  async loadItemFromDB(key) {
    try {
      await this.ensureInitialized();

      // Buscar en auth
      const authValue = await dbManager.getAuth(key);
      if (authValue !== null) {
        this.cache.set(key, authValue);
        return;
      }

      // Buscar en cache
      const cacheValue = await dbManager.getCache(key);
      if (cacheValue !== null) {
        this.cache.set(key, cacheValue);
      }
    } catch (error) {
      console.error(`❌ [StorageWrapper] Error cargando ${key}:`, error);
    }
  }

  /**
   * getItemAsync - Versión asíncrona de getItem (recomendada)
   */
  async getItemAsync(key) {
    await this.ensureInitialized();

    // Primero buscar en cache
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Buscar en auth
    const authValue = await dbManager.getAuth(key);
    if (authValue !== null) {
      this.cache.set(key, authValue);
      return authValue;
    }

    // Buscar en cache
    const cacheValue = await dbManager.getCache(key);
    if (cacheValue !== null) {
      this.cache.set(key, cacheValue);
      return cacheValue;
    }

    return null;
  }

  /**
   * removeItem - Compatible con localStorage.removeItem()
   */
  removeItem(key) {
    // Eliminar del cache inmediatamente
    this.cache.delete(key);

    // Eliminar de IndexedDB (asíncrono)
    this.deleteItemFromDB(key).catch((error) => {
      console.error(`❌ [StorageWrapper] Error eliminando ${key}:`, error);
    });
  }

  /**
   * Elimina un item de IndexedDB
   */
  async deleteItemFromDB(key) {
    await this.ensureInitialized();

    try {
      await dbManager.deleteAuth(key);
    } catch (error) {
      // Intentar eliminar del cache si no está en auth
      await dbManager.delete('cache', key);
    }
  }

  /**
   * clear - Compatible con localStorage.clear()
   */
  clear() {
    // Limpiar cache inmediatamente
    this.cache.clear();

    // Limpiar IndexedDB (asíncrono)
    this.clearDB().catch((error) => {
      console.error('❌ [StorageWrapper] Error limpiando storage:', error);
    });
  }

  /**
   * Limpia los datos de IndexedDB
   */
  async clearDB() {
    await this.ensureInitialized();

    if (this.persistent) {
      // Limpiar todo
      await dbManager.clear('auth');
      await dbManager.clear('cache');
    } else {
      // Solo limpiar datos no persistentes
      await dbManager.clearNonPersistentAuth();
    }
  }

  /**
   * key - Compatible con localStorage.key()
   */
  key(index) {
    const keys = Array.from(this.cache.keys());
    return keys[index] || null;
  }

  /**
   * length - Compatible con localStorage.length
   */
  get length() {
    return this.cache.size;
  }

  /**
   * Sincroniza el cache con IndexedDB (útil al iniciar la app)
   */
  async sync() {
    await this.ensureInitialized();
    console.log(`🔄 [StorageWrapper] ${this.storageType} sincronizado`);
  }
}

/**
 * Storage Manager - Gestiona ambos storages
 */
class StorageManager {
  constructor() {
    this.localStorage = new StorageWrapper(true);
    this.sessionStorage = new StorageWrapper(false);
    this.migrated = false;
  }

  /**
   * Inicializa ambos storages
   */
  async init() {
    console.log('🔧 [StorageManager] Inicializando storages...');

    await Promise.all([this.localStorage.init(), this.sessionStorage.init()]);

    // Realizar migración si es necesario
    if (!this.migrated) {
      await this.migrateFromNativeStorage();
      this.migrated = true;
    }

    console.log('✅ [StorageManager] Storages inicializados');
  }

  /**
   * Migra datos del localStorage/sessionStorage nativo
   */
  async migrateFromNativeStorage() {
    console.log(
      '🔄 [StorageManager] Verificando migración desde storage nativo...'
    );

    try {
      // Verificar si ya se migró
      const migrationFlag = window.localStorage.getItem(
        '__indexeddb_migrated__'
      );
      if (migrationFlag === 'true') {
        console.log(
          '✅ [StorageManager] Ya se realizó la migración anteriormente'
        );
        return;
      }

      // Realizar migración
      const migrated = await dbManager.migrateFromLocalStorage();

      if (migrated) {
        // Recargar cache
        await this.localStorage.init();
        await this.sessionStorage.init();

        // Marcar como migrado
        window.localStorage.setItem('__indexeddb_migrated__', 'true');

        console.log('✅ [StorageManager] Migración completada exitosamente');
      }
    } catch (error) {
      console.error('❌ [StorageManager] Error durante la migración:', error);
    }
  }

  /**
   * Obtiene estadísticas de almacenamiento
   */
  async getStats() {
    return {
      localStorage: {
        cached: this.localStorage.cache.size,
        persistent: true,
      },
      sessionStorage: {
        cached: this.sessionStorage.cache.size,
        persistent: false,
      },
      indexedDB: await dbManager.getStats(),
    };
  }
}

// Instancia global
const storageManager = new StorageManager();

/**
 * Reemplaza localStorage y sessionStorage con las versiones de IndexedDB
 * ADVERTENCIA: Solo usar si se quiere reemplazo completo
 */
export function replaceNativeStorage() {
  console.warn(
    '⚠️ [StorageWrapper] Reemplazando localStorage y sessionStorage nativos'
  );

  // Guardar referencias originales
  window._originalLocalStorage = window.localStorage;
  window._originalSessionStorage = window.sessionStorage;

  // Reemplazar con wrappers
  Object.defineProperty(window, 'localStorage', {
    get: () => storageManager.localStorage,
    configurable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    get: () => storageManager.sessionStorage,
    configurable: true,
  });
}

/**
 * Restaura localStorage y sessionStorage originales
 */
export function restoreNativeStorage() {
  if (window._originalLocalStorage) {
    Object.defineProperty(window, 'localStorage', {
      get: () => window._originalLocalStorage,
      configurable: true,
    });
  }

  if (window._originalSessionStorage) {
    Object.defineProperty(window, 'sessionStorage', {
      get: () => window._originalSessionStorage,
      configurable: true,
    });
  }

  console.log('✅ [StorageWrapper] Storage nativo restaurado');
}

// Inicializar automáticamente
if (typeof window !== 'undefined') {
  window.storageManager = storageManager;

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      storageManager.init().catch((error) => {
        console.error('❌ [StorageManager] Error al inicializar:', error);
      });
    });
  } else {
    storageManager.init().catch((error) => {
      console.error('❌ [StorageManager] Error al inicializar:', error);
    });
  }
}

export { storageManager, StorageWrapper };
export default storageManager;
