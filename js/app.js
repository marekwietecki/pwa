import { DataManager } from "./data.js";
import { elements, domElements } from "./elements.js";
import { initEventListeners } from "./events.js";
import {
  NotificationService,
  PermissionsManager,
  OfflineService,
  fetchDailyQuote
} from "./services.js";
import { UI } from "./ui.js";

const AppState = {
  date: new Date(), // Miesiąc w kalendarzu
  selectedDate: new Date(), // Wybrany dzień
  currentCreateType: "task", // task/habit/goal
  statsViewDate: new Date(), // Mini kalendarz statystyk
  selectedHabitForStats: null, // Kliknięty nawyk
};

// Dalej w kodzie zamiast 'selectedDate' używasz 'AppState.selectedDate'

document.addEventListener("DOMContentLoaded", () => {
  domElements();
  OfflineService.init();
  initEventListeners(AppState);
  UI.applyRandomGradient();
  UI.setupMonthlyGrid();
  PermissionsManager.init();
  UI.updateGoalHabitSelect();
  const stats = DataManager.getUserStats();
  const nameLabel = document.getElementById("displayUserName");
  if (nameLabel) {
    nameLabel.textContent = stats.userName;
  }
  UI.updateXPBar();

  // index
  if (elements.toDoList && !elements.calendarGrid) {
    fetchDailyQuote();
    UI.renderTasksForDay(AppState, false);
  }
  // calendar
  if (elements.calendarGrid) {
    UI.renderCalendar(AppState);
    UI.renderTasksForDay(AppState, true);
    const todayCount = DataManager.countTasksForDate(new Date());
    const now = new Date();
    if (now.getHours() >= 8 && todayCount > 0) {
      NotificationService.checkDailyBriefing(todayCount);
    }
  }
  // habits
  if (elements.habitSection) {
    UI.renderHabits(AppState);
  }
  // goals
  if (elements.goalsList) {
    UI.renderGoals();
  }
});

// ... Twój obecny kod (importy, AppState, DOMContentLoaded) ...

// --- SEKRETY SERVICE WORKERA I PERIODIC SYNC ---
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log("✅ SW zarejestrowany:", registration.scope);

      // Gdy SW jest gotowy, rejestrujemy Periodic Sync
      if ('periodicSync' in registration) {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync',
        });

        if (status.state === 'granted') {
          try {
            await registration.periodicSync.register('daily-briefing', {
              minInterval: 12 * 60 * 60 * 1000, // Raz na 12h (nie spamujmy systemu)
            });
            console.log("✅ Periodic Sync: daily-briefing aktywny!");
          } catch (e) {
            console.warn("⚠️ Periodic Sync: Błąd rejestracji (wymagana instalacja PWA).", e);
          }
        }
      }
    } catch (error) {
      console.error("❌ SW: Błąd rejestracji:", error);
    }
  }
}

registerSW();