// Stock Register — service worker
// Cache-first with network fallback: serve instantly from cache when present
// (refreshing it in the background from the network), otherwise fetch from the
// network and cache the response. Bump CACHE_NAME on every deploy so old caches
// get cleaned up on 'activate'.

const CACHE_NAME = 'stock-register-cache-v2026-07-16.1';
const CORE_ASSETS = [
  './',
  './index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((err) => console.warn('sw: precache failed', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // only cache safe, idempotent GETs

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);

      // Cross-origin no-CORS resources (fonts, CDN scripts) always report status 0
      // and type 'opaque' — that's expected and they're still safe to cache.
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => null);

      if (cached) {
        // Serve the cached copy instantly; refresh the cache in the background
        // without making the caller wait for it.
        networkFetch;
        return cached;
      }

      const netRes = await networkFetch;
      return netRes || new Response('Offline and this resource is not cached yet.', { status: 503 });
    })
  );
});
