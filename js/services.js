import { Utils, DataManager } from "./data.js";

export const NotificationService = {
  async send(title, options = {}) {
    const isMutedByUser =
      localStorage.getItem("user_notifications_enabled") === "false";
    if (Notification.permission !== "granted" || isMutedByUser) return;

    const registration = await navigator.serviceWorker.ready;

    const defaultOptions = {
      icon: "/assets/192x192.png",
      badge: "/assets/192x192.png",
      vibrate: [200, 100, 200],
      tag: "habit-hero-alert", // tag helps fighting with spam
      renotify: true,
      ...options,
    };

    return registration.showNotification(title, defaultOptions);
  },

  async runDailyCheck() {
    const now = new Date();
    if (now.getHours() < 8) return;

    const todayKey = Utils.formatDateKey(now);
    const lastBriefing = await DataManager.getMetadata("last_briefing_date");
    if (lastBriefing === todayKey) return;

    const undoneCount = await DataManager.countUndoneTasks(todayKey);

    if (undoneCount > 0) {
      await this.send("Good Morning! 🦸‍♂️", {
        body: `You have ${undoneCount} pending tasks for today. Time to level up!`,
      });
      await DataManager.setMetadata("last_briefing_date", todayKey);
    }
  },
};

export const PermissionsManager = {
  notificationsEnabled() {
    const userWants =
      localStorage.getItem("user_notifications_enabled") !== "false";
    return Notification.permission === "granted" && userWants;
  },

  async requestNotifications() {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem("user_notifications_enabled", "true");
    }
    return permission;
  },

  async requestGeolocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  },
};

export const swManager = {
  register: async () => {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        // Czekamy, aż Service Worker będzie aktywny
        if (registration.active) {
          setupPeriodicSync(registration);
        } else {
          // Jeśli się instaluje, czekamy na zmianę stanu
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                setupPeriodicSync(registration);
              }
            });
          });
        }

        console.log("SW Registered!");
      } catch (err) {
        console.error("SW Registration failed", err);
      }
    }
  },
};

export const LocationService = {
  formatAddress(address) {
    if (!address) return "";
    const street =
      address.road || address.pedestrian || address.cycleway || address.footway;
    const house = address.house_number;
    const city =
      address.city || address.town || address.village || address.hamlet;
    const country = address.country;

    if (street && house && city) return `${street} ${house}, ${city}`;
    if (street && city) return `${street}, ${city}`;
    if (city && country) return `${city}, ${country}`;
    return country || "";
  },

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

  getCurrentCoords() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });
  },
};

export const QuoteService = {
  getDailyAdvice: async () => {
    const API_URL = "https://api.adviceslip.com/advice";
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      return { text: data.slip.advice, author: "Daily Hero Advice" };
    } catch (error) {
      return {
        text: "Hero, your discipline is your strength.",
        author: "Habit Hero Team",
      };
    }
  },
};

export const OfflineService = {
  init() {
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
