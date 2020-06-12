// Install the service worker to cache the assets needed to work as an offline PWA
self.addEventListener("install", function(event) {
    console.log("serviceWorker installed");
    event.waitUntil(
        caches.open("dash_cache").then(function(cache) {
            return cache.addAll([
                './index.html',
                './js/dash.js',
                './js/csv.js',
                './lib/gauge/gauge.min.js',
                './css/dash.css'
            ]);
        });
    );
});

// Get the resquests online, if not, get from offline cache
self.addEventListener("fetch", function(event) {
    event.respondWith(
        fetch(event.request).catch(function() {
            console.log("Fetched from cache");
            return caches.match(event.request);
        })
    );
});
