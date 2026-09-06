// Service Worker de Mi Zapatería v3.5
// IMPORTANTE: cambiar CACHE_VERSION con cada actualización de la app
// para que los dispositivos descarguen la nueva versión automáticamente.
const CACHE_VERSION = 24;
const CACHE_NAME = 'zapateria-v' + CACHE_VERSION;

const ARCHIVOS_CORE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Al instalar: pre-cachear archivos y activar inmediatamente
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ARCHIVOS_CORE);
    })
  );
  // Activar sin esperar a que se cierren las pestañas abiertas
  self.skipWaiting();
});

// Al activar: eliminar cachés antiguas y tomar control inmediatamente
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      // Tomar control de TODAS las pestañas abiertas sin esperar recarga
      return self.clients.claim();
    }).then(function() {
      // Notificar a todas las pestañas que hay una versión nueva
      return self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ tipo: 'nueva-version', version: CACHE_VERSION });
        });
      });
    })
  );
});

// Estrategia de fetch: red primero para HTML, caché primero para el resto
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  var esHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');

  if (esHTML) {
    // Red primero: siempre intenta descargar la versión más nueva
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var copia = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copia); });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
  } else {
    // Caché primero para iconos y manifest
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          if (response && response.status === 200) {
            var copia = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copia); });
          }
          return response;
        });
      }).catch(function() {
        return caches.match('./index.html');
      })
    );
  }
});

// Escuchar mensajes desde la app
self.addEventListener('message', function(event) {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
