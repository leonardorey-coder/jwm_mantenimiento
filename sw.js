const CACHE_NAME = 'jwm-mant-cache-v1';
const urlsToCache = [
  './index.php', // Cambiado de '/' a ruta explícita relativa
  './style.css',
  './script.js',
  './logo_high.png',
  './logo_low.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
  // No cachear procesar.php, obtener_*.php ni data.json
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

  // No intentar cachear peticiones POST o a scripts PHP de procesamiento/obtención
  // o el propio manifest/sw (aunque no deberían pedirse via fetch normalmente)
  if (event.request.method === 'POST' ||
      requestUrl.pathname.endsWith('.php') ||
      requestUrl.pathname.endsWith('data.json') ||
      requestUrl.pathname.endsWith('manifest.json') ||
      requestUrl.pathname.endsWith('sw.js')) {
    // Para PHP, POST y archivos PWA, siempre ir a la red
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
