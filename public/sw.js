const CACHE_NAME = 'queijos-wr-pedidos-v9-logo-transparente';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/logo-queijos-wr.png',
  '/logo-app.png',
  '/logo.png',
  '/logo-queijos-wr.svg',
  '/logo-app.svg',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/pwa-icon.svg',
  '/icone.png',
  '/icone.svg',
  '/favicon.ico',
  '/favicon-16.png',
  '/favicon-32.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});
