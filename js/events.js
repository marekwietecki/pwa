import { Utils, DataManager } from "./data.js";
import { elements } from "./elements.js";
import { LocationService } from "./services.js";
import { UI } from "./ui.js";

export function initEventListeners(AppState) {
  // Modal Toggles
  elements.addTaskBtn?.addEventListener("click", async () => {
    UI.resetModal(AppState); // Najpierw ustawia typ i czyści pola
    await UI.populateGoalHabitSelect();
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
        UI.openEditHabitModal(AppState.selectedHabitForStats, AppState);
    });

  document
    .getElementById("editHabitStartDate")
    ?.addEventListener("click", () => {
      if (AppState.selectedHabitForStats)
        UI.openEditHabitModal(AppState.selectedHabitForStats, AppState);
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
      UI.renderActivityGrid(AppState.selectedHabitForStats, AppState);
  });

  document.getElementById("nextStatMonth")?.addEventListener("click", () => {
    AppState.statsViewDate.setMonth(AppState.statsViewDate.getMonth() + 1);
    if (AppState.selectedHabitForStats)
      UI.renderActivityGrid(AppState.selectedHabitForStats, AppState);
  });

  //calendar arrows
  document.getElementById("prevMonth")?.addEventListener("click", async () => {
    AppState.date.setMonth(AppState.date.getMonth() - 1);
    await UI.renderCalendar(AppState);
  });

  document.getElementById("nextMonth")?.addEventListener("click", async () => {
    AppState.date.setMonth(AppState.date.getMonth() + 1);
    await UI.renderCalendar(AppState);
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

  // DELEGACJA ZDARZEŃ DLA LIST
  const handleListAction = async (e) => {
    const target = e.target;
    const li = target.closest(".taskItem");
    if (!li) return;

    const id = parseInt(li.dataset.id);
    const type = li.dataset.type;
    const dateKey = li.dataset.dateKey;
    const name = li.querySelector(".taskNodeName")?.textContent;

    // 1. OBSŁUGA CHECKBOXA (ZROBIONE / NIEZROBIONE)
    if (target.classList.contains("taskCheckbox")) {
      const isChecked = target.checked;

      try {
        if (type === "task") {
          await DataManager.toggleTaskDone(id, isChecked);
        } else if (type === "habit") {
          await DataManager.toggleHabitDone(id, dateKey, isChecked);
        } else if (type === "goal") {
          await DataManager.updateGoalDetails(id, { done: isChecked });
        }

        // System XP
        const todayKey = Utils.formatDateKey(new Date());
        if (dateKey === todayKey || type === "goal") {
          // Pobieramy dane obiektu do kalkulacji XP (uproszczone)
          const xpValue = LevelManager.calculateXP(type, { name });
          await LevelManager.applyXP(isChecked ? xpValue : -xpValue);
          if (isChecked && navigator.vibrate) navigator.vibrate(50);
        }

        li.classList.toggle("is-completed", isChecked);

        setTimeout(async () => {
          const isCalendar = !!document.getElementById("calendarToDoList");
          await UI.renderTasksForDay(AppState, isCalendar);
          if (type === "goal") await UI.renderGoals();
        }, 300);
      } catch (err) {
        console.error("Błąd podczas aktualizacji statusu:", err);
        target.checked = !isChecked; // Rollback ui
      }
    }

    const moreBtn = target.closest(".moreBtn");
    if (moreBtn) {
      if (li.classList.contains("show-delete")) {
        if (type === "task") await DataManager.deleteTask(id);
        else if (type === "habit") await DataManager.deleteHabit(id);
        else if (type === "goal") await DataManager.deleteGoal(id);

        // Globalny refresh UI
        const isCalendar = !!document.getElementById("calendarToDoList");
        await UI.renderTasksForDay(AppState, isCalendar);
        if (elements.habitSection) await UI.renderHabits(AppState);
        if (elements.goalsList) await UI.renderGoals();
        if (elements.calendarGrid) UI.renderCalendar(AppState);
      } else {
        // Pierwsze kliknięcie - pokaż "kosz"
        li.classList.add("show-delete");
        moreBtn.replaceChildren(UI.createDeleteIcon());
        setTimeout(() => {
          if (li.classList.contains("show-delete")) {
            li.classList.remove("show-delete");
            moreBtn.replaceChildren(UI.createEllipsisIcon());
          }
        }, 2500);
      }
    }

    // 3. OBSŁUGA EDYCJI (Inline Pencil dla Goals)
    if (target.closest(".edit-inline-btn") && type === "goal") {
      const goals = await DataManager.getGoals();
      const goal = goals.find((g) => g.id === id);
      if (goal) UI.openEditGoalModal(goal);
    }
  };

  // Podpinamy jeden listener pod wszystkie możliwe listy
  [
    elements.toDoList,
    elements.habitSection,
    elements.goalsList,
    document.getElementById("calendarToDoList"),
  ].forEach((container) => {
    container?.addEventListener("click", handleListAction);
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
    elements.editUserName.addEventListener("click", async () => {
      const stats = await DataManager.getUserStats();
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

    elements.userNameInput.addEventListener("blur", async () => {
      // Logika zapisu
      if (elements.userNameInput.style.display === "none") return;

      const newName = elements.userNameInput.value.trim() || "New Hero";
      await DataManager.updateUserName(newName);

      elements.displayUserName.textContent = newName;
      elements.displayUserName.style.display = "block";
      elements.userNameInput.style.display = "none";
      elements.editUserName.style.display = "inline-flex";

      if (navigator.vibrate) navigator.vibrate(30);
    });
  }

  //adding logic
  elements.confirmAddBtn.addEventListener("click", async () => {
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

        await DataManager.updateGoalDetails(parseInt(editId), newData);
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

        await DataManager.updateHabitDetails(
          parseInt(editId),
          newFreq,
          newSchedule,
          newStartDate
        );

        const habits = await DataManager.getHabits();

        const updatedHabit = habits.find(
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
      await UI.resetModal(AppState);
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
      await DataManager.addTask(name, dateStr, location);
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
      await DataManager.addHabit(habit);
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
      await DataManager.addGoal(goal);
    }

    // Odśwież kalendarz jeśli istnieje
    if (elements.calendarGrid) await UI.renderCalendar(AppState);

    const isCalendarView = !!document.getElementById("calendarToDoList");

    if (elements.toDoList && !elements.habitSection) {
      await UI.renderTasksForDay(AppState, isCalendarView);
    }

    if (elements.habitSection) {
      await UI.renderHabits(AppState);
    }

    if (elements.goalsList) await UI.renderGoals();

    elements.modalOverlay.classList.remove("open");
    await UI.resetModal(AppState);
  });
}
