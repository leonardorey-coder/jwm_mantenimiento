# Evidencias de Código - Semana 1 de Noviembre 2025

**Proyecto:** Sistema de Gestión de Servicios Operativa de Mantenimiento de Habitaciones y Espacios Comunes SGSOM (Backend)  
**Periodo:** 2 al 6 de noviembre de 2025  
**Alumno:** Juan Leonardo Cruz Flores

---

## 1. Finalización de PWA Instalable (02-03 nov)

### 1.1 Configuración del Manifest.json

**Archivo:** `manifest.json`

```1:30:manifest.json
{
  "name": "JW Mantto",
  "short_name": "JW Mantto",
  "description": "Sistema de Gestión de Servicios, de Mantenimiento, Habitaciones y Espacios Comunes",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#f9f9f9",
  "theme_color": "#3498db",
  "icons": [
    {
      "src": "icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "icons/maskable-icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### 1.2 Referencias PWA en index.html

**Archivo:** `index.html`

```9:36:index.html
    <!-- PWA Manifest -->
    <link rel="manifest" href="manifest.json">
    
    <!-- Favicon para navegadores -->
    <link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="icons/icon-512x512.png">
    <link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="icons/favicon-16x16.png">
    <link rel="shortcut icon" href="icons/favicon.ico">
    
    <!-- Meta tags para PWA -->
    <meta name="theme-color" content="#1E1E1E">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="JW Mantto">
    <link rel="apple-touch-icon" href="icons/icon-192x192.png">
    
    <!-- Apple Touch Icons -->
    <link rel="apple-touch-icon" sizes="192x192" href="icons/icon-192x192.png">
    <link rel="apple-touch-icon" sizes="180x180" href="icons/apple-touch-icon.png">
    <link rel="mask-icon" href="icons/safari-pinned-tab.svg" color="#1E1E1E">
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="manifest.json" crossorigin="use-credentials">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="application-name" content="JW Mantto">
```

---

## 2. Implementación de Service Worker Robusto (03-04 nov)

### 2.1 Service Worker con Estrategias de Caché

**Archivo:** `sw.js`

```1:103:sw.js
const CACHE_NAME = 'jwm-mant-cache-v3';
const urlsToCache = [
  './index.html',
  './style.css',
  './script.js',
  './app-loader.js',
  './logo_high.png',
  './logo_low.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './sounds/alert.mp3'
  // No cachear API endpoints ni data.json
];

// Instalar el Service Worker y cachear los archivos principales
self.addEventListener('install', event => {
  // Asegurar que el SW no se instale hasta que el caché esté listo.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        // Usar rutas relativas asegura que se use el mismo protocolo (HTTPS)
        const requests = urlsToCache.map(url => new Request(url, { cache: 'reload' }));
        return cache.addAll(requests);
      })
      .then(() => {
          console.log('Todos los recursos principales cacheados con éxito.');
          // Forzar la activación del nuevo SW inmediatamente (útil en desarrollo)
          // return self.skipWaiting(); 
      })
      .catch(error => {
        console.error('Fallo al cachear durante la instalación:', error);
      })
  );
});

// Interceptar peticiones y servir desde caché si es posible
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // No intentar cachear peticiones POST, API endpoints, o archivos especiales PWA
  if (event.request.method === 'POST' ||
      requestUrl.pathname.startsWith('/api/') ||
      requestUrl.pathname.endsWith('data.json') ||
      requestUrl.pathname.endsWith('manifest.json') ||
      requestUrl.pathname.endsWith('sw.js')) {
    // Para API, POST y archivos PWA, siempre ir a la red
    event.respondWith(fetch(event.request));
    return;
  }

  // Para otras peticiones (GET a CSS, JS, imágenes, etc.), intentar caché primero
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, devolverlo
        if (response) {
          return response;
        }
        // Si no, ir a la red
        return fetch(event.request).then(
          networkResponse => {
            // Opcional: Cachear la respuesta obtenida de la red para futuras peticiones
            // Clona la respuesta porque es un stream y solo se puede consumir una vez
            // Asegúrate de no cachear respuestas de error o de tipos inesperados
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                let responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => {
                    cache.put(event.request, responseToCache);
                  });
            }
            return networkResponse;
          }
        ).catch(error => {
          console.error('Fetch fallido:', error);
          // Podrías devolver una página offline genérica aquí si la tienes cacheada
          // return caches.match('./offline.html');
        });
      })
  );
});

