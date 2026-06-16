const CACHE_VERSION = "v25";
const CACHE_NAME = `habitHero-cache-${CACHE_VERSION}`;
const APP_ASSETS = [
  // Główne dokumenty HTML
  "./",
  "./index.html",
  "./calendar.html",
  "./habits.html",
  "./hero.html",

  // Style css
  "./css/global.css",
  "./css/index.css",
  "./css/calendar.css",
  "./css/habits.css",
  "./css/hero.css",

  // Architektura JS aplikacji
  "./js/app.js",
  "./js/data.js",
  "./js/db.js",
  "./js/elements.js",
  "./js/events.js",
  "./js/icons.js",
  "./js/onboarding.js",
  "./js/services.js",
  "./js/ui.js",

  // fonts
  "./assets/fonts/fredoka-v17-latin-600.woff2",
  "./assets/fonts/fredoka-v17-latin-700.woff2",
  "./assets/fonts/poppins-v24-latin-regular.woff2",
  "./assets/fonts/poppins-v24-latin-500.woff2",
  "./assets/fonts/poppins-v24-latin-600.woff2",
  "./assets/fonts/poppins-v24-latin-700.woff2",

  // PWA manifest
  "./manifest.webmanifest",

  // Wszystkie zasoby graficzne i ikony z folderu assets
  "./assets/icons/android-chrome-192x192.webp",
  "./assets/icons/android-chrome-512x512.webp",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon.ico",
  "./assets/icons/habitbubbl-favicon.svg",
  "./assets/icons/logo-192.webp",
  "./assets/icons/logo-512.webp",
  "./assets/icons/logo-habit-bubbles.webp",
  "./assets/icons/logo-icon.svg",
  "./assets/icons/logo-transparent.webp",
  "./assets/icons/logo.svg",

  // Pliki dźwiękowe
  "./assets/sounds/bubble_pop.mp3",
];

console.log("🔧 SW: Inicjalizacja - Cache Name:", CACHE_NAME);
console.log("📦 SW: Zasoby do Cacheowania:", APP_ASSETS);

// nie ma widnow i this ale jest self czyli sw
// to się odpali tylko raz przy instalacji nowego sw
self.addEventListener("install", (event) => {
  event.waitUntil(
    // przeglądarka otwiera lub tworzy cache, jest to operacja atomowa
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("✅ INSTALL: Cache otwarty pomyślnie");
        console.log("📥 INSTALL: Dodawanie zasobów do cache...");
        return cache.addAll(APP_ASSETS);
      })
      .then(() => {
        console.log("✅ INSTALL: Wszystkie zasoby dodane do cache");
        console.log(
          "⚡️ INSTALL: Wywołanie skipWaiting() - natychmiastowa aktywacja"
        );
        // to tylko do developmentu - jest też checkbox w dev toolsach
        return self.skipWaiting();
      })
      .then(() => {
        console.log("🏁 INSTALL: Instalacja zakończona");
      })
      .catch((err) => {
        console.log("❌ INSTALL: Błąd podczas cacheowania:", err);
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
    checkStorageQuota()
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
  //if (request.method !== "GET") return;

  const url = new URL(request.url);
  const path = url.pathname;

  // CACHE ONLY: Manifest
  if (path.endsWith("manifest.webmanifest")) {
    event.respondWith(
      caches.match(request).then((response) => response || fetch(request))
    );
    return;
  }
  /*Cache only
  if (APP_ASSETS.some(asset => event.request.url.includes(asset.replace('./', '')))) {
    event.respondWith(caches.match(event.request));
    return
  }
  */

  // CACHE FIRST: css, assets (ZABEZPIECZONY PRZED STATUSEM 206 DLA AUDIO)
  if (path.endsWith(".css") || path.includes("/assets/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request).then((response) => {
            // Odpowiedzi typu Partial Content (206) dla audio lecą prosto do odtwarzacza.
            if (response.status === 200) {
              const clone = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone));
            }
            return response;
          })
        );
      })
    );
    return;
  }

  //NETWORK FIRST: Motivational Quotes API
  if (url.hostname.includes("api.adviceslip.com")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return (
            cached ||
            new Response(
              JSON.stringify({ advice: "Hero, stay disciplined!" }),
              {
                headers: { "Content-Type": "application/json" },
              }
            )
          );
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
});

async function checkStorageQuota() {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const estimate = await navigator.storage.estimate();

    const usageInMb = (estimate.usage / (1024 * 1024)).toFixed(2);
    const quotaInMb = (estimate.quota / (1024 * 1024)).toFixed(2);
    const percentageUsed = ((estimate.usage / estimate.quota) * 100).toFixed(1);

    console.log(`Storage Używane: ${usageInMb} MB`);
    console.log(`Storage Dostępne: ${quotaInMb} MB`);
    console.log(`Procent Użycia: ${percentageUsed} %`);

    if (percentageUsed > 80) {
      console.warn("Storage quota > 80%");
      await cleanupOldCaches();
    }

    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentageUsed,
    };
  }
}

async function cleanupOldCaches() {
  const keys = await caches.keys();

  return Promise.all(
    keys.map((key) => {
      if (key !== CACHE_NAME) {
        console.log(`🗑️ SW: Usuwanie starego cache: ${key}`);
        return caches.delete(key);
      }
    })
  );
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow("/");
    })
  );
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "daily-briefing") {
    event.waitUntil(checkAndNotify());
  }
});

// sw.js
async function checkAndNotify() {
  const now = new Date();
  const hour = now.getHours();
  if (hour < 8 || hour >= 20) return;

  const todayKey = now.toISOString().split("T")[0];

  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open("HabitHeroDB", 6);

    dbRequest.onerror = () => reject("SW: Error while opening DB.");

    dbRequest.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(["tasks", "metadata"], "readwrite");
      const metaStore = tx.objectStore("metadata");
      const taskStore = tx.objectStore("tasks");
      const taskIndex = taskStore.index("by_date");

      const metaRequest = metaStore.get("last_briefing_date");

      metaRequest.onsuccess = () => {
        const lastDate = metaRequest.result?.value || metaRequest.result;

        if (lastDate === todayKey) {
          console.log("SW: Briefing has already been done today.");
          return resolve();
        }

        const taskRequest = taskIndex.getAll(IDBKeyRange.only(todayKey));

        taskRequest.onsuccess = () => {
          const tasks = taskRequest.result;
          const undoneCount = tasks.filter((t) => !t.done).length;

          if (undoneCount > 0) {
            metaStore.put(todayKey, "last_briefing_date");
            //metaStore.put({ id: "last_briefing_date", value: todayKey });

            self.registration.showNotification("Habit Bubble", {
              body: `Hey, You have ${undoneCount} thing(s) to do today! Let's go!`,
              icon: "./assets/icons/logo-192.webp",
              badge: "./assets/icons/logo-192.webp",
              tag: "daily-briefing",
              renotify: true,
            });
          }
          resolve();
        };
      };

      tx.oncomplete = () => db.close();
      tx.onerror = () => reject("SW: Transaction error");
    };
  });
}
