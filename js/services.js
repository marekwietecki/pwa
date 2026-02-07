import { Utils, DataManager } from "./data.js";

// NotificationService.js
export const NotificationService = {
  // --- SILNIK (To co napisałeś) ---
  async send(title, options = {}) {
    const isMutedByUser = localStorage.getItem("user_notifications_enabled") === "false";
    if (Notification.permission !== "granted" || isMutedByUser) return;

    const registration = await navigator.serviceWorker.ready;
    
    const defaultOptions = {
      icon: "/assets/192x192.png",
      badge: "/assets/192x192.png", // Upewnij się, że ścieżka do badge jest poprawna
      vibrate: [200, 100, 200],
      tag: "habit-hero-alert", // Zapobiega spamowi (podmienia stare powiadomienie)
      renotify: true,
      ...options
    };

    return registration.showNotification(title, defaultOptions);
  },

  // --- LOGIKA (Kierowca) ---
  async runDailyCheck() {
    const now = new Date();
    // 1. Sprawdzamy godzinę (np. po 8 rano)
    if (now.getHours() < 8) return;

    // 2. Sprawdzamy czy już dziś nie było powiadomienia
    const todayKey = now.toISOString().split('T')[0]; // Prosty format YYYY-MM-DD
    if (localStorage.getItem("last_briefing_date") === todayKey) return;

    // 3. Pobieramy dane (na razie z localStorage, dopóki nie wjedzie IndexedDB)
    // UWAGA: SW tego nie widzi, to zadziała tylko gdy karta jest otwarta!
    const savedTasks = JSON.parse(localStorage.getItem("habitHero_tasks") || "{}");
    const tasksToday = savedTasks[todayKey] || {};
    const undoneCount = Object.keys(tasksToday).filter(name => !tasksToday[name].done).length;

    // 4. Jeśli są zadania - ogień!
    if (undoneCount > 0) {
      await this.send(
        "Good Morning! 🦸‍♂️",
        { body: `You have ${undoneCount} pending tasks for today. Time to level up!` }
      );
      localStorage.setItem("last_briefing_date", todayKey);
    }
  }
};

export const PermissionsManager = {
  init() {
    const notifyToggle = document.getElementById("toggleNotifications");
    const locationToggle = document.getElementById("toggleLocation");

    // Bezpiecznik: jeśli nie ma toggle na danej podstronie
    if (!notifyToggle || !locationToggle) return;

    // --- LOGIKA POWIADOMIEŃ ---
    const userWantsNotifications =
      localStorage.getItem("user_notifications_enabled") !== "false";
    const isSystemGranted = Notification.permission === "granted";

    // Toggle włączony tylko gdy system pozwala I użytkownik nie wyciszył
    notifyToggle.checked = isSystemGranted && userWantsNotifications;

    notifyToggle.addEventListener("change", async () => {
      if (notifyToggle.checked) {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          localStorage.setItem("user_notifications_enabled", "true");
          NotificationService.sendNotification(
            "Habit Hero",
            "Notifications are active! 🚀"
          );
        } else {
          notifyToggle.checked = false;
          alert(
            "Permission denied! Please enable notifications in your browser settings (lock icon in URL bar)."
          );
        }
      } else {
        localStorage.setItem("user_notifications_enabled", "false");
        console.log("🔕 Notifications muted by user toggle.");
      }
    });

    // --- LOGIKA LOKALIZACJI ---
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        locationToggle.checked = result.state === "granted";

        // Nasłuchiwanie zmian systemowych (np. user wyłączy w ustawieniach przeglądarki)
        result.onchange = () => {
          locationToggle.checked = result.state === "granted";
        };
      });
    }

    locationToggle.addEventListener("change", () => {
      if (locationToggle.checked) {
        navigator.geolocation.getCurrentPosition(
          () => {
            console.log("📍 Location access granted");
            // Możesz tu wywołać UI.refreshLocation() jeśli masz taką funkcję
          },
          () => {
            locationToggle.checked = false;
            alert(
              "Location access denied. Please enable it in browser settings."
            );
          }
        );
      }
    });
  },
};
/*
  const addTaskBtn = document.getElementById("addTaskBtn");
  if (addTaskBtn) {
    addTaskBtn.addEventListener("click", () => {
      NotificationService.init();
    });
  }
  */

export const LocationService = {
  // Wyszukiwanie po tekście
  search: async (query) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(url);
    return await res.json();
  },

  // Zamiana współrzędnych na adres (Reverse Geocoding)
  reverse: async (lat, lon) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const res = await fetch(url);
    return await res.json();
  },
};

export async function fetchDailyQuote() {
  const quoteText = document.getElementById("quote-text");
  const quoteAuthor = document.getElementById("quote-author");

  if (!quoteText || !quoteAuthor) {
    return;
  }
  const fallbackQuote = "Hero, your discipline is your biggest strength.";
  const fallbackAuthor = "— Habit Hero Team";

  const API_URL = "https://api.adviceslip.com/advice";

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error("Network issues");

    const data = await response.json();

    quoteText.textContent = `"${data.slip.advice}"`;
    quoteAuthor.textContent = `— Daily Hero Advice`;
  } catch (error) {
    console.log("Offline/Error mode: Using fallback quote.");

    quoteText.textContent = fallbackQuote;
    quoteAuthor.textContent = fallbackAuthor;
  }
}

export const OfflineService = {
  init() {
    if (!document.getElementById("offline-banner")) {
      const banner = document.createElement("div");
      banner.id = "offline-banner";
      banner.textContent =
        "Brak połączenia z internetem. Aplikacja działa w trybie offline!";
      document.body.prepend(banner);
    }

    const updateStatus = () => {
      if (navigator.onLine) {
        document.body.classList.remove("offline");
      } else {
        document.body.classList.add("offline");
      }
    };

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    updateStatus();

    // Niektóre przeglądarki potrzebują chwili na start API sieciowego
    setTimeout(updateStatus, 100);
  },
};
