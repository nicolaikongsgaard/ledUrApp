// Service Worker for offline support
const CACHE_NAME = 'led-ur-v12';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Install service worker and cache all files
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache opened, adding files...');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('All files cached!');
        return self.skipWaiting();
      })
  );
});

// Activate service worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch from cache first, then network
self.addEventListener('fetch', function(event) {
  // Don't intercept weather API requests - let them go directly to network
  if (event.request.url.includes('wttr.in')) {
    console.log('Bypassing cache for weather API:', event.request.url);
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }
        // Clone the request
        var fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // Check if valid response - allow both 'basic' and 'cors' types
            if(!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }

            // Clone the response
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});