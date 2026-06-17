import { Utils, DataManager, LevelManager } from "./data.js";
import { QuoteService, PermissionsManager } from "./services.js";
import { elements } from "./elements.js";
import { Icons } from "./icons.js";

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

  /**
   * Pobiera aktywne nawyki i uzupełnia nimi listę rozwijaną (select) w modalu tworzenia celu.
   */
  fillModalHabitSelect: async () => {
    const select = elements.goalHabitSelect;
    if (!select) return;

    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select linked habit (optional)";
    select.appendChild(defaultOption);

    try {
      const habits = await DataManager.getHabits();
      habits.forEach((habit) => {
        const option = document.createElement("option");
        option.value = habit.id;
        option.textContent = habit.name;
        select.appendChild(option);
      });
    } catch (error) {
      console.error("Błąd podczas ładowania nawyków do selecta:", error);
    }
  },

  /**
   * Rozpoznaje i zwraca domyślny typ formularza (task/habit/goal) na podstawie bieżącego adresu URL lub hasha.
   * @returns {"task" | "habit" | "goal"} Rozpoznany typ widoku.
   */
  detectModalDefaultType: () => {
    const path = window.location.hash || window.location.pathname;
    const cleanPath = path.toLowerCase();

    if (cleanPath.includes("goal")) return "goal";
    if (cleanPath.endsWith("habits") || cleanPath.includes("#habit"))
      return "habit";
    return "task";
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

    if (elements.goalHabitSelect) elements.goalHabitSelect.selectedIndex = 0;
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

      if (isEdit) {
        if (dSection) dSection.style.display = "flex";
        if (dateTitle) dateTitle.textContent = "Start Date";
        if (nameSection) nameSection.style.display = "none";
        if (lSection) lSection.style.display = "none";
        if (habitIcon) habitIcon.style.display = "none";
      } else {
        if (nameSection) nameSection.style.display = "flex";
        if (lSection) lSection.style.display = "flex";
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

    const btn = document.getElementById("confirmAddBtn");
    if (btn) {
      btn.setAttribute("data-edit-id", habit.id);
      btn.setAttribute("data-edit-type", "habit");
    }

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

    if (elements.goalHabitSelect) {
      elements.goalHabitSelect.value = goal.linkedHabitId
        ? String(goal.linkedHabitId)
        : "";
    }

    const btn = document.getElementById("confirmAddBtn");
    if (btn) {
      btn.setAttribute("data-edit-id", goal.id);
      btn.setAttribute("data-edit-type", "goal");
    }

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

    const savedGoals = await DataManager.getGoals();
    const goalNodes = savedGoals
      .filter((g) => !g.done)
      .map((goal, index) => {
        const li = UI.createItem(goal.name, goal, null, "goal", AppState);
        li.style.animationDelay = `${index * 0.04}s`;
        return li;
      });

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
      titleEl.textContent = `Tasks for ${targetDate.toDateString()}:`;

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
        const li = UI.createItem(goal.name, goal, dateKey, "goal", AppState);
        sortNode(li, goal.done);
      }
    });

    const finalNodes = [...undoneNodes, ...doneNodes];
    finalNodes.forEach((li, index) => {
      li.style.animationDelay = `${index * 0.04}s`;
    });

    UI.renderToContainer(listEl, finalNodes);
  },

  /**
   * Buduje i zwraca kontener z metadanymi elementu (lokalizacja, deadline, powiązany nawyk, opis).
   * @param {Object} data - Dane wejściowe obiektu.
   * @param {string} type - Typ elementu (task/habit/goal).
   * @param {Object[]} allHabits - Lista wszystkich nawyków do dopasowania powiązań.
   * @returns {HTMLDivElement} Kontener zawierający ikony i etykiety metadanych.
   */
  getItemMetadata: (data, type, allHabits) => {
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

      if (data.linkedHabitId) {
        const habit = allHabits.find(
          (h) => Number(h.id) === Number(data.linkedHabitId)
        );
        if (habit) {
          const linkedSpan = document.createElement("span");
          linkedSpan.className = "linkedHabitBadge";

          const icon = UI.createRepeatIcon
            ? UI.createRepeatIcon()
            : document.createTextNode("🔄 ");
          icon.classList.add("small-icon");

          linkedSpan.appendChild(icon);
          linkedSpan.appendChild(
            document.createTextNode(` Linked: ${habit.name}`)
          );
          metaWrapper.appendChild(linkedSpan);
        } else {
          console.warn("Nie znaleziono nawyku o ID:", data.linkedHabitId);
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
   * Obsługuje dwustopniowy proces usuwania elementu (zabezpieczenie przytrzymania przycisku, animacja paska i usunięcie z DOM).
   * @param {HTMLButtonElement} moreBtn - Przycisk opcji/usuwania.
   * @param {Object} data - Struktura danych usuwanego zasobu.
   * @param {Object} AppState - Globalny stan aplikacji.
   * @param {Function} onConfirmDelete - Asynchroniczny callback wywoływany po pomyślnym zatwierdzeniu usunięcia.
   */
  renderDeleteWithFriction: function (
    moreBtn,
    data,
    AppState,
    onConfirmDelete
  ) {
    const isAlreadyTrash = moreBtn.classList.contains("deleteBtn");
    const li = moreBtn.closest("li");
    if (!li) return;

    if (!isAlreadyTrash) {
      moreBtn.classList.add("deleteBtn");
      moreBtn.innerHTML = "";

      moreBtn.insertAdjacentHTML(
        "beforeend",
        `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
    `
      );

      moreBtn.insertAdjacentHTML(
        "beforeend",
        `<div class="delete-progress-line-track"><div class="delete-progress-bar-line"></div></div>`
      );

      let holdTimeout;
      let isHoldingNow = false;

      const resetToEllipsis = () => {
        moreBtn.classList.remove("deleteBtn");
        moreBtn.innerHTML = "";
        moreBtn.appendChild(UI.createEllipsisIcon());
      };

      let revertTimeout = setTimeout(() => {
        if (!isHoldingNow && moreBtn.classList.contains("deleteBtn")) {
          cancelHold();
          resetToEllipsis();
        }
      }, 4000);

      const startHold = (e) => {
        if (e.type === "mousedown" && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        isHoldingNow = true;
        if (revertTimeout) {
          clearTimeout(revertTimeout);
          revertTimeout = null;
        }

        moreBtn.classList.add("is-holding");

        holdTimeout = setTimeout(async () => {
          moreBtn.classList.remove("is-holding");
          isHoldingNow = false;

          if (typeof navigator.vibrate === "function") navigator.vibrate(60);

          if (
            AppState &&
            AppState.selectedHabitForStats?.id === data.id &&
            data.type === "habit"
          ) {
            AppState.selectedHabitForStats = null;
          }

          li.style.transition = "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)";
          li.style.transform = "scale(0.8) translateY(-10px)";
          li.style.opacity = "0";

          if (typeof onConfirmDelete === "function") {
            await onConfirmDelete();
          }

          setTimeout(() => {
            li.remove();
          }, 200);
        }, 2000);
      };

      const cancelHold = (e) => {
        isHoldingNow = false;
        if (holdTimeout) {
          clearTimeout(holdTimeout);
          moreBtn.classList.remove("is-holding");
        }

        if (moreBtn.classList.contains("deleteBtn") && !revertTimeout) {
          revertTimeout = setTimeout(() => {
            if (!isHoldingNow && moreBtn.classList.contains("deleteBtn")) {
              resetToEllipsis();
            }
          }, 3000);
        }
      };

      moreBtn.addEventListener("mousedown", startHold);
      moreBtn.addEventListener("mouseup", cancelHold);
      moreBtn.addEventListener("mouseleave", cancelHold);
      moreBtn.addEventListener("touchstart", startHold, { passive: false });
      moreBtn.addEventListener("touchend", cancelHold);
      moreBtn.addEventListener("touchcancel", cancelHold);
    }
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

    li.className = `taskItem is-${type} ${isOverdue ? "overdue" : ""} ${
      isDone ? "is-completed" : ""
    }`;
    li.dataset.id = data.id;
    li.dataset.type = type;
    if (dateKey) li.dataset.dateKey = dateKey;

    const taskContent = document.createElement("div");
    taskContent.className = "taskContent";

    const uniqueId = `${type}-${data.id}-${dateKey || "fixed"}`;
    const taskLabel = document.createElement("label");
    taskLabel.className = "taskLabel";
    taskLabel.setAttribute("for", `check-${uniqueId}`);

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
    taskContent.appendChild(UI.getItemMetadata(data, type, allHabits));

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

    const moreBtn = document.createElement("button");
    moreBtn.className = "moreBtn";
    moreBtn.setAttribute("aria-label", `More options for ${name}`);
    moreBtn.appendChild(UI.createEllipsisIcon());

    taskActions.appendChild(checkbox);
    taskActions.appendChild(moreBtn);

    li.appendChild(taskContent);
    li.appendChild(taskActions);

    return li;
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
   * Renderuje i konfiguruje rozwijaną listę (dropdown) nawyków w zakładce statystyk oraz przypina do nich akcje kliknięcia.
   * @param {Object} AppState - Globalny stan aplikacji.
   */
  renderHabits: async (AppState) => {
    const listContainer = document.getElementById("habitDropdownList");
    const trigger = document.getElementById("habitDropdownTrigger");
    const dropdownContainer = trigger?.parentElement;

    if (!listContainer || !trigger || !dropdownContainer) return;

    const habits = await DataManager.getHabits();
    listContainer.innerHTML = "";

    trigger.onclick = (e) => {
      e.stopPropagation();
      dropdownContainer.classList.toggle("open");
    };

    document.addEventListener("click", () => {
      dropdownContainer.classList.remove("open");
    });

    if (habits.length === 0) {
      listContainer.innerHTML = `<p class="noHabitsMsg" style="padding: 16px;">No habits added yet!</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    habits.forEach((habit, index) => {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.dataset.id = habit.id;

      item.innerHTML = `
      <span class="habit-item-icon">${habit.icon || "🫧"}</span>
      <span class="habit-item-name">${habit.name}</span>
    `;

      const isSelected =
        AppState.selectedHabitForStats?.id === habit.id ||
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

        dropdownContainer.classList.remove("open");
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

    const icon = type === "error" ? "⚠️ " : "❌ ";
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

    const progress = DataManager.calculateHabitProgress(habit);
    const streakValue = DataManager.calculateStreak(habit);

    const frequencyText = Utils.getFrequencyText(habit);
    const startDate = habit.createdAt
      ? new Date(habit.createdAt).toLocaleDateString("en-US")
      : "Unknown";
    const unit = Utils.getStreakUnit(habit.frequency, streakValue);

    document.getElementById("habitDetails").style.display = "block";
    document.getElementById("detailHabitName").textContent = habit.name;
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
      el.textContent = dayData.day;

      if (dayData.isDone) el.classList.add("habit-done");
      if (!dayData.isScheduled) el.classList.add("inactive");

      fragment.appendChild(el);
    });

    grid.appendChild(fragment);

    UI.updateActivityStats(stats);
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

    console.log("=== 🫧 NEUROBUBBLE GLOBAL UI OBJECT CHECK ===");
    console.log("Poziom aktualny z bazy:", stats.level);
    console.log("Ostatni zapamiętany poziom w UI:", UI.lastObservedLevelGlobal);
    console.log(
      "Czy poziom z bazy jest większy?:",
      stats.level > UI.lastObservedLevelGlobal
    );

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
  triggerTaskXpAnimation(event, xpValue, newBarPercentage) {
    const progressBar = document.getElementById("xp-progress-bar");
    if (progressBar) {
      progressBar.style.width = `${newBarPercentage}%`;
    }

    const clickedElement = event.currentTarget || event.target;
    if (!clickedElement) {
      console.warn("🫧 XP Animation: Brak klikniętego elementu w evencie!");
      return;
    }

    const rect = clickedElement.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      console.warn(
        "🫧 XP Animation: Element zniknął z DOM przed pobraniem pozycji! Uruchom animację ułamek sekundy wcześniej."
      );
      return;
    }

    const xpBadge = document.createElement("div");
    xpBadge.className = "task-xp-badge";
    xpBadge.textContent = `+${xpValue} XP 🫧`;

    const targetLeft = rect.left + window.scrollX + rect.width / 2;
    const targetTop = rect.top + window.scrollY - 15;

    xpBadge.style.left = `${targetLeft}px`;
    xpBadge.style.top = `${targetTop}px`;

    console.log(
      `🫧 XP Animation: Tworzę bąbelek na pozycji X: ${targetLeft}, Y: ${targetTop}`
    );

    document.body.appendChild(xpBadge);

    setTimeout(() => {
      xpBadge.remove();
    }, 800);
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

    window.addEventListener("load", () => {
      updatePosition();
      indicator.classList.add("animate");
    });

    window.addEventListener("resize", updatePosition);

    if (document.readyState === "complete") {
      updatePosition();
      setTimeout(() => {
        updatePosition();
        indicator.classList.add("animate");
      }, 50);
    }

    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const href = item.getAttribute("href");

        indicator.style.opacity = "0";

        if (document.startViewTransition) {
          document.startViewTransition(() => {
            window.location.href = href;
          });
        } else {
          window.location.href = href;
        }
      });
    });
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
    let touchCurrentX = 0;
    let isSwiping = false;
    const SWIPE_THRESHOLD = 50;

    track.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchCurrentX = touchStartX;
        isSwiping = true;
        track.style.transition = "none";
      },
      { passive: true }
    );

    track.addEventListener(
      "touchmove",
      (e) => {
        if (!isSwiping) return;
        touchCurrentX = e.touches[0].clientX;
        const deltaX = touchCurrentX - touchStartX;

        const trackWidth = track.offsetWidth || 1;
        const deltaPercent = (deltaX / trackWidth) * 100;
        const basePercent = -currentSlide * 100;

        track.style.transform = `translateX(${basePercent + deltaPercent}%)`;
      },
      { passive: true }
    );

    const handleTouchEnd = () => {
      if (!isSwiping) return;
      isSwiping = false;

      track.style.transition = "";

      const deltaX = touchCurrentX - touchStartX;
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
