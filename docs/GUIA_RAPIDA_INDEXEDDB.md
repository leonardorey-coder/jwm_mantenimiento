# Guía Rápida - IndexedDB API

## 🚀 Inicio Rápido

### Acceso Global
Los módulos están disponibles globalmente:
```javascript
window.dbManager      // Acceso bajo nivel a IndexedDB
window.storageHelper  // API de alto nivel (recomendado)
```

## 📖 Ejemplos de Uso Común

### Autenticación

#### Guardar sesión de usuario
```javascript
// Después del login exitoso
await window.storageHelper.saveAuthTokens({
    accessToken: 'eyJhbGc...',
    refreshToken: 'eyJhbGc...',
    tokenType: 'Bearer',
    expiresIn: 3600,
    sesionId: '123-456'
}, true); // true = persistente, false = solo sesión

await window.storageHelper.saveCurrentUser({
    id: 1,
    nombre: 'Juan Pérez',
    email: 'juan@ejemplo.com',
    rol: 'administrador'
}, true);
```

#### Obtener datos de sesión
```javascript
const token = await window.storageHelper.getAccessToken();
const user = await window.storageHelper.getCurrentUser();
const hasSession = await window.storageHelper.hasActiveSession();

console.log('Usuario:', user.nombre);
console.log('Sesión activa:', hasSession);
```

#### Cerrar sesión
```javascript
await window.storageHelper.clearAuth();
```

### Datos de la Aplicación

#### Guardar datos después de cargar de la API
```javascript
// Después de fetch exitoso
const cuartos = await fetch('/api/cuartos').then(r => r.json());
const edificios = await fetch('/api/edificios').then(r => r.json());

// Guardar en IndexedDB
await window.storageHelper.saveAllData({
    cuartos,
    edificios,
    mantenimientos,
    usuarios
});
```

#### Cargar datos (modo offline)
```javascript
// Intentar cargar desde API, si falla usar IndexedDB
try {
    const response = await fetch('/api/cuartos');
    const cuartos = await response.json();
} catch (error) {
    // Modo offline - cargar desde IndexedDB
    const offlineData = await window.storageHelper.loadOfflineData();
    if (offlineData.hasData) {
        const cuartos = offlineData.data.cuartos;
        console.log('Modo offline:', cuartos.length, 'cuartos');
    }
}
```

#### Guardar datos individuales
```javascript
// Cuartos
await window.storageHelper.saveCuartos(cuartosArray);
const cuartos = await window.storageHelper.getCuartos();

// Edificios
await window.storageHelper.saveEdificios(edificiosArray);
const edificios = await window.storageHelper.getEdificios();

// Mantenimientos
await window.storageHelper.saveMantenimientos(mantenimientosArray);
const mantenimientos = await window.storageHelper.getMantenimientos();

// Usuarios
await window.storageHelper.saveUsuarios(usuariosArray);
const usuarios = await window.storageHelper.getUsuarios();
```

### Preferencias del Usuario

#### Guardar tema
```javascript
// Guardar preferencia de tema
await window.storageHelper.saveTheme('dark');

// Obtener tema guardado
const theme = await window.storageHelper.getTheme(); // 'light' o 'dark'
```

#### Guardar otras preferencias
```javascript
// Guardar cualquier preferencia
await window.storageHelper.savePreference('idioma', 'es');
await window.storageHelper.savePreference('notificaciones', true);
await window.storageHelper.savePreference('vista', 'compacta');

// Obtener preferencias
const idioma = await window.storageHelper.getPreference('idioma');
const notif = await window.storageHelper.getPreference('notificaciones');
```

### Sincronización Offline

#### Agregar operación a la cola
```javascript
// Cuando no hay conexión
if (!navigator.onLine) {
    await window.storageHelper.addToSyncQueue(
        'crear_mantenimiento',
        '/api/mantenimientos',
        'POST',
        {
            cuarto_id: 101,
            tipo: 'normal',
            descripcion: 'Revisar aire acondicionado'
        }
    );
    mostrarMensaje('Operación guardada, se sincronizará cuando vuelva la conexión');
}
```

