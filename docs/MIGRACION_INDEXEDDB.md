# Migración de localStorage a IndexedDB

## 📋 Resumen

Se ha implementado una migración completa del sistema de almacenamiento de **localStorage/sessionStorage** a **IndexedDB**, proporcionando mayor capacidad, mejor rendimiento y estructura de datos más robusta para la aplicación PWA.

## 🎯 Objetivos Alcanzados

✅ **Mayor capacidad de almacenamiento**: IndexedDB permite almacenar más datos que localStorage (hasta 50MB+)
✅ **Mejor rendimiento**: Operaciones asíncronas que no bloquean el hilo principal
✅ **Estructura de datos robusta**: Basada en el esquema de la base de datos PostgreSQL
✅ **Soporte offline mejorado**: Mejor gestión de datos para funcionalidad offline
✅ **Cola de sincronización**: Sistema para sincronizar operaciones cuando se recupera la conexión
✅ **Compatibilidad retroactiva**: Mantiene soporte para localStorage como fallback

## 🏗️ Arquitectura

### Módulos Creados

#### 1. `indexeddb-manager.js`

**Responsabilidad**: Gestión de bajo nivel de IndexedDB

**Stores creadas**:

- `auth` - Tokens de autenticación y datos de sesión
- `usuarios` - Usuarios del sistema
- `edificios` - Edificios
- `cuartos` - Habitaciones
- `mantenimientos` - Registros de mantenimiento
- `cache` - Datos temporales y preferencias
- `sync_queue` - Cola de sincronización offline

**Índices implementados**:

```javascript
// Store: auth
-key(primary) -
  type -
  timestamp -
  // Store: usuarios
  id(primary) -
  username -
  email -
  rol_id -
  activo -
  // Store: cuartos
  id(primary) -
  numero -
  edificio_id -
  estado -
  // Store: mantenimientos
  id(primary) -
  cuarto_id -
  tipo -
  estado -
  fecha_registro -
  dia_alerta -
  // Store: cache
  key(primary) -
  timestamp -
  expiresAt;
```

**Métodos principales**:

```javascript
// Operaciones genéricas
await dbManager.set(storeName, data);
await dbManager.get(storeName, key);
await dbManager.getAll(storeName);
await dbManager.delete(storeName, key);
await dbManager.clear(storeName);
await dbManager.getByIndex(storeName, indexName, value);
await dbManager.setMultiple(storeName, dataArray);

// Operaciones de autenticación
await dbManager.setAuth(key, value, type, persistent);
await dbManager.getAuth(key);
await dbManager.deleteAuth(key);

// Operaciones de cache
await dbManager.setCache(key, value, ttlMinutes);
await dbManager.getCache(key);
await dbManager.cleanExpiredCache();

// Cola de sincronización
await dbManager.addToSyncQueue(operation);
await dbManager.getPendingSyncOperations();
await dbManager.markSyncOperationComplete(id);
```

#### 2. `storage-helper.js`

**Responsabilidad**: API de alto nivel para operaciones comunes

**Métodos principales**:

```javascript
// Autenticación
await storageHelper.saveAuthTokens(tokens, persistent);
await storageHelper.getAccessToken();
await storageHelper.getRefreshToken();
await storageHelper.saveCurrentUser(user, persistent);
await storageHelper.getCurrentUser();
await storageHelper.clearAuth();
await storageHelper.hasActiveSession();

// Datos de la aplicación
await storageHelper.saveCuartos(cuartos);
await storageHelper.getCuartos();
await storageHelper.saveEdificios(edificios);
await storageHelper.getEdificios();
await storageHelper.saveMantenimientos(mantenimientos);
await storageHelper.getMantenimientos();
await storageHelper.saveUsuarios(usuarios);
await storageHelper.getUsuarios();
await storageHelper.saveAllData({
  cuartos,
  edificios,
  mantenimientos,
  usuarios,
});
await storageHelper.getAllData();
await storageHelper.loadOfflineData();

// Preferencias
await storageHelper.saveTheme(theme);
await storageHelper.getTheme();
await storageHelper.savePreference(key, value);
await storageHelper.getPreference(key);

// Sincronización
await storageHelper.addToSyncQueue(type, endpoint, method, data);
await storageHelper.processSyncQueue(apiBaseUrl);

// Mantenimiento
await storageHelper.cleanExpiredData();
await storageHelper.getStorageStats();
await storageHelper.exportBackup();
await storageHelper.clearAllData();
```

#### 3. `storage-wrapper.js`

**Responsabilidad**: Wrapper de compatibilidad con localStorage API (opcional)

Permite usar la API de localStorage pero con IndexedDB por debajo:

```javascript
// API compatible con localStorage
storageManager.localStorage.setItem(key, value);
storageManager.localStorage.getItem(key);
storageManager.localStorage.removeItem(key);
storageManager.localStorage.clear();

// Versión asíncrona (recomendada)
await storageManager.localStorage.getItemAsync(key);
```

