import { Utils, DataManager, LevelManager } from "./data.js";
import { QuoteService } from "./services.js";
import { elements } from "./elements.js";
import { Icons } from "./icons.js";

// Tracks whether the browser is running its own native cross-document
// View Transition for the current page load (see @view-transition in
// global.css), so initTabNav can skip its own pop-in entrance animation
// and avoid animating the nav indicator twice.
let navIndicatorViewTransitionActive = false;
window.addEventListener(
  "pagereveal",
  (e) => {
    if (e.viewTransition) {
      navIndicatorViewTransitionActive = true;
      e.viewTransition.finished.finally(() => {
        navIndicatorViewTransitionActive = false;
      });
    }
  },
  { once: true }
);

export const GRADIENTS = [
  "linear-gradient(90deg, #AD22B6, #FF00FF)",
  "linear-gradient(90deg, #4facfe, #00f2fe)",
  "linear-gradient(90deg, #43e97b, #38f9d7)",
  "linear-gradient(90deg, #fa709a, #fee140)",
  "linear-gradient(90deg, #667eea, #764ba2)",
  "linear-gradient(90deg, #f093fb, #f5576c)",
];

export const ONBOARDING_ICONS = [
  "💧",
  "🛌",
  "💪",
  "🍏",
  "🏃‍♂️",
  "📚",
  "💵",
  "🚭",
  "📱",
  "🐶",
  "🧠",
  "🧘",
  "🎯",
  "🌟",
];

