// Install the service worker to cache the assets needed to work as an offline PWA
self.addEventListener("install", function(event) {
    event.waitUntil(caches.open("dash_cache").then(function(cache) {
        return cache.addAll([
            './index.html',
            './js/dash.js',
            './js/csv.js',
            './js/simulator.js',
            './lib/gauge/gauge.min.js',
            './css/dash.css',
            './manifest.json',
            './icon/192x192.png',
            './icon/512x512.png'
        ]);
    }));
});

// Get the resquests online, if not, get from offline cache
self.addEventListener("fetch", function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request);
        })
    );
});