#### Procesar cola al volver online
```javascript
window.addEventListener('online', async () => {
    console.log('✅ Conexión restaurada, sincronizando...');
    
    const result = await window.storageHelper.processSyncQueue(API_BASE_URL);
    
    if (result.success > 0) {
        mostrarMensaje(`${result.success} operaciones sincronizadas`);
    }
    
    if (result.failed > 0) {
        mostrarMensaje(`${result.failed} operaciones fallaron`, 'error');
    }
});
```

### Cache con Expiración

#### Guardar en cache temporal
```javascript
// Guardar con TTL (tiempo de vida)
await window.dbManager.setCache('stats_dashboard', statsData, 30); // 30 minutos

// Obtener desde cache (null si expiró)
const stats = await window.dbManager.getCache('stats_dashboard');

if (!stats) {
    // Cache expiró, recargar desde API
    const newStats = await fetch('/api/stats').then(r => r.json());
    await window.dbManager.setCache('stats_dashboard', newStats, 30);
}
```

### Búsquedas Eficientes

#### Buscar por índice
```javascript
// Cuartos de un edificio específico
const cuartosEdificio = await window.dbManager.getByIndex(
    'cuartos', 
    'edificio_id', 
    1
);

// Cuartos por estado
const cuartosOcupados = await window.dbManager.getByIndex(
    'cuartos',
    'estado',
    'ocupado'
);

// Mantenimientos de un cuarto
const mantenimientos = await window.dbManager.getByIndex(
    'mantenimientos',
    'cuarto_id',
    101
);

// Mantenimientos pendientes
const pendientes = await window.dbManager.getByIndex(
    'mantenimientos',
    'estado',
    'pendiente'
);
```

### Operaciones por Lote

#### Guardar múltiples registros
```javascript
const cuartosNuevos = [
    { id: 1, numero: '101', edificio_id: 1, estado: 'vacio' },
    { id: 2, numero: '102', edificio_id: 1, estado: 'ocupado' },
    { id: 3, numero: '201', edificio_id: 2, estado: 'mantenimiento' }
];

const result = await window.dbManager.setMultiple('cuartos', cuartosNuevos);
console.log(`Guardados: ${result.success}, Errores: ${result.errors.length}`);
```

## 🔧 Utilidades

### Estadísticas de almacenamiento
```javascript
// Obtener estadísticas
const stats = await window.storageHelper.getStorageStats();
console.log('Estadísticas:', stats);
// { auth: 5, usuarios: 10, cuartos: 150, ... }

// Información detallada con uso de espacio
const info = await window.storageHelper.showStorageInfo();
console.log('Uso:', info.estimate.usage, 'bytes');
console.log('Cuota:', info.estimate.quota, 'bytes');
```

### Backup de datos
```javascript
// Exportar todos los datos a archivo JSON
await window.storageHelper.exportBackup();
// Se descarga automáticamente: jwm-backup-2025-11-20T15:30:00.json
```

### Limpieza de datos
```javascript
// Limpiar datos expirados
const cleaned = await window.storageHelper.cleanExpiredData();
console.log('Entradas eliminadas:', cleaned.cacheDeleted);

// Limpiar TODO (requiere confirmación)
const cleared = await window.storageHelper.clearAllData();
if (cleared) {
    console.log('Todos los datos locales eliminados');
}
```

## 🎯 Patrones Recomendados

### Patrón: Cargar con Fallback
```javascript
async function cargarCuartos() {
    try {
        // 1. Intentar desde API
        const response = await fetch('/api/cuartos');
        const cuartos = await response.json();
        
        // 2. Guardar en IndexedDB para uso offline
        await window.storageHelper.saveCuartos(cuartos);
        
        return cuartos;
    } catch (error) {
        // 3. Si falla API, usar IndexedDB
        console.warn('API no disponible, usando cache');
        const cuartos = await window.storageHelper.getCuartos();
        
        if (cuartos.length === 0) {
            // 4. Si IndexedDB vacío, usar datos mock
            return datosOfflineMock.cuartos;
        }
        
        return cuartos;
    }
}
```