## 📝 Cambios en el Código Existente

### 1. `index.html`

```html
<!-- Antes -->
<script>
  const script = document.createElement('script');
  script.src = 'js/app-loader.js';
  document.head.appendChild(script);
</script>

<!-- Después -->
<script type="module">
  import dbManager from './js/indexeddb-manager.js';
  import storageHelper from './js/storage-helper.js';

  window.dbManager = dbManager;
  window.storageHelper = storageHelper;

  Promise.all([dbManager.init(), storageHelper.init()]).then(() => {
    const script = document.createElement('script');
    script.src = 'js/app-loader.js';
    document.head.appendChild(script);
  });
</script>
```

### 2. `login.html`

Similar a `index.html`, inicializa IndexedDB antes de cargar `login-jwt.js`.

### 3. `app-loader.js`

**Función de autenticación**:

```javascript
// Antes
function obtenerHeadersConAuth() {
  const accessToken = localStorage.getItem('accessToken');
  // ...
}

// Después
async function obtenerHeadersConAuth() {
  let accessToken = null;

  if (window.storageHelper) {
    accessToken = await window.storageHelper.getAccessToken();
  }

  if (!accessToken) {
    accessToken = localStorage.getItem('accessToken');
  }
  // ...
}
```

**Guardado de datos**:

```javascript
// Antes
localStorage.setItem('ultimosCuartos', JSON.stringify(cuartos));
localStorage.setItem('ultimosEdificios', JSON.stringify(edificios));

// Después
if (window.storageHelper) {
  await window.storageHelper.saveAllData({
    cuartos,
    edificios,
    mantenimientos,
    usuarios,
  });
}
// Mantener localStorage como fallback
localStorage.setItem('ultimosCuartos', JSON.stringify(cuartos));
```

**Carga offline**:

```javascript
// Antes
const cuartosGuardados = localStorage.getItem('ultimosCuartos');
cuartos = cuartosGuardados ? JSON.parse(cuartosGuardados) : [];

// Después
if (window.storageHelper) {
  const offlineData = await window.storageHelper.loadOfflineData();
  if (offlineData.hasData) {
    cuartos = offlineData.data.cuartos;
    // ...
  }
}
// Fallback a localStorage si falla IndexedDB
```

### 4. `login-jwt.js`

**Guardado de tokens**:

```javascript
// Antes
localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);

// Después
if (window.storageHelper) {
  await window.storageHelper.saveAuthTokens(
    {
      accessToken: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
      tokenType: data.tokens.tokenType,
      expiresIn: data.tokens.expiresIn,
      sesionId: data.sesion_id,
    },
    rememberMe
  );
}
// Mantener localStorage como fallback
localStorage.setItem('accessToken', data.tokens.accessToken);
```

## 🔄 Proceso de Migración Automática

Al iniciar la aplicación por primera vez después de la actualización:

1. Se verifica si ya se realizó la migración (`__indexeddb_migrated__` flag)
2. Si no se ha migrado, se ejecuta automáticamente:
   - Se leen todos los datos de localStorage
   - Se convierten y guardan en las stores correspondientes de IndexedDB
   - Se marca como migrado para evitar repetir el proceso

```javascript
// En storage-helper.js
async init() {
    const migrated = localStorage.getItem('__indexeddb_migrated__');
    if (migrated !== 'true') {
        await this.dbManager.migrateFromLocalStorage();
        localStorage.setItem('__indexeddb_migrated__', 'true');
    }
}
```

## 🎨 Ventajas de IndexedDB

### 1. Mayor Capacidad

- **localStorage**: ~5-10 MB
- **IndexedDB**: 50 MB+ (varía por navegador)

### 2. Rendimiento

```javascript
// localStorage - Síncrono (bloquea el hilo)
const data = localStorage.getItem('data'); // Bloquea

// IndexedDB - Asíncrono (no bloquea)
const data = await dbManager.get('store', 'key'); // No bloquea
```

### 3. Estructura de Datos

```javascript
// localStorage - Solo strings
localStorage.setItem('user', JSON.stringify(user)); // Serialización manual

// IndexedDB - Objetos nativos
await dbManager.set('usuarios', user); // Objetos directamente
```

### 4. Búsquedas Eficientes

```javascript
// localStorage - Iterar todo
const users = JSON.parse(localStorage.getItem('users'));
const activeUsers = users.filter((u) => u.activo); // O(n)

// IndexedDB - Índices
const activeUsers = await dbManager.getByIndex('usuarios', 'activo', true); // O(log n)
```

### 5. Transacciones

```javascript
// IndexedDB permite transacciones ACID
await dbManager.setMultiple('cuartos', [cuarto1, cuarto2, cuarto3]);
// Se guardan todos o ninguno
```

## 🔧 Configuración y Uso

### Inicialización

```javascript
// Automática en index.html y login.html
// Los módulos se cargan antes de la aplicación principal
```

### Uso en Código Nuevo

