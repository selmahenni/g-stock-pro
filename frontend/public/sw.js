/*
 * Service worker neutralisant.
 *
 * L'application n'utilise plus de service worker. D'anciennes versions en avaient
 * enregistré un : les navigateurs concernés continuaient de réclamer /sw.js (404 en boucle).
 * Ce fichier renvoie désormais un 200 ; il se désenregistre lui-même, vide les caches,
 * puis recharge les onglets ouverts. Une fois exécuté, plus aucune requête /sw.js ne part.
 */
self.addEventListener('install', () => {
  // Prend la main immédiatement, sans attendre la fermeture des onglets.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) { /* pas de cache à nettoyer */ }

    await self.registration.unregister();

    // Recharge les pages contrôlées pour qu'elles repartent sans service worker.
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => client.navigate(client.url));
  })());
});