export const UI = {
  selectedHabitIcon: "💧",

  createDeadlineIcon: () => Icons.createDeadlineIcon(),
  createLocationIcon: () => Icons.createLocationIcon(),
  createRepeatIcon: () => Icons.createRepeatIcon(),
  createLinkIcon: () => Icons.createLinkIcon(),
  createCheckIcon: () => Icons.createCheckIcon(),
  createEllipsisIcon: () => Icons.createEllipsisIcon(),
  createDeleteIcon: () => Icons.createDeleteIcon(),
  createGoalIcon: () => Icons.createGoalIcon(),
  createDescriptionIcon: () => Icons.createDescriptionIcon(),
  createPencilIcon: () => Icons.createPencilIcon(),

  /**
   * Tworzy i konfiguruje pierścień postępu SVG na podstawie przekazanej wartości procentowej.
   * @param {number} percentage - Procent ukończenia (0 - 100).
   * @returns {HTMLDivElement} Kontener z wyrenderowanym elementem SVG.
   */
  createProgressCircle: (percentage) => {
    const size = 32;
    const stroke = 4;
    const radius = (size - 10) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    const svgNS = "http://www.w3.org/2000/svg";

    const container = document.createElement("div");
    container.className = "progress-ring-container";

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.style.transform = "rotate(-90deg) scaleY(-1)";
    svg.style.transformOrigin = "center";
    svg.style.display = "block";

    const bgCircle = document.createElementNS(svgNS, "circle");
    bgCircle.setAttribute("class", "progress-ring-circle-bg");
    bgCircle.setAttribute("stroke", "rgba(255,255,255,0.1)");
    bgCircle.setAttribute("stroke-width", stroke);
    bgCircle.setAttribute("fill", "transparent");
    bgCircle.setAttribute("r", radius);
    bgCircle.setAttribute("cx", size / 2);
    bgCircle.setAttribute("cy", size / 2);

    const progressCircle = document.createElementNS(svgNS, "circle");
    progressCircle.setAttribute("class", "progress-ring-circle");
    progressCircle.setAttribute("stroke", "#3DADFF");
    progressCircle.setAttribute("stroke-width", stroke);
    progressCircle.setAttribute("fill", "transparent");
    progressCircle.setAttribute("r", radius);
    progressCircle.setAttribute("cx", size / 2);
    progressCircle.setAttribute("cy", size / 2);
    progressCircle.setAttribute(
      "stroke-dasharray",
      `${circumference} ${circumference}`
    );
    progressCircle.style.strokeDashoffset = offset;
    progressCircle.setAttribute("stroke-linecap", "round");

    svg.appendChild(bgCircle);
    svg.appendChild(progressCircle);
    container.appendChild(svg);

    return container;
  },

  /**
   * Aktualizuje nazwę użytkownika w nagłówku oraz odświeża pasek doświadczenia (XP).
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  updateUserHeader: async (AppState) => {
    const stats = await DataManager.getUserStats();
    const nameLabel = document.getElementById("displayUserName");
    if (nameLabel) nameLabel.textContent = stats.userName;
    await UI.updateXPBar(AppState);
  },

  /**
   * Zarządza asynchronicznym renderowaniem aktualnej strony z animacją przejścia.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  renderCurrentPage: async (AppState) => {
    const mainContent =
      document.querySelector(".page-container") ||
      document.querySelector("main");

    if (mainContent) {
      mainContent.classList.add("is-switching");
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    if (elements.toDoList) {
      await UI.renderQuote();
      await UI.renderDailyTasks(AppState);
      await UI.renderLongTermGoals(AppState);
    }
    if (elements.calendarGrid) {
      await UI.renderCalendar(AppState);
      await UI.renderWeekStrip(AppState);
      await UI.renderCalendarTasks(AppState);
    }
    if (elements.habitSection) await UI.renderHabits(AppState);
    if (elements.goalsList) {
      await UI.setupSettingsToggles();
      UI.applyRandomGradient();
      await UI.renderLongTermGoals(AppState);
    }

    if (mainContent) {
      setTimeout(() => {
        mainContent.classList.remove("is-switching");
      }, 30);
    }
  },

  /**
   * Losuje jeden z dostępnych gradientów i ustawia go jako zmienną CSS dla tła profilu.
   */
  applyRandomGradient: () => {
    const randomIndex = Math.floor(Math.random() * GRADIENTS.length);
    const selectedGradient = GRADIENTS[randomIndex];
    document.documentElement.style.setProperty(
      "--hero-gradient",
      selectedGradient
    );
  },

  MAX_LINKED_HABITS: 5,
  _habitSelectRequestId: 0,

  /**
   * Pobiera aktywne nawyki i uzupełnia nimi listę checkboxów w modalu tworzenia celu
   * (do MAX_LINKED_HABITS zaznaczeń naraz).
   *
   * resetModal/toggleModalFields and the caller here can both trigger this
   * within the same tick (fire-and-forget), so two calls can be in flight
   * at once - without a guard, whichever call's getHabits() resolves last
   * appends onto whatever the other already appended, duplicating every
   * chip. A generation token lets a superseded call bail out instead.
   */
  fillModalHabitSelect: async () => {
    const container = elements.goalHabitCheckboxList;
    if (!container) return;

    const requestId = ++UI._habitSelectRequestId;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    try {
      const habits = await DataManager.getHabits();
      if (requestId !== UI._habitSelectRequestId) return;

      habits.forEach((habit) => {
        const label = document.createElement("label");
        label.className = "habit-checkbox-row";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = habit.id;
        checkbox.addEventListener("change", () =>
          UI.enforceHabitCheckboxLimit(container)
        );

        const text = document.createElement("span");
        text.textContent = habit.name;

        label.appendChild(checkbox);
        label.appendChild(text);
        container.appendChild(label);
      });

      UI.updateHabitPickerToggleLabel();
    } catch (error) {
      console.error("Błąd podczas ładowania nawyków do listy checkboxów:", error);
    }
  },

  /**
   * Blokuje zaznaczanie kolejnych checkboxów po osiągnięciu limitu MAX_LINKED_HABITS.
   */
  enforceHabitCheckboxLimit: (container) => {
    const checkboxes = Array.from(
      container.querySelectorAll('input[type="checkbox"]')
    );
    const checkedCount = checkboxes.filter((cb) => cb.checked).length;
    const atLimit = checkedCount >= UI.MAX_LINKED_HABITS;

    checkboxes.forEach((cb) => {
      if (!cb.checked) {
        cb.disabled = atLimit;
        cb.closest("label")?.classList.toggle("disabled", atLimit);
      }
    });

    if (checkedCount === UI.MAX_LINKED_HABITS) {
      UI.showToast(
        `You can link up to ${UI.MAX_LINKED_HABITS} habits to a goal.`,
        "info"
      );
    }

    UI.updateHabitPickerToggleLabel();
  },

  /**
   * Aktualizuje etykietę przycisku rozwijającego listę checkboxów, pokazując
   * liczbę aktualnie wybranych nawyków (np. "3/5 habits linked").
   */
  updateHabitPickerToggleLabel: () => {
    const btn = elements.goalHabitToggleBtn;
    if (!btn) return;

    const count = UI.getSelectedHabitIds().length;
    btn.textContent =
      count > 0
        ? `${count}/${UI.MAX_LINKED_HABITS} habits linked`
        : "Select habits to link";
  },

  /**
   * Odczytuje zaznaczone w modalu checkboxy nawyków i zwraca ich ID.
   */
  getSelectedHabitIds: () => {
    const container = elements.goalHabitCheckboxList;
    if (!container) return [];
    return Array.from(
      container.querySelectorAll('input[type="checkbox"]:checked')
    ).map((cb) => parseInt(cb.value));
  },

  /**
   * Zwraca listę ID nawyków powiązanych z celem, z fallbackiem na starsze
   * cele zapisane jeszcze z pojedynczym polem linkedHabitId.
   */
  getLinkedHabitIds: (goal) => {
    if (Array.isArray(goal.linkedHabitIds)) return goal.linkedHabitIds;
    return goal.linkedHabitId ? [goal.linkedHabitId] : [];
  },

  /**
   * Resetuje wartości wszystkich głównych pól tekstowych i datowników w modalu.
   */
  clearModalInputs: () => {
    const inputs = [
      elements.taskName,
      elements.taskDate,
      elements.descriptionInput,
      elements.goalDeadline,
      elements.locationInput,
    ];
    inputs.forEach((input) => {
      if (input) input.value = "";
    });

    if (elements.habitTargetQuantity) elements.habitTargetQuantity.value = "";
    elements.habitUnitPicker
      ?.querySelectorAll('input[name="habitUnit"]')
      .forEach((radio) => (radio.checked = false));

    if (elements.goalHabitCheckboxList) {
      elements.goalHabitCheckboxList
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => {
          cb.checked = false;
          cb.disabled = false;
          cb.closest("label")?.classList.remove("disabled");
        });
      elements.goalHabitCheckboxList.hidden = true;
    }
    UI.updateHabitPickerToggleLabel();
    if (elements.locationInput)
      elements.locationInput.classList.remove("success", "error");

    document
      .querySelectorAll("#daysPicker input, #monthDaysGrid input")
      .forEach((cb) => (cb.checked = false));
  },

  /**
   * Uniwersalny generator siatki ikon (Emoji Picker) obsługujący zaznaczenia i wywołanie callbacku.
   * @param {Object} config - Obiekt konfiguracyjny (kontener, ikony, ikona aktywna, zdarzenie onSelect).
   */
  createEmojiPicker: ({
    container,
    icons,
    activeIcon,
    itemFlex,
    fontSize,
    onSelect,
  }) => {
    if (!container) return;
    container.innerHTML = "";

    if (!document.getElementById("bubble-picker-scrollbar-style")) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "bubble-picker-scrollbar-style";
      styleSheet.textContent = `
        #mainHabitIconPicker::-webkit-scrollbar, 
        #onboardingIconPicker::-webkit-scrollbar { display: none; }
      `;
      document.head.appendChild(styleSheet);
    }

    icons.forEach((emoji) => {
      const iconWrapper = document.createElement("div");
      iconWrapper.className = "bubble-picker-item";
      iconWrapper.textContent = emoji;

      const size = itemFlex || "44px";
      const fSize = fontSize || "20px";

      iconWrapper.style.cssText = `
        flex: 0 0 ${size}; width: ${size}; height: ${size};
        display: flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,0.04); border: 2px solid transparent;
        border-radius: 12px; cursor: pointer; font-size: ${fSize};
        transition: all 0.25s ease; user-select: none; box-sizing: border-box;
      `;

      if (emoji === activeIcon) {
        iconWrapper.style.border = "2px solid rgba(255, 255, 255, 0.6)";
        iconWrapper.style.background = "rgba(255, 255, 255, 0.12)";
        iconWrapper.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.3)";
      }

      iconWrapper.addEventListener("click", () => {
        container.querySelectorAll(".bubble-picker-item").forEach((item) => {
          item.style.border = "2px solid transparent";
          item.style.background = "rgba(255,255,255,0.04)";
          item.style.boxShadow = "none";
        });

        iconWrapper.style.border = "2px solid rgba(255, 255, 255, 0.6)";
        iconWrapper.style.background = "rgba(255, 255, 255, 0.12)";
        iconWrapper.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.3)";

        if (typeof onSelect === "function") {
          onSelect(emoji);
        }
      });

      container.appendChild(iconWrapper);
    });
  },

  /**
   * Inicjalizuje pasek wyboru odznaki nawyku wraz z obsługą pola dla własnego znaku użytkownika.
   * @param {string} activeEmoji - Początkowo zaznaczona ikona.
   */
  setupHabitIconPicker: (activeEmoji) => {
    const wrapper = document.getElementById("habitIconWrapper");
    if (!wrapper) return;

    wrapper.innerHTML = "";

    const subTitle = document.createElement("div");
    subTitle.className = "modalSubTitle";
    subTitle.textContent = "Choose Habit Badge";
    subTitle.style.width = "100%";
    subTitle.style.marginBottom = "8px";
    wrapper.appendChild(subTitle);

    const rowContainer = document.createElement("div");
    rowContainer.style.cssText = `
      display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%;
    `;

    const pickerContainer = document.createElement("div");
    pickerContainer.id = "mainHabitIconPicker";
    pickerContainer.style.cssText = `
      display: flex; gap: 12px; flex: 1; padding: 5px 0; overflow-x: auto; justify-content: start; scrollbar-width: none; min-width: 0;
    `;

    UI.selectedHabitIcon = activeEmoji || "💧";
    const isPreset = ONBOARDING_ICONS.includes(UI.selectedHabitIcon);

    UI.createEmojiPicker({
      container: pickerContainer,
      icons: ONBOARDING_ICONS,
      activeIcon: isPreset ? UI.selectedHabitIcon : null,
      itemFlex: "44px",
      fontSize: "20px",
      onSelect: (emoji) => {
        if (customInput) {
          customInput.value = "";
          customInput.placeholder = "+";
        }
        UI.selectedHabitIcon = emoji;
      },
    });

    rowContainer.appendChild(pickerContainer);

    const customInput = document.createElement("input");
    customInput.type = "text";
    customInput.id = "customHabitIconInput";
    customInput.placeholder = "+";
    customInput.maxLength = 2;
    customInput.style.cssText = `
      flex: 0 0 44px; width: 44px; height: 44px; padding: 0; background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; color: #ffffff; font-size: 18px;
      text-align: center; outline: none; transition: all 0.3s ease; cursor: pointer;
    `;

    if (!isPreset && activeEmoji) {
      customInput.value = activeEmoji;
      customInput.style.border = "1px solid rgba(255, 255, 255, 0.5)";
      customInput.style.background = "rgba(255, 255, 255, 0.07)";
    }

    customInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      UI.selectedHabitIcon = val !== "" ? val : "💧";
    });

    customInput.addEventListener("focus", () => {
      customInput.placeholder = "";
      customInput.style.border = "1px solid rgba(255, 255, 255, 0.6)";
      customInput.style.background = "rgba(255, 255, 255, 0.12)";
      customInput.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.2)";

      pickerContainer
        .querySelectorAll(".bubble-picker-item")
        .forEach((item) => {
          item.style.border = "2px solid transparent";
          item.style.background = "rgba(255,255,255,0.04)";
          item.style.boxShadow = "none";
        });

      if (customInput.value.trim() === "") {
        UI.selectedHabitIcon = "💧";
      }
      setTimeout(() => customInput.select(), 10);
    });

    customInput.addEventListener("blur", () => {
      if (customInput.value === "") {
        customInput.placeholder = "+";
        customInput.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        customInput.style.background = "rgba(255, 255, 255, 0.03)";
        customInput.style.boxShadow = "none";

        const firstIcon = pickerContainer.querySelector(".bubble-picker-item");
        if (firstIcon && firstIcon.textContent === "💧") {
          firstIcon.style.border = "2px solid rgba(255, 255, 255, 0.6)";
          firstIcon.style.background = "rgba(255, 255, 255, 0.12)";
          firstIcon.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.3)";
          UI.selectedHabitIcon = "💧";
        }
      }
    });

    rowContainer.appendChild(customInput);
    wrapper.appendChild(rowContainer);
  },

  /**
   * Przełącza widoczność sekcji modala dopasowując układ pól do wybranego typu i trybu edycji.
   * @param {"task" | "habit" | "goal"} type - Aktualny typ formularza w modalu.
   * @param {boolean} isEdit - Czy modal jest w trybie edycji zasobu.
   */
  toggleModalFields: async (type, isEdit = false) => {
    const dSection = document.getElementById("dateSection");
    const hSection = document.getElementById("habitSection");
    const gSection = document.getElementById("goalSection");
    const lSection = document.getElementById("locationSection");
    const typePickers = document.querySelector(".typePickers");
    const dateTitle = document.querySelector("#dateSection .modalSubTitle");
    const nameSection = document.querySelector(".nameSection");
    const habitIcon = document.getElementById("habitIconWrapper");

    [dSection, hSection, gSection, lSection, typePickers, habitIcon].forEach(
      (el) => {
        if (el) el.style.display = "none";
      }
    );

    if (dateTitle) dateTitle.textContent = "Date";
    if (nameSection) nameSection.style.display = "flex";

    if (type === "task") {
      if (dSection) dSection.style.display = "flex";
      if (lSection) lSection.style.display = "flex";
    }

    if (type === "habit") {
      if (hSection) hSection.style.display = "flex";
      if (habitIcon) {
        habitIcon.style.display = "flex";
        habitIcon.style.flexDirection = "column";
      }

      // Name and icon stay visible in both create and edit mode (habits
      // don't have a location field, so that stays hidden either way).
      if (isEdit) {
        if (dSection) dSection.style.display = "flex";
        if (dateTitle) dateTitle.textContent = "Start Date";
      }
    }

    if (type === "goal") {
      if (gSection) gSection.style.display = "flex";
      await UI.fillModalHabitSelect();
    }

    if (!isEdit && typePickers) {
      typePickers.style.display = "flex";
    }

    if (elements.daysPicker) elements.daysPicker.style.display = "none";
    if (elements.monthlyDayPicker)
      elements.monthlyDayPicker.style.display = "none";
  },

  /**
   * Przełącza klasę aktywności na przyciskach wyboru typu wewnątrz modala.
   * @param {string} currentType - Obecnie wybrany typ (task/habit/goal).
   */
  refreshTypePickerButtons: (currentType) => {
    const typePickers = document.querySelectorAll(".typePicker");
    typePickers.forEach((btn) => {
      const btnType = btn.getAttribute("data-type");
      btn.classList.toggle("active", btnType === currentType);
    });
  },

  /**
   * Resetuje dane wejściowe, odznacza checkbox'y oraz przywraca domyślny stan widoku modala.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  resetModal: (AppState) => {
    if (!AppState) {
      console.warn("⚠️ resetModal: Brak obiektu AppState!");
      return;
    }

    UI.clearModalInputs();

    const scheduleCheckboxes = document.querySelectorAll(
      '#daysPicker input[type="checkbox"], #monthDaysGrid input[type="checkbox"]'
    );
    scheduleCheckboxes.forEach((cb) => (cb.checked = false));

    UI.toggleModalFields(AppState.currentCreateType, false);
    UI.refreshTypePickerButtons(AppState.currentCreateType);
    UI.setupHabitIconPicker("💧");
    UI.updateSubmitButtonState(AppState);
  },

  /**
   * Włącza przycisk Create/Save Changes wyłącznie gdy wymagane pola są uzupełnione
   * (nazwa zawsze; dodatkowo deadline dla celów).
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  updateSubmitButtonState: (AppState) => {
    const btn = document.getElementById("confirmAddBtn");
    if (!btn) return;

    const nameInput = document.getElementById("taskName");
    const hasName = !!nameInput && nameInput.value.trim().length > 0;

    const type = AppState && AppState.currentCreateType;
    const deadlineInput = document.getElementById("goalDeadline");
    const hasDeadline =
      type !== "goal" || !!(deadlineInput && deadlineInput.value);

    btn.disabled = !(hasName && hasDeadline);
  },

  /**
   * Konfiguruje etykiety tekstowe nagłówka oraz przycisku głównego modala dla trybu zapisu lub kreacji.
   * @param {"create" | "edit"} mode - Tryb pracy formularza.
   * @param {string} type - Nazwa typu elementu.
   */
  setModalMode: (mode = "create", type = "") => {
    const btn = document.getElementById("confirmAddBtn");
    const title = elements.modalTitle;
    const formattedType = type
      ? type.charAt(0).toUpperCase() + type.slice(1)
      : "";

    if (mode === "create") {
      if (title) {
        title.textContent = "New";
        title.classList.add("modal-title-hide-mobile");
      }
      if (btn) {
        btn.textContent = "Create";
        btn.removeAttribute("data-edit-id");
        btn.removeAttribute("data-edit-type");
      }
    } else {
      if (title) {
        title.textContent = formattedType ? `Edit ${formattedType}` : "Edit";
        title.classList.remove("modal-title-hide-mobile");
      }
      if (btn) btn.textContent = "Save Changes";
    }
  },

  /**
   * Otwiera formularz modala i uzupełnia go danymi istniejącego zadania przygotowanego do edycji.
   * @param {Object} task - Obiekt struktury danych zadania.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  openEditTaskModal: async (task, AppState) => {
    if (!AppState) return;

    AppState.currentCreateType = "task";
    UI.resetModal(AppState);

    UI.setModalMode("edit", "task");
    await UI.toggleModalFields("task", true);

    document.getElementById("taskName").value = task.name || "";

    const dateInput = document.getElementById("taskDate");
    if (dateInput) dateInput.value = task.date || "";

    if (elements.locationInput) {
      elements.locationInput.value = task.location || "";
    }

    const btn = document.getElementById("confirmAddBtn");
    if (btn) {
      btn.setAttribute("data-edit-id", task.id);
      btn.setAttribute("data-edit-type", "task");
    }

    UI.updateSubmitButtonState(AppState);

    if (elements.modalOverlay) elements.modalOverlay.classList.add("open");
  },

  /**
   * Otwiera formularz modala i uzupełnia go danymi istniejącego nawyku przygotowanego do edycji.
   * @param {Object} habit - Obiekt struktury danych nawyku.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  openEditHabitModal: async (habit, AppState) => {
    if (!AppState) return;

    AppState.currentCreateType = "habit";
    UI.resetModal(AppState);

    UI.setModalMode("edit", "habit");
    await UI.toggleModalFields("habit", true);

    document.getElementById("taskName").value = habit.name || "";

    if (habit.createdAt) {
      const startDate = new Date(habit.createdAt).toISOString().split("T")[0];
      const dateInput = document.getElementById("taskDate");
      if (dateInput) dateInput.value = startDate;
    }

    const freqSelect = document.getElementById("habitFrequency");
    if (freqSelect) {
      freqSelect.value = habit.frequency || "daily";
      freqSelect.dispatchEvent(new Event("change"));
    }

    if (habit.schedule && Array.isArray(habit.schedule)) {
      const container =
        habit.frequency === "weekly"
          ? elements.daysPicker
          : document.getElementById("monthDaysGrid");

      if (container) {
        container
          .querySelectorAll('input[type="checkbox"]')
          .forEach((cb) => (cb.checked = false));
        habit.schedule.forEach((val) => {
          const cb = container.querySelector(`input[value="${val}"]`);
          if (cb) cb.checked = true;
        });
      }
    }

    UI.setupHabitIconPicker(habit.icon || "💧");

    if (elements.habitTargetQuantity) {
      elements.habitTargetQuantity.value = habit.measurable
        ? habit.targetQuantity ?? ""
        : "";
    }
    elements.habitUnitPicker
      ?.querySelectorAll('input[name="habitUnit"]')
      .forEach((radio) => {
        radio.checked = habit.measurable && radio.value === habit.unit;
      });

    const btn = document.getElementById("confirmAddBtn");
    if (btn) {
      btn.setAttribute("data-edit-id", habit.id);
      btn.setAttribute("data-edit-type", "habit");
    }

    UI.updateSubmitButtonState(AppState);

    if (elements.modalOverlay) elements.modalOverlay.classList.add("open");
  },

  /**
   * Otwiera formularz modala i uzupełnia go danymi istniejącego celu długoterminowego przygotowanego do edycji.
   * @param {Object} goal - Obiekt struktury danych celu.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  openEditGoalModal: async (goal, AppState) => {
    if (!AppState) return;

    AppState.currentCreateType = "goal";
    UI.resetModal(AppState);

    UI.setModalMode("edit", "goal");
    await UI.toggleModalFields("goal", true);

    const nameInput = document.getElementById("taskName");
    if (nameInput) nameInput.value = goal.name || "";

    if (elements.descriptionInput) {
      elements.descriptionInput.value = goal.description || "";
    }

    if (elements.goalDeadline) {
      elements.goalDeadline.value = goal.deadline || "";
    }

    if (elements.goalHabitCheckboxList) {
      const linkedIds = UI.getLinkedHabitIds(goal).map(String);
      elements.goalHabitCheckboxList
        .querySelectorAll('input[type="checkbox"]')
        .forEach((cb) => {
          cb.checked = linkedIds.includes(cb.value);
        });
      UI.enforceHabitCheckboxLimit(elements.goalHabitCheckboxList);
    }

    const btn = document.getElementById("confirmAddBtn");
    if (btn) {
      btn.setAttribute("data-edit-id", goal.id);
      btn.setAttribute("data-edit-type", "goal");
    }

    UI.updateSubmitButtonState(AppState);

    if (elements.modalOverlay) elements.modalOverlay.classList.add("open");
  },

  /**
   * Odczytuje stan ustawień powiadomień oraz lokalizacji z localStorage i odpowiednio ustawia przełączniki w widoku.
   */
  setupSettingsToggles: async () => {
    const notifyToggle = document.getElementById("toggleNotifications");
    const locationToggle = document.getElementById("toggleLocation");

    if (notifyToggle) {
      const isEnabled =
        localStorage.getItem("user_notifications_enabled") === "true";
      notifyToggle.checked = isEnabled;
    }

    if (locationToggle) {
      const isEnabled =
        localStorage.getItem("user_location_enabled") === "true";
      locationToggle.checked = isEnabled;
    }
  },

  /**
   * Pobiera codzienną poradę/cytat motywacyjny za pomocą QuoteService i wstrzykuje jej treść oraz autora do DOM.
   */
  renderQuote: async () => {
    const quoteText = document.getElementById("quote-text");
    const quoteAuthor = document.getElementById("quote-author");

    if (!quoteText || !quoteAuthor) return;

    const quote = await QuoteService.getDailyAdvice();

    quoteText.textContent = quote.text;
    quoteAuthor.textContent = quote.author;
  },

  /**
   * Generuje dynamicznie siatkę 31 dni (jako zestaw pól checkbox i etykiet) wewnątrz kontenera wyboru dni miesiąca.
   */
  setupMonthlyGrid: () => {
    const grid = document.getElementById("monthDaysGrid");
    if (!grid) return;

    grid.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (let i = 1; i <= 31; i++) {
      const label = document.createElement("label");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = i.toString();

      const span = document.createElement("span");
      span.textContent = i.toString();

      label.appendChild(checkbox);
      label.appendChild(span);
      fragment.appendChild(label);
    }
    grid.appendChild(fragment);
  },

  /**
   * Uniwersalna metoda czyszcząca wskazany kontener i bezpiecznie wstrzykująca do niego nową tablicę węzłów DOM.
   * @param {HTMLElement} container - Kontener docelowy.
   * @param {HTMLElement[]} nodes - Tablica elementów do wyrenderowania.
   */
  renderToContainer: (container, nodes) => {
    if (!container) return;
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();
    nodes.forEach((node) => fragment.appendChild(node));
    container.appendChild(fragment);
  },

  /**
   * Pobiera i renderuje listę zadań nieukończonych (w tym przeterminowanych) oraz nawyków zaplanowanych na wybrany dzień.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  renderDailyTasks: async (AppState) => {
    const listEl = document.getElementById("toDoList");
    const wrapperEl = document.getElementById("emptyListMessageWrapper");
    if (!listEl) return;

    const targetDate = AppState.selectedDate;
    const dateKey = Utils.formatDateKey(targetDate);

    const undoneTasks = await DataManager.getUndoneTasks(dateKey);
    const savedHabits = await DataManager.getHabits();

    undoneTasks.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.name.localeCompare(b.name);
    });

    const undoneNodes = [];
    let globalIndex = 0;

    undoneTasks.forEach((task) => {
      const isOverdue = task.date < dateKey;
      const li = UI.createItem(
        task.name,
        task,
        dateKey,
        "task",
        AppState,
        isOverdue
      );

      li.style.animationDelay = `${globalIndex * 0.04}s`;
      globalIndex++;

      undoneNodes.push(li);
    });

    const sortedHabits = [...savedHabits].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    sortedHabits.forEach((habit) => {
      if (dateKey < Utils.formatDateKey(new Date(habit.createdAt))) return;

      const isDue = Utils.isHabitDue(habit, targetDate);
      const isDone = habit.history && habit.history[dateKey];

      if (isDue && !isDone) {
        const li = UI.createItem(habit.name, habit, dateKey, "habit", AppState);

        li.style.animationDelay = `${globalIndex * 0.04}s`;
        globalIndex++;

        undoneNodes.push(li);
      }
    });

    if (wrapperEl) {
      wrapperEl.style.display = undoneNodes.length === 0 ? "flex" : "none";
    }

    UI.renderToContainer(listEl, undoneNodes);
  },

  /**
   * Pobiera z bazy danych i renderuje listę aktywnych, nieukończonych celów długoterminowych.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  renderLongTermGoals: async (AppState) => {
    const goalsListEl = document.getElementById("goalsList");
    if (!goalsListEl) return;

    const wrapperEl = document.getElementById("emptyListMessageWrapper");

    const [savedGoals, allHabits] = await Promise.all([
      DataManager.getGoals(),
      DataManager.getHabits(),
    ]);
    const goalNodes = savedGoals
      .filter((g) => !g.done)
      .map((goal, index) => {
        const li = UI.createItem(
          goal.name,
          goal,
          null,
          "goal",
          AppState,
          false,
          allHabits
        );
        li.style.animationDelay = `${index * 0.04}s`;
        return li;
      });

    if (wrapperEl) {
      wrapperEl.style.display = goalNodes.length === 0 ? "flex" : "none";
    }

    UI.renderToContainer(goalsListEl, goalNodes);
  },

  /**
   * Renderuje pełną listę wszystkich obiektów (zadań, nawyków, celów) przypisanych do wybranej daty w widoku kalendarza.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  renderCalendarTasks: async (AppState) => {
    const listEl = document.getElementById("calendarToDoList");
    const titleEl = document.getElementById("calendarTaskDateTitle");
    if (!listEl) return;

    const targetDate = AppState.selectedDate;
    const dateKey = Utils.formatDateKey(targetDate);

    if (titleEl)
      titleEl.textContent = `To Do for ${targetDate.toDateString()}:`;

    const [tasks, habits, goals] = await Promise.all([
      DataManager.getTasksByDate(dateKey),
      DataManager.getHabits(),
      DataManager.getGoals(),
    ]);

    const undoneNodes = [];
    const doneNodes = [];

    const sortNode = (li, isDone) =>
      isDone ? doneNodes.push(li) : undoneNodes.push(li);

    tasks.forEach((task) => {
      const li = UI.createItem(task.name, task, dateKey, "task", AppState);
      sortNode(li, task.done);
    });

    habits.forEach((habit) => {
      if (dateKey < Utils.formatDateKey(new Date(habit.createdAt))) return;
      if (Utils.isHabitDue(habit, targetDate)) {
        const isActuallyDone = habit.history && habit.history[dateKey];
        const li = UI.createItem(habit.name, habit, dateKey, "habit", AppState);
        sortNode(li, isActuallyDone);
      }
    });

    goals.forEach((goal) => {
      if (goal.deadline && goal.deadline.startsWith(dateKey)) {
        const li = UI.createItem(
          goal.name,
          goal,
          dateKey,
          "goal",
          AppState,
          false,
          habits
        );
        sortNode(li, goal.done);
      }
    });

    const finalNodes = [...undoneNodes, ...doneNodes];
    finalNodes.forEach((li, index) => {
      li.style.animationDelay = `${index * 0.04}s`;
    });

    const wrapperEl = document.getElementById("calendarEmptyListMessageWrapper");
    const nothingPlannedEl = document.getElementById("calendarMessageFuture");
    const allDoneEl = document.getElementById("calendarMessageToday");

    if (wrapperEl && nothingPlannedEl && allDoneEl) {
      const isEmpty = finalNodes.length === 0;
      const isAllDone = !isEmpty && undoneNodes.length === 0;

      wrapperEl.style.display = isEmpty || isAllDone ? "flex" : "none";
      nothingPlannedEl.style.display = isEmpty ? "flex" : "none";
      allDoneEl.style.display = isAllDone ? "flex" : "none";
    }

    UI.renderToContainer(listEl, finalNodes);
  },

  /**
   * Buduje i zwraca kontener z metadanymi elementu (lokalizacja, deadline, powiązany nawyk, opis).
   * @param {Object} data - Dane wejściowe obiektu.
   * @param {string} type - Typ elementu (task/habit/goal).
   * @param {Object[]} allHabits - Lista wszystkich nawyków do dopasowania powiązań.
   * @returns {HTMLDivElement} Kontener zawierający ikony i etykiety metadanych.
   */
  getItemMetadata: (data, type, allHabits, dateKey) => {
    const metaWrapper = document.createElement("div");
    metaWrapper.className = "taskMetaWrapper";

    if (data.location) {
      const locSpan = document.createElement("span");
      locSpan.className = "taskLocation";
      const locationIcon = UI.createLocationIcon();
      locSpan.appendChild(locationIcon);
      const textNode = document.createTextNode(` ${data.location}`);
      locSpan.appendChild(textNode);
      metaWrapper.appendChild(locSpan);
    }

    if (type === "habit" && data.measurable && dateKey) {
      const amount = (data.progress && data.progress[dateKey]) || 0;
      const progressSpan = document.createElement("span");
      progressSpan.className = "habitProgressMeta";
      progressSpan.textContent = `${amount} / ${data.targetQuantity} ${
        data.unit || ""
      }`;
      metaWrapper.appendChild(progressSpan);
    }

    if (type === "goal") {
      if (data.deadline) {
        const deadlineSpan = document.createElement("span");
        deadlineSpan.style.marginTop = "4px";
        deadlineSpan.className = "goalDeadline";

        const deadlineIcon = UI.createDeadlineIcon();
        if (deadlineIcon) {
          deadlineIcon.style.setProperty("vertical-align", "middle");
          deadlineIcon.style.marginRight = "6px";
        }

        const dateObj = new Date(data.deadline);
        const dateText = document.createTextNode(
          `Deadline: ${dateObj.toLocaleDateString()}`
        );

        deadlineSpan.appendChild(deadlineIcon);
        deadlineSpan.appendChild(dateText);
        metaWrapper.appendChild(deadlineSpan);
      }

      const linkedHabitIds = UI.getLinkedHabitIds(data);
      if (linkedHabitIds.length) {
        const linkedHabits = [];
        linkedHabitIds.forEach((id) => {
          const habit = allHabits.find((h) => Number(h.id) === Number(id));
          if (habit) {
            linkedHabits.push(habit);
          } else {
            console.warn("Nie znaleziono nawyku o ID:", id);
          }
        });

        if (linkedHabits.length) {
          const linkedSpan = document.createElement("span");
          linkedSpan.className = "linkedHabitBadge";

          const icon = UI.createLinkIcon
            ? UI.createLinkIcon()
            : document.createTextNode("🔗 ");
          icon.classList.add("small-icon");

          linkedSpan.appendChild(icon);
          linkedSpan.appendChild(
            document.createTextNode(
              ` Linked: ${linkedHabits.map((h) => h.name).join(", ")}`
            )
          );
          metaWrapper.appendChild(linkedSpan);

          // Same per-habit "effectiveness" used on the habit detail page
          // (days completed / days scheduled since the habit's own
          // createdAt) - a goal's habit progress is the mean of that
          // across its linked habits, not a single day's checkbox state.
          const avgEffectiveness = Math.round(
            linkedHabits.reduce(
              (sum, h) => sum + DataManager.calculateHabitProgress(h),
              0
            ) / linkedHabits.length
          );

          const progressSpan = document.createElement("span");
          progressSpan.className = "linkedHabitProgress";

          const progressIcon = UI.createCheckIcon
            ? UI.createCheckIcon()
            : document.createTextNode("✅ ");
          progressIcon.classList.add("small-icon");

          progressSpan.appendChild(progressIcon);
          progressSpan.appendChild(
            document.createTextNode(
              ` Linked habits effectiveness: ${avgEffectiveness}% avg`
            )
          );
          metaWrapper.appendChild(progressSpan);
        }
      }

      if (data.description) {
        const descDiv = document.createElement("div");
        descDiv.className = "goalDescription";
        descDiv.style.marginTop = "4px";

        const descIcon = UI.createDescriptionIcon();
        if (descIcon) {
          descIcon.style.marginRight = "6px";
          descIcon.style.opacity = "0.7";
          descIcon.style.verticalAlign = "middle";
          descDiv.appendChild(descIcon);
        }

        const descText = document.createElement("span");
        descText.textContent = data.description;

        descDiv.appendChild(descText);
        metaWrapper.appendChild(descDiv);
      }
    }

    return metaWrapper;
  },

  /**
   * Konstruuje pojedynczy element listy (li) reprezentujący zadanie, nawyk lub cel wraz z checkboxem i akcjami.
   * @returns {HTMLLIElement} Gotowy element listy struktury DOM.
   */
  createItem: (
    name,
    data,
    dateKey,
    type,
    AppState,
    isOverdue = false,
    allHabits = []
  ) => {
    const li = document.createElement("li");
    const isDone =
      type === "task" || type === "goal"
        ? !!data.done
        : !!(data.history && data.history[dateKey]);

    li.className = `taskItem is-${type} ${
      isOverdue ? "overdue" : ""
    } ${isDone ? "is-completed" : ""} is-tappable`;
    li.dataset.id = data.id;
    li.dataset.type = type;
    if (dateKey) li.dataset.dateKey = dateKey;

    const taskContent = document.createElement("div");
    taskContent.className = "taskContent";

    const uniqueId = `${type}-${data.id}-${dateKey || "fixed"}`;
    const taskLabel = document.createElement("label");
    taskLabel.className = "taskLabel";
    // Every row type opens the detail bubble on tap (see
    // handleListAction's ".taskContent" branch) rather than toggling the
    // checkbox directly, so the row must NOT be wired to the checkbox via
    // the native label "for" - that would fire the checkbox's click
    // handler for every row tap instead.

    const icon =
      type === "habit"
        ? UI.createRepeatIcon()
        : type === "goal"
        ? UI.createGoalIcon()
        : UI.createCheckIcon();
    taskLabel.appendChild(icon);

    const nameSpan = document.createElement("span");
    nameSpan.className = "taskNodeName";
    nameSpan.textContent = name;
    taskLabel.appendChild(nameSpan);

    if (type === "habit") {
      const userIcon = document.createElement("span");
      userIcon.className = "habit-user-emoji-list";
      userIcon.textContent = ` ${data.icon || "⭐️"}`;
      userIcon.style.fontSize = "16px";
      userIcon.style.marginLeft = "2px";
      userIcon.style.display = "inline-block";
      userIcon.style.verticalAlign = "middle";
      taskLabel.appendChild(userIcon);
    }

    taskContent.appendChild(taskLabel);
    taskContent.appendChild(UI.getItemMetadata(data, type, allHabits, dateKey));

    if (isOverdue && type === "task" && data.date) {
      const overdueBadge = document.createElement("div");
      overdueBadge.className = "task-overdue-date-badge";

      const calendarSvg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      calendarSvg.setAttribute("width", "12");
      calendarSvg.setAttribute("height", "12");
      calendarSvg.setAttribute("viewBox", "0 0 24 24");
      calendarSvg.setAttribute("fill", "none");
      calendarSvg.setAttribute("stroke", "currentColor");
      calendarSvg.setAttribute("stroke-width", "2");
      calendarSvg.setAttribute("stroke-linecap", "round");
      calendarSvg.setAttribute("stroke-linejoin", "round");
      calendarSvg.setAttribute(
        "class",
        "lucide lucide-calendar overdue-calendar-icon"
      );

      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      rect.setAttribute("width", "14");
      rect.setAttribute("height", "14");
      rect.setAttribute("x", "5");
      rect.setAttribute("y", "6");
      rect.setAttribute("rx", "1.5");
      rect.setAttribute("ry", "1.5");

      const line1 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line1.setAttribute("x1", "15");
      line1.setAttribute("x2", "15");
      line1.setAttribute("y1", "4");
      line1.setAttribute("y2", "8");

      const line2 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line2.setAttribute("x1", "9");
      line2.setAttribute("x2", "9");
      line2.setAttribute("y1", "4");
      line2.setAttribute("y2", "8");

      const line3 = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );
      line3.setAttribute("x1", "5");
      line3.setAttribute("x2", "19");
      line3.setAttribute("y1", "11");
      line3.setAttribute("y2", "11");

      calendarSvg.appendChild(rect);
      calendarSvg.appendChild(line1);
      calendarSvg.appendChild(line2);
      calendarSvg.appendChild(line3);

      const dateText = document.createElement("span");
      dateText.textContent = data.date;

      overdueBadge.appendChild(calendarSvg);
      overdueBadge.appendChild(dateText);
      taskContent.appendChild(overdueBadge);
    }

    const taskActions = document.createElement("div");
    taskActions.className = "taskActions";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `check-${uniqueId}`;
    checkbox.className = "taskCheckbox";
    checkbox.checked = isDone;
    checkbox.setAttribute("aria-label", `Mark ${name} as completed`);

    const checkboxWrap = document.createElement("label");
    checkboxWrap.className = "taskCheckboxWrap";
    checkboxWrap.setAttribute("for", checkbox.id);
    checkboxWrap.appendChild(checkbox);

    taskActions.appendChild(checkboxWrap);

    li.appendChild(taskContent);
    li.appendChild(taskActions);

    if (type === "goal") {
      const timeProgress = UI.createGoalTimeProgressBar(data);
      if (timeProgress) li.appendChild(timeProgress);
    }

    return li;
  },

  /**
   * Buduje pasek postępu pokazujący, ile czasu upłynęło od utworzenia celu
   * do jego terminu (deadline). Zwraca null dla celów bez zapisanej daty
   * utworzenia (starsze wpisy sprzed tej funkcji) zamiast zgadywać.
   */
  createGoalTimeProgressBar: (goal) => {
    if (!goal.createdAt || !goal.deadline) return null;

    const startTs = new Date(goal.createdAt).getTime();
    const deadlineTs = new Date(goal.deadline).getTime();
    if (Number.isNaN(startTs) || Number.isNaN(deadlineTs)) return null;

    const totalSpan = deadlineTs - startTs;
    let percent =
      totalSpan > 0 ? ((Date.now() - startTs) / totalSpan) * 100 : 100;
    percent = Math.max(0, Math.min(100, percent));

    const wrapper = document.createElement("div");
    wrapper.className = "goalTimeProgress";
    wrapper.setAttribute("role", "progressbar");
    wrapper.setAttribute("aria-label", "Time elapsed toward deadline");
    wrapper.setAttribute("aria-valuenow", String(Math.round(percent)));
    wrapper.setAttribute("aria-valuemin", "0");
    wrapper.setAttribute("aria-valuemax", "100");

    const fill = document.createElement("div");
    fill.className = "goalTimeProgressFill";
    if (percent >= 100) fill.classList.add("overdue");
    fill.style.width = `${percent}%`;

    wrapper.appendChild(fill);
    return wrapper;
  },

  /**
   * Buduje interaktywną siatkę dni wybranego miesiąca dla widoku kalendarza, uwzględniając zaległe cele i dni aktywne.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  renderCalendar: async (AppState) => {
    const grid = elements.calendarGrid;
    if (!grid) return;

    grid.innerHTML = "";
    const fragment = document.createDocumentFragment();

    elements.currentMonth.textContent = AppState.date.toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    );

    const year = AppState.date.getFullYear();
    const month = AppState.date.getMonth();

    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((d) => {
      const el = document.createElement("div");
      el.textContent = d;
      el.className = "day-label";
      fragment.appendChild(el);
    });

    const firstDay = new Date(year, month, 1);
    const startIndex = Utils.getMondayFirstDay(firstDay);

    for (let i = 0; i < startIndex; i++) {
      fragment.appendChild(document.createElement("div"));
    }

    const allGoals = await DataManager.getGoals();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = Utils.formatDateKey(new Date());

    for (let day = 1; day <= daysInMonth; day++) {
      const currentLoopDate = new Date(year, month, day);
      const dateKey = Utils.formatDateKey(currentLoopDate);

      const el = document.createElement("div");
      el.className = "day";
      el.dataset.date = dateKey;

      const dayNumber = document.createElement("span");
      dayNumber.textContent = day;
      el.appendChild(dayNumber);

      const goalsForThisDay = allGoals.filter((g) => g.deadline === dateKey);
      if (goalsForThisDay.length > 0) {
        const wrapper = document.createElement("div");
        wrapper.className = "day-goal-wrapper";
        if (goalsForThisDay.some((g) => !g.done && dateKey < todayStr)) {
          wrapper.classList.add("is-overdue");
        }
        wrapper.appendChild(UI.createGoalIcon());
        el.appendChild(wrapper);
      }

      if (Utils.formatDateKey(AppState.selectedDate) === dateKey) {
        el.classList.add("active");
      }

      fragment.appendChild(el);
    }

    const totalRenderedSlots = startIndex + daysInMonth;
    const totalSlotsNeeded = 42;

    for (let i = totalRenderedSlots; i < totalSlotsNeeded; i++) {
      fragment.appendChild(document.createElement("div"));
    }

    grid.appendChild(fragment);
  },

  /**
   * Renderuje pasek jednego tygodnia (widok mobilny kalendarza) zawierający
   * tydzień, w którym znajduje się AppState.date.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  renderWeekStrip: async (AppState) => {
    const grid = document.getElementById("weekStrip");
    const labelsRow = document.getElementById("weekDayLabels");
    if (!grid || !AppState) return;

    grid.innerHTML = "";
    const fragment = document.createDocumentFragment();

    if (labelsRow && !labelsRow.childElementCount) {
      const labelsFragment = document.createDocumentFragment();
      ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((d) => {
        const el = document.createElement("div");
        el.textContent = d;
        el.className = "day-label";
        labelsFragment.appendChild(el);
      });
      labelsRow.appendChild(labelsFragment);
    }

    const anchor = AppState.date;
    const offset = Utils.getMondayFirstDay(anchor);
    const monday = new Date(anchor);
    monday.setDate(monday.getDate() - offset);

    const allGoals = await DataManager.getGoals();
    const todayStr = Utils.formatDateKey(new Date());

    for (let i = 0; i < 7; i++) {
      const currentLoopDate = new Date(monday);
      currentLoopDate.setDate(monday.getDate() + i);
      const dateKey = Utils.formatDateKey(currentLoopDate);

      const el = document.createElement("div");
      el.className = "day";
      el.dataset.date = dateKey;

      const dayNumber = document.createElement("span");
      dayNumber.textContent = currentLoopDate.getDate();
      el.appendChild(dayNumber);

      const goalsForThisDay = allGoals.filter((g) => g.deadline === dateKey);
      if (goalsForThisDay.length > 0) {
        const wrapper = document.createElement("div");
        wrapper.className = "day-goal-wrapper";
        if (goalsForThisDay.some((g) => !g.done && dateKey < todayStr)) {
          wrapper.classList.add("is-overdue");
        }
        wrapper.appendChild(UI.createGoalIcon());
        el.appendChild(wrapper);
      }

      if (Utils.formatDateKey(AppState.selectedDate) === dateKey) {
        el.classList.add("active");
      }

      fragment.appendChild(el);
    }

    grid.appendChild(fragment);

    const labelEl = document.getElementById("weekMonthYearLabel");
    if (labelEl) {
      labelEl.textContent = anchor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
  },

  /**
   * Wypełnia rozwijaną listę wyboru miesiąca/roku (widok tygodniowy, mobile)
   * elementami z zakresu +/-12 miesięcy od dzisiejszej daty.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  populateMonthYearList: (AppState) => {
    const listContainer = document.getElementById("monthYearDropdownList");
    if (!listContainer || !AppState) return;

    listContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const today = new Date();
    const selectedKey = `${AppState.date.getFullYear()}-${AppState.date.getMonth()}`;

    for (let offset = -12; offset <= 12; offset++) {
      const optionDate = new Date(
        today.getFullYear(),
        today.getMonth() + offset,
        1
      );
      const item = document.createElement("div");
      item.className = "month-year-item";
      item.dataset.year = optionDate.getFullYear();
      item.dataset.month = optionDate.getMonth();
      item.textContent = optionDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      const key = `${optionDate.getFullYear()}-${optionDate.getMonth()}`;
      if (key === selectedKey) item.classList.add("selected");

      fragment.appendChild(item);
    }
    listContainer.appendChild(fragment);
  },

  /**
   * Renderuje i konfiguruje rozwijaną listę (dropdown) nawyków w zakładce statystyk oraz przypina do nich akcje kliknięcia.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  renderHabits: async (AppState) => {
    const listContainer = document.getElementById("habitDropdownList");
    const trigger = document.getElementById("habitDropdownTrigger");
    const dropdownContainer = trigger ? trigger.parentElement : null;
    
    if (!listContainer || !trigger || !dropdownContainer) return;

    const habits = await DataManager.getHabits();
    listContainer.innerHTML = "";

    const openDropdown = () => {
      dropdownContainer.classList.add("open");
      listContainer.style.maxHeight =
        Math.min(listContainer.scrollHeight, 300) + "px";
    };

    const closeDropdown = () => {
      dropdownContainer.classList.remove("open");
      listContainer.style.maxHeight = "0px";
    };

    trigger.onclick = (e) => {
      e.stopPropagation();
      if (dropdownContainer.classList.contains("open")) {
        closeDropdown();
      } else {
        openDropdown();
      }
    };

    document.addEventListener("click", closeDropdown);

    if (habits.length === 0) {
      listContainer.innerHTML = `
        <div class="emptyState">
          <div class="emptyState-icon">🔥</div>
          <p class="emptyState-title">No habits yet</p>
          <p class="emptyState-subtitle">Add one to start your streak.</p>
        </div>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();

    const allHabitsItem = document.createElement("div");
    allHabitsItem.className = "dropdown-item";
    allHabitsItem.dataset.id = "all";
    allHabitsItem.innerHTML = `
      <span class="habit-item-icon">🔥</span>
      <span class="habit-item-name">All Habits</span>
    `;
    if (AppState.selectedHabitForStats === "ALL") {
      allHabitsItem.classList.add("selected");
      document.getElementById("currentHabitIcon").textContent = "🔥";
      document.getElementById("currentHabitName").textContent = "All Habits";
    }
    allHabitsItem.onclick = (e) => {
      e.stopPropagation();

      listContainer
        .querySelectorAll(".dropdown-item.selected")
        .forEach((el) => el.classList.remove("selected"));
      allHabitsItem.classList.add("selected");

      document.getElementById("currentHabitIcon").textContent = "🔥";
      document.getElementById("currentHabitName").textContent = "All Habits";

      AppState.selectedHabitForStats = "ALL";
      UI.showAllHabitsStats(AppState);

      closeDropdown();
    };
    fragment.appendChild(allHabitsItem);

    habits.forEach((habit, index) => {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.dataset.id = habit.id;

      item.innerHTML = `
      <span class="habit-item-icon">${habit.icon || "🫧"}</span>
      <span class="habit-item-name">${habit.name}</span>
    `;

      const isSelected =
      AppState.selectedHabitForStats && AppState.selectedHabitForStats !== "ALL" && AppState.selectedHabitForStats.id === habit.id ||
        (!AppState.selectedHabitForStats && index === 0);

      if (isSelected) {
        item.classList.add("selected");

        document.getElementById("currentHabitIcon").textContent =
          habit.icon || "🫧";
        document.getElementById("currentHabitName").textContent = habit.name;

        if (!AppState.selectedHabitForStats) {
          AppState.selectedHabitForStats = habit;
          UI.showHabitDetails(habit, AppState);
        }
      }

      item.onclick = (e) => {
        e.stopPropagation();

        listContainer
          .querySelectorAll(".dropdown-item.selected")
          .forEach((el) => el.classList.remove("selected"));
        item.classList.add("selected");

        document.getElementById("currentHabitIcon").textContent =
          habit.icon || "🫧";
        document.getElementById("currentHabitName").textContent = habit.name;

        AppState.selectedHabitForStats = habit;
        UI.showHabitDetails(habit, AppState);

        closeDropdown();
      };

      fragment.appendChild(item);
    });
    listContainer.appendChild(fragment);
  },
  /**
   * Tworzy i konfiguruje powiadomienie typu Toast (bąbelek) na górze ekranu,
   * obsługując animację wejścia, automatyczne ukrywanie po 4 sekundach oraz zamknięcie po kliknięciu.
   */
  showToast: (message, type = "info") => {
    let container = document.getElementById("bubble-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "bubble-toast-container";
      container.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 90%;
        max-width: 380px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.style.cssText = `
      pointer-events: auto;
      background: rgba(255, 255, 255, 0.04);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 14px 20px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 500;
      text-align: center;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35), 
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
      transform: translateY(-40px);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Dynamiczny powrót bąbelka */
    `;

    const icon = type === "error" ? "❌ " : "ℹ️ ";
    toast.textContent = icon + message;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    }, 10);

    const dismissToast = () => {
      toast.style.transform = "translateY(-20px)";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 400);
    };

    const autoDismiss = setTimeout(dismissToast, 4000);

    toast.addEventListener("click", () => {
      clearTimeout(autoDismiss);
      dismissToast();
    });
  },

  /**
   * Przełącza widok na szczegóły wybranego nawyku, oblicza statystyki (progres, streak)
   * i aktualizuje powiązane elementy interfejsu oraz kołowy wykres postępu.
   */
  showHabitDetails: (habit, AppState) => {
    AppState.selectedHabitForStats = habit;

    // This renders the Habits page's own stats panel, which only exists in
    // habits.html's DOM. Habit editing is now also reachable from the
    // detail bubble on the Today/Calendar pages, so this can be called
    // from a page that never has that panel - bail out rather than throw.
    if (!document.getElementById("habitDetails")) return;

    const progress = DataManager.calculateHabitProgress(habit);
    const streakValue = DataManager.calculateStreak(habit);

    const frequencyText = Utils.getFrequencyText(habit);
    const startDate = habit.createdAt
      ? Utils.formatDisplayDate(new Date(habit.createdAt))
      : "Unknown";
    const unit = Utils.getStreakUnit(habit.frequency, streakValue);

    document.getElementById("habitDetails").style.display = "block";
    document.getElementById("detailHabitName").textContent = habit.name;

    document.querySelector(".crucialHabitStats").style.display = "";
    document.querySelector(".stat-items-secondary").style.display = "";
    document.getElementById("monthActivityView").style.display = "";
    document.getElementById("monthStatsRow").style.display = "";
    document.getElementById("yearActivityView").style.display = "none";

    document.getElementById(
      "detailStreak"
    ).textContent = `${streakValue} ${unit}`;
    document.getElementById(
      "completionPercent"
    ).textContent = `${progress}\u00A0%`;
    document.getElementById("frequencyData").textContent = frequencyText;
    document.getElementById("startData").textContent = startDate;

    const circleContainer = document.getElementById("detailProgressCircle");
    circleContainer.innerHTML = "";
    circleContainer.appendChild(UI.createProgressCircle(progress));

    UI.renderActivityGrid(habit, AppState);
  },

  /**
   * Generuje siatkę aktywności (mini-kalendarz) dla nawyku w obrębie wskazanego miesiąca,
   * oznaczając dni zrealizowane, zaplanowane oraz nieaktywne.
   */
  renderActivityGrid: (habit, AppState) => {
    const grid = document.getElementById("activityGrid");
    if (!grid || !AppState) return;

    grid.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const year = AppState.statsViewDate.getFullYear();
    const month = AppState.statsViewDate.getMonth();

    const { days, stats } = DataManager.getMonthlyStats(habit, month, year);

    const monthLabel = document.querySelector(".activity-section h4");
    if (monthLabel) {
      monthLabel.textContent = AppState.statsViewDate.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
      );
    }

    const firstDay = new Date(year, month, 1);
    const startIndex = Utils.getMondayFirstDay(firstDay);
    for (let i = 0; i < startIndex; i++) {
      fragment.appendChild(document.createElement("div"));
    }

    days.forEach((dayData) => {
      const el = document.createElement("div");
      el.className = "mini-day";
      el.title = `${dayData.day} ${monthLabel ? monthLabel.textContent : ""}`;

      if (dayData.isDone) el.classList.add("habit-done");
      if (!dayData.isScheduled) el.classList.add("inactive");

      fragment.appendChild(el);
    });

    grid.appendChild(fragment);

    UI.updateActivityStats(stats);
  },

  /**
   * Przełącza widok statystyk nawyków na zagregowany widok roczny obejmujący
   * wszystkie nawyki jednocześnie ("All Habits"), analogicznie do wykresu
   * aktywności GitHub.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  showAllHabitsStats: (AppState) => {
    document.getElementById("habitDetails").style.display = "block";
    document.getElementById("detailHabitName").textContent = "All Habits";

    document.querySelector(".crucialHabitStats").style.display = "none";
    document.querySelector(".stat-items-secondary").style.display = "none";
    document.getElementById("monthActivityView").style.display = "none";
    document.getElementById("monthStatsRow").style.display = "none";
    document.getElementById("yearActivityView").style.display = "block";

    UI.renderYearActivityGrid(AppState);
  },

  /**
   * Generuje roczną siatkę aktywności (styl GitHub) łączącą wszystkie nawyki —
   * odcień koloru marki odzwierciedla procent ukończonych nawyków danego dnia.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  renderYearActivityGrid: async (AppState) => {
    if (!AppState) return;

    const year = AppState.statsViewDate.getFullYear();

    const yearLabel = document.querySelector(".activity-section h4");
    if (yearLabel) yearLabel.textContent = String(year);

    const days = await DataManager.getYearlyStatsAllHabits(year);

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    // Two half-year columns (Jan-Jun, Jul-Dec) side by side, each an
    // independent GitHub-style week grid, so the wide card width gets
    // used instead of one narrow column scrolling for the whole year.
    const halves = [
      { startMonth: 0, endMonth: 5 },
      { startMonth: 6, endMonth: 11 },
    ];

    halves.forEach((half, halfIndex) => {
      const grid = document.querySelector(
        `.year-activity-grid[data-half="${halfIndex}"]`
      );
      const monthLabelsEl = document.querySelector(
        `.year-month-labels[data-half="${halfIndex}"]`
      );
      if (!grid || !monthLabelsEl) return;

      grid.innerHTML = "";
      monthLabelsEl.innerHTML = "";

      const halfStart = new Date(year, half.startMonth, 1);
      const halfEnd = new Date(year, half.endMonth + 1, 0);
      const halfDays = days.filter(
        (d) => d.date >= halfStart && d.date <= halfEnd
      );

      const leadingBlanks = Utils.getMondayFirstDay(halfStart);
      const cells = [...Array(leadingBlanks).fill(null), ...halfDays];

      const fragment = document.createDocumentFragment();
      cells.forEach((dayData) => {
        const dot = document.createElement("div");
        dot.className = "year-dot";

        if (!dayData || dayData.percentage === null) {
          dot.classList.add("no-data");
          if (dayData) dot.title = `${dayData.dateKey}: no habits scheduled`;
        } else if (dayData.percentage === 0) {
          dot.classList.add("tier-0");
          dot.title = `${dayData.dateKey}: 0% completed`;
        } else {
          const tier = Math.min(100, Math.ceil(dayData.percentage / 20) * 20);
          dot.classList.add(`tier-${tier}`);
          dot.title = `${dayData.dateKey}: ${dayData.percentage}% completed`;
        }

        fragment.appendChild(dot);
      });
      grid.appendChild(fragment);

      const labelFragment = document.createDocumentFragment();
      for (let m = half.startMonth; m <= half.endMonth; m++) {
        const firstOfMonth = new Date(year, m, 1);
        const dayIndex =
          Math.round((firstOfMonth - halfStart) / 86400000) + leadingBlanks;
        const row = Math.floor(dayIndex / 7) + 1;

        const label = document.createElement("span");
        label.textContent = monthNames[m];
        label.style.gridRowStart = row;
        labelFragment.appendChild(label);
      }
      monthLabelsEl.appendChild(labelFragment);
    });
  },

  /**
   * Aktualizuje tekstowe wskaźniki podsumowania miesięcznego (najlepszy streak, procent wykonania, licznik).
   */
  updateActivityStats: (stats) => {
    const percentage =
      stats.scheduled === 0
        ? 0
        : Math.round((stats.completed / stats.scheduled) * 100);

    const streakEl = document.getElementById("monthBestStreak");
    const percentEl = document.getElementById("monthPercentage");
    const countEl = document.getElementById("monthCount");

    if (streakEl) streakEl.textContent = `${stats.bestStreak} days`;
    if (percentEl) percentEl.textContent = `${percentage}%`;
    if (countEl)
      countEl.textContent = `${stats.completed} / ${stats.scheduled}`;
  },

  modalTimer: null,

  /**
   * Wyświetla błąd lub komunikat walidacji wewnątrz wrappera modala, uruchamiając animację potrząsania (shake).
   */
  showModalMessage: (text, duration = 3000) => {
    const wrapper = document.getElementById("modalMessageWrapper");
    const msgSpan = document.getElementById("modalMessage");
    if (!wrapper || !msgSpan) return;

    if (UI.modalTimer) clearTimeout(UI.modalTimer);

    msgSpan.textContent = text;
    wrapper.style.display = "flex";
    wrapper.classList.add("shake-animation");

    UI.modalTimer = setTimeout(() => {
      wrapper.style.display = "none";
      wrapper.classList.remove("shake-animation");
      UI.modalTimer = null;
    }, duration);
  },

  /**
   * Pokazuje modal potwierdzenia (Cancel/Confirm) i zwraca Promise<boolean>
   * rozstrzygane po wyborze użytkownika. Używane dla akcji, które nie
   * powinny wykonać się od razu po jednym przypadkowym kliknięciu (np.
   * oznaczenie celu jako ukończony).
   */
  confirmDialog: (message, confirmLabel = "Confirm", variant = "default") => {
    const overlay = document.getElementById("confirmDialogOverlay");
    const msgEl = document.getElementById("confirmDialogMessage");
    const cancelBtn = document.getElementById("confirmDialogCancelBtn");
    const confirmBtn = document.getElementById("confirmDialogConfirmBtn");

    if (!overlay || !msgEl || !cancelBtn || !confirmBtn) {
      console.warn("⚠️ confirmDialog: brak elementów w DOM, autoconfirm.");
      return Promise.resolve(true);
    }

    msgEl.textContent = message;
    confirmBtn.textContent = confirmLabel;
    confirmBtn.classList.toggle("danger", variant === "danger");

    return new Promise((resolve) => {
      const cleanup = (result) => {
        overlay.classList.remove("open");
        cancelBtn.removeEventListener("click", onCancel);
        confirmBtn.removeEventListener("click", onConfirm);
        overlay.removeEventListener("click", onOverlayClick);
        resolve(result);
      };
      const onCancel = () => cleanup(false);
      const onConfirm = () => cleanup(true);
      const onOverlayClick = (e) => {
        if (e.target === overlay) cleanup(false);
      };

      cancelBtn.addEventListener("click", onCancel);
      confirmBtn.addEventListener("click", onConfirm);
      overlay.addEventListener("click", onOverlayClick);
      overlay.classList.add("open");
    });
  },

  /**
   * Otwiera bąbelkowy modal szczegółów dla zadania lub nawyku. Dla
   * mierzalnego nawyku pokazuje suwak/stepper do logowania ilości
   * (onSave(amount) wywoływane po Save); dla zwykłego zadania/nawyku
   * ukrywa tę sekcję. onEdit()/onDelete() są zawsze dostępne przez ikony
   * ołówka/kosza w nagłówku (edycja otwiera pełny formularz modala).
   */
  openItemDetailModal: (data, type, dateKey, { onSave, onDelete, onEdit } = {}) => {
    const overlay = document.getElementById("habitProgressOverlay");
    const iconEl = document.getElementById("habitProgressIcon");
    const nameEl = document.getElementById("habitProgressName");
    const dateEl = document.getElementById("habitProgressDateLabel");
    const progressSection = document.getElementById(
      "habitProgressProgressSection"
    );
    const fillEl = document.getElementById("habitProgressBarFill");
    const input = document.getElementById("habitProgressAmountInput");
    const targetEl = document.getElementById("habitProgressTarget");
    const unitEl = document.getElementById("habitProgressUnit");
    const decBtn = document.getElementById("habitProgressDecBtn");
    const incBtn = document.getElementById("habitProgressIncBtn");
    const cancelBtn = document.getElementById("habitProgressCancelBtn");
    const saveBtn = document.getElementById("habitProgressSaveBtn");
    const editBtn = document.getElementById("habitProgressEditBtn");
    const deleteBtn = document.getElementById("habitProgressDeleteBtn");

    if (
      !overlay || !iconEl || !nameEl || !dateEl || !progressSection ||
      !fillEl || !input || !targetEl || !unitEl || !decBtn || !incBtn ||
      !cancelBtn || !saveBtn || !editBtn || !deleteBtn
    ) {
      console.warn("⚠️ openItemDetailModal: brak elementów w DOM.");
      return;
    }

    const isMeasurable = type === "habit" && !!data.measurable;
    const todayKey = Utils.formatDateKey(new Date());

    iconEl.textContent =
      data.icon ||
      (type === "task" ? "📝" : type === "goal" ? "🎯" : "💧");
    nameEl.textContent = data.name;
    dateEl.textContent = !dateKey
      ? ""
      : dateKey === todayKey
      ? "Today"
      : Utils.formatDisplayDate(new Date(dateKey));

    progressSection.hidden = !isMeasurable;
    saveBtn.hidden = !isMeasurable;

    const target = data.targetQuantity || 1;
    const startingAmount = (data.progress && data.progress[dateKey]) || 0;
    targetEl.textContent = target;
    unitEl.textContent = data.unit || "";
    input.value = startingAmount;

    const updateFill = () => {
      const val = Math.max(0, parseFloat(input.value) || 0);
      const pct = Math.min(100, (val / target) * 100);
      fillEl.style.width = `${pct}%`;
    };
    if (isMeasurable) updateFill();

    const step = (delta) => {
      const current = Math.max(0, parseFloat(input.value) || 0);
      input.value = Math.max(0, current + delta);
      updateFill();
    };

    const onDec = () => step(-1);
    const onInc = () => step(1);
    const onInputChange = () => updateFill();

    const cleanup = () => {
      overlay.classList.remove("open");
      decBtn.removeEventListener("click", onDec);
      incBtn.removeEventListener("click", onInc);
      input.removeEventListener("input", onInputChange);
      cancelBtn.removeEventListener("click", onCancel);
      saveBtn.removeEventListener("click", onConfirmSave);
      editBtn.removeEventListener("click", onEditClick);
      deleteBtn.removeEventListener("click", onDeleteClick);
      overlay.removeEventListener("click", onOverlayClick);
    };

    const onCancel = () => cleanup();
    const onOverlayClick = (e) => {
      if (e.target === overlay) cleanup();
    };
    const onConfirmSave = async () => {
      const finalAmount = Math.max(0, parseFloat(input.value) || 0);
      cleanup();
      if (onSave) await onSave(finalAmount);
    };
    const onEditClick = async () => {
      cleanup();
      if (onEdit) await onEdit();
    };
    const onDeleteClick = async () => {
      cleanup();
      if (onDelete) await onDelete();
    };

    decBtn.addEventListener("click", onDec);
    incBtn.addEventListener("click", onInc);
    input.addEventListener("input", onInputChange);
    cancelBtn.addEventListener("click", onCancel);
    saveBtn.addEventListener("click", onConfirmSave);
    editBtn.addEventListener("click", onEditClick);
    deleteBtn.addEventListener("click", onDeleteClick);
    overlay.addEventListener("click", onOverlayClick);

    overlay.classList.add("open");
  },

  /**
   * Zarządza stanem ładowania (loading) dla pól input oraz powiązanych przycisków, manipulując klasami sukcesu/błędu.
   */
  async setInputLoading(input, btn, isLoading, status = "") {
    input.disabled = isLoading;
    if (btn) btn.disabled = isLoading;

    input.classList.remove("success", "error");
    if (isLoading) {
      input.dataset.oldValue = input.value;
      input.value = status;
    } else if (status === "error") {
      input.classList.add("error");
    } else if (status === "success") {
      input.classList.add("success");
    }
  },

  /**
   * Przełącza widoczność elementów DOM pomiędzy tekstowym wyświetlaniem nazwy użytkownika a polem edycji (input).
   */
  toggleUserNameEdit(isEditing) {
    const isVisible = isEditing ? "inline-block" : "none";
    const isHidden = isEditing ? "none" : "block";
    const isBtnHidden = isEditing ? "none" : "inline-flex";

    elements.displayUserName.style.display = isHidden;
    elements.editUserName.style.display = isBtnHidden;
    elements.userNameInput.style.display = isVisible;

    if (isEditing) {
      elements.userNameInput.focus();
      elements.userNameInput.select();
    }
  },

  /**
   * Przeprowadza kalkulację i aktualizację paska postępu punktów doświadczenia (XP) użytkownika oraz poziomu,
   * wykrywając i wywołując animację awansu (Level Up).
   */
  updateXPBar: async (AppState) => {
    const stats = await DataManager.getUserStats();
    const threshold = LevelManager.getXpThreshold(stats.level);
    const progressPercent = (stats.currentXp / threshold) * 100;

    if (UI.lastObservedLevelGlobal === undefined) {
      const el = document.getElementById("user-level-value");
      UI.lastObservedLevelGlobal = el
        ? parseInt(el.textContent, 10) || stats.level
        : stats.level;
    }

    // console.log("=== 🫧 NEUROBUBBLE GLOBAL UI OBJECT CHECK ===");
    // console.log("Poziom aktualny z bazy:", stats.level);
    // console.log("Ostatni zapamiętany poziom w UI:", UI.lastObservedLevelGlobal);
    // console.log(
    //   "Czy poziom z bazy jest większy?:",
    //   stats.level > UI.lastObservedLevelGlobal
    // );

    if (stats.level > UI.lastObservedLevelGlobal) {
      console.log(
        "🚀 BINGO! Wykryto awans w pamięci globalnej UI. Odpalam animację."
      );

      UI.lastObservedLevelGlobal = stats.level;

      UI.triggerLevelUpAnimation(stats.level);
    } else {
      console.log("📉 Brak awansu lub dubel wywołania.");

      const progressBar = document.getElementById("xp-progress-bar");
      if (progressBar) {
        progressBar.style.setProperty("height", `${progressPercent}%`);
      }

      const currentDisplayedLevelEl =
        document.getElementById("user-level-value");
      if (currentDisplayedLevelEl) {
        currentDisplayedLevelEl.textContent = stats.level;
      }

      UI.lastObservedLevelGlobal = stats.level;
    }

    const elementsToUpdate = {
      currentLevel: stats.level,
      "next-level-value": stats.level + 1,
      "xp-next-level": `${Math.floor(stats.currentXp)} / ${threshold}`,
      "total-xp-value": stats.totalXp.toLocaleString(),
    };

    Object.entries(elementsToUpdate).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  },

  /**
   * ANIMACJA LEVEL UP
   * Obsługuje pełną sekwencję wizualną awansu poziomu: wypełnienie paska, błysk koła poziomu
   * oraz wysunięcie dedykowanego baneru toast z góry ekranu.
   */
  triggerLevelUpAnimation(newLevelValue) {
    const progressBar = document.getElementById("xp-progress-bar");
    const levelText = document.getElementById("user-level-value");
    const levelCircle = document.querySelector(".heroLvlWrapper");
    const toast = document.getElementById("levelUpToast");

    if (!toast) {
      console.error(
        "⚠️ LevelUp Error: Nie znaleziono elementu #levelUpToast w HTML!"
      );
      return;
    }

    if (progressBar) {
      progressBar.style.width = "100%";

      setTimeout(() => {
        if (levelCircle) levelCircle.classList.add("level-up-flash");
        if (levelText) levelText.textContent = newLevelValue;

        progressBar.style.transition = "none";
        progressBar.style.width = "0%";

        setTimeout(() => {
          progressBar.style.transition = "";
        }, 50);
      }, 350);
    } else {
      if (levelText) levelText.textContent = newLevelValue;
    }

    setTimeout(
      () => {
        const toastSubtitle = toast.querySelector(".level-up-subtitle");
        if (toastSubtitle) {
          toastSubtitle.textContent = `LEVEL UP: LEVEL ${newLevelValue} 🫧`;
        }

        // baner z góry ekranu
        toast.classList.add("show");

        setTimeout(() => {
          toast.classList.remove("show");

          setTimeout(() => {
            if (levelCircle) levelCircle.classList.remove("level-up-flash");
          }, 600);
        }, 4000);
      },
      progressBar ? 550 : 50
    );
  },

  /**
   * Odpowiada za mikrointerakcję przyznawania XP: aktualizuje szerokość paska postępu
   * oraz tworzy pływający, znikający bąbelek tekstu "+XP" w miejscu kliknięcia elementu.
   */
  /**
   * Tworzy pływający "bąbelek" z dowolnym tekstem tuż nad klikniętym elementem
   * (np. checkboxem zadania), używany zarówno dla zdobytego XP, jak i innych
   * krótkich komunikatów kontekstowych.
   */
  createFloatingBadge(event, text) {
    const clickedElement = event.currentTarget || event.target;
    if (!clickedElement) {
      console.warn("🫧 Floating badge: Brak klikniętego elementu w evencie!");
      return;
    }

    const rect = clickedElement.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      console.warn(
        "🫧 Floating badge: Element zniknął z DOM przed pobraniem pozycji! Uruchom animację ułamek sekundy wcześniej."
      );
      return;
    }

    const badge = document.createElement("div");
    badge.className = "task-xp-badge";
    badge.textContent = text;

    const targetLeft = rect.left + window.scrollX + rect.width / 2;
    const targetTop = rect.top + window.scrollY - 15;

    badge.style.left = `${targetLeft}px`;
    badge.style.top = `${targetTop}px`;

    document.body.appendChild(badge);

    setTimeout(() => {
      badge.remove();
    }, 3000);
  },

  triggerTaskXpAnimation(event, xpValue, newBarPercentage) {
    const progressBar = document.getElementById("xp-progress-bar");
    if (progressBar) {
      progressBar.style.width = `${newBarPercentage}%`;
    }

    UI.createFloatingBadge(event, `+${xpValue} XP 🫧`);
  },

  /**
   * Inicjalizuje dolny pasek nawigacji kart (tabs), oblicza pozycję ruchomego indykatora podświetlenia (tabIndicator)
   * przy załadowaniu i zmianie rozmiaru okna, oraz podpina przejścia widoków (View Transitions API).
   */
  initTabNav() {
    const navContainer = document.querySelector(".tabNav");
    const indicator = document.getElementById("tabIndicator");
    const navItems = document.querySelectorAll(".tabNavItem");

    if (!navContainer || !indicator || navItems.length === 0) return;

    const updatePosition = () => {
      const indicatorWidth = indicator.offsetWidth || 40;

      const activeIndex = Array.from(navItems).findIndex((item) =>
        item.classList.contains("active")
      );
      const safeIndex = activeIndex !== -1 ? activeIndex : 0;

      const containerRect = navContainer.getBoundingClientRect();
      const itemRect = navItems[safeIndex].getBoundingClientRect();

      if (itemRect.width === 0) return;

      const itemCenter =
        itemRect.left - containerRect.left + itemRect.width / 2;
      const targetX = itemCenter - indicatorWidth / 2;

      indicator.style.setProperty("--target-x", `${targetX}px`);
    };

    indicator.classList.remove("animate");

    updatePosition();

    const playEntrance = () => {
      updatePosition();
      // Skip the pop-in when the browser is already animating this
      // element in via its own cross-document view transition.
      if (!navIndicatorViewTransitionActive) {
        indicator.classList.add("animate");
      }
    };

    window.addEventListener("load", playEntrance);
    window.addEventListener("resize", updatePosition);

    if (document.readyState === "complete") {
      updatePosition();
      setTimeout(playEntrance, 50);
    }

    // No click handler needed to animate navigation: the `@view-transition`
    // rule in global.css opts every same-origin link (including these tab
    // links) into the browser's native cross-document view transition.
  },

  /**
   * Konfiguruje pełną funkcjonalność modala przewodnika (Guide), w tym nawigację przyciskami,
   * kropki statusu, skrót klawiszowy Escape, a także pełną obsługę gestów swipowania na ekranach dotykowych.
   */
  initGuideModal() {
    const overlay = document.getElementById("guideModal");
    const closeBtn = document.getElementById("closeGuideBtn");
    const nextBtn = document.getElementById("understandGuideBtn");
    const track = document.getElementById("guideSlidesTrack");

    if (!overlay || !track || !nextBtn) return;

    let currentSlide = 0;

    // Funkcja nawigacji po slajdach
    const goToSlide = (index) => {
      const dynamicDots = overlay.querySelectorAll(".guide-dot");
      const totalSlides = dynamicDots.length || 3;

      if (index < 0 || index >= totalSlides) return;
      currentSlide = index;

      track.style.transform = `translateX(-${currentSlide * 100}%)`;

      dynamicDots.forEach((dot) => dot.classList.remove("active"));
      if (dynamicDots[currentSlide])
        dynamicDots[currentSlide].classList.add("active");

      if (currentSlide === totalSlides - 1) {
        nextBtn.innerHTML = "Wszystko jasne, lecimy! 🚀";
      } else {
        nextBtn.innerHTML = "Dalej ➡️";
      }
    };

    nextBtn.replaceWith(nextBtn.cloneNode(true));
    const freshNextBtn = document.getElementById("understandGuideBtn");

    freshNextBtn.addEventListener("click", (e) => {
      e.preventDefault();

      const dynamicDots = overlay.querySelectorAll(".guide-dot");
      const totalSlides = dynamicDots.length || 3;

      if (currentSlide < totalSlides - 1) {
        goToSlide(currentSlide + 1);
      } else {
        overlay.classList.remove("open");
        setTimeout(() => goToSlide(0), 300);
      }
    });

    const dotsContainer = document.getElementById("guideDots");
    if (dotsContainer) {
      dotsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("guide-dot")) {
          const targetIndex = parseInt(e.target.getAttribute("data-index"));
          goToSlide(targetIndex);
        }
      });
    }

    const closeModalForce = () => {
      overlay.classList.remove("open");
      setTimeout(() => goToSlide(0), 300);
    };

    if (closeBtn) {
      closeBtn.replaceWith(closeBtn.cloneNode(true));
      document
        .getElementById("closeGuideBtn")
        .addEventListener("click", closeModalForce);
    }

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModalForce();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open")) {
        closeModalForce();
      }
    });

    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let isSwiping = false;
    // null until the gesture has moved enough to tell intent apart; then
    // "horizontal" (we drive the slide) or "vertical" (native scroll of
    // a slide's own overflow-y content keeps the gesture, we stay out).
    let swipeAxis = null;
    const SWIPE_THRESHOLD = 50;
    const AXIS_LOCK_THRESHOLD = 10;

    track.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchCurrentX = touchStartX;
        isSwiping = true;
        swipeAxis = null;
        track.style.transition = "none";
      },
      { passive: true }
    );

    track.addEventListener(
      "touchmove",
      (e) => {
        if (!isSwiping) return;
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const deltaX = currentX - touchStartX;
        const deltaY = currentY - touchStartY;

        if (!swipeAxis) {
          // A slide taller than the modal (e.g. slide 2/3 with more text)
          // makes ".guide-slide" a real overflow-y:auto scroll target. Real
          // fingers rarely move on a perfect diagonal, so wait for a clear
          // enough move before deciding whether this gesture is meant to
          // page the carousel or scroll that slide's own content.
          if (
            Math.abs(deltaX) < AXIS_LOCK_THRESHOLD &&
            Math.abs(deltaY) < AXIS_LOCK_THRESHOLD
          ) {
            return;
          }
          swipeAxis = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
          if (swipeAxis === "vertical") {
            // Hand the gesture to the browser's native vertical scroll -
            // touch-action: pan-y on the track already permits this; we
            // just stop tracking so touchend doesn't also snap the slide.
            isSwiping = false;
            return;
          }
        }

        // Locked horizontal: this event's default action would be a native
        // scroll attempt on the slide beneath the finger - block it so the
        // page drag below isn't fighting the browser for the same gesture.
        e.preventDefault();

        touchCurrentX = currentX;
        const trackWidth = track.offsetWidth || 1;
        const deltaPercent = (deltaX / trackWidth) * 100;
        const basePercent = -currentSlide * 100;

        track.style.transform = `translateX(${basePercent + deltaPercent}%)`;
      },
      { passive: false }
    );

    const handleTouchEnd = (e) => {
      if (!isSwiping) return;
      isSwiping = false;

      track.style.transition = "";

      // A quick flick can end before touchmove ever fires, leaving
      // touchCurrentX stuck at the start position - read the real final
      // coordinate off the event itself when it's available.
      const endX = e?.changedTouches?.[0]?.clientX ?? touchCurrentX;
      const deltaX = endX - touchStartX;
      const dynamicDots = overlay.querySelectorAll(".guide-dot");
      const totalSlides = dynamicDots.length || 3;

      if (deltaX <= -SWIPE_THRESHOLD && currentSlide < totalSlides - 1) {
        // Swipe w lewo -> następny slajd
        goToSlide(currentSlide + 1);
      } else if (deltaX >= SWIPE_THRESHOLD && currentSlide > 0) {
        // Swipe w prawo -> poprzedni slajd
        goToSlide(currentSlide - 1);
      } else {
        // Niewystarczający ruch -> wracamy do aktualnego slajdu
        goToSlide(currentSlide);
      }
    };

    track.addEventListener("touchend", handleTouchEnd, { passive: true });
    track.addEventListener("touchcancel", handleTouchEnd, { passive: true });
  },

  /**
   * Otwiera modal przewodnika po aplikacji poprzez dodanie klasy "open" do overlay'a.
   */
  showGuide() {
    const overlay = document.getElementById("guideModal");
    if (overlay) {
      overlay.classList.add("open");
    } else {
      console.error(
        "⚠️ Guide Error: Nie znaleziono elementu #guideModal w DOM!"
      );
    }
  },

  /**
   * Inicjalizuje przycisk przełączania panelu zezwoleń (Permissions) w sekcji ustawień, obsługując rozwijanie menu.
   */
  initPermissionsToggle() {
    const toggleBtn = document.getElementById("settingsToggleBtn");
    const panel = document.getElementById("permissionsPanel");

    if (!toggleBtn || !panel) return;

    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();

      toggleBtn.classList.toggle("open");
      panel.classList.toggle("open");
    });
  },
};

window.UI = UI;
