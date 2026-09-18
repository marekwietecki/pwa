import { Utils, DataManager, LevelManager } from "./data.js";
import { elements } from "./elements.js";
import {
  LocationService,
  NotificationService,
  PermissionsManager,
} from "./services.js";
import { UI } from "./ui.min.js";

const bubbleSound = new Audio("./assets/sounds/bubble_pop.mp3");
bubbleSound.volume = 0.4;

const futureTaskDeniedSound = new Audio(
  "./assets/sounds/future_task_denied.mp3"
);
futureTaskDeniedSound.volume = 0.4;

/**
 * Otwiera modal dodawania nowego elementu, automatycznie dopasowując typ tworzonego 
 * obiektu (cel, nawyk, zadanie) na podstawie aktualnej ścieżki URL podstrony aplikacji.
 */
async function openAddTaskModal(AppState) {
  if (!elements.modalOverlay) return;

  // Netlify serves these pages with the .html extension stripped from
  // internal links (pretty URLs), so pathname is "/calendar", not
  // "/calendar.html" — match on the page name alone, not the extension.
  const page = window.location.pathname;
  if (page.includes("hero")) AppState.currentCreateType = "goal";
  else if (page.includes("habits")) AppState.currentCreateType = "habit";
  else AppState.currentCreateType = "task";

  UI.resetModal(AppState);

  UI.setModalMode("create", AppState.currentCreateType);

  if (page.includes("calendar") && elements.taskDate) {
    elements.taskDate.value = Utils.formatDateKey(AppState.selectedDate);
  }

  await UI.fillModalHabitSelect();

  elements.modalOverlay.classList.add("open");
}

