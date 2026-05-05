// VisuaLim Service Worker — v1.0
// Universidad de Nariño · 2026

const CACHE_NAME = 'visualim-v1';

// Archivos a cachear para funcionamiento offline
const ASSETS = [
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
  // Fuentes de Google (se intentan cachear en primera carga)
  'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,600&family=Playfair+Display:ital,wght@1,700&display=swap'
];

// ── INSTALACIÓN ──────────────────────────────────────────────
self.addEventListener('install', function(event) {
  console.log('[SW] Instalando VisuaLim...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Cacheando archivos principales');
      // Cachear archivos locales (falla silenciosa en fuentes externas)
      return cache.addAll(ASSETS.filter(url => !url.startsWith('http')))
        .then(function() {
          // Intentar cachear fuentes externas (opcional)
          return cache.addAll(
            ASSETS.filter(url => url.startsWith('http'))
          ).catch(function() {
            console.log('[SW] Fuentes externas no cacheadas (sin conexión inicial)');
          });
        });
    }).then(function() {
      console.log('[SW] Instalación completa');
      return self.skipWaiting();
    })
  );
});

// ── ACTIVACIÓN ───────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  console.log('[SW] Activando VisuaLim...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          console.log('[SW] Eliminando caché antiguo:', name);
          return caches.delete(name);
        })
      );
    }).then(function() {
      console.log('[SW] Activación completa');
      return self.clients.claim();
    })
  );
});

// ── FETCH (Estrategia: Cache First, Network Fallback) ────────
self.addEventListener('fetch', function(event) {
  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      // Si está en caché, devolver inmediatamente
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no está en caché, ir a la red
      return fetch(event.request).then(function(networkResponse) {
        // Cachear la respuesta para uso futuro
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(function() {
        // Sin red y sin caché: devolver página principal como fallback
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

// ── MENSAJE DESDE LA APP ─────────────────────────────────────
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
