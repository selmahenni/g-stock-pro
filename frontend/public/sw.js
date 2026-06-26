// frontend/public/sw.js
const CACHE_NAME = 'g-stock-pro-cache-v1';

// 1. À l'installation, on prend le contrôle immédiatement
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. À l'activation, on nettoie les anciens caches potentiels
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. OBLIGATOIRE POUR LA PWA : Interception des requêtes (Événement 'fetch')
// Stratégie "Network First, fallback to Cache" pour garantir des données fraîches
self.addEventListener('fetch', (event) => {
  // On ignore les requêtes non-GET et les requêtes vers l'API Backend (on ne veut pas cacher l'API)
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Si le réseau répond bien, on met en cache cette nouvelle version
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Si le technicien est hors-ligne (en zone blanche), on sort la page du cache
        return caches.match(event.request);
      })
  );
});