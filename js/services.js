import { Utils, DataManager } from "./data.js";

const MOTIVATIONAL_QUOTES = [
  // 🧠 Action & Breaking Procrastination
  "Start before you're ready.",
  "Do it now. 'Later' is the ultimate dream killer.",
  "The 5-Minute Rule: tell yourself you'll only do it for 5 minutes.",
  "You don't need motivation. You need to start.",
  "The best time to act is right now.",
  "Take the first step, and the rest of the path will appear.",
  "Focus on the system, not just the goal.",
  "The longer you think about starting, the more you delay success.",
  "Do one micro-task for your project right this second.",
  "Choose immediate action over a perfect plan.",
  "Stop waiting for inspiration. Inspiration is born in action.",
  "The hardest part is the first two minutes. Just sit down.",
  "Small steps taken daily yield massive results.",
  "Winners do what needs to be done, even when they don't feel like it.",
  "Don't put off until tomorrow what you can finish today.",
  "Start with your worst task. Eat that frog first thing in the morning.",
  "Action breeds motivation, not the other way around.",
  "Better to do it poorly than to do nothing while chasing perfection.",
  "Your future self will thank you for what you do right now.",
  "Don't look for excuses. Look for ways.",
  "Action cures fear and doubt.",
  "Think about the satisfaction you'll feel once this task is done.",
  "Do it for yourself. No one else is going to do it for you.",
  "Every great thing consists of micro-tasks. Break it down.",
  "The secret of getting ahead is simply getting started.",

  // 🫧 Habit Building & Discipline
  "Discipline is choosing between what you want now and what you want most.",
  "Habits shape your future. Choose wisely.",
  "Be consistent, not perfect.",
  "What you do every day matters more than what you do once in a while.",
  "Never miss two days in a row with your habits.",
  "Discipline equals freedom.",
  "You are what you repeatedly do.",
  "Automate good decisions through healthy habits.",
  "Small habits, big changes.",
  "Motivation gets you started. Habit keeps you going.",
  "Don't sacrifice your long-term goals for temporary comfort.",
  "Willpower is like a muscle. Train it daily.",
  "Hard choices now, easy life later.",
  "Your routine determines your success.",
  "Don't wait for easier conditions. Build stronger resilience.",
  "Victory is the sum of small, boring, daily decisions.",
  "When motivation fades, let discipline take the lead.",
  "Take care of your habits, and your habits will take care of you.",
  "Every completed habit is a vote for your new identity.",
  "Don't negotiate with your laziness.",
  "Consistency beats intensity every single time.",
  "Build habits so small you can't say no to them.",
  "Your daily rituals are the architecture of your life.",
  "Mastery is just the aggressive repetition of the basics.",
  "Consistency builds self-confidence.",

  // ⏱️ Time Management & Focus
  "Focus on one thing. Multitasking is a myth.",
  "Turn on airplane mode. Your time is valuable.",
  "Protect your focus like it's your greatest treasure.",
  "If it takes less than two minutes, do it immediately.",
  "Learn to say 'no' to things that waste your time.",
  "Time will pass anyway. The question is, how will you spend it?",
  "Clean your desk and clear your desktop before you start working.",
  "An hour of deep focus is worth more than a day of chaos.",
  "Work smarter, not just harder.",
  "Cutting out distractors is half the battle.",
  "Plan your day the night before.",
  "An hour without your phone in the morning can change your whole day.",
  "Your attention is currency. Don't spend it on nonsense.",
  "Block time in your calendar for what truly matters.",
  "Handle your priorities before the world dictates its own.",
  "Silence around you is silence in your mind.",
  "Take a break before you hit absolute exhaustion.",
  "Control your notifications, or they will control you.",
  "A good plan today is better than a perfect plan tomorrow.",
  "Focus is the elimination of everything unnecessary.",
  "Stop collecting tasks. Start finishing them.",
  "Time spent planning saves time during execution.",
  "Minimize task-switching to protect your brainpower.",
  "Be unavailable when you are working on your dreams.",
  "The best productivity tool is the power button on your phone.",

  // 🚀 Growth Mindset & Self-Improvement
  "Failure is not the end. It's just feedback.",
  "Only compare yourself to who you were yesterday.",
  "Mistakes are proof that you are trying.",
  "Don't be afraid of going slowly, be afraid of standing still.",
  "Patience and hard work will crush any obstacle.",
  "Investment in yourself pays the highest dividends.",
  "Your limitations exist only in your mind.",
  "Be proud of how far you've already come.",
  "Every master was once a clueless beginner.",
  "Demand more from yourself than anyone else expects from you.",
  "Don't fear big goals. Fear small efforts.",
  "Obstacles are those frightful things you see when you take your eyes off your goal.",
  "Believe you can, and you're halfway there.",
  "Don't look for applause. Look for progress.",
  "Your mindset dictates your productivity.",
  "Be grateful for difficulties—they are what harden you.",
  "Success doesn't come to you. You have to go get it.",
  "You can have results or excuses. Never both.",
  "If hard work were easy, everyone would be a master.",
  "Take care of your mind the way you take care of your body.",
  "Goals without deadlines are just wishes.",
  "Focus on the process of creating a better version of yourself.",
  "The past is gone. You build the future right now.",
  "The best revenge on your weaknesses is a massive success.",
  "You can change your life at any second. Choose this one.",
];

