const CACHE_VERSION = 'v';
const CACHE_NAME = `habitHero-cache-${CACHE_VERSION}`;
const APP_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.webmanifest',
    './assets/192x192.png',
    './assets/512x512.png',
]

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS))
    );

    self.skipWaiting();
})

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k.startsWith('habitHero-cache-') && k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
})

self.addEventListener('fetch', event => {
    const {request} = event;
    if(request.method !== 'GET') return;

    event.respondWith(
        caches.match(request).then( cached => {
            const networkFetch = fetch(request)
                .then( response => {
                    const clone = response.clone();

                    if(response.ok && request.url.startsWith(self.location.origin)) {
                        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    }

                    return response
                })
                .catch(() => cached);

        return cached || networkFetch;
        })
    )
})