import { Utils, DataManager } from "./data.js";
import { elements } from "./elements.js";
import { LocationService } from "./services.js";
import { UI } from "./ui.js";

export function initEventListeners(AppState) {
  // Modal Toggles
  elements.addTaskBtn?.addEventListener("click", () => {
    UI.resetModal(AppState); // Najpierw ustawia typ i czyści pola
    elements.modalOverlay.classList.add("open"); // Potem otwiera
  });

  // XP change
  document.addEventListener("statsUpdated", () => {
    UI.updateXPBar();
  });

  // Editing habit
  document
    .getElementById("editHabitFrequency")
    ?.addEventListener("click", () => {
      if (AppState.selectedHabitForStats)
        UI.openEditHabitModal(AppState.selectedHabitForStats);
    });

  document
    .getElementById("editHabitStartDate")
    ?.addEventListener("click", () => {
      if (AppState.selectedHabitForStats)
        UI.openEditHabitModal(AppState.selectedHabitForStats);
    });

  // Zamykanie krzyżykiem
  elements.closeModal?.addEventListener("click", () => {
    elements.modalOverlay.classList.remove("open");
  });

  // Zamykanie tłem
  elements.modalOverlay?.addEventListener("click", (e) => {
    if (e.target === elements.modalOverlay) {
      elements.modalOverlay.classList.remove("open");
    }
  });

  //mini calendar arrows
  document.getElementById("prevStatMonth")?.addEventListener("click", () => {
    AppState.statsViewDate.setMonth(AppState.statsViewDate.getMonth() - 1);
    if (AppState.selectedHabitForStats)
      UI.renderActivityGrid(AppState.selectedHabitForStats);
  });

  document.getElementById("nextStatMonth")?.addEventListener("click", () => {
    AppState.statsViewDate.setMonth(AppState.statsViewDate.getMonth() + 1);
    if (AppState.selectedHabitForStats)
      UI.renderActivityGrid(AppState.selectedHabitForStats);
  });

  //calendar arrows
  document.getElementById("prevMonth")?.addEventListener("click", () => {
    AppState.date.setMonth(AppState.date.getMonth() - 1);
    UI.renderCalendar(AppState);
  });

  document.getElementById("nextMonth")?.addEventListener("click", () => {
    AppState.date.setMonth(AppState.date.getMonth() + 1);
    UI.renderCalendar(AppState);
  });

  /*
  // Klikanie w konkretny dzień kalendarza (Delegacja zdarzeń)
  elements.calendarGrid?.addEventListener("click", (e) => {
    const dayEl = e.target.closest(".calendar-day");
    
    if (dayEl && dayEl.dataset.date) {
      AppState.selectedDate = new Date(dayEl.dataset.date);
      
      elements.calendarGrid.querySelectorAll(".calendar-day")
        .forEach(el => el.classList.remove("selected"));
      dayEl.classList.add("selected");
      
      UI.renderTasksForDay(AppState, true);
    }
  });
  */

  // modal type switch
  document.querySelectorAll(".typePicker").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const type = e.target.getAttribute("data-type");
      AppState.currentCreateType = type;

      document
        .querySelectorAll(".typePicker")
        .forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      UI.toggleModalFields(type);
    });
  });

  // habit frequency listeners
  elements.habitFrequency?.addEventListener("change", () => {
    elements.daysPicker.style.display =
      elements.habitFrequency.value === "weekly" ? "flex" : "none";
  });
  elements.habitFrequency?.addEventListener("change", () => {
    elements.monthlyDayPicker.style.display =
      elements.habitFrequency.value === "monthly" ? "block" : "none";
  });

  //Wyszukiwanie lokalizacji przyciskiem lupy
  elements.searchLocation.addEventListener("click", async () => {
    const query = elements.locationInput.value.trim();
    if (!query) return;

    const originalValue = query;
    const input = elements.locationInput;
    const btn = elements.searchLocation;
    input.value = "Searching... 🔍";
    input.disabled = true;
    btn.disabled = true;
    input.classList.remove("success", "error");

    try {
      const data = await LocationService.search(query);

      if (!data.length) {
        input.value = originalValue;
        elements.locationInput.classList.remove("success");
        elements.locationInput.classList.add("error");
        UI.showModalMessage("Location not found");
        return;
      }

      const place = data[0];
      const shortName = Utils.formatLocation(place.address);

      elements.locationInput.value = shortName || place.display_name;
      elements.locationInput.classList.remove("error");
      elements.locationInput.classList.add("success");
    } catch (e) {
      console.error("Search location error", e);
      input.value = "";
      input.classList.add("error");
    } finally {
      input.disabled = false;
      btn.disabled = false;
    }
  });

  // 2. Lokalizacja z GPS (przycisk pinezki)
  elements.geoLocBtn.addEventListener("click", () => {
    if (!navigator.geolocation)
      return UI.showModalMessage("Geolocation not supported");

    // --- START LOADING ---
    const btn = elements.geoLocBtn;
    const input = elements.locationInput;
    const originalPlaceholder = input.placeholder;

    btn.classList.add("loading");
    btn.disabled = true;
    input.value = "Locating... ⏳";
    input.classList.remove("success", "error");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const data = await LocationService.reverse(latitude, longitude);

          if (!data || !data.display_name) {
            throw new Error("Location not found");
          }

          const shortName = Utils.formatLocation(data.address);
          input.value = shortName || data.display_name;
          input.classList.add("success");
        } catch (e) {
          console.error("Reverse geocoding failed", e);
          input.classList.add("error");
          UI.showModalMessage("Address not found, but we have your coords!");
        } finally {
          // --- END LOADING (Success/Error) ---
          btn.classList.remove("loading");
          btn.disabled = false;
          input.placeholder = originalPlaceholder;
        }
      },
      (err) => {
        // --- END LOADING (Permission Denied/Timeout) ---
        btn.classList.remove("loading");
        btn.disabled = false;
        input.disabled = false;
        input.placeholder = originalPlaceholder;

        const messages = {
          1: "Permission denied. Enable location in settings.",
          2: "Position unavailable. Check your GPS.",
          3: "Timeout. Try again.",
        };
        UI.showModalMessage(messages[err.code] || "Could not get location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 sekund na odpowiedź GPS
      }
    );
  });

  // live habit placeholder
  elements.taskName.addEventListener("input", (e) => {
    const iconInput = document.getElementById("habitIcon");
    if (!iconInput) return;

    if (iconInput.value.trim() === "") {
      const nameValue = e.target.value.trim();
      if (nameValue.length > 0) {
        iconInput.placeholder = nameValue.charAt(0).toUpperCase();
      } else {
        iconInput.placeholder = "★";
      }
    }
  });

  // Edycja Nazwy Użytkownika Inline
  if (elements.editUserName) {
    elements.editUserName.addEventListener("click", () => {
      const stats = DataManager.getUserStats();
      elements.userNameInput.value =
        stats.userName || elements.displayUserName.textContent;

      elements.displayUserName.style.display = "none";
      elements.editUserName.style.display = "none";
      elements.userNameInput.style.display = "inline-block";

      elements.userNameInput.focus();
      elements.userNameInput.select();
    });
  }

  if (elements.userNameInput) {
    elements.userNameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") elements.userNameInput.blur();
      if (e.key === "Escape") {
        elements.displayUserName.style.display = "block";
        elements.userNameInput.style.display = "none";
        elements.editUserName.style.display = "inline-flex";
      }
    });

    elements.userNameInput.addEventListener("blur", () => {
      // Logika zapisu
      if (elements.userNameInput.style.display === "none") return;

      const newName = elements.userNameInput.value.trim() || "New Hero";
      DataManager.updateUserName(newName);

      elements.displayUserName.textContent = newName;
      elements.displayUserName.style.display = "block";
      elements.userNameInput.style.display = "none";
      elements.editUserName.style.display = "inline-flex";

      if (navigator.vibrate) navigator.vibrate(30);
    });
  }

  //adding logic
  elements.confirmAddBtn.addEventListener("click", () => {
    const editId = elements.confirmAddBtn.getAttribute("data-edit-id");
    const editType = elements.confirmAddBtn.getAttribute("data-edit-type");

    console.log("Przycisk ma ID:", editId, "Typ:", editType);

    if (editId) {
      if (editType === "goal") {
        const newData = {
          name: elements.taskName.value.trim(),
          description: elements.descriptionInput.value.trim(),
          deadline: elements.goalDeadline.value,
          linkedHabitId: elements.goalHabitSelect.value
            ? parseInt(elements.goalHabitSelect.value)
            : null,
        };

        if (!newData.name || !newData.deadline) {
          return UI.showModalMessage("Name and Deadline are required!");
        }

        DataManager.updateGoalDetails(parseInt(editId), newData);
        if (elements.goalsList) UI.renderGoals();
      } else {
        const newFreq = document.getElementById("habitFrequency").value;
        const newStartDate = document.getElementById("taskDate").value;
        let newSchedule = [];

        if (newFreq === "weekly") {
          newSchedule = Array.from(
            elements.daysPicker.querySelectorAll(
              "input[type='checkbox']:checked"
            )
          ).map((cb) => parseInt(cb.value));
        } else if (newFreq === "monthly") {
          newSchedule = Array.from(
            document
              .getElementById("monthDaysGrid")
              .querySelectorAll("input[type='checkbox']:checked")
          ).map((cb) => parseInt(cb.value));
        }

        DataManager.updateHabitDetails(
          parseInt(editId),
          newFreq,
          newSchedule,
          newStartDate
        );

        const updatedHabit = DataManager.getHabits().find(
          (h) => h.id === parseInt(editId)
        );
        if (updatedHabit) {
          AppState.selectedHabitForStats = updatedHabit;
          UI.showHabitDetails(updatedHabit, AppState);
        }
        UI.renderHabits(AppState);
        UI.renderTasksForDay(AppState, true);
      }
      elements.modalOverlay.classList.remove("open");
      UI.resetModal(AppState);
      return;
    }

    let name = elements.taskName.value.trim();
    if (!name) {
      UI.showModalMessage("Provide a name! ✍️");
      return;
    }
    name = name.charAt(0).toUpperCase() + name.slice(1);

    const type = AppState.currentCreateType;
    const location = elements.locationInput?.value.trim() || null;

    // (Task)
    if (type === "task") {
      const dateStr =
        elements.taskDate.value || Utils.formatDateKey(AppState.selectedDate);
      DataManager.addTask(name, dateStr, location);
    }

    // (Habit)
    else if (type === "habit") {
      const frequency = elements.habitFrequency.value;

      const iconInput = document.getElementById("habitIcon");
      let finalIcon = iconInput ? iconInput.value.trim() : "";

      if (!finalIcon) {
        finalIcon = name.charAt(0).toUpperCase();
      }

      let schedule = [];

      if (frequency === "weekly") {
        schedule = Array.from(
          elements.daysPicker.querySelectorAll("input[type='checkbox']:checked")
        ).map((cb) => parseInt(cb.value));
        if (schedule.length === 0)
          return UI.showModalMessage("Select at least one day!");
      } else if (frequency === "monthly") {
        const monthlyGrid = document.getElementById("monthDaysGrid");
        schedule = Array.from(
          monthlyGrid.querySelectorAll("input[type='checkbox']:checked")
        ).map((cb) => parseInt(cb.value));
        if (schedule.length === 0)
          return UI.showModalMessage("Enter days of the month!");
      }

      const habit = {
        id: Date.now(),
        name,
        icon: finalIcon,
        location: location,
        frequency: frequency,
        schedule: schedule,
        createdAt: new Date().toISOString(),
        history: {},
      };
      DataManager.addHabit(habit);
    } else if (type === "goal") {
      const description = elements.descriptionInput?.value.trim() || "";
      const deadline = elements.goalDeadline?.value || null;
      const habitSelectEl = document.getElementById("goalHabitSelect");

      if (!deadline) {
        UI.showModalMessage("Provide a deadline for your goal! 📅");
        if (elements.taskDate) elements.goalDeadline.focus();
        return;
      }

      const goal = {
        id: Date.now(),
        name: name,
        description: description,
        deadline: deadline,
        linkedHabitId:
          habitSelectEl && habitSelectEl.value
            ? parseInt(habitSelectEl.value)
            : null,
        createdAt: new Date().toISOString(),
        done: false,
      };

      console.log("Dodaję Goal: ", goal);
      DataManager.addGoal(goal);
    }

    // Odśwież kalendarz jeśli istnieje
    if (elements.calendarGrid) UI.renderCalendar(AppState);

    const isCalendarView = !!document.getElementById("calendarToDoList");

    if (elements.toDoList && !elements.habitSection) {
      UI.renderTasksForDay(AppState, isCalendarView);
    }

    if (elements.habitSection) {
      UI.renderHabits(AppState);
    }

    if (elements.goalsList) UI.renderGoals();

    elements.modalOverlay.classList.remove("open");
    UI.resetModal(AppState);
  });
}