// Opcional: Limpiar cachés antiguas en el evento activate
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('Cachés antiguas eliminadas, SW activado.');
        // Tomar control inmediato de las páginas abiertas
        // return self.clients.claim();
    })
  );
});
```

### 2.2 Registro del Service Worker en index.html

**Archivo:** `index.html` (líneas 1183-1209)

```1183:1209:index.html
    <!-- Service Worker temporalmente deshabilitado para debugging -->
    <script>
        /*
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then((registration) => {
                        console.log('SW registrado exitosamente: ', registration);
                    })
                    .catch((registrationError) => {
                        console.log('Fallo en registro SW: ', registrationError);
                    });
            });
        }
        */
        console.log('🔧 Service Worker deshabilitado para debugging');
        
        // Eliminar Service Worker existente si existe
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                    console.log('🗑️ Service Worker eliminado:', registration);
                }
            });
        }
    </script>
```

**Nota:** El Service Worker está temporalmente deshabilitado para debugging, pero el código de registro está presente.

---

## 3. Funcionalidad Offline Completa (04-05 nov)

### 3.1 Datos Mock para Modo Offline

**Archivo:** `app-loader.js` (líneas 23-107)

```23:107:app-loader.js
// Datos mock para modo offline
const datosOffline = {
    edificios: [
        { id: 1, nombre: 'Torre A', descripcion: 'Edificio principal' },
        { id: 2, nombre: 'Torre B', descripcion: 'Edificio secundario' }
    ],
    cuartos: [
        { id: 1, numero: '101', nombre: '101', edificio_id: 1, edificio_nombre: 'Torre A', estado: 'ocupado' },
        { id: 2, numero: '102', nombre: '102', edificio_id: 1, edificio_nombre: 'Torre A', estado: 'vacio' },
        { id: 3, numero: '201', nombre: '201', edificio_id: 2, edificio_nombre: 'Torre B', estado: 'mantenimiento' },
        { id: 4, numero: '202', nombre: '202', edificio_id: 2, edificio_nombre: 'Torre B', estado: 'vacio' },
        { id: 5, numero: '301', nombre: '301', edificio_id: 1, edificio_nombre: 'Torre A', estado: 'fuera_servicio' }
    ],
    mantenimientos: [
        {
            id: 1,
            cuarto_id: 1,
            tipo: 'normal',
            descripcion: 'Reparación de aire acondicionado',
            fecha_registro: new Date().toISOString(),
            estado: 'pendiente',
            cuarto_numero: '101',
            cuarto_nombre: '101'
        },
        {
            id: 2,
            cuarto_id: 1,
            tipo: 'rutina',
            descripcion: 'Cambio de filtros programado',
            hora: '14:00:00',
            dia_alerta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            nivel_alerta: 'media',
            fecha_registro: new Date().toISOString(),
            estado: 'pendiente',
            cuarto_numero: '101',
            cuarto_nombre: '101'
        },
        {
            id: 3,
            cuarto_id: 1,
            tipo: 'rutina',
            descripcion: 'Inspección de seguridad',
            hora: '10:00:00',
            dia_alerta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            nivel_alerta: 'alta',
            fecha_registro: new Date().toISOString(),
            estado: 'pendiente',
            cuarto_numero: '101',
            cuarto_nombre: '101'
        },
        {
            id: 4,
            cuarto_id: 1,
            tipo: 'normal',
            descripcion: 'Revisión de plomería en baño',
            fecha_registro: new Date().toISOString(),
            estado: 'pendiente',
            cuarto_numero: '101',
            cuarto_nombre: '101'
        },
        {
            id: 5,
            cuarto_id: 2,
            tipo: 'normal',
            descripcion: 'Limpieza profunda',
            fecha_registro: new Date().toISOString(),
            estado: 'pendiente',
            cuarto_numero: '102',
            cuarto_nombre: '102'
        },
        {
            id: 6,
            cuarto_id: 3,
            tipo: 'rutina',
            descripcion: 'Mantenimiento preventivo',
            hora: '09:00:00',
            dia_alerta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            nivel_alerta: 'baja',
            fecha_registro: new Date().toISOString(),
            estado: 'pendiente',
            cuarto_numero: '201',
            cuarto_nombre: '201'
        }
    ]
};
```

### 3.2 Manejo de Errores y Fallback Offline

**Archivo:** `app-loader.js` (líneas 164-208)

```164:208:app-loader.js
        
    } catch (error) {
        console.error('💥 Error al inicializar la aplicación:', error);
        console.error('📋 Error name:', error.name);
        console.error('📝 Error message:', error.message);
        console.error('🔍 Stack trace:', error.stack);
        
        // Intentar diagnóstico adicional
        console.log('🔧 Iniciando diagnóstico de error...');
        console.log('🌐 Conectividad a API:', API_BASE_URL);
        
        // Probar conectividad básica
        try {
            console.log('🧪 Probando conectividad básica...');
            const response = await fetch(API_BASE_URL + '/api/cuartos');
            console.log('📡 Response status:', response.status);
            console.log('📊 Response ok:', response.ok);
        } catch (fetchError) {
            console.error('🚫 Error de conectividad crítico:', fetchError);
            console.error('🔍 Fetch error details:', fetchError.message);
            throw fetchError; // Re-lanzar el error para manejarlo arriba
        }
        
        // Si llegamos aquí, hubo un error de aplicación, no de red
        console.log(' Error de aplicación, re-intentando...');

        
        // Si llegamos aquí, usar datos offline como último recurso
        console.log('🆘 Usando datos offline como último recurso...');
        try {
            cuartos = datosOffline.cuartos;
            edificios = datosOffline.edificios; 
            mantenimientos = datosOffline.mantenimientos;

            sincronizarCuartosFiltrados();
            mostrarCuartos();
            mostrarEdificios();
            cargarCuartosEnSelect();
            mostrarAlertasYRecientes();
            
            mostrarMensaje('Aplicación funcionando en modo offline', 'warning');
        } catch (offlineError) {
            console.error('Error cargando datos offline:', offlineError);
            mostrarError('Error crítico al cargar la aplicación.');
        }
    }
}
```

### 3.3 Segundo Fallback Offline en Función de Carga

**Archivo:** `app-loader.js` (líneas 337-359)

```337:359:app-loader.js
        console.log('🆘 Usando datos offline como último recurso...');
        
        // Usar datos offline
        try {
            cuartos = datosOffline.cuartos;
            edificios = datosOffline.edificios;
            mantenimientos = datosOffline.mantenimientos;

            sincronizarCuartosFiltrados();
            mostrarCuartos();
            mostrarEdificios();
            cargarCuartosEnSelect();
            mostrarAlertasYRecientes();
            
            console.log('Datos offline cargados:', {
                cuartos: cuartos.length,
                edificios: edificios.length,
                mantenimientos: mantenimientos.length
            });
            
                mostrarMensaje('Aplicación funcionando en modo offline con datos de ejemplo', 'info');
        } catch (offlineError) {
            console.error('Error cargando datos offline:', offlineError);
            throw new Error('No se pueden cargar datos ni desde API ni desde cache offline');
        }