export const NotificationService = {
  async send(title, options = {}) {
    const isMutedByUser =
      localStorage.getItem("user_notifications_enabled") === "false";
    if (Notification.permission !== "granted" || isMutedByUser) return;

    const registration = await navigator.serviceWorker.ready;

    const defaultOptions = {
      icon: "/assets/logo-192.png",
      badge: "/assets/logo-192.png",
      vibrate: [200, 100, 200],
      tag: "habit-hero-alert", // Grupuje powiadomienia pod jednym tagiem
      renotify: true,
      ...options,
    };

    return registration.showNotification(title, defaultOptions);
  },

  /**
   * Główny dispatcher sprawdzający czas i odpalający odpowiednie alerty
   */
  async runDailyCheck() {
    const now = new Date();
    const currentHour = now.getHours();
    const todayKey = Utils.formatDateKey(now);

    // 1. PORANNY SCREENING (między 08:00 a 10:00)
    if (currentHour >= 8 && currentHour < 10) {
      const lastBriefing = await DataManager.getMetadata("last_briefing_date");
      if (lastBriefing !== todayKey) {
        const undoneCount = await DataManager.countUndoneTasks(todayKey);

        if (undoneCount > 0) {
          await this.send("Good Morning, Hero! 🦸‍♂️", {
            body: `You have ${undoneCount} pending tasks for today. Let's stack some multiplier combos!`,
          });
          await DataManager.setMetadata("last_briefing_date", todayKey);
        }
      }
    }

    // 2. POPOŁUDNIOWA PRZYPOMINAJKA (od 17:00 wzwyż)
    if (currentHour >= 17) {
      const lastReminder = await DataManager.getMetadata("last_reminder_date");
      if (lastReminder !== todayKey) {
        const undoneCount = await DataManager.countUndoneTasks(todayKey);

        // Strzelamy tylko, jeśli cokolwiek zostało do zrobienia
        if (undoneCount > 0) {
          await this.send("Don't let the tasks wait! 🕠", {
            body: `Quick check: ${undoneCount} task(s) are still waiting to be burst today. Imrove your level!`,
            tag: "habit-hero-reminder", // Inny tag, żeby poranny i wieczorny alert nie nadpisywały się nawzajem, jeśli oba wiszą
          });
          await DataManager.setMetadata("last_reminder_date", todayKey);
        }
      }
    }
  },
};

