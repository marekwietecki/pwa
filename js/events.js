import { Utils, DataManager, LevelManager } from "./data.js";
import { elements } from "./elements.js";
import {
  LocationService,
  NotificationService,
  PermissionsManager,
} from "./services.js";
import { UI } from "./ui.js";

const bubbleSound = new Audio("./assets/bubble_pop.wav");
bubbleSound.volume = 0.4;

async function openAddTaskModal(AppState) {
  if (!elements.modalOverlay) return;

  const page = window.location.pathname;
  if (page.includes("hero.html")) AppState.currentCreateType = "goal";
  else if (page.includes("habits.html")) AppState.currentCreateType = "habit";
  else AppState.currentCreateType = "task";

  UI.resetModal(AppState);

  UI.setModalMode("create", AppState.currentCreateType);

  await UI.fillModalHabitSelect();

  elements.modalOverlay.classList.add("open");
}

export function initEventListeners(AppState) {
  const onAddTaskClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await openAddTaskModal(AppState);
  };

  if (elements.addTaskBtn) {
    elements.addTaskBtn.addEventListener("click", onAddTaskClick);
  } else {
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#addTaskBtn")) return;
      onAddTaskClick(e);
    });
  }

  // XP change
  document.addEventListener("statsUpdated", () => {
    UI.updateXPBar();
  });

  // Editing habit
  ["editHabitFrequency", "editHabitStartDate"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => {
      if (AppState.selectedHabitForStats) {
        UI.openEditHabitModal(AppState.selectedHabitForStats, AppState);
      }
    });
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

  // Klikanie w konkretny dzień kalendarza (Delegacja zdarzeń)
  elements.calendarGrid?.addEventListener("click", async (e) => {
    const dayEl = e.target.closest(".day");

    if (dayEl && dayEl.dataset.date) {
      AppState.selectedDate = new Date(dayEl.dataset.date);

      elements.calendarGrid
        .querySelectorAll(".day")
        .forEach((el) => el.classList.remove("active"));
      dayEl.classList.add("active");

      await UI.renderCalendarTasks(AppState);
    }
  });

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

    if (target.classList.contains("taskCheckbox") && target.checked) {
      if (navigator.vibrate) {
        navigator.vibrate(24);
      }
    }

    const id = parseInt(li.dataset.id);
    const type = li.dataset.type;
    const dateKey = li.dataset.dateKey;

    // object
    const itemObject = await DataManager.getItemByTypeAndId(type, id);

    // CHECKBOX
    if (target.classList.contains("taskCheckbox")) {
      const isChecked = target.checked;

      try {
        if (type === "task") {
          await DataManager.toggleTaskDone(id, isChecked);
        } else if (type === "habit") {
          await DataManager.toggleHabitDone(id, dateKey, isChecked);
        } else if (type === "goal") {
          await DataManager.toggleGoalDone(id, isChecked);
        }

        li.classList.toggle("is-completed", isChecked);

        // Wyciągamy deklarację przed bloki IF, żeby każdy miał do niej dostęp
        const itemData = itemObject || {
          name: li.querySelector(".taskNodeName")?.textContent,
        };

        // 1. Wywołanie silnika XP (Tylko JEDNO wspólne miejsce dla dzisiejszych zadań / celów)
        const todayKey = Utils.formatDateKey(new Date());
        if (dateKey === todayKey || type === "goal") {
          // NALICZAMY XP W BAZIE
          await handleCompletion(type, itemData, isChecked);

          // 2. ANIMACJA + BĄBELEK XP i dzwięk (Odpala się tylko gdy zadanie jest zaznaczane jako zrobione)
          if (isChecked) {
            // Pobieramy wartość XP dla bąbelka
            const xpValue = LevelManager.calculateXP(type, itemData);

            // Pobieramy świeże statystyki zaraz po zapisie w handleCompletion
            const freshStats = await DataManager.getUserStats();
            const currentXpThreshold = LevelManager.getXpThreshold(
              freshStats.level
            );
            const newBarPercentage =
              (freshStats.currentXp / currentXpThreshold) * 100;

            // Wywołujemy animację i dzwięk (Sprawdzanie modułu UI lub globalnej funkcji)
            if (typeof triggerTaskXpAnimation !== "undefined") {
              triggerTaskXpAnimation(e, xpValue, newBarPercentage);
            } else if (typeof UI !== "undefined" && UI.triggerTaskXpAnimation) {
              UI.triggerTaskXpAnimation(e, xpValue, newBarPercentage);
            }
            bubbleSound.currentTime = 0;
            bubbleSound
              .play()
              .catch((err) => console.log("Audio block bypass:", err));
          }
        }

        // REFRESH UI - bezpieczne 300ms na wzniesienie się bąbelka
        setTimeout(() => refreshCurrentView(AppState), 300);
      } catch (err) {
        // 🔥 PRZYWRÓCONY BLOK CATCH: Cofnięcie zaznaczenia w razie błędu bazy danych
        console.error("Błąd podczas aktualizacji statusu:", err);
        target.checked = !isChecked;
      }
    } // 💥 Tutaj prawidłowo zamyka się warunek IF dla Checkboxa

    // DELETE (Zaktualizowana sekcja w handleListAction)
    // ==========================================
    const moreBtn = target.closest(".moreBtn");
    if (moreBtn) {
      e.stopPropagation();

      // Wyciągamy poprawne dane z li zanim cokolwiek zmienimy
      const currentId = parseInt(li.dataset.id);
      const currentType = li.dataset.type;

      const itemName = li.querySelector(".taskNodeName")?.textContent || "Item";

      if (typeof UI !== "undefined" && UI.renderDeleteWithFriction) {
        UI.renderDeleteWithFriction(
          moreBtn,
          { id: currentId, type: currentType },
          AppState,
          async () => {
            try {
              // 1. Usunięcie z bazy IndexedDB
              await DataManager.deleteItemByType(currentType, currentId);
              console.log(`[IndexedDB] Permanentnie usunięto: ${currentType} o ID: ${currentId}`);
              
              // 🔥 DYNAMICZNY TOAST: Pierwsza litera typu duża (habit -> Habit, task -> Task)
              const displayType = currentType.charAt(0).toUpperCase() + currentType.slice(1);
              UI.showToast(`${displayType} "${itemName}" has been permanently deleted.`, "info");

              // 2. Odświeżenie widoku aplikacji
              if (typeof refreshCurrentView === "function") {
                await refreshCurrentView(AppState);
              }
            } catch (err) {
              console.error("Błąd krytyczny podczas usuwania z IndexedDB:", err);
            }
          }
        );
      }
    }

    if (target.closest(".edit-inline-btn") && type === "goal") {
      if (itemObject) UI.openEditGoalModal(itemObject, AppState);
    }
  };

  // Jeden listener pod wszystkie listy
  [
    elements.toDoList,
    elements.habitSection,
    elements.goalsList,
    document.getElementById("calendarToDoList"),
  ].forEach((container) => {
    container?.addEventListener("click", handleListAction);
  });

  // habit frequency
  elements.habitFrequency?.addEventListener("change", (e) => {
    const val = e.target.value;
    elements.daysPicker.style.display = val === "weekly" ? "flex" : "none";
    elements.monthlyDayPicker.style.display =
      val === "monthly" ? "block" : "none";
  });

  // Localization search (LOOP BTN)
  elements.searchLocation.addEventListener("click", async () => {
    const query = elements.locationInput.value.trim();
    if (!query) return;

    const input = elements.locationInput;
    const btn = elements.searchLocation;

    await UI.setInputLoading(input, btn, true, "Searching...🔍");

    try {
      const data = await LocationService.search(query);
      if (!data.length) throw new Error("Location not found");

      input.value =
        LocationService.formatAddress(data[0].address) || data[0].display_name;
      UI.setInputLoading(input, btn, false, "success");
    } catch (e) {
      console.error("Search location error", e);
      input.value = input.dataset.oldValue;
      UI.setInputLoading(input, btn, false, "error");
      UI.showModalMessage(e.message);
    }
  });

  // Localization with GPS (PIN BTN)
  elements.geoLocBtn.addEventListener("click", async () => {
    if (!navigator.geolocation)
      return UI.showModalMessage("Geolocation not supported");

    // --- START LOADING ---
    const btn = elements.geoLocBtn;
    const input = elements.locationInput;

    UI.setInputLoading(input, btn, true, "Locating... ⏳");

    try {
      const position = await LocationService.getCurrentCoords();
      const { latitude, longitude } = position.coords;

      const data = await LocationService.reverse(latitude, longitude);
      if (!data?.display_name) throw new Error("Address not found");

      input.value =
        LocationService.formatAddress(data.address) || data.display_name;
      UI.setInputLoading(input, btn, false, "success");
    } catch (err) {
      // Obsługa błędów GPS i API w jednym miejscu
      const gpsErrors = {
        1: "Permission denied",
        2: "Position unavailable",
        3: "Timeout",
      };
      const msg =
        gpsErrors[err.code] || err.message || "Could not get location.";

      UI.setInputLoading(input, btn, false, "error");
      UI.showModalMessage(msg);
    }
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
  elements.editUserName?.addEventListener("click", async () => {
    const stats = await DataManager.getUserStats();
    elements.userNameInput.value =
      stats.userName || elements.displayUserName.textContent;
    UI.toggleUserNameEdit(true);
  });

  elements.userNameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") elements.userNameInput.blur();
    if (e.key === "Escape") UI.toggleUserNameEdit(false);
  });

  elements.userNameInput?.addEventListener("blur", async () => {
    if (elements.userNameInput.style.display === "none") return;

    const newName = elements.userNameInput.value.trim() || "New Hero";
    await DataManager.updateUserName(newName);

    elements.displayUserName.textContent = newName;
    UI.toggleUserNameEdit(false);

    if (navigator.vibrate) navigator.vibrate(30);
  });

  const getHabitSchedule = () => {
    const freq = document.getElementById("habitFrequency").value;
    if (freq === "weekly") {
      return Array.from(
        elements.daysPicker.querySelectorAll("input:checked")
      ).map((cb) => parseInt(cb.value));
    }
    if (freq === "monthly") {
      return Array.from(
        document
          .getElementById("monthDaysGrid")
          .querySelectorAll("input:checked")
      ).map((cb) => parseInt(cb.value));
    }
    return [];
  };

  const handleSaveEdit = async (editId, editType, AppState) => {
    const id = parseInt(editId);

    if (editType === "goal") {
      const newData = {
        name: elements.taskName.value.trim(),
        description: elements.descriptionInput.value.trim(),
        deadline: elements.goalDeadline.value,
        linkedHabitId: parseInt(elements.goalHabitSelect.value) || null,
      };
      if (!newData.name || !newData.deadline) {
        UI.showModalMessage("Required fields missing!");
        throw new Error("Validation failed");
      }
      await DataManager.updateGoalDetails(id, newData);
    } else {
      // Logika edycji nawyku - czysto i czytelnie
      const newFreq = document.getElementById("habitFrequency").value;
      const newStartDate = document.getElementById("taskDate").value;
      const newSchedule = getHabitSchedule();

      await DataManager.updateHabitDetails(
        id,
        newFreq,
        newSchedule,
        newStartDate
      );

      // Zamiast find(), użyj swojego nowego DataManager.getItemByTypeAndId!
      const updatedHabit = await DataManager.getItemByTypeAndId("habit", id);
      if (updatedHabit) {
        AppState.selectedHabitForStats = updatedHabit;
        UI.showHabitDetails(updatedHabit, AppState);
      }
    }
    await refreshCurrentView(AppState); // Użyj swojej nowej uniwersalnej funkcji!
  };

  const handleAddNew = async (AppState) => {
    let name = elements.taskName.value.trim();
    if (!name) return UI.showModalMessage("Provide a name! ✍️");

    name = name.charAt(0).toUpperCase() + name.slice(1);
    const type = AppState.currentCreateType;
    const location = elements.locationInput?.value.trim() || null;
    try {
      if (type === "task") {
        const dateStr =
          elements.taskDate.value || Utils.formatDateKey(AppState.selectedDate);
        await DataManager.addTask(name, dateStr, location);
      } else if (type === "habit") {
        const frequency = elements.habitFrequency.value;
        const schedule = getHabitSchedule();
        const icon = UI.selectedHabitIcon || name.charAt(0).toUpperCase();

        const createdAt = new Date().setHours(0, 0, 0, 0);

        await DataManager.addHabit({
          name,
          icon,
          location,
          frequency,
          schedule,
          createdAt,
          history: {},
        });
      } else if (type === "goal") {
        const deadline = elements.goalDeadline?.value;
        if (!deadline) {
          UI.showModalMessage("Provide a deadline! 📅");
          return false;
        }

        const goalData = {
          name,
          deadline,
          description: elements.descriptionInput?.value.trim() || "",
          linkedHabitId:
            parseInt(document.getElementById("goalHabitSelect")?.value) || null,
        };
        await DataManager.addGoal(goalData);
      }
      return true;
    } catch (err) {
      console.error("Error adding new item:", err);
      UI.showModalMessage("Something went wrong while saving.");
      return false;
    }
  };

  elements.confirmAddBtn.addEventListener("click", async () => {
    // (no Double Click allowed)
    if (elements.confirmAddBtn.disabled) return;
    elements.confirmAddBtn.disabled = true;

    try {
      const editId = elements.confirmAddBtn.getAttribute("data-edit-id");
      const editType = elements.confirmAddBtn.getAttribute("data-edit-type");

      if (editId) {
        await handleSaveEdit(editId, editType, AppState);
      } else {
        const success = await handleAddNew(AppState);
        if (!success) {
          elements.confirmAddBtn.disabled = false; // Odblokuj przycisk, żeby mógł poprawić błąd!
          return;
        }
      }

      await refreshCurrentView(AppState);
      elements.modalOverlay.classList.remove("open");
      UI.resetModal(AppState);
    } catch (err) {
      console.error("Critical Save Error:", err);
    } finally {
      elements.confirmAddBtn.disabled = false; // back enabled
    }
  });

  const refreshCurrentView = async (AppState) => {
    if (elements.calendarGrid) await UI.renderCalendar(AppState);

    const isCalendarView = !!document.getElementById("calendarToDoList");
    const isHeroView = !!document.getElementById("goalsList");

    if (isCalendarView) {
      await UI.renderCalendarTasks?.(AppState);
    } else {
      await UI.renderDailyTasks?.(AppState);
      if (isHeroView) await UI.renderLongTermGoals?.(AppState);
    }

    if (elements.habitSection) await UI.renderHabits?.(AppState);
  };

  // ==========================================
  // BUBBLE TOOLTIPS HANDLER (Streak & Effectiveness)
  // ==========================================
  const tooltipsConfig = [
    { btnId: "streakInfoBtn", boxId: "streakTooltip" },
    { btnId: "effectivenessInfoBtn", boxId: "effectivenessTooltip" },
  ];

  // Mapujemy konfigurację i podpinamy listenery
  tooltipsConfig.forEach(({ btnId, boxId }) => {
    const btn = document.getElementById(btnId);
    const box = document.getElementById(boxId);

    if (btn && box) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();

        // Zamykamy INNE otwarte tooltipy przed otwarciem tego, żeby nie nachodziły na siebie
        document.querySelectorAll(".tooltip-box").forEach((el) => {
          if (el !== box) el.classList.remove("is-active");
        });

        // Przełączamy stan obecnego bąbelka
        box.classList.toggle("is-active");

        if (box.classList.contains("is-active") && navigator.vibrate) {
          navigator.vibrate(15); // Lekki bąbelkowy haptic pop
        }
      });
    }
  });

  // Globalne zamykanie (kliknięcie poza tooltipami lub klawisz Escape)
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".tooltip-container")) {
      document
        .querySelectorAll(".tooltip-box")
        .forEach((el) => el.classList.remove("is-active"));
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".tooltip-box")
        .forEach((el) => el.classList.remove("is-active"));
    }
  });

  // NOTIFIACTIONS
  const notifyToggle = document.getElementById("toggleNotifications");
  notifyToggle?.addEventListener("change", async () => {
    const isEnabled = notifyToggle.checked;
    if (isEnabled) {
      const permission = await PermissionsManager.requestNotifications();
      if (permission !== "granted") {
        notifyToggle.checked = false;
        return UI.showModalMessage("Permission denied.");
      }
      NotificationService.send("Habit Bubble", {
        body: "Notifications are active! 🚀",
      });
    }
    localStorage.setItem("user_notifications_enabled", isEnabled);
  });

  // LOCALISAITION
  const locationToggle = document.getElementById("toggleLocation");
  if (locationToggle) {
    locationToggle.addEventListener("change", async () => {
      if (locationToggle.checked) {
        try {
          await PermissionsManager.requestGeolocation();
          console.log("📍 Location access granted");
          localStorage.setItem("user_location_enabled", "true");
        } catch (err) {
          locationToggle.checked = false;
          localStorage.setItem("user_location_enabled", "false");
          UI.showModalMessage("Location access denied.");
        }
      } else {
        localStorage.setItem("user_location_enabled", "false");
      }
    });
  }

  // xp engine
  async function handleCompletion(type, item, isDone) {
    let xpAmount = LevelManager.calculateXP(type, item);

    if (!isDone) xpAmount = -xpAmount;

    const currentStats = await DataManager.getUserStats();
    const { stats: newStats, leveledUp } = LevelManager.processXpGain(
      currentStats,
      xpAmount
    );

    await DataManager.saveUserStats(newStats);

    if (leveledUp && navigator.vibrate) navigator.vibrate([100, 50, 200]);
    else if (isDone && navigator.vibrate) navigator.vibrate(50);

    document.dispatchEvent(
      new CustomEvent("statsUpdated", { detail: { leveledUp, newStats } })
    );
  }
}