### Patrón: Guardar y Sincronizar
```javascript
async function crearMantenimiento(data) {
    if (navigator.onLine) {
        // Online - enviar directamente a API
        const response = await fetch('/api/mantenimientos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        // Actualizar cache local
        const mantenimientos = await window.storageHelper.getMantenimientos();
        mantenimientos.push(result);
        await window.storageHelper.saveMantenimientos(mantenimientos);
        
        return result;
    } else {
        // Offline - agregar a cola de sincronización
        await window.storageHelper.addToSyncQueue(
            'crear_mantenimiento',
            '/api/mantenimientos',
            'POST',
            data
        );
        
        // Agregar temporalmente a cache local
        const tempId = 'temp_' + Date.now();
        const tempData = { ...data, id: tempId, _pending: true };
        
        const mantenimientos = await window.storageHelper.getMantenimientos();
        mantenimientos.push(tempData);
        await window.storageHelper.saveMantenimientos(mantenimientos);
        
        return tempData;
    }
}
```

### Patrón: Cache con Revalidación
```javascript
async function obtenerEstadisticas() {
    // 1. Intentar desde cache (rápido)
    let stats = await window.dbManager.getCache('stats_dashboard');
    
    if (stats) {
        // Devolver cache inmediatamente
        mostrarEstadisticas(stats);
        
        // Revalidar en background
        fetch('/api/stats')
            .then(r => r.json())
            .then(newStats => {
                window.dbManager.setCache('stats_dashboard', newStats, 30);
                if (JSON.stringify(stats) !== JSON.stringify(newStats)) {
                    // Si cambió, actualizar UI
                    mostrarEstadisticas(newStats);
                }
            });
        
        return stats;
    }
    
    // 2. No hay cache, cargar desde API
    try {
        const response = await fetch('/api/stats');
        stats = await response.json();
        await window.dbManager.setCache('stats_dashboard', stats, 30);
        return stats;
    } catch (error) {
        // Sin conexión y sin cache
        throw error;
    }
}
```

## ⚠️ Consideraciones Importantes

### 1. Operaciones Asíncronas
```javascript
// ❌ INCORRECTO - No usar localStorage directamente
const user = JSON.parse(localStorage.getItem('currentUser'));

// ✅ CORRECTO - Usar API asíncrona
const user = await window.storageHelper.getCurrentUser();
```

### 2. Manejo de Errores
```javascript
// ✅ Siempre usar try-catch con IndexedDB
try {
    await window.storageHelper.saveCuartos(cuartos);
} catch (error) {
    console.error('Error guardando cuartos:', error);
    // Fallback o notificar usuario
}
```

### 3. Inicialización
```javascript
// ✅ Asegurarse de que IndexedDB esté inicializado
if (window.storageHelper) {
    // Usar storageHelper
} else {
    // Fallback a localStorage
}
```

## 📱 Testing en Consola

```javascript
// Ver estado de IndexedDB
await window.storageHelper.showStorageInfo();

// Ver todos los datos
const data = await window.storageHelper.getAllData();
console.log('Datos:', data);

// Probar guardar/cargar
await window.storageHelper.savePreference('test', { valor: 123 });
const test = await window.storageHelper.getPreference('test');
console.log('Test:', test); // { valor: 123 }

// Ver operaciones pendientes
const pending = await window.dbManager.getPendingSyncOperations();
console.log('Pendientes de sync:', pending.length);
```

## 🐛 Debugging

```javascript
// Ver contenido de una store
const cuartos = await window.dbManager.getAll('cuartos');
console.table(cuartos);

// Ver estadísticas
const stats = await window.dbManager.getStats();
console.log('Stats:', stats);

// Verificar cache
const cacheData = await window.dbManager.getAll('cache');
cacheData.forEach(item => {
    const expired = item.expiresAt < Date.now();
    console.log(item.key, expired ? 'EXPIRADO' : 'VÁLIDO');
});
```

---

**💡 Tip**: Usa siempre `storageHelper` en lugar de `dbManager` para operaciones comunes. Solo usa `dbManager` directamente cuando necesites control fino.

**🔗 Más info**: Ver `MIGRACION_INDEXEDDB.md` para documentación completa.
