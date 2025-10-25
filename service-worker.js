// Service Worker - This file runs in the background and manages caching for offline access

const CACHE_NAME = 'fire-ops-v1';

// List of files to cache immediately when the service worker is installed
// Add any files here that you want to be available offline
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json'
  // Your PDF and image files will be cached automatically when first accessed
];

/**
 * Install event - happens when the service worker is first installed
 * This is where we cache all the essential files
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

/**
 * Fetch event - intercepts all network requests
 * This is where the magic happens - we serve cached files when offline
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If we have a cached version, return it
        if (response) {
          return response;
        }

        // Otherwise, fetch from network and cache it for next time
        return fetch(event.request).then(
          fetchResponse => {
            // Don't cache if it's not a valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Clone the response because it can only be consumed once
            const responseToCache = fetchResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Cache this file for future offline access
                cache.put(event.request, responseToCache);
              });

            return fetchResponse;
          }
        ).catch(() => {
          // If fetch fails (offline), try to return cached version
          return caches.match(event.request);
        });
      })
  );
});

/**
 * Activate event - clean up old caches when a new service worker activates
 */
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
