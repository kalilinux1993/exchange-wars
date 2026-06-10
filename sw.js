// Minimal PWA shell: network-first with cache fallback for same-origin GETs.
// The game itself is fully client-side; this just makes reopening work offline.
const CACHE = 'exchange-wars-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const fresh = await fetch(event.request);
        cache.put(event.request, fresh.clone());
        return fresh;
      } catch {
        const hit = await cache.match(event.request, { ignoreSearch: true });
        if (hit) return hit;
        throw new Error('offline and uncached: ' + url.pathname);
      }
    }),
  );
});
