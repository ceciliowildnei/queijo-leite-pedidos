const CACHE_NAME = 'queijos-wr-v5-202608062022';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/brand/app-icon-mobile.jpg',
  '/brand/logo-simbolo.webp',
  '/install-app.css',
  '/install-app.js',
  '/mobile-stage-3.js?v=202608062022',
  '/mobile-final-fixes.css?v=202608061402',
  '/mobile-bar-overlap-fix.css?v=202608061915',
  '/mobile-bar-overlap-fix.js?v=202608061915',
  '/mobile-top-actions.css?v=202608062022'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  const isFreshAsset = /\.(?:js|css|json|webmanifest)$/i.test(url.pathname);
  if (isFreshAsset) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
