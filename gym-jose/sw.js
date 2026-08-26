/* Service worker de Gym José — precache del shell + módulos para uso offline.
   Estrategia: cache-first para lo precacheado; red con fallback a caché para el resto.
   Sube CACHE_VERSION al publicar cambios para invalidar la caché anterior. */

const CACHE_VERSION = 'gym-jose-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
  './src/app.js',
  './src/db.js',
  './src/store.js',
  './src/data/seed-machines.js',
  './src/data/seed-plan12.js',
  './src/lib/ui.js',
  './src/lib/validate.js',
  './src/lib/chart.js',
  './src/lib/export.js',
  './src/lib/metrics.js',
  './src/lib/plate.js',
  './src/lib/plate-ui.js',
  './src/lib/timer.js',
  './src/views/routines.js',
  './src/views/machines.js',
  './src/views/plan.js',
  './src/views/progress.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navegaciones: intenta red, cae a index.html cacheado (SPA offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Resto: cache-first, y guarda en caché lo nuevo que se descargue.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
    }),
  );
});
