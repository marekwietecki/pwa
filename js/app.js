import { DataManager } from './data.js';
import { elements, domElements } from './elements.js';
import { initEventListeners } from './events.js';
import { NotificationService, PermissionsManager, OfflineService } from './services.js';
import { UI } from './ui.js';


const AppState = {
  date: new Date(),               // Miesiąc w kalendarzu
  selectedDate: new Date(),       // Wybrany dzień
  currentCreateType: "task",      // task/habit/goal
  statsViewDate: new Date(),      // Mini kalendarz statystyk
  selectedHabitForStats: null     // Kliknięty nawyk
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
