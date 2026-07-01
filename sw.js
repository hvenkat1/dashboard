// Forma PWA Service Worker
// Caches the app shell so it loads instantly and works offline (except for
// Firebase data, which always requires a network connection).

const CACHE_NAME = 'forma-v1';
const CACHE_URLS = [
  '/dashboard/',
  '/dashboard/index.html',
  '/dashboard/manifest.json',
  '/dashboard/icons/icon-192.png',
  '/dashboard/icons/icon-512.png'
];

// Install — cache the app shell immediately
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS);
    }).then(function() {
      // Take over immediately without waiting for old tabs to close
      return self.skipWaiting();
    })
  );
});

// Activate — clean up any old caches from previous versions
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch — serve from cache first for app shell files, network first for
// everything else (Firebase, Open Food Facts, AI APIs).
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Always go to network for API calls — Firebase, Gemini, OFF, etc.
  if (
    url.includes('firestore.googleapis.com') ||
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('openfoodfacts.org') ||
    url.includes('anthropic.com') ||
    url.includes('openai.com')
  ) {
    return; // Let the browser handle it normally
  }

  // Cache-first for the app shell
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Cache successful GET responses for the app's own files
        if (
          response.ok &&
          event.request.method === 'GET' &&
          url.includes('/dashboard/')
        ) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
    })
  );
});