/**
 * Główna funkcja inicjalizująca nasłuchiwanie zdarzeń (Event Listeners) dla całego interfejsu, 
 * zarządzająca delegacją kliknięć na listach zadań, interakcjami w modalach, geolokalizacją oraz tooltipami.
 */
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

  if (elements.goalHabitToggleBtn && elements.goalHabitCheckboxList) {
    elements.goalHabitToggleBtn.addEventListener("click", () => {
      elements.goalHabitCheckboxList.hidden =
        !elements.goalHabitCheckboxList.hidden;
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
    if (AppState.selectedHabitForStats === "ALL") {
      AppState.statsViewDate.setFullYear(
        AppState.statsViewDate.getFullYear() - 1
      );
      UI.renderYearActivityGrid(AppState);
    } else {
      AppState.statsViewDate.setMonth(AppState.statsViewDate.getMonth() - 1);
      if (AppState.selectedHabitForStats)
        UI.renderActivityGrid(AppState.selectedHabitForStats, AppState);
    }
  });

  document.getElementById("nextStatMonth")?.addEventListener("click", () => {
    if (AppState.selectedHabitForStats === "ALL") {
      AppState.statsViewDate.setFullYear(
        AppState.statsViewDate.getFullYear() + 1
      );
      UI.renderYearActivityGrid(AppState);
    } else {
      AppState.statsViewDate.setMonth(AppState.statsViewDate.getMonth() + 1);
      if (AppState.selectedHabitForStats)
        UI.renderActivityGrid(AppState.selectedHabitForStats, AppState);
    }
  });

  //calendar arrows
  document.getElementById("prevMonth")?.addEventListener("click", async () => {
    AppState.date.setMonth(AppState.date.getMonth() - 1);
    await UI.renderCalendar(AppState);
    await UI.renderWeekStrip(AppState);
  });

  document.getElementById("nextMonth")?.addEventListener("click", async () => {
    AppState.date.setMonth(AppState.date.getMonth() + 1);
    await UI.renderCalendar(AppState);
    await UI.renderWeekStrip(AppState);
  });

  // week strip arrows (mobile)
  document.getElementById("prevWeek")?.addEventListener("click", async () => {
    AppState.date.setDate(AppState.date.getDate() - 7);
    await UI.renderCalendar(AppState);
    await UI.renderWeekStrip(AppState);
  });

  document.getElementById("nextWeek")?.addEventListener("click", async () => {
    AppState.date.setDate(AppState.date.getDate() + 7);
    await UI.renderCalendar(AppState);
    await UI.renderWeekStrip(AppState);
  });

  // week strip touch-swipe navigation (mobile)
  (() => {
    const stripEl = document.getElementById("weekStrip");
    if (!stripEl) return;
    let touchStartX = 0;
    let touchStartY = 0;

    stripEl.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      },
      { passive: true }
    );

    stripEl.addEventListener(
      "touchend",
      async (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;

        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;

        AppState.date.setDate(AppState.date.getDate() + (dx < 0 ? 7 : -7));
        await UI.renderCalendar(AppState);
        await UI.renderWeekStrip(AppState);
      },
      { passive: true }
    );
  })();

  // Klikanie w konkretny dzień kalendarza (Delegacja zdarzeń)
  const handleDayClick = async (e, container) => {
    const dayEl = e.target.closest(".day");

    if (dayEl && dayEl.dataset.date) {
      AppState.selectedDate = new Date(dayEl.dataset.date);

      container
        .querySelectorAll(".day")
        .forEach((el) => el.classList.remove("active"));
      dayEl.classList.add("active");

      await UI.renderCalendarTasks(AppState);
    }
  };

  elements.calendarGrid?.addEventListener("click", (e) =>
    handleDayClick(e, elements.calendarGrid)
  );

  document
    .getElementById("weekStrip")
    ?.addEventListener("click", (e) =>
      handleDayClick(e, document.getElementById("weekStrip"))
    );

  // month/year dropdown (mobile week view)
  const monthYearContainer = document.getElementById(
    "monthYearDropdownContainer"
  );
  const monthYearTrigger = document.getElementById("monthYearTrigger");
  const monthYearList = document.getElementById("monthYearDropdownList");

  const openMonthYearDropdown = () => {
    UI.populateMonthYearList(AppState);
    monthYearContainer.classList.add("open");
    monthYearList.style.maxHeight =
      Math.min(monthYearList.scrollHeight, 260) + "px";

    // Land on the current month centered in the scrollable list instead of
    // wherever the top of the 25-month range happens to be - most relevant
    // on small screens where the dropdown only shows a few rows at once.
    requestAnimationFrame(() => {
      monthYearList
        .querySelector(".month-year-item.selected")
        ?.scrollIntoView({ block: "center", behavior: "auto" });
    });
  };
  const closeMonthYearDropdown = () => {
    monthYearContainer?.classList.remove("open");
    if (monthYearList) monthYearList.style.maxHeight = "0px";
  };

  monthYearTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (monthYearContainer.classList.contains("open")) {
      closeMonthYearDropdown();
    } else {
      openMonthYearDropdown();
    }
  });

  monthYearList?.addEventListener("click", async (e) => {
    const item = e.target.closest(".month-year-item");
    if (!item) return;

    AppState.date = new Date(
      parseInt(item.dataset.year),
      parseInt(item.dataset.month),
      1
    );
    await UI.renderCalendar(AppState);
    await UI.renderWeekStrip(AppState);
    closeMonthYearDropdown();
  });

  document.addEventListener("click", closeMonthYearDropdown);

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
      UI.updateSubmitButtonState(AppState);
    });
  });

  /**
   * Zapisuje ilość dla mierzalnego nawyku danego dnia i - jeśli to
   * zmieniło stan ukończenia na dziś - nalicza/cofa XP tym samym torem co
   * zwykły checkbox. Współdzielone przez szybkie dopełnienie checkboxem
   * (ustaw = target/0) i bąbelek logowania (dowolna wpisana wartość).
   */
  const applyHabitProgress = async (habit, dateKey, amount) => {
    const wasDone = habit.history?.[dateKey] === true;
    const updatedHabit = await DataManager.logHabitProgress(
      habit.id,
      dateKey,
      amount
    );
    if (!updatedHabit) return null;
    const isNowDone = updatedHabit.history?.[dateKey] === true;

    const todayKey = Utils.formatDateKey(new Date());
    if (dateKey === todayKey && isNowDone !== wasDone) {
      await handleCompletion("habit", updatedHabit, isNowDone);
      if (isNowDone) {
        const xpValue = LevelManager.calculateXP("habit", updatedHabit);
        UI.showToast(`Habit completed! +${xpValue} XP 🫧`, "info");
        bubbleSound.currentTime = 0;
        bubbleSound
          .play()
          .catch((err) => console.log("Audio block bypass:", err));
      }
    }

    await refreshCurrentView(AppState);
    return updatedHabit;
  };

  /**
   * Usuwa zadanie/nawyk/cel po potwierdzeniu w confirmDialog (wariant
   * "danger"). Współdzielone przez detail bubble (zadania/nawyki) i
   * pozostały hold-to-delete w "..." menu (cele).
   */
  const deleteItemWithConfirm = async (itemType, itemId, itemName) => {
    const name = itemName || "this item";
    const confirmed = await UI.confirmDialog(
      `Delete "${name}" permanently?`,
      "Delete",
      "danger"
    );
    if (!confirmed) return;

    await DataManager.deleteItemByType(itemType, itemId);
    const displayType = itemType.charAt(0).toUpperCase() + itemType.slice(1);
    UI.showToast(
      `${displayType} "${name}" has been permanently deleted.`,
      "info"
    );
    await refreshCurrentView(AppState);
  };

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

      if (
        isChecked &&
        (type === "task" || type === "habit") &&
        dateKey &&
        dateKey > Utils.formatDateKey(new Date())
      ) {
        target.checked = false;
        UI.showToast(
          "You cannot check a future task. Build your habits day by day!",
          "error"
        );
        futureTaskDeniedSound.currentTime = 0;
        futureTaskDeniedSound
          .play()
          .catch((err) => console.log("Audio block bypass:", err));
        return;
      }

      // A measurable habit's checkbox is a quick-complete shortcut, not a
      // partial-progress editor: checking it fills the amount straight to
      // the target (e.g. 4/8 -> 8/8) and unchecking resets it to 0. Logging
      // an in-between amount (3 out of 5) happens via the row tap instead
      // (see the ".taskContent" branch below), which opens the bubble.
      if (type === "habit" && itemObject?.measurable) {
        target.checked = !isChecked;

        if (isChecked && dateKey && dateKey > Utils.formatDateKey(new Date())) {
          UI.showToast(
            "You cannot log a future habit. Build your habits day by day!",
            "error"
          );
          futureTaskDeniedSound.currentTime = 0;
          futureTaskDeniedSound
            .play()
            .catch((err) => console.log("Audio block bypass:", err));
          return;
        }

        await applyHabitProgress(
          itemObject,
          dateKey,
          isChecked ? itemObject.targetQuantity : 0
        );
        return;
      }

      // Completing a goal is a bigger, harder-to-notice action than
      // checking off a task/habit (it awards XP and drops the goal out
      // of the active list entirely), so guard the one-tap checkbox with
      // an explicit confirmation instead of letting a mistake click
      // complete it outright. Unchecking (undoing a mistaken complete)
      // stays instant since that direction isn't destructive.
      if (isChecked && type === "goal") {
        target.checked = false;
        const goalName = itemObject?.name || "this goal";
        const confirmed = await UI.confirmDialog(
          `Mark "${goalName}" as complete?`,
          "Complete 🎉"
        );
        if (!confirmed) return;
        target.checked = true;
      }

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

        //  Wywołanie silnika XP (Tylko JEDNO wspólne miejsce dla dzisiejszych zadań / celów)
        const todayKey = Utils.formatDateKey(new Date());
        if (dateKey === todayKey || type === "goal") {
          // NALICZAMY XP W BAZIE
          await handleCompletion(type, itemData, isChecked);

          // ANIMACJA + BĄBELEK XP i dzwięk (Odpala się tylko gdy zadanie jest zaznaczane jako zrobione)
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
        } else if (isChecked && type !== "goal") {
          // Zadanie/nawyk z przeszłości - można odznaczyć, ale bez XP.
          UI.createFloatingBadge(e, "No points for past tasks");
        }

        // REFRESH UI - bezpieczne 300ms na wzniesienie się bąbelka
        setTimeout(() => refreshCurrentView(AppState), 300);
      } catch (err) {
        // 🔥 PRZYWRÓCONY BLOK CATCH: Cofnięcie zaznaczenia w razie błędu bazy danych
        console.error("Błąd podczas aktualizacji statusu:", err);
        target.checked = !isChecked;
      }
    } else if (!target.closest(".taskActions")) {
      // Tapping anywhere on the row (not the checkbox in taskActions) opens
      // the detail bubble. For a measurable habit this is where a partial
      // amount (3 out of 5) gets logged - the checkbox stays a quick "fill
      // to target" shortcut. For everything else it's just how edit/delete
      // are reached now that the list no longer has a "..." menu anywhere.
      const isMeasurable = type === "habit" && !!itemObject?.measurable;

      if (isMeasurable && dateKey && dateKey > Utils.formatDateKey(new Date())) {
        UI.showToast(
          "You cannot log a future habit. Build your habits day by day!",
          "error"
        );
        futureTaskDeniedSound.currentTime = 0;
        futureTaskDeniedSound
          .play()
          .catch((err) => console.log("Audio block bypass:", err));
        return;
      }

      UI.openItemDetailModal(itemObject, type, dateKey, {
        onSave: (finalAmount) =>
          applyHabitProgress(itemObject, dateKey, finalAmount),
        onEdit: () => {
          if (type === "task") UI.openEditTaskModal(itemObject, AppState);
          else if (type === "habit") UI.openEditHabitModal(itemObject, AppState);
          else UI.openEditGoalModal(itemObject, AppState);
        },
        onDelete: () => deleteItemWithConfirm(type, id, itemObject?.name),
      });
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

  elements.taskName.addEventListener("input", () => {
    UI.updateSubmitButtonState(AppState);
  });

  elements.goalDeadline?.addEventListener("input", () => {
    UI.updateSubmitButtonState(AppState);
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

  /**
   * Pomocnicza funkcja zbierająca zaznaczone dni tygodnia lub miesiąca z pickerów w modalu, 
   * mapująca je na tablicę liczb reprezentującą harmonogram nawyku.
   */
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

  /**
   * Odczytuje z modala docelową ilość + wybraną jednostkę nawyku - oba pola
   * są teraz zawsze widoczne (bez osobnego przełącznika). Puste oba pola =
   * zwykły nawyk (measurable: false). Wypełnione tylko jedno z nich uznajemy
   * za pomyłkę użytkownika (invalid), bo połówkowa konfiguracja nie ma
   * żadnego sensownego znaczenia.
   */
  const getMeasurableFields = () => {
    const targetQuantity = parseFloat(elements.habitTargetQuantity?.value);
    const unit = elements.habitUnitPicker?.querySelector(
      'input[name="habitUnit"]:checked'
    )?.value;

    const hasQuantity = !!targetQuantity && targetQuantity > 0;
    const hasUnit = !!unit;

    if (!hasQuantity && !hasUnit) return { measurable: false };
    if (!hasQuantity || !hasUnit) return { measurable: false, invalid: true };

    return { measurable: true, targetQuantity, unit };
  };

  /**
   * Pomocnicza funkcja obsługująca proces walidacji oraz zapisu zmodyfikowanych danych 
   * istniejącego już celu (Goal) bądź nawyku (Habit) w bazie danych.
   */
  const handleSaveEdit = async (editId, editType, AppState) => {
    const id = parseInt(editId);

    if (editType === "goal") {
      const newData = {
        name: elements.taskName.value.trim(),
        description: elements.descriptionInput.value.trim(),
        deadline: elements.goalDeadline.value,
        linkedHabitIds: UI.getSelectedHabitIds(),
      };
      if (!newData.name || !newData.deadline) {
        UI.showModalMessage("Required fields missing!");
        throw new Error("Validation failed");
      }
      await DataManager.updateGoalDetails(id, newData);
    } else if (editType === "task") {
      let newName = elements.taskName.value.trim();
      const newDate = elements.taskDate.value;
      const newLocation = elements.locationInput?.value.trim() || null;

      if (!newName) {
        UI.showModalMessage("Provide a name! ✍️");
        throw new Error("Validation failed");
      }
      if (!newDate) {
        UI.showModalMessage("Provide a date! 📅");
        throw new Error("Validation failed");
      }
      newName = newName.charAt(0).toUpperCase() + newName.slice(1);

      await DataManager.updateTaskDetails(id, {
        name: newName,
        date: newDate,
        location: newLocation,
      });
    } else {

      const newFreq = document.getElementById("habitFrequency").value;
      const newStartDate = document.getElementById("taskDate").value;
      const newSchedule = getHabitSchedule();
      let newName = elements.taskName.value.trim();
      if (newName) newName = newName.charAt(0).toUpperCase() + newName.slice(1);
      const newIcon = UI.selectedHabitIcon;

      if (!newName) {
        UI.showModalMessage("Provide a name! ✍️");
        throw new Error("Validation failed");
      }

      const measurableFields = getMeasurableFields();
      if (measurableFields.invalid) {
        UI.showModalMessage("Provide a valid quantity and unit! 🔢");
        throw new Error("Validation failed");
      }

      await DataManager.updateHabitDetails(id, {
        frequency: newFreq,
        schedule: newSchedule,
        startDate: newStartDate,
        name: newName,
        icon: newIcon,
        ...measurableFields,
      });

      const updatedHabit = await DataManager.getItemByTypeAndId("habit", id);
      if (updatedHabit) {
        AppState.selectedHabitForStats = updatedHabit;
        UI.showHabitDetails(updatedHabit, AppState);
      }
    }
    await refreshCurrentView(AppState); 
  };

  /**
   * Pomocnicza funkcja parsująca formularz modala pod kątem poprawności, formatująca dane wejściowe 
   * i wywołująca asynchroniczny zapis nowego wpisu (zadania, nawyku, celu) do IndexedDB.
   */
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

        const measurableFields = getMeasurableFields();
        if (measurableFields.invalid) {
          UI.showModalMessage("Provide a valid quantity and unit! 🔢");
          return false;
        }

        await DataManager.addHabit({
          name,
          icon,
          location,
          frequency,
          schedule,
          createdAt,
          history: {},
          progress: {},
          ...measurableFields,
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
          linkedHabitIds: UI.getSelectedHabitIds(),
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
          elements.confirmAddBtn.disabled = false; 
          return;
        }
      }

      await refreshCurrentView(AppState);
      elements.modalOverlay.classList.remove("open");
      UI.resetModal(AppState);
    } catch (err) {
      console.error("Critical Save Error:", err);
    } finally {
      elements.confirmAddBtn.disabled = false;
    }
  });

  /**
   * Pomocnicza funkcja odświeżająca aktualnie widoczne struktury list, kalendarza 
   * i sekcji nawyków po dokonaniu zmian lub usunięciu jakiegoś elementu.
   */
  const refreshCurrentView = async (AppState) => {
    if (elements.calendarGrid) {
      await UI.renderCalendar(AppState);
      await UI.renderWeekStrip(AppState);
    }

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

  // BUBBLE TOOLTIPS HANDLER 
  const tooltipsConfig = [
    { btnId: "streakInfoBtn", boxId: "streakTooltip" },
    { btnId: "effectivenessInfoBtn", boxId: "effectivenessTooltip" },
  ];

  tooltipsConfig.forEach(({ btnId, boxId }) => {
    const btn = document.getElementById(btnId);
    const box = document.getElementById(boxId);

    if (btn && box) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();

        document.querySelectorAll(".tooltip-box").forEach((el) => {
          if (el !== box) el.classList.remove("is-active");
        });

        box.classList.toggle("is-active");

        if (box.classList.contains("is-active") && navigator.vibrate) {
          navigator.vibrate(15); // Lekki bąbelkowy haptic pop
        }
      });
    }
  });

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

  /**
   * Pomocnicza funkcja pośrednicząca w silniku grywalizacji, obliczająca bilans zysku lub straty punktów XP 
   * przy zaznaczaniu/odznaczaniu zadań, zapisująca nowy poziom w statystykach oraz wywołująca event 'statsUpdated'.
   */
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