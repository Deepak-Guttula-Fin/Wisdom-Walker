// Service Worker for Cache Control
const CACHE_NAME = 'wisdom-walker-v2.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-database-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics-compat.js',
    'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js'
];

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch event - serve from cache, but always try network first
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    // For HTML files, always try network first to get latest
                    if (event.request.url.includes('.html') || 
                        event.request.url.endsWith('/') ||
                        event.request.url.includes('script.js') ||
                        event.request.url.includes('style.css')) {
                        return fetch(event.request)
                            .then(networkResponse => {
                                // Update cache with new version
                                caches.open(CACHE_NAME).then(cache => {
                                    cache.put(event.request, networkResponse.clone());
                                });
                                return networkResponse;
                            })
                            .catch(() => {
                                return response;
                            });
                    }
                    return response;
                }
                
                // Not in cache - fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // Don't cache non-successful responses
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }
                        
                        // Cache successful responses
                        return caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, networkResponse.clone());
                                return networkResponse;
                            });
                    })
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Force immediate activation
self.skipWaiting();
