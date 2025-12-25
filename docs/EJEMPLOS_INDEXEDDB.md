# Ejemplos de Código - IndexedDB

Ejemplos prácticos de cómo usar el nuevo sistema de almacenamiento IndexedDB en diferentes escenarios.

## 📋 Tabla de Contenidos

1. [Autenticación y Sesiones](#autenticación-y-sesiones)
2. [Gestión de Datos](#gestión-de-datos)
3. [Modo Offline](#modo-offline)
4. [Cache y Preferencias](#cache-y-preferencias)
5. [Sincronización](#sincronización)
6. [Debugging y Mantenimiento](#debugging-y-mantenimiento)

---

## Autenticación y Sesiones

### Iniciar Sesión y Guardar Tokens

```javascript
// En login-jwt.js después de login exitoso
async function handleLogin(loginData) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginData),
  });

  const data = await response.json();

  if (data.success) {
    // Guardar tokens en IndexedDB
    await window.storageHelper.saveAuthTokens(
      {
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        tokenType: data.tokens.tokenType || 'Bearer',
        expiresIn: data.tokens.expiresIn,
        sesionId: data.sesion_id,
      },
      loginData.rememberMe
    ); // true para sesión persistente

    // Guardar datos del usuario
    await window.storageHelper.saveCurrentUser(
      {
        id: data.usuario.id,
        nombre: data.usuario.nombre,
        email: data.usuario.email,
        rol: data.usuario.rol,
        permisos: data.usuario.permisos,
      },
      loginData.rememberMe
    );

    console.log('✅ Sesión guardada en IndexedDB');
    window.location.href = 'index.html';
  }
}
```

### Verificar Sesión Activa

```javascript
// Al cargar la aplicación
async function verificarSesion() {
  const hasSession = await window.storageHelper.hasActiveSession();

  if (!hasSession) {
    console.log('❌ No hay sesión activa');
    window.location.href = 'login.html';
    return false;
  }

  const user = await window.storageHelper.getCurrentUser();
  console.log('✅ Sesión activa:', user.nombre);

  return true;
}
```

### Hacer Request con Autenticación

```javascript
async function fetchWithAuth(endpoint, options = {}) {
  const token = await window.storageHelper.getAccessToken();

  if (!token) {
    throw new Error('No hay token de acceso');
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
}

// Uso
const response = await fetchWithAuth('/api/cuartos');
const cuartos = await response.json();
```

### Cerrar Sesión

```javascript
async function logout() {
  // Limpiar datos de autenticación
  await window.storageHelper.clearAuth();

  // Notificar al servidor (opcional)
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: await obtenerHeadersConAuth(),
    });
  } catch (error) {
    console.warn('Error al notificar logout al servidor:', error);
  }

  // Redirigir a login
  window.location.href = 'login.html';
}
```

---

## Gestión de Datos

### Cargar y Guardar Cuartos

```javascript
async function cargarCuartos() {
  try {
    // Intentar cargar desde API
    const response = await fetchWithAuth('/api/cuartos');
    const cuartos = await response.json();

    // Guardar en IndexedDB para uso offline
    await window.storageHelper.saveCuartos(cuartos);

    console.log('✅ Cuartos cargados desde API:', cuartos.length);
    return cuartos;
  } catch (error) {
    console.warn('⚠️ Error cargando desde API, usando cache:', error);

    // Cargar desde IndexedDB (modo offline)
    const cuartos = await window.storageHelper.getCuartos();

    if (cuartos.length > 0) {
      console.log('💾 Cuartos cargados desde IndexedDB:', cuartos.length);
      return cuartos;
    }

    // Si no hay datos, usar mock
    console.log('🆘 Usando datos mock');
    return datosOfflineMock.cuartos;
  }
}
```

### Guardar Todos los Datos de la App

```javascript
async function cargarTodosDatos() {
  try {
    // Cargar en paralelo
    const [cuartos, edificios, mantenimientos, usuarios] = await Promise.all([
      fetch('/api/cuartos').then((r) => r.json()),
      fetch('/api/edificios').then((r) => r.json()),
      fetch('/api/mantenimientos').then((r) => r.json()),
      fetch('/api/usuarios').then((r) => r.json()),
    ]);

    // Guardar todo en IndexedDB
    await window.storageHelper.saveAllData({
      cuartos,
      edificios,
      mantenimientos,
      usuarios,
    });

    console.log('✅ Todos los datos guardados en IndexedDB');

    return { cuartos, edificios, mantenimientos, usuarios };
  } catch (error) {
    console.error('❌ Error cargando datos:', error);

    // Cargar desde IndexedDB
    return await window.storageHelper.getAllData();
  }
}
```

### Búsquedas Eficientes con Índices

```javascript
// Buscar cuartos de un edificio
async function getCuartosPorEdificio(edificioId) {
  const cuartos = await window.dbManager.getByIndex(
    'cuartos',
    'edificio_id',
    edificioId
  );

  console.log(`🔍 Cuartos del edificio ${edificioId}:`, cuartos.length);
  return cuartos;
}

// Buscar cuartos por estado
async function getCuartosPorEstado(estado) {
  const cuartos = await window.dbManager.getByIndex(
    'cuartos',
    'estado',
    estado
  );

  console.log(`🔍 Cuartos en estado "${estado}":`, cuartos.length);
  return cuartos;
}

// Buscar mantenimientos de un cuarto
async function getMantenimientosDeCuarto(cuartoId) {
  const mantenimientos = await window.dbManager.getByIndex(
    'mantenimientos',
    'cuarto_id',
    cuartoId
  );

  return mantenimientos;
}

// Buscar mantenimientos pendientes
async function getMantenimientosPendientes() {
  const pendientes = await window.dbManager.getByIndex(
    'mantenimientos',
    'estado',
    'pendiente'
  );

  console.log(`📋 Mantenimientos pendientes:`, pendientes.length);
  return pendientes;
}
```

---

## Modo Offline

### Detectar Estado de Conexión

```javascript
// Detectar cuando se pierde/recupera conexión
window.addEventListener('offline', () => {
  console.log('📵 Conexión perdida - Modo offline activado');
  mostrarBannerOffline(true);
});

window.addEventListener('online', () => {
  console.log('📶 Conexión recuperada - Procesando cola de sincronización');
  mostrarBannerOffline(false);
  procesarColaSincronizacion();
});

function mostrarBannerOffline(offline) {
  const banner = document.getElementById('offline-banner');
  if (offline) {
    banner.textContent = '⚠️ Sin conexión - Trabajando en modo offline';
    banner.style.display = 'block';
  } else {
    banner.textContent = '✅ Conexión restaurada - Sincronizando...';
    setTimeout(() => {
      banner.style.display = 'none';
    }, 3000);
  }
}
```

### Cargar Datos Offline

```javascript
async function cargarDatosOffline() {
  console.log('💾 Cargando datos en modo offline...');

  const offlineData = await window.storageHelper.loadOfflineData();

  if (!offlineData.hasData) {
    console.error('❌ No hay datos offline disponibles');
    mostrarMensajeError('No hay datos guardados para modo offline');
    return null;
  }

  console.log('✅ Datos offline cargados:', {
    cuartos: offlineData.data.cuartos.length,
    edificios: offlineData.data.edificios.length,
    mantenimientos: offlineData.data.mantenimientos.length,
    usuarios: offlineData.data.usuarios.length,
  });

  return offlineData.data;
}
```

### Operación Offline con Cola de Sincronización

```javascript
async function crearMantenimiento(data) {
  if (navigator.onLine) {
    // Online - enviar a API directamente
    try {
      const response = await fetchWithAuth('/api/mantenimientos', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      // Actualizar cache local
      const mantenimientos = await window.storageHelper.getMantenimientos();
      mantenimientos.push(result);
      await window.storageHelper.saveMantenimientos(mantenimientos);

      mostrarMensaje('✅ Mantenimiento creado', 'success');
      return result;
    } catch (error) {
      console.error('Error creando mantenimiento:', error);
      mostrarMensaje('❌ Error al crear mantenimiento', 'error');
      throw error;
    }
  } else {
    // Offline - agregar a cola
    await window.storageHelper.addToSyncQueue(
      'crear_mantenimiento',
      '/api/mantenimientos',
      'POST',
      data
    );

    // Crear ID temporal
    const tempId = `temp_${Date.now()}`;
    const tempData = {
      ...data,
      id: tempId,
      _pending: true,
      _createdOffline: true,
    };

    // Guardar temporalmente en cache local
    const mantenimientos = await window.storageHelper.getMantenimientos();
    mantenimientos.push(tempData);
    await window.storageHelper.saveMantenimientos(mantenimientos);

    mostrarMensaje(
      '💾 Guardado localmente - Se sincronizará cuando haya conexión',
      'info'
    );
    return tempData;
  }
}
```

### Sincronizar Cola al Recuperar Conexión

```javascript
async function procesarColaSincronizacion() {
  const result = await window.storageHelper.processSyncQueue(API_BASE_URL);

  console.log('🔄 Sincronización completada:', result);

  if (result.success > 0) {
    mostrarMensaje(`✅ ${result.success} operaciones sincronizadas`, 'success');

    // Recargar datos desde servidor
    await cargarTodosDatos();
    renderizarInterfaz();
  }

  if (result.failed > 0) {
    mostrarMensaje(
      `⚠️ ${result.failed} operaciones fallaron. Se reintentarán más tarde`,
      'warning'
    );
  }
}
```

---

## Cache y Preferencias

### Guardar y Cargar Tema

```javascript
// Guardar tema
async function cambiarTema(nuevoTema) {
  document.documentElement.setAttribute('data-theme', nuevoTema);
  await window.storageHelper.saveTheme(nuevoTema);
  console.log('✅ Tema guardado:', nuevoTema);
}

// Cargar tema al iniciar
async function cargarTema() {
  const tema = await window.storageHelper.getTheme();
  document.documentElement.setAttribute('data-theme', tema);
  console.log('🎨 Tema cargado:', tema);
  return tema;
}

// Event listener para botón de tema
document.getElementById('themeToggle').addEventListener('click', async () => {
  const temaActual = await window.storageHelper.getTheme();
  const nuevoTema = temaActual === 'light' ? 'dark' : 'light';
  await cambiarTema(nuevoTema);
});
```

### Cache con Expiración (Estadísticas)

```javascript
async function obtenerEstadisticas() {
  // Intentar desde cache primero (rápido)
  let stats = await window.dbManager.getCache('stats_dashboard');

  if (stats) {
    console.log('📊 Estadísticas desde cache');
    mostrarEstadisticas(stats);

    // Revalidar en background
    fetch('/api/stats')
      .then((r) => r.json())
      .then(async (newStats) => {
        // Actualizar cache
        await window.dbManager.setCache('stats_dashboard', newStats, 30);

        // Si cambió, actualizar UI
        if (JSON.stringify(stats) !== JSON.stringify(newStats)) {
          console.log('📊 Estadísticas actualizadas');
          mostrarEstadisticas(newStats);
        }
      })
      .catch((err) => console.warn('Error revalidando stats:', err));

    return stats;
  }

  // No hay cache, cargar desde API
  try {
    const response = await fetch('/api/stats');
    stats = await response.json();

    // Guardar en cache (30 minutos)
    await window.dbManager.setCache('stats_dashboard', stats, 30);

    console.log('📊 Estadísticas desde API');
    mostrarEstadisticas(stats);
    return stats;
  } catch (error) {
    console.error('❌ Error cargando estadísticas:', error);
    throw error;
  }
}
```

### Preferencias del Usuario

```javascript
// Guardar preferencias
async function guardarPreferencias(prefs) {
  await window.storageHelper.savePreference(
    'notificaciones_sonido',
    prefs.sonido
  );
  await window.storageHelper.savePreference(
    'vista_compacta',
    prefs.vistaCompacta
  );
  await window.storageHelper.savePreference('idioma', prefs.idioma);

  console.log('✅ Preferencias guardadas');
}

// Cargar preferencias
async function cargarPreferencias() {
  return {
    sonido:
      (await window.storageHelper.getPreference('notificaciones_sonido')) ??
      true,
    vistaCompacta:
      (await window.storageHelper.getPreference('vista_compacta')) ?? false,
    idioma: (await window.storageHelper.getPreference('idioma')) ?? 'es',
  };
}

// Usar preferencias
const prefs = await cargarPreferencias();
if (prefs.sonido) {
  reproducirSonidoAlerta();
}
```

---

## Sincronización

### Configuración Completa de Sincronización Automática

```javascript
// Inicializar al cargar la app
async function inicializarSincronizacion() {
  // Eventos de conexión
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Verificar si hay operaciones pendientes al cargar
  const pending = await window.dbManager.getPendingSyncOperations();
  if (pending.length > 0 && navigator.onLine) {
    console.log(
      `🔄 ${pending.length} operaciones pendientes, sincronizando...`
    );
    await procesarColaSincronizacion();
  }
}

async function handleOnline() {
  console.log('📶 Online');
  await procesarColaSincronizacion();
}

function handleOffline() {
  console.log('📵 Offline');
  mostrarMensaje('Trabajando en modo offline', 'info');
}
```

---

## Debugging y Mantenimiento

### Ver Información de Almacenamiento

```javascript
// En la consola del navegador
await window.storageHelper.showStorageInfo();

// Resultado:
// 📊 [Storage Info]
// IndexedDB Stats: { auth: 5, usuarios: 12, cuartos: 150, ... }
// Storage Estimate: {
//   usage: "2.45 MB",
//   quota: "1024.00 MB",
//   percent: "0.24%"
// }
```

### Exportar Backup

```javascript
// Exportar todos los datos
await window.storageHelper.exportBackup();
// Se descarga: jwm-backup-2025-11-20T15:30:00.json
```

### Limpiar Datos Expirados

```javascript
// Limpiar automáticamente
const result = await window.storageHelper.cleanExpiredData();
console.log('🧹 Limpieza completada:', result);
// { cacheDeleted: 5, syncDeleted: 12 }

// Programar limpieza periódica (cada hora)
setInterval(
  async () => {
    await window.storageHelper.cleanExpiredData();
  },
  60 * 60 * 1000
);
```

### Reset Completo

```javascript
// Limpiar TODOS los datos (requiere confirmación)
async function resetearAplicacion() {
  const confirmado = confirm(
    '⚠️ ¿Eliminar todos los datos locales? Esta acción no se puede deshacer.'
  );

  if (confirmado) {
    await window.storageHelper.clearAllData();
    await window.storageHelper.clearAuth();

    console.log('🗑️ Aplicación reseteada');
    window.location.href = 'login.html';
  }
}
```

### Verificar Migración

```javascript
// Verificar si la migración se completó
const migrated = localStorage.getItem('__indexeddb_migrated__');
console.log('Migración completada:', migrated === 'true');

// Ver estadísticas de migración
const stats = await window.storageHelper.getStorageStats();
console.table(stats);
```

---

## 💡 Mejores Prácticas

### 1. Siempre Usar Try-Catch

```javascript
try {
  await window.storageHelper.saveCuartos(cuartos);
} catch (error) {
  console.error('Error guardando:', error);
  mostrarMensaje('Error al guardar datos', 'error');
}
```

### 2. Verificar Disponibilidad

```javascript
if (window.storageHelper) {
  // Usar IndexedDB
} else {
  // Fallback a localStorage
}
```

### 3. Combinar Estrategias

```javascript
// Cargar rápido desde cache, actualizar en background
const dataCache = await window.storageHelper.getCuartos();
renderizar(dataCache);

fetch('/api/cuartos')
  .then((r) => r.json())
  .then(async (dataFresca) => {
    await window.storageHelper.saveCuartos(dataFresca);
    if (JSON.stringify(dataCache) !== JSON.stringify(dataFresca)) {
      renderizar(dataFresca);
    }
  });
```

---

**💾 Más información**: Ver [GUIA_RAPIDA_INDEXEDDB.md](./GUIA_RAPIDA_INDEXEDDB.md) y [MIGRACION_INDEXEDDB.md](./MIGRACION_INDEXEDDB.md)