```javascript
// Usar storageHelper (recomendado)
await window.storageHelper.saveCurrentUser(user);
const user = await window.storageHelper.getCurrentUser();

// O usar dbManager directamente (más control)
await window.dbManager.set('usuarios', user);
const user = await window.dbManager.get('usuarios', userId);
```

### Verificar Estado

```javascript
// Ver estadísticas
const stats = await window.storageHelper.getStorageStats();
console.log(stats);
// { auth: 5, usuarios: 10, cuartos: 150, ... }

// Ver información detallada
await window.storageHelper.showStorageInfo();
```

## 🧪 Testing

### Verificar Migración

```javascript
// En la consola del navegador
await window.dbManager.getStats();
// Debería mostrar conteos de registros en cada store

await window.storageHelper.getAllData();
// Debería devolver todos los datos migrados
```

### Modo Offline

```javascript
// Desconectar red y recargar
// La app debería cargar datos desde IndexedDB
const offlineData = await window.storageHelper.loadOfflineData();
console.log('Datos offline disponibles:', offlineData.hasData);
```

### Backup Manual

```javascript
// Exportar datos (crea archivo JSON)
await window.storageHelper.exportBackup();
```

## 🚨 Manejo de Errores

La implementación incluye múltiples niveles de fallback:

1. **IndexedDB** (preferido)
2. **localStorage** (fallback automático)
3. **Datos mock offline** (último recurso)

```javascript
// Ejemplo de la estrategia
try {
  // Intentar IndexedDB
  data = await storageHelper.getCuartos();
} catch (error) {
  try {
    // Fallback a localStorage
    data = JSON.parse(localStorage.getItem('ultimosCuartos'));
  } catch (error2) {
    // Usar datos offline
    data = datosOffline.cuartos;
  }
}
```

## 📊 Comparación Antes/Después

| Aspecto           | localStorage | IndexedDB       |
| ----------------- | ------------ | --------------- |
| Capacidad         | ~5-10 MB     | 50+ MB          |
| Tipo de operación | Síncrono     | Asíncrono       |
| Tipos de datos    | Solo strings | Objetos nativos |
| Índices           | No           | Sí              |
| Transacciones     | No           | Sí              |
| Búsquedas         | O(n)         | O(log n)        |
| Expiración        | Manual       | Automática      |
| Sincronización    | Manual       | Cola integrada  |

## 🔐 Seguridad

- Los tokens se siguen manejando con las mismas prácticas de seguridad
- IndexedDB está aislado por dominio (same-origin policy)
- Los datos sensibles no se exponen más que antes
- El flag `persistent` controla si los datos permanecen al cerrar el navegador

## 📱 Compatibilidad PWA

IndexedDB es **fundamental** para PWAs porque:

- ✅ Funciona offline
- ✅ Mayor capacidad que localStorage
- ✅ Recomendado por estándares PWA
- ✅ Soportado por todos los navegadores modernos

## 🔄 Cola de Sincronización

Nueva funcionalidad para manejar operaciones offline:

```javascript
// Agregar operación cuando offline
await storageHelper.addToSyncQueue(
  'crear_mantenimiento',
  '/api/mantenimientos',
  'POST',
  { cuarto_id: 101, descripcion: 'Revisar AC' }
);

// Procesar cola cuando vuelve online
window.addEventListener('online', async () => {
  const result = await storageHelper.processSyncQueue(API_BASE_URL);
  console.log(`Sincronizadas ${result.success} operaciones`);
});
```

## 🧹 Mantenimiento

### Limpieza Automática

```javascript
// Se ejecuta periódicamente
await storageHelper.cleanExpiredData();
// Elimina cache expirado y operaciones de sync completadas
```

### Limpieza Manual

```javascript
// Limpiar todo (requiere confirmación)
await storageHelper.clearAllData();
```

## 📈 Próximos Pasos

1. ✅ Migración básica completada
2. ⏳ Implementar sincronización automática en segundo plano
3. ⏳ Añadir compresión de datos para mayor eficiencia
4. ⏳ Implementar estrategias de caché más avanzadas
5. ⏳ Añadir telemetría de uso de storage

## 🐛 Debugging

### Ver contenido de IndexedDB

En Chrome DevTools:

1. Application → Storage → IndexedDB
2. Expandir `jwm_mant_cuartos_db`
3. Ver cada store y sus registros

### Logs útiles

```javascript
// Activar logs detallados
localStorage.setItem('debug_indexeddb', 'true');

// Ver todas las operaciones
console.log('IndexedDB operations:', window.dbManager);
console.log('Storage stats:', await window.storageHelper.getStorageStats());
```

## 📚 Referencias

- [IndexedDB API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Working with IndexedDB - web.dev](https://web.dev/indexeddb/)
- [PWA Storage Best Practices](https://developers.google.com/web/fundamentals/instant-and-offline/web-storage/offline-for-pwa)

---

**Fecha de migración**: 20 de noviembre de 2025
**Versión de la base de datos**: v1
**Estado**: ✅ Completado y operacional
