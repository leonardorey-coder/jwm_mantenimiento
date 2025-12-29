/**
 * ========================================
 * IndexedDB Manager - Sistema de Almacenamiento Local
 * ========================================
 * Migración completa de localStorage/sessionStorage a IndexedDB
 * Basado en el esquema de base de datos PostgreSQL
 */

const DB_NAME = 'jwm_mant_cuartos_db';
const DB_VERSION = 1;

class IndexedDBManager {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.initPromise = null;
  }

  /**
   * Inicializa la base de datos IndexedDB
   */
  async init() {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error(
          '❌ [IndexedDB] Error al abrir la base de datos:',
          request.error
        );
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isReady = true;
        console.log('✅ [IndexedDB] Base de datos abierta correctamente');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log(
          '🔧 [IndexedDB] Actualizando estructura de la base de datos...'
        );

        // Store: auth - Autenticación y tokens
        if (!db.objectStoreNames.contains('auth')) {
          const authStore = db.createObjectStore('auth', { keyPath: 'key' });
          authStore.createIndex('type', 'type', { unique: false });
          authStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('✅ [IndexedDB] Store "auth" creada');
        }

        // Store: usuarios - Usuarios del sistema
        if (!db.objectStoreNames.contains('usuarios')) {
          const usuariosStore = db.createObjectStore('usuarios', {
            keyPath: 'id',
          });
          usuariosStore.createIndex('username', 'username', { unique: false });
          usuariosStore.createIndex('email', 'email', { unique: false });
          usuariosStore.createIndex('rol_id', 'rol_id', { unique: false });
          usuariosStore.createIndex('activo', 'activo', { unique: false });
          console.log('✅ [IndexedDB] Store "usuarios" creada');
        }

        // Store: edificios - Edificios
        if (!db.objectStoreNames.contains('edificios')) {
          const edificiosStore = db.createObjectStore('edificios', {
            keyPath: 'id',
          });
          edificiosStore.createIndex('nombre', 'nombre', { unique: false });
          console.log('✅ [IndexedDB] Store "edificios" creada');
        }

        // Store: cuartos - Habitaciones
        if (!db.objectStoreNames.contains('cuartos')) {
          const cuartosStore = db.createObjectStore('cuartos', {
            keyPath: 'id',
          });
          cuartosStore.createIndex('numero', 'numero', { unique: false });
          cuartosStore.createIndex('edificio_id', 'edificio_id', {
            unique: false,
          });
          cuartosStore.createIndex('estado', 'estado', { unique: false });
          console.log('✅ [IndexedDB] Store "cuartos" creada');
        }

        // Store: mantenimientos - Registros de mantenimiento
        if (!db.objectStoreNames.contains('mantenimientos')) {
          const mantStore = db.createObjectStore('mantenimientos', {
            keyPath: 'id',
          });
          mantStore.createIndex('cuarto_id', 'cuarto_id', { unique: false });
          mantStore.createIndex('tipo', 'tipo', { unique: false });
          mantStore.createIndex('estado', 'estado', { unique: false });
          mantStore.createIndex('fecha_registro', 'fecha_registro', {
            unique: false,
          });
          mantStore.createIndex('dia_alerta', 'dia_alerta', { unique: false });
          console.log('✅ [IndexedDB] Store "mantenimientos" creada');
        }

        // Store: cache - Datos temporales y preferencias
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
          cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          console.log('✅ [IndexedDB] Store "cache" creada');
        }

        // Store: sync_queue - Cola de sincronización offline
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('status', 'status', { unique: false });
          console.log('✅ [IndexedDB] Store "sync_queue" creada');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Asegura que la base de datos esté lista
   */
  async ensureReady() {
    if (!this.isReady) {
      await this.init();
    }
    return this.db;
  }

  // ========================================
  // OPERACIONES GENÉRICAS
  // ========================================

  /**
   * Guarda un registro en una store
   */
  async set(storeName, data) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene un registro por su clave primaria
   */
  async get(storeName, key) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene todos los registros de una store
   */
  async getAll(storeName) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Elimina un registro por su clave primaria
   */
  async delete(storeName, key) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpia todos los registros de una store
   */
  async clear(storeName) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obtiene registros por índice
   */
  async getByIndex(storeName, indexName, value) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Guarda múltiples registros en una transacción
   */
  async setMultiple(storeName, dataArray) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      let completed = 0;
      const errors = [];

      dataArray.forEach((data, index) => {
        const request = store.put(data);

        request.onsuccess = () => {
          completed++;
          if (completed === dataArray.length) {
            resolve({ success: completed, errors });
          }
        };

        request.onerror = () => {
          errors.push({ index, error: request.error });
          completed++;
          if (completed === dataArray.length) {
            resolve({ success: completed - errors.length, errors });
          }
        };
      });
    });
  }

  // ========================================
  // OPERACIONES DE AUTENTICACIÓN
  // ========================================

  /**
   * Guarda los tokens de autenticación
   */
  async setAuth(key, value, type = 'token', persistent = true) {
    const authData = {
      key,
      value,
      type,
      persistent,
      timestamp: Date.now(),
    };
    return this.set('auth', authData);
  }

  /**
   * Obtiene un valor de autenticación
   */
  async getAuth(key) {
    const data = await this.get('auth', key);
    return data ? data.value : null;
  }

  /**
   * Elimina un valor de autenticación
   */
  async deleteAuth(key) {
    return this.delete('auth', key);
  }

  /**
   * Limpia todos los datos de autenticación no persistentes
   */
  async clearNonPersistentAuth() {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['auth'], 'readwrite');
      const store = transaction.objectStore('auth');
      const index = store.index('type');
      const request = index.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (!cursor.value.persistent) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ========================================
  // OPERACIONES DE CACHE
  // ========================================

  /**
   * Guarda en cache con tiempo de expiración
   */
  async setCache(key, value, ttlMinutes = 60) {
    const cacheData = {
      key,
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    };
    return this.set('cache', cacheData);
  }

  /**
   * Obtiene un valor del cache (si no ha expirado)
   */
  async getCache(key) {
    const data = await this.get('cache', key);
    if (!data) return null;

    // Verificar si expiró
    if (data.expiresAt && Date.now() > data.expiresAt) {
      await this.delete('cache', key);
      return null;
    }

    return data.value;
  }

  /**
   * Limpia entradas expiradas del cache
   */
  async cleanExpiredCache() {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const index = store.index('expiresAt');
      const request = index.openCursor();
      const now = Date.now();
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.expiresAt && cursor.value.expiresAt < now) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          console.log(
            `🧹 [IndexedDB] Cache limpiado: ${deletedCount} entradas eliminadas`
          );
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ========================================
  // OPERACIONES ESPECÍFICAS DE DATOS
  // ========================================

  /**
   * Guarda usuarios
   */
  async setUsuarios(usuarios) {
    return this.setMultiple('usuarios', usuarios);
  }

  /**
   * Obtiene todos los usuarios activos
   */
  async getUsuariosActivos() {
    return this.getByIndex('usuarios', 'activo', true);
  }

  /**
   * Guarda edificios
   */
  async setEdificios(edificios) {
    return this.setMultiple('edificios', edificios);
  }

  /**
   * Guarda cuartos
   */
  async setCuartos(cuartos) {
    return this.setMultiple('cuartos', cuartos);
  }

  /**
   * Obtiene cuartos por edificio
   */
  async getCuartosByEdificio(edificioId) {
    return this.getByIndex('cuartos', 'edificio_id', edificioId);
  }

  /**
   * Obtiene cuartos por estado
   */
  async getCuartosByEstado(estado) {
    return this.getByIndex('cuartos', 'estado', estado);
  }

  /**
   * Guarda mantenimientos
   */
  async setMantenimientos(mantenimientos) {
    return this.setMultiple('mantenimientos', mantenimientos);
  }

  /**
   * Obtiene mantenimientos por cuarto
   */
  async getMantenimientosByCuarto(cuartoId) {
    return this.getByIndex('mantenimientos', 'cuarto_id', cuartoId);
  }

  /**
   * Obtiene mantenimientos pendientes
   */
  async getMantenimientosPendientes() {
    return this.getByIndex('mantenimientos', 'estado', 'pendiente');
  }

  // ========================================
  // COLA DE SINCRONIZACIÓN OFFLINE
  // ========================================

  /**
   * Agrega una operación a la cola de sincronización
   */
  async addToSyncQueue(operation) {
    const syncData = {
      ...operation,
      timestamp: Date.now(),
      status: 'pending',
    };
    return this.set('sync_queue', syncData);
  }

  /**
   * Obtiene operaciones pendientes de sincronización
   */
  async getPendingSyncOperations() {
    return this.getByIndex('sync_queue', 'status', 'pending');
  }

  /**
   * Marca una operación como completada
   */
  async markSyncOperationComplete(id) {
    const operation = await this.get('sync_queue', id);
    if (operation) {
      operation.status = 'completed';
      operation.completedAt = Date.now();
      return this.set('sync_queue', operation);
    }
  }

  /**
   * Elimina operaciones completadas antiguas
   */
  async cleanCompletedSyncOperations(olderThanDays = 7) {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.openCursor();
      const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value;
          if (
            record.status === 'completed' &&
            record.completedAt < cutoffTime
          ) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          console.log(
            `🧹 [IndexedDB] Cola de sincronización limpiada: ${deletedCount} operaciones eliminadas`
          );
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ========================================
  // MIGRACIÓN DESDE LOCALSTORAGE
  // ========================================

  /**
   * Migra datos existentes de localStorage a IndexedDB
   */
  async migrateFromLocalStorage() {
    console.log('🔄 [IndexedDB] Iniciando migración desde localStorage...');

    try {
      // Migrar tokens de autenticación
      const authKeys = [
        'accessToken',
        'refreshToken',
        'tokenType',
        'tokenExpiration',
        'sesionId',
        'currentUser',
        'usuarioActualId',
      ];

      for (const key of authKeys) {
        const localValue = localStorage.getItem(key);
        const sessionValue = sessionStorage.getItem(key);

        if (localValue) {
          let value = localValue;
          try {
            value = JSON.parse(localValue);
          } catch (e) {
            // No es JSON, usar como string
          }
          await this.setAuth(key, value, 'token', true);
          console.log(`✅ Migrado de localStorage: ${key}`);
        } else if (sessionValue) {
          let value = sessionValue;
          try {
            value = JSON.parse(sessionValue);
          } catch (e) {
            // No es JSON, usar como string
          }
          await this.setAuth(key, value, 'token', false);
          console.log(`✅ Migrado de sessionStorage: ${key}`);
        }
      }

      // Migrar datos en cache
      const cacheKeys = [
        'ultimosCuartos',
        'ultimosEdificios',
        'ultimosMantenimientos',
        'ultimosUsuarios',
        'theme',
      ];

      for (const key of cacheKeys) {
        const value = localStorage.getItem(key);
        if (value) {
          let parsedValue = value;
          try {
            parsedValue = JSON.parse(value);
          } catch (e) {
            // No es JSON, usar como string
          }

          // Guardar en las stores correspondientes
          if (key === 'ultimosCuartos' && Array.isArray(parsedValue)) {
            await this.setCuartos(parsedValue);
            console.log(`✅ Migrado: ${parsedValue.length} cuartos`);
          } else if (key === 'ultimosEdificios' && Array.isArray(parsedValue)) {
            await this.setEdificios(parsedValue);
            console.log(`✅ Migrado: ${parsedValue.length} edificios`);
          } else if (
            key === 'ultimosMantenimientos' &&
            Array.isArray(parsedValue)
          ) {
            await this.setMantenimientos(parsedValue);
            console.log(`✅ Migrado: ${parsedValue.length} mantenimientos`);
          } else if (key === 'ultimosUsuarios' && Array.isArray(parsedValue)) {
            await this.setUsuarios(parsedValue);
            console.log(`✅ Migrado: ${parsedValue.length} usuarios`);
          } else {
            await this.setCache(key, parsedValue, 10080); // 1 semana
            console.log(`✅ Migrado a cache: ${key}`);
          }
        }
      }

      console.log('✅ [IndexedDB] Migración completada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ [IndexedDB] Error durante la migración:', error);
      return false;
    }
  }

  /**
   * Limpia localStorage después de una migración exitosa
   */
  async clearLocalStorageAfterMigration() {
    console.log(
      '🧹 [IndexedDB] Limpiando localStorage después de migración...'
    );

    const keysToRemove = [
      'ultimosCuartos',
      'ultimosEdificios',
      'ultimosMantenimientos',
      'ultimosUsuarios',
      // No eliminamos tokens por seguridad, solo datos en cache
    ];

    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    console.log('✅ [IndexedDB] localStorage limpiado');
  }

  // ========================================
  // CIERRE Y LIMPIEZA
  // ========================================

  /**
   * Cierra la conexión a la base de datos de forma limpia
   */
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        console.log('🛑 [IndexedDB] Cerrando conexión a la base de datos...');
        this.db.close();
        this.db = null;
        this.isReady = false;
        this.initPromise = null;
        console.log('✅ [IndexedDB] Conexión cerrada correctamente');
      }
      resolve();
    });
  }

  // ========================================
  // UTILIDADES
  // ========================================

  /**
   * Obtiene estadísticas de la base de datos
   */
  async getStats() {
    await this.ensureReady();

    const stores = [
      'auth',
      'usuarios',
      'edificios',
      'cuartos',
      'mantenimientos',
      'cache',
      'sync_queue',
    ];
    const stats = {};

    for (const storeName of stores) {
      const data = await this.getAll(storeName);
      stats[storeName] = data.length;
    }

    return stats;
  }

  /**
   * Exporta todos los datos (para backup)
   */
  async exportData() {
    await this.ensureReady();

    const stores = [
      'auth',
      'usuarios',
      'edificios',
      'cuartos',
      'mantenimientos',
      'cache',
      'sync_queue',
    ];
    const exportData = {
      version: DB_VERSION,
      exportDate: new Date().toISOString(),
      data: {},
    };

    for (const storeName of stores) {
      exportData.data[storeName] = await this.getAll(storeName);
    }

    return exportData;
  }

  /**
   * Limpia toda la base de datos
   */
  async clearAll() {
    await this.ensureReady();

    const stores = [
      'auth',
      'usuarios',
      'edificios',
      'cuartos',
      'mantenimientos',
      'cache',
      'sync_queue',
    ];

    for (const storeName of stores) {
      await this.clear(storeName);
    }

    console.log('🧹 [IndexedDB] Toda la base de datos ha sido limpiada');
  }
}

// Instancia global del manager
const dbManager = new IndexedDBManager();

// Inicializar automáticamente cuando se carga el script
if (typeof window !== 'undefined') {
  dbManager.init().catch((error) => {
    console.error('❌ [IndexedDB] Error al inicializar:', error);
  });
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.dbManager = dbManager;
}

// Exportar para módulos ES6
export default dbManager;
