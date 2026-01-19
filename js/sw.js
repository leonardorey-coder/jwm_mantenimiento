const CACHE_NAME = 'jwm-mant-cache-v4';
const urlsToCache = [
  './index.html',
  './style.css',
  './script.js',
  './app-loader.js',
  './logo_high.png',
  './logo_low.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './sounds/alert.mp3',
  // No cachear API endpoints ni data.json
];

// Instalar el Service Worker y cachear los archivos principales
self.addEventListener('install', (event) => {
  // Asegurar que el SW no se instale hasta que el caché esté listo.
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        // Usar rutas relativas asegura que se use el mismo protocolo (HTTPS)
        const requests = urlsToCache.map(
          (url) => new Request(url, { cache: 'reload' })
        );
        return cache.addAll(requests);
      })
      .then(() => {
        console.log('Todos los recursos principales cacheados con éxito.');
        // Forzar la activación del nuevo SW inmediatamente
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Fallo al cachear durante la instalación:', error);
      })
  );
});

// Interceptar peticiones y servir desde caché si es posible
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // No intentar cachear peticiones POST, API endpoints, o archivos especiales PWA
  if (
    event.request.method === 'POST' ||
    requestUrl.pathname.startsWith('/api/') ||
    requestUrl.pathname.endsWith('data.json') ||
    requestUrl.pathname.endsWith('manifest.json') ||
    requestUrl.pathname.endsWith('sw.js')
  ) {
    // Para API, POST y archivos PWA, siempre ir a la red
    event.respondWith(fetch(event.request));
    return;
  }

  // Para otras peticiones (GET a CSS, JS, imágenes, etc.), intentar caché primero
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si está en caché, devolverlo
      if (response) {
        return response;
      }
      // Si no, ir a la red
      return fetch(event.request)
        .then((networkResponse) => {
          // Opcional: Cachear la respuesta obtenida de la red para futuras peticiones
          // Clona la respuesta porque es un stream y solo se puede consumir una vez
          // Asegúrate de no cachear respuestas de error o de tipos inesperados
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === 'basic'
          ) {
            let responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.error('Fetch fallido:', error);
          // Podrías devolver una página offline genérica aquí si la tienes cacheada
          // return caches.match('./offline.html');
        });
    })
  );
});

// Limpiar cachés antiguas en el evento activate
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('Eliminando caché antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Cachés antiguas eliminadas, SW activado.');
        // Tomar control inmediato de las páginas abiertas
        return self.clients.claim();
      })
  );
});

// ========================================
// PUSH NOTIFICATIONS - Soporte PWA
// ========================================

/**
 * Manejar notificaciones push recibidas del servidor
 */
self.addEventListener('push', (event) => {
  console.log('🔔 [SW] Push notification recibida');

  let data = {
    title: '🔔 Alerta de Mantenimiento',
    body: 'Nueva alerta de mantenimiento',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-192x192.png',
    tag: 'alerta-mantenimiento',
    data: {}
  };

  // Intentar parsear datos del push
  if (event.data) {
    try {
      const pushData = event.data.json();
      data = { ...data, ...pushData };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || './icons/icon-192x192.png',
    badge: data.badge || './icons/icon-192x192.png',
    tag: data.tag || 'alerta-mantenimiento',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      {
        action: 'ver',
        title: 'Ver Alerta',
        icon: './icons/icon-192x192.png'
      },
      {
        action: 'descartar',
        title: 'Descartar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Manejar clics en notificaciones
 */
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [SW] Notificación clickeada:', event.action);

  event.notification.close();

  if (event.action === 'descartar') {
    return;
  }

  // Abrir o enfocar la ventana de la aplicación
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes('index.html') && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no hay ventana, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow('./index.html');
        }
      })
  );
});

/**
 * Manejar cierre de notificaciones
 */
self.addEventListener('notificationclose', (event) => {
  console.log('🔔 [SW] Notificación cerrada');
});

// ========================================
// PERIODIC BACKGROUND SYNC - Verificar alertas en segundo plano
// ========================================

/**
 * Manejar sincronización periódica en segundo plano
 * Se ejecuta incluso cuando la app está cerrada (solo Android/Chrome)
 */
self.addEventListener('periodicsync', (event) => {
  console.log('🔄 [SW] Periodic sync ejecutándose:', event.tag);

  if (event.tag === 'verificar-alertas') {
    event.waitUntil(verificarAlertasEnBackground());
  }
});

/**
 * Manejar sincronización normal (cuando vuelve la conexión)
 */
self.addEventListener('sync', (event) => {
  console.log('🔄 [SW] Background sync ejecutándose:', event.tag);

  if (event.tag === 'verificar-alertas-sync') {
    event.waitUntil(verificarAlertasEnBackground());
  }
});