export const PermissionsManager = {
  // --- NOTIFICATIONS ---
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

  geolocationEnabled() {
    const userWants = localStorage.getItem("user_location_enabled") === "true";
    // W geolokacji nie sprawdzimy synchronicznie stanu uprawnień przeglądarki tak łatwo jak w Notification,
    // dlatego opieramy się na fladze z localStorage, którą ustawiamy przy sukcesie.
    return userWants;
  },

  // 2. Asynchroniczne żądanie dostępu i wywołanie powiadomienia push po sukcesie
  async requestGeolocation() {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        console.warn("📍 Geolocation API is not supported by this browser.");
        reject(new Error("Not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Sukces: Zapisujemy stan w pamięci lokalnej
          localStorage.setItem("user_location_enabled", "true");
          console.log("📍 Geolocation active:", position.coords);

          // 🔥 Odpalamy powiadomienie push, jeśli aplikacja ma do tego uprawnienia
          if (Notification.permission === "granted") {
            new Notification("Habit Bubbl 🫧", {
              body: "📍 Space-time synced! Your environment is now successfully linked.",
              icon: "./assets/icons/icon-192x192.png", // upewnij się, że ścieżka do Twojej ikony PWA się zgadza
              vibrate: [100, 50, 100],
            });
          }

          resolve(position);
        },
        (error) => {
          // Obsługa błędu lub odrzucenia przez użytkownika
          localStorage.setItem("user_location_enabled", "false");
          console.warn("📍 Geolocation denied or error:", error.message);
          reject(error);
        }
      );
    });
  },
};

async function setupPeriodicSync(registration) {
  try {
    const status = await navigator.permissions.query({
      name: "periodic-background-sync",
    });

    if (status.state === "granted") {
      await registration.periodicSync.register("daily-briefing", {
        minInterval: 2 * 60 * 60 * 1000,
      });
      console.log("✅ Periodic Sync zarejestrowany!");
    } else {
      console.log(
        "⚠️ Brak uprawnień do Periodic Sync (standard w niektórych przeglądarkach)"
      );
    }
  } catch (err) {
    console.log(
      "ℹ️ Periodic Sync nie jest wspierany, briefingi będą działać tylko przy starcie apki."
    );
  }
}

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

let deferredPrompt = null;

export const QuoteService = {
  getDailyAdvice: async () => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    const selectedQuote = MOTIVATIONAL_QUOTES[randomIndex];
    return {
      text: selectedQuote,
      author: "Habit Bubbl",
    };
  },
};

export const PwaService = {
  initInstallHandler: () => {
    const cardContainer = document.getElementById("hero-dynamic-card");
    if (!cardContainer) return;

    // Na start zawsze renderujemy cytat, żeby nie było pustki!
    PwaService.renderDailyQuote(cardContainer);

    // Przechwytujemy prompt instalacji PWA od przeglądarki
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;

      PwaService.renderInstallBanner(cardContainer);
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      PwaService.renderDailyQuote(cardContainer);
    });
  },

  renderInstallBanner: (container) => {
    try {
      container.classList.add("has-banner");

      const wrapper = document.createElement("div");
      wrapper.className = "pwa-install-container";

      const title = document.createElement("span");
      title.className = "pwa-install-title";
      title.textContent =
        "Take Habit Bubbl to your home screen for full experience 🫧";

      const button = document.createElement("button");
      button.id = "pwa-install-btn";
      button.className = "pwa-install-btn";
      button.textContent = "Install App";

      button.addEventListener("click", async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Decyzja użytkownika o instalacji: ${outcome}`);
        deferredPrompt = null;
      });

      wrapper.appendChild(title);
      wrapper.appendChild(button);
      container.replaceChildren(wrapper);
    } catch (error) {
      console.error("Błąd w renderInstallBanner:", error);
    }
  },

  renderDailyQuote: (container) => {
    try {
      container.classList.remove("has-banner");

      const randomIndex = Math.floor(
        Math.random() * MOTIVATIONAL_QUOTES.length
      );
      const randomText = MOTIVATIONAL_QUOTES[randomIndex];

      const quoteParagraph = document.createElement("p");
      quoteParagraph.className = "quote-text";
      quoteParagraph.textContent = `"${randomText}"`;

      container.replaceChildren(quoteParagraph);
    } catch (error) {
      console.error("Błąd w renderDailyQuote:", error);
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
