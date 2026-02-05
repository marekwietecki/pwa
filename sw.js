const CACHE_VERSION = "v2";
const CACHE_NAME = `habitHero-cache-${CACHE_VERSION}`;
const APP_ASSETS = [
  // tylko niezbędne do działania offline
  "./",
  "./index.html",
  "./calendar.html",
  "./habits.html",
  "./hero.html",
  "./style.css",
  "./app.js",
  "./manifest.webmanifest",
  "./assets/192x192.png",
  "./assets/512x512.png",
];

console.log('🔧 SW: Inicjalizacja - Cache Name:', CACHE_NAME);
console.log('📦 SW: Zasoby do Cacheowania:', APP_ASSETS);

// nie ma widnow i this ale jest self czyli sw
// to się odpali tylko raz przy instalacji nowego sw
self.addEventListener("install", (event) => {
  event.waitUntil(
    // przeglądarka otwiera lub tworzy cache, jest to operacja atomowa
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ INSTALL: Cache otwarty pomyślnie');
        console.log('📥 INSTALL: Dodawanie zasobów do cache...');
        return cache.addAll(APP_ASSETS);
      })
      .then(() => {
        console.log('✅ INSTALL: Wszystkie zasoby dodane do cache');
        console.log('⚡️ INSTALL: Wywołanie skipWaiting() - natychmiastowa aktywacja');
        // to tylko do developmentu - jest też checkbox w dev toolsach
        return self.skipWaiting();
      })
      .then(() => {
        console.log('🏁 INSTALL: Instalacja zakończona');
      })
      .catch((err) => {
        console.log('❌ INSTALL: Błąd podczas cacheowania:', err);
      })
  );
});

//cleanup, czyścimy stare cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("habitHero-cache-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      ),
      checkStorageQuota(),
  );
  // development, bo claim może nam zepsuć działające strony ..
  // .. jak się mocno różnią sw między sobą
  self.clients.claim();
});

// każdy request http przechodzi przez to tutaj
self.addEventListener("fetch", (event) => {
  const { request } = event;
  // bezpiecznie jest samo get dla prostych pwa,
  // przy wysylaniu po odzyskaniu sieci lub offline editing notatek np.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const path = url.pathname;

  // CACHE ONLY: Manifest
  if (path.endsWith('manifest.webmanifest')) {
    event.respondWith(
      caches.match(request).then((response) => {
        // Zabezpieczenie: jeśli manifestu nie ma w cache, pobierz go raz
        return response || fetch(request).then(netRes => {
          const clone = netRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return netRes;
        });
      })
    );
    return;
  }
  /*Cache only
  if (APP_ASSETS.some(asset => event.request.url.includes(asset.replace('./', '')))) {
    event.respondWith(caches.match(event.request));
    return
  }
  */

  //CACHE FIRST: css, assets
  if (path.endsWith('.css') || path.includes('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // STALE WHILE REVALIDATE: pages, app.js
  event.respondWith(
    // jak jest w cache, to pokazujemy i w trakcie równolegle ..
    // .. szukamy w sieci nowszej wersji i jak jest to następnym razem podmianka
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          // musimy klonować żeby go zwrócić, bo response to strumień
          const clone = response.clone();

          // response od 200 do 299 i tutaj chcemy tylko od swojego api brać zasoby (można z zew. ale trzeba czasami ograć dodatkowo)
          if (response.ok && request.url.startsWith(self.location.origin)) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }

          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );

  //NETWORK FIRST: Motivational Quotes API 
  if (url.hostname.includes('api.quotable.io')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }
});




async function checkStorageQuota() {
  if('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();

    const usageInMb = (estimate.usage / (1024*1024)).toFixed(2);
    const quotaInMb = (estimate.quota / (1024*1024)).toFixed(2);
    const percentageUsed = ((estimate.usage / estimate.quota) * 100).toFixed(1);

    console.log(`Storage Używane: ${usageInMb} MB`);
    console.log(`Storage Dostępne: ${quotaInMb} MB`);
    console.log(`Procent Użycia: ${percentageUsed} %`);

    if(percentageUsed > 80) {
      console.warn('Storage quota > 80%')
      await cleanupOldCaches()
    }

    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentageUsed
    }
  }
}

async function cleanupOldCaches() {
  const keys = await caches.keys();

  return Promise.all(
    keys.map(key => {
      if (key !== CACHE_NAME) {
        console.log(`🗑️ SW: Usuwanie starego cache: ${key}`);
        return caches.delete(key);
      }
    })
  );
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close(); 

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});