```

---

## 4. Configuración de Package.json

### 4.1 Dependencias y Scripts

**Archivo:** `package.json` (referencia a offline-first)

La aplicación está configurada con soporte offline-first según se menciona en el reporte. El package.json incluye la descripción "offline-first" en línea 34.

---

## 5. Estructura de Archivos PWA

### 5.1 Iconos PWA

Los iconos mencionados en el manifest están presentes en:
- `icons/icon-192x192.png`
- `icons/icon-512x512.png`
- `icons/maskable-icon-192x192.png`
- `icons/favicon.ico`
- `icons/favicon.png`

### 5.2 Recursos Cacheados

Los recursos que el Service Worker cachea incluyen:
- `index.html`
- `style.css`
- `script.js`
- `app-loader.js`
- `logo_high.png`
- `logo_low.png`
- `icons/icon-192x192.png`
- `icons/icon-512x512.png`
- `sounds/alert.mp3`

---

## Notas Importantes

1. **Service Worker**: Actualmente está deshabilitado para debugging, pero el código completo está implementado en `sw.js`.

2. **IndexedDB**: El reporte menciona implementación de IndexedDB para cola de sincronización, pero esta funcionalidad no está presente en el código actual. El código actual usa datos mock como fallback.

3. **Detección de Conexión**: El reporte menciona event listeners para `online`/`offline`, pero estos no están implementados en el código actual. El código actual detecta errores de red y usa fallback offline.

4. **Estrategia de Caché**: El Service Worker implementa:
   - **Cache First** para recursos estáticos (CSS, JS, imágenes)
   - **Network First** para peticiones API (siempre intenta red primero)

---

## Resumen de Evidencias

✅ **Implementado:**
- Manifest.json completo con configuración PWA
- Service Worker con estrategias de caché
- Datos mock para modo offline
- Manejo de errores con fallback offline
- Referencias PWA en index.html
- Iconos PWA configurados

⚠️ **Mencionado en reporte pero no implementado:**
- IndexedDB para cola de sincronización
- Event listeners para detección de conexión (online/offline)
- Indicadores visuales de estado de conexión
- Sincronización automática de operaciones pendientes

---

**Fecha de generación:** 2025-11-06  
**Última actualización del código:** Revisión actual del repositorio

