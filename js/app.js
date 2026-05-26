import { DataManager } from "./data.js";
import { elements, domElements } from "./elements.js";
import { initEventListeners } from "./events.js";
import { OnboardingService } from "./onboarding.js";
import {
  NotificationService,
  PermissionsManager,
  OfflineService,
  swManager,
} from "./services.js";
import { UI } from "./ui.js";

const AppState = {
  date: new Date(), // Miesiąc w kalendarzu
  selectedDate: new Date(), // Wybrany dzień
  currentCreateType: "task", // task/habit/goal
  statsViewDate: new Date(), // Mini kalendarz statystyk
  selectedHabitForStats: null, // Kliknięty nawyk
};

document.addEventListener("DOMContentLoaded", async () => {
  domElements();
  const notifyToggle = document.getElementById("toggleNotifications");
  const locationToggle = document.getElementById("toggleLocation");

  if (notifyToggle) {
    notifyToggle.checked =
      localStorage.getItem("user_notifications_enabled") === "true";
  }
  if (locationToggle) {
    locationToggle.checked =
      localStorage.getItem("user_location_enabled") === "true";
  }
  OfflineService.init();
  initEventListeners(AppState);
  swManager.register();

  UI.setupMonthlyGrid();
  await UI.updateUserHeader();
  await UI.fillModalHabitSelect();

  await UI.renderCurrentPage(AppState);

  await OnboardingService.checkAndStart();

  checkDailyNotifications();
});

window.testOnboarding = () => OnboardingService.forceRun();

const checkDailyNotifications = async () => {
  const todayCount = await DataManager.countUndoneTasks(new Date());
  const hour = new Date().getHours();
  if (hour >= 8 && todayCount > 0) {
    NotificationService.runDailyCheck(todayCount);
  }
};
