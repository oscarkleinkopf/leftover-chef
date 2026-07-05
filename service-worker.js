/**
 * Leftover Chef - Service Worker
 * Offline-first file caching and request interceptor.
 */

const CACHE_NAME = 'leftover-chef-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/recipes.js',
  './js/scanner.js',
  './js/app.js',
  './icon.svg',
  './manifest.json'
];

// Install Event - cache core resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install: Caching static assets');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate: Cleaning old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Serve cached content or fallback to network
self.addEventListener('fetch', (event) => {
  // Do not intercept external API calls to Google Gemini
  if (event.request.url.includes('generativelanguage.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Fallback to fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Cache newly fetched local pages
        if (networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // If both cache and network fail, check if it is HTML
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
