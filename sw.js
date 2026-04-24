/**
 * CalcPro — Service Worker (sw.js)
 * Enables offline-first operation by caching all app assets
 * Compatible with Android WebView PWA and standalone browsers
 */

'use strict';

const CACHE_NAME   = 'calcpro-v1.0.0';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;600;700;800&display=swap'
];

/* Install: pre-cache all app shell assets */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* Activate: clean up old caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch: cache-first strategy */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Fallback to index.html for navigation requests
          if (event.request.mode === 'navigate') return caches.match('./index.html');
        })
      )
  );
});