/**
 * Verificar alertas pendientes desde el Service Worker
 * Hace fetch a la API y muestra notificaciones para alertas que coincidan
 */
async function verificarAlertasEnBackground() {
  try {
    console.log('🔍 [SW] Verificando alertas en background...');

    // Obtener la URL base desde los clientes
    const clients = await self.clients.matchAll();
    let apiBaseUrl = '';

    if (clients.length > 0) {
      const clientUrl = new URL(clients[0].url);
      apiBaseUrl = clientUrl.origin;
    } else {
      // Fallback: usar la ubicación del SW
      apiBaseUrl = self.location.origin;
    }

    // Obtener alertas pendientes de la API
    const response = await fetch(`${apiBaseUrl}/api/alertas/pendientes-hoy`);

    if (!response.ok) {
      console.error('❌ [SW] Error obteniendo alertas:', response.status);
      return;
    }

    const alertas = await response.json();
    console.log(`📋 [SW] Alertas pendientes encontradas: ${alertas.length}`);

    const ahora = new Date();
    const horaActual = ahora.toTimeString().slice(0, 5);
    const fechaActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

    // Filtrar alertas que deberían emitirse ahora o ya pasaron
    const alertasPorEmitir = alertas.filter(alerta => {
      if (alerta.tipo !== 'rutina' || !alerta.dia_alerta || !alerta.hora) return false;
      if (alerta.alerta_emitida) return false;

      const fechaAlerta = alerta.dia_alerta.includes('T')
        ? alerta.dia_alerta.split('T')[0]
        : alerta.dia_alerta;
      const horaAlerta = alerta.hora.slice(0, 5);

      // Verificar si la fecha/hora ya pasó o coincide con ahora
      const fechaPasada = fechaAlerta < fechaActual;
      const mismaFecha = fechaAlerta === fechaActual;
      const horaPasadaOMisma = horaAlerta <= horaActual;

      return fechaPasada || (mismaFecha && horaPasadaOMisma);
    });

    console.log(`📢 [SW] Alertas por emitir: ${alertasPorEmitir.length}`);

    // Mostrar notificación para cada alerta
    for (const alerta of alertasPorEmitir) {
      await mostrarNotificacionAlerta(alerta, apiBaseUrl);
    }

    // Notificar a los clientes abiertos para que actualicen su UI
    await notificarClientesActualizar();

  } catch (error) {
    console.error('❌ [SW] Error en verificación background:', error);
  }
}

/**
 * Mostrar notificación para una alerta específica
 */
async function mostrarNotificacionAlerta(alerta, apiBaseUrl) {
  try {
    const isEspacioComun = !!alerta.espacio_comun_id;
    const ubicacion = alerta.espacio_nombre || alerta.cuarto_nombre ||
      (isEspacioComun ? `Espacio #${alerta.espacio_comun_id}` : `Cuarto #${alerta.cuarto_id}`);

    const titulo = '🔔 Alerta de Mantenimiento';
    const mensaje = `${ubicacion}\n${alerta.descripcion}`;

    // Mostrar notificación
    await self.registration.showNotification(titulo, {
      body: mensaje,
      icon: './icons/icon-192x192.png',
      badge: './icons/icon-192x192.png',
      tag: `alerta-${alerta.id}`,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        alertaId: alerta.id,
        isEspacioComun: isEspacioComun
      },
      actions: [
        { action: 'ver', title: 'Ver Alerta' },
        { action: 'descartar', title: 'Descartar' }
      ]
    });

    // Marcar como emitida en el servidor
    try {
      await fetch(`${apiBaseUrl}/api/mantenimientos/${alerta.id}/emitir`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log(`✅ [SW] Alerta ${alerta.id} marcada como emitida`);
    } catch (err) {
      console.warn(`⚠️ [SW] No se pudo marcar alerta ${alerta.id}:`, err);
    }

  } catch (error) {
    console.error('❌ [SW] Error mostrando notificación:', error);
  }
}

/**
 * Notificar a los clientes abiertos para que actualicen su UI
 */
async function notificarClientesActualizar() {
  const allClients = await self.clients.matchAll({ includeUncontrolled: true });

  for (const client of allClients) {
    client.postMessage({
      type: 'ALERTAS_ACTUALIZADAS',
      timestamp: Date.now()
    });
  }
}

/**
 * Manejar mensajes desde el cliente
 */
self.addEventListener('message', (event) => {
  console.log('📨 [SW] Mensaje recibido:', event.data);

  if (event.data && event.data.type === 'VERIFICAR_ALERTAS') {
    verificarAlertasEnBackground();
  }
});

