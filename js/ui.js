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

// 🔥 Lista pięknych ikon współdzielona z onboardingiem
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
  // 🔥 Przechowuje aktualnie wybrane emoji w modalu głównym
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

  updateUserHeader: async (AppState) => {
    const stats = await DataManager.getUserStats();
    const nameLabel = document.getElementById("displayUserName");
    if (nameLabel) nameLabel.textContent = stats.userName;
    await UI.updateXPBar(AppState);
  },
  renderCurrentPage: async (AppState) => {
    const mainContent =
      document.querySelector(".page-container") ||
      document.querySelector("main");

    if (mainContent) {
      mainContent.classList.add("is-switching");
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    // Renderowanie podstron...
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
      await UI.renderLongTermGoals();
    }

    if (mainContent) {
      setTimeout(() => {
        mainContent.classList.remove("is-switching");
      }, 30);
    }
  },

  applyRandomGradient: () => {
    const randomIndex = Math.floor(Math.random() * GRADIENTS.length);
    const selectedGradient = GRADIENTS[randomIndex];

    document.documentElement.style.setProperty(
      "--hero-gradient",
      selectedGradient
    );
  },

  // MODAL

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

  detectModalDefaultType: () => {
    const path = window.location.hash || window.location.pathname;
    const cleanPath = path.toLowerCase();

    if (cleanPath.includes("goal")) return "goal";
    if (cleanPath.endsWith("habits") || cleanPath.includes("#habit"))
      return "habit";
    return "task";
  },

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

    // Globalne zapewnienie ukrycia scrollbara bez dotykania innych stylów kontenera
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

      // Używamy przekazanych wymiarów (np. 44px dla UI, 48px dla Onboardingu)
      const size = itemFlex || "44px";
      const fSize = fontSize || "20px";

      iconWrapper.style.cssText = `
        flex: 0 0 ${size};
        width: ${size};
        height: ${size};
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.04);
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: pointer;
        font-size: ${fSize};
        transition: all 0.25s ease;
        user-select: none;
        box-sizing: border-box;
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

  setupHabitIconPicker: (activeEmoji) => {
    const wrapper = document.getElementById("habitIconWrapper");
    if (!wrapper) return;

    wrapper.innerHTML = "";

    // 1. Nagłówek sekcji
    const subTitle = document.createElement("div");
    subTitle.className = "modalSubTitle";
    subTitle.textContent = "Choose Habit Badge";
    subTitle.style.width = "100%";
    subTitle.style.marginBottom = "8px";
    wrapper.appendChild(subTitle);

    // 2. GŁÓWNY KONTENER JEDNOLINIJKOWY
    const rowContainer = document.createElement("div");
    rowContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
    `;

    // 3. Kontener na kafelki z emoji (Przywracamy poziomą taśmę/slider)
    const pickerContainer = document.createElement("div");
    pickerContainer.id = "mainHabitIconPicker";
    pickerContainer.style.cssText = `
      display: flex;
      gap: 12px;
      flex: 1;
      padding: 5px 0;
      overflow-x: auto;
      justify-content: start;
      scrollbar-width: none;
      min-width: 0;
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

    // 4. KWADRATOWY INPUT PO PRAWEJ
    const customInput = document.createElement("input");
    customInput.type = "text";
    customInput.id = "customHabitIconInput";
    customInput.placeholder = "+";
    customInput.maxLength = 2;
    customInput.style.cssText = `
      flex: 0 0 44px;
      width: 44px;
      height: 44px;
      padding: 0;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #ffffff;
      font-size: 18px;
      text-align: center;
      outline: none;
      transition: all 0.3s ease;
      cursor: pointer;
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

      // Gaszenie podświetleń z karuzeli poprzez nową wspólną klasę
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
        habitIcon.style.flexDirection = "column"; // Zapewnia ładne układanie tytułu i paska
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

  refreshTypePickerButtons: (currentType) => {
    const typePickers = document.querySelectorAll(".typePicker");
    typePickers.forEach((btn) => {
      const btnType = btn.getAttribute("data-type");
      btn.classList.toggle("active", btnType === currentType);
    });
  },

  resetModal: (AppState) => {
    if (!AppState) {
      console.warn("⚠️ resetModal: Brak obiektu AppState!");
      return;
    }

    // 1. Czyszczenie standardowych inputów tekstowych/selectów
    UI.clearModalInputs();

    // 2. 🔥 NOWOŚĆ: Ręcznie resetujemy i czyścimy wszystkie checkboxy harmonogramów (dni tygodnia/miesiąca)
    // Dzięki temu żaden stary harmonogram nie "zostanie" w pamięci modalu
    const scheduleCheckboxes = document.querySelectorAll(
      '#daysPicker input[type="checkbox"], #monthDaysGrid input[type="checkbox"]'
    );
    scheduleCheckboxes.forEach((cb) => (cb.checked = false));

    // 3. Przełączanie widoczności pól na bazie aktualnego typu
    UI.toggleModalFields(AppState.currentCreateType, false);
    UI.refreshTypePickerButtons(AppState.currentCreateType);

    // 4. Reset ikony na domyślną kropelkę
    UI.setupHabitIconPicker("💧");
  },

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
      // EDIT MODE
      if (title) {
        title.textContent = formattedType ? `Edit ${formattedType}` : "Edit";
        title.classList.remove("modal-title-hide-mobile");
      }
      if (btn) btn.textContent = "Save Changes";
    }
  },

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

  renderQuote: async () => {
    const quoteText = document.getElementById("quote-text");
    const quoteAuthor = document.getElementById("quote-author");

    if (!quoteText || !quoteAuthor) return;

    const quote = await QuoteService.getDailyAdvice();

    quoteText.textContent = quote.text;
    quoteAuthor.textContent = quote.author;
  },

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

  renderToContainer: (container, nodes) => {
    if (!container) return;
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();
    nodes.forEach((node) => fragment.appendChild(node));
    container.appendChild(fragment);
  },

  renderDailyTasks: async (AppState) => {
    const listEl = document.getElementById("toDoList");
    const wrapperEl = document.getElementById("emptyListMessageWrapper");
    if (!listEl) return;

    const targetDate = AppState.selectedDate;
    const dateKey = Utils.formatDateKey(targetDate);

    const undoneTasks = await DataManager.getUndoneTasks(dateKey);
    const savedHabits = await DataManager.getHabits();

    // Sortowanie zadań (Najstarsze/Przeterminowane na górę)
    undoneTasks.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.name.localeCompare(b.name);
    });

    const undoneNodes = [];
    // 🔥 Licznik, który zapewni ciągłość fali między zadaniami a nawykami
    let globalIndex = 0;

    // TASKS
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

      // 🔥 NAKŁADAMY DELAY: Pierwsze zadanie 0s, drugie 0.04s, trzecie 0.08s...
      li.style.animationDelay = `${globalIndex * 0.04}s`;
      globalIndex++;

      undoneNodes.push(li);
    });

    // HABITS
    const sortedHabits = [...savedHabits].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    sortedHabits.forEach((habit) => {
      if (dateKey < Utils.formatDateKey(new Date(habit.createdAt))) return;

      const isDue = Utils.isHabitDue(habit, targetDate);
      const isDone = habit.history && habit.history[dateKey];

      if (isDue && !isDone) {
        const li = UI.createItem(habit.name, habit, dateKey, "habit", AppState);

        // 🔥 KONTYNUACJA FALI: Nawyki lecą z opóźnieniem zaraz po zadaniach
        li.style.animationDelay = `${globalIndex * 0.04}s`;
        globalIndex++;

        undoneNodes.push(li);
      }
    });

    // if empty
    if (wrapperEl) {
      wrapperEl.style.display = undoneNodes.length === 0 ? "flex" : "none";
    }

    UI.renderToContainer(listEl, undoneNodes);
  },

  renderLongTermGoals: async (AppState) => {
    const goalsListEl = document.getElementById("goalsList");
    if (!goalsListEl) return;

    const savedGoals = await DataManager.getGoals();
    const goalNodes = savedGoals
      .filter((g) => !g.done)
      .map((goal, index) => {
        // 🔥 Pobieramy index z metody map
        const li = UI.createItem(goal.name, goal, null, "goal", AppState);

        // 🔥 NAKŁADAMY DELAY dla celów
        li.style.animationDelay = `${index * 0.04}s`;

        return li;
      });

    UI.renderToContainer(goalsListEl, goalNodes);
  },

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

    // TASKS
    tasks.forEach((task) => {
      const li = UI.createItem(task.name, task, dateKey, "task", AppState);
      sortNode(li, task.done);
    });

    // HABITS
    habits.forEach((habit) => {
      if (dateKey < Utils.formatDateKey(new Date(habit.createdAt))) return;
      if (Utils.isHabitDue(habit, targetDate)) {
        const isActuallyDone = habit.history && habit.history[dateKey];
        const li = UI.createItem(habit.name, habit, dateKey, "habit", AppState);
        sortNode(li, isActuallyDone);
      }
    });

    // GOALS
    goals.forEach((goal) => {
      if (goal.deadline && goal.deadline.startsWith(dateKey)) {
        const li = UI.createItem(goal.name, goal, dateKey, "goal", AppState);
        sortNode(li, goal.done);
      }
    });

    // 🔥 ŁĄCZYMY TABLICE I NAKŁADAMY DELAY NA CAŁOŚĆ:
    // Chcemy, żeby zrobione zadania na samym dole też ładnie wleciały w kaskadzie
    const finalNodes = [...undoneNodes, ...doneNodes];
    finalNodes.forEach((li, index) => {
      li.style.animationDelay = `${index * 0.04}s`;
    });

    UI.renderToContainer(listEl, finalNodes);
  },

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
      // PIERWSZE KLIKNIĘCIE: Zamiana w czerwony bąbel
      moreBtn.classList.add("deleteBtn");
      moreBtn.innerHTML = "";

      // Wstrzykujemy ikonę śmietnika
      moreBtn.insertAdjacentHTML(
        "beforeend",
        `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      `
      );

      // Wstrzykujemy kółko postępu
      moreBtn.insertAdjacentHTML(
        "beforeend",
        `
        <svg class="delete-progress-svg" width="32" height="32" viewBox="0 0 32 32">
          <circle class="delete-progress-bg" cx="16" cy="16" r="14" fill="none" stroke-width="2"/>
          <circle class="delete-progress-bar" cx="16" cy="16" r="14" fill="none" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      `
      );

      // MECHANIKA LICZNIKA
      let holdTimeout;

      const startHold = (e) => {
        if (e.type === "mousedown" && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        moreBtn.classList.add("is-holding");

        holdTimeout = setTimeout(async () => {
          moreBtn.classList.remove("is-holding");

          if (typeof navigator.vibrate === "function") navigator.vibrate(60);

          // Jeśli to był aktywny habit w statystykach, zerujemy go w pamięci RAM aplikacji
          if (
            AppState &&
            AppState.selectedHabitForStats?.id === data.id &&
            data.type === "habit"
          ) {
            AppState.selectedHabitForStats = null;
          }

          // 1. Odpalamy animację bąbelkowego znikania
          li.style.transition = "all 0.2s ease-out";
          li.style.transform = "scale(0.7)";
          li.style.opacity = "0";

          // 2. 🔥 NAJPIERW wykonujemy twardy zapis w bazie IndexedDB (czekamy na niego!)
          if (typeof onConfirmDelete === "function") {
            await onConfirmDelete();
          }

          // 3. DOPIERO NA KOŃCU czyścimy DOM, kiedy baza jest czysta
          setTimeout(() => {
            li.remove();
          }, 200);
        }, 3000);
      };

      const cancelHold = (e) => {
        if (holdTimeout) {
          clearTimeout(holdTimeout);
          moreBtn.classList.remove("is-holding");
        }
      };

      // Eventy wejściowe
      moreBtn.addEventListener("mousedown", startHold);
      moreBtn.addEventListener("mouseup", cancelHold);
      moreBtn.addEventListener("mouseleave", cancelHold);
      moreBtn.addEventListener("touchstart", startHold, { passive: false });
      moreBtn.addEventListener("touchend", cancelHold);
      moreBtn.addEventListener("touchcancel", cancelHold);
    }
  },

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

    // Wrzucamy standardowe metadane (np. lokalizację)
    taskContent.appendChild(UI.getItemMetadata(data, type, allHabits));

    if (isOverdue && type === "task" && data.date) {
      const overdueBadge = document.createElement("div");
      overdueBadge.className = "task-overdue-date-badge";

      // Tworzymy ikonkę kalendarza SVG (czysty kod, pasuje do reszty Lucide Icons w aplikacji)
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

      // 🔥 TUTAJ BYŁ PIES POGRZEBANY: Używamy setAttribute zamiast .className
      calendarSvg.setAttribute(
        "class",
        "lucide lucide-calendar overdue-calendar-icon"
      );

      // Ścieżki SVG dla klasycznego kalendarza
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect"
      );
      rect.setAttribute("width", "14");
      rect.setAttribute("height", "14");
      rect.setAttribute("x", "5");
      rect.setAttribute("y", "6");
      rect.setAttribute("rx", "1.5"); // Lekko mniejszy zaokrąglony róg, żeby pasował do skali
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

      // Tworzymy span na samą zaległą datę
      const dateText = document.createElement("span");
      dateText.textContent = data.date; // format: RRRR-MM-DD

      // Składamy komponent w całość
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

    // Usuwanie (hold-to-delete) jest obsługiwane wyłącznie przez delegowany
    // listener w handleListAction (events.js) — nie podpinamy tu onclick,
    // żeby uniknąć podwójnej, konfliktowej rejestracji.

    taskActions.appendChild(checkbox);
    taskActions.appendChild(moreBtn);

    li.appendChild(taskContent);
    li.appendChild(taskActions);

    return li;
  },

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
    const totalSlotsNeeded = 42; // 6 rzędów * 7 dni

    for (let i = totalRenderedSlots; i < totalSlotsNeeded; i++) {
      fragment.appendChild(document.createElement("div"));
    }

    grid.appendChild(fragment);
  },

  renderHabits: async (AppState) => {
    const listContainer = document.getElementById("habitDropdownList");
    const trigger = document.getElementById("habitDropdownTrigger");
    const dropdownContainer = trigger?.parentElement;

    if (!listContainer || !trigger || !dropdownContainer) return;

    const habits = await DataManager.getHabits();
    listContainer.innerHTML = "";

    // 1. Obsługa otwierania/zamykania dropdownu (Toggle)
    trigger.onclick = (e) => {
      e.stopPropagation(); // Żeby kliknięcie w przycisk nie odpalało innych eventów
      dropdownContainer.classList.toggle("open");
    };

    // Zamykanie listy, jeśli użytkownik kliknie gdziekolwiek indziej na ekranie
    document.addEventListener("click", () => {
      dropdownContainer.classList.remove("open");
    });

    if (habits.length === 0) {
      listContainer.innerHTML = `<p class="noHabitsMsg" style="padding: 16px;">No habits added yet!</p>`;
      return;
    }

    const fragment = document.createDocumentFragment();
    habits.forEach((habit, index) => {
      // 2. Budujemy pozycje (opcje) na liście rozwijanej
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.dataset.id = habit.id;

      item.innerHTML = `
        <span class="habit-item-icon">${habit.icon || "🫧"}</span>
        <span class="habit-item-name">${habit.name}</span>
      `;

      // Sprawdzamy, czy ten nawyk jest aktualnie zaznaczony
      const isSelected =
        AppState.selectedHabitForStats?.id === habit.id ||
        (!AppState.selectedHabitForStats && index === 0);

      if (isSelected) {
        item.classList.add("selected");

        // Wstrzykujemy dane domyślnego nawyku do widocznego paska głównego
        document.getElementById("currentHabitIcon").textContent =
          habit.icon || "🫧";
        document.getElementById("currentHabitName").textContent = habit.name;

        if (!AppState.selectedHabitForStats) {
          AppState.selectedHabitForStats = habit;
          UI.showHabitDetails(habit, AppState);
        }
      }

      // 3. Kliknięcie w element na liście rozwijanej
      item.onclick = (e) => {
        e.stopPropagation();

        // Podmieniamy wizualne zaznaczenie klasy na liście
        listContainer
          .querySelectorAll(".dropdown-item.selected")
          .forEach((el) => el.classList.remove("selected"));
        item.classList.add("selected");

        // Aktualizujemy główny pasek (Belkę dropdownu)
        document.getElementById("currentHabitIcon").textContent =
          habit.icon || "🫧";
        document.getElementById("currentHabitName").textContent = habit.name;

        // Ładujemy statystyki poniżej
        AppState.selectedHabitForStats = habit;
        UI.showHabitDetails(habit, AppState);

        // Chowamy listę po wyborze
        dropdownContainer.classList.remove("open");
      };

      fragment.appendChild(item);
    });
    listContainer.appendChild(fragment);
  },

  showToast: (message, type = "info") => {
    // Sprawdzamy, czy istnieje już kontener na toasty, jeśli nie - tworzymy go
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

    // Tworzenie pojedynczego bąbelka powiadomienia
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

    // Dobieranie ikonki w zależności od kontekstu
    const icon = type === "error" ? "⚠️ " : "❌ ";
    toast.textContent = icon + message;

    container.appendChild(toast);

    // Odpalenie animacji wsuniecia (w następnym ticku silnika renderowania)
    setTimeout(() => {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    }, 10);

    // Funkcja usuwająca powiadomienie
    const dismissToast = () => {
      toast.style.transform = "translateY(-20px)";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 400);
    };

    // Automatyczne ukrywanie po 4 sekundach
    const autoDismiss = setTimeout(dismissToast, 4000);

    // Opcjonalnie: kliknięcie w toast zamyka go natychmiast
    toast.addEventListener("click", () => {
      clearTimeout(autoDismiss);
      dismissToast();
    });
  },

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

  updateXPBar: async (AppState) => {
    const stats = await DataManager.getUserStats();
    const threshold = LevelManager.getXpThreshold(stats.level);
    const progressPercent = (stats.currentXp / threshold) * 100;

    // 🔥 KROK 1: Inicjalizujemy globalnego strażnika bezwzględnie w obiekcie UI (jeśli jeszcze nie istnieje)
    if (UI.lastObservedLevelGlobal === undefined) {
      const el = document.getElementById("user-level-value");
      UI.lastObservedLevelGlobal = el
        ? parseInt(el.textContent, 10) || stats.level
        : stats.level;
    }

    // 🔥 LOGI DEWELOPERSKIE - SPRAWDZAMY GLOBALNEGO STRAŻNIKA W PAMIĘCI UI
    console.log("=== 🫧 NEUROBUBBLE GLOBAL UI OBJECT CHECK ===");
    console.log("Poziom aktualny z bazy:", stats.level);
    console.log("Ostatni zapamiętany poziom w UI:", UI.lastObservedLevelGlobal);
    console.log(
      "Czy poziom z bazy jest większy?:",
      stats.level > UI.lastObservedLevelGlobal
    );

    // 🔥 KROK 2: Pancerne porównanie. Jeśli poziom z bazy wzrósł w stosunku do tego, co UI pamięta globalnie
    if (stats.level > UI.lastObservedLevelGlobal) {
      console.log(
        "🚀 BINGO! Wykryto awans w pamięci globalnej UI. Odpalam animację."
      );

      // Aktualizujemy strażnika natychmiast, żeby kolejne szybkie wywołania (te duble z logów) nie odpaliły animacji drugi raz!
      UI.lastObservedLevelGlobal = stats.level;

      // Odpalamy show!
      UI.triggerLevelUpAnimation(stats.level);
    } else {
      console.log("📉 Brak awansu lub dubel wywołania.");

      // Standardowa aktualizacja paska dla zwykłego przyrostu XP
      const progressBar = document.getElementById("xp-progress-bar");
      if (progressBar) {
        progressBar.style.setProperty("height", `${progressPercent}%`);
      }

      const currentDisplayedLevelEl =
        document.getElementById("user-level-value");
      if (currentDisplayedLevelEl) {
        currentDisplayedLevelEl.textContent = stats.level;
      }

      // Aktualizujemy na wypadek, gdyby poziom spadł lub ładował się na start
      UI.lastObservedLevelGlobal = stats.level;
    }

    // Aktualizacja reszty statystyk tekstowych
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
   * 🔥 EFEKTOWNA ANIMACJA LEVEL UP (TOP TOAST) - WERSJA PANCERNA
   * @param {number} newLevelValue - Numer nowego poziomu
   */
  triggerLevelUpAnimation(newLevelValue) {
    // Łapiemy elementy ŚWIEŻO z DOM w momencie wywołania funkcji
    const progressBar = document.getElementById("xp-progress-bar");
    const levelText = document.getElementById("user-level-value");
    const levelCircle = document.querySelector(".heroLvlWrapper");
    const toast = document.getElementById("levelUpToast");

    // Jeśli nie ma nawet toasta w HTML, to nic nie zrobimy
    if (!toast) {
      console.error(
        "⚠️ LevelUp Error: Nie znaleziono elementu #levelUpToast w HTML!"
      );
      return;
    }

    // --- SEKCJA ANIMACJI EKRANU GŁÓWNEGO (odpala się tylko gdy jesteśmy na ekranie głównym) ---
    if (progressBar) {
      // ETAP 1: Błyskawiczne nabicie paska doświadczenia do 100%
      progressBar.style.width = "100%";

      // ETAP 2: Po uderzeniu paska (350ms) odpalamy błysk kółka i podmieniamy cyfrę poziomu
      setTimeout(() => {
        if (levelCircle) levelCircle.classList.add("level-up-flash");
        if (levelText) levelText.textContent = newLevelValue;

        // Resetujemy pasek na 0% w tle
        progressBar.style.transition = "none";
        progressBar.style.width = "0%";

        setTimeout(() => {
          progressBar.style.transition = "";
        }, 50);
      }, 350);
    } else {
      // Jeśli jesteśmy na innej podstronie, po prostu cicho aktualizujemy cyfrę (jeśli element gdzieś tam jest)
      if (levelText) levelText.textContent = newLevelValue;
    }

    // --- SEKCJA BANERU (odpala się ZAWSZE i wszędzie) ---
    setTimeout(
      () => {
        const toastSubtitle = toast.querySelector(".level-up-subtitle");
        if (toastSubtitle) {
          toastSubtitle.textContent = `LEVEL UP: LEVEL ${newLevelValue} 🫧`;
        }

        // Wjeżdżamy z banerem z góry ekranu
        toast.classList.add("show");

        // ETAP 4: Automatyczne schowanie baneru po 4 sekundach wyświetlania
        setTimeout(() => {
          toast.classList.remove("show");

          // Czyszczenie klasy błysku z kółka
          setTimeout(() => {
            if (levelCircle) levelCircle.classList.remove("level-up-flash");
          }, 600);
        }, 4000);
      },
      progressBar ? 550 : 50
    ); // Jeśli nie ma paska, baner wjeżdża natychmiast (po 50ms)!
  },

  triggerTaskXpAnimation(event, xpValue, newBarPercentage) {
    // 1. Aktualizacja paska postępu
    const progressBar = document.getElementById("xp-progress-bar");
    if (progressBar) {
      progressBar.style.width = `${newBarPercentage}%`;
    }

    // 2. Pobieramy element wywołujący
    const clickedElement = event.currentTarget || event.target;
    if (!clickedElement) {
      console.warn("🫧 XP Animation: Brak klikniętego elementu w evencie!");
      return;
    }

    const rect = clickedElement.getBoundingClientRect();

    // Zabezpieczenie: Jeśli element ma szerokość 0 (bo np. właśnie zniknął z DOM)
    if (rect.width === 0 && rect.height === 0) {
      console.warn(
        "🫧 XP Animation: Element zniknął z DOM przed pobraniem pozycji! Uruchom animację ułamek sekundy wcześniej."
      );
      return;
    }

    // 3. Tworzenie mikro-bąbelka XP
    const xpBadge = document.createElement("div");
    xpBadge.className = "task-xp-badge";
    xpBadge.textContent = `+${xpValue} XP 🫧`;

    // Wyliczanie dokładnej pozycji
    const targetLeft = rect.left + window.scrollX + rect.width / 2;
    const targetTop = rect.top + window.scrollY - 15;

    xpBadge.style.left = `${targetLeft}px`;
    xpBadge.style.top = `${targetTop}px`;

    console.log(
      `🫧 XP Animation: Tworzę bąbelek na pozycji X: ${targetLeft}, Y: ${targetTop}`
    );

    document.body.appendChild(xpBadge);

    // 4. Usuwamy element z DOM po zakończeniu animacji (800ms)
    setTimeout(() => {
      xpBadge.remove();
    }, 800);
  },

  initTabNav() {
    const navContainer = document.querySelector(".tabNav");
    const indicator = document.getElementById("tabIndicator");
    const navItems = document.querySelectorAll(".tabNavItem");

    if (!navContainer || !indicator || navItems.length === 0) return;

    // Funkcja czysto pozycjonująca bąbel
    const updatePosition = () => {
      // Sprawdzamy, czy wskaźnik ma już szerokość (jeśli ukryty w CSS, daj mu domyślną wartość)
      const indicatorWidth = indicator.offsetWidth || 40;

      const activeIndex = Array.from(navItems).findIndex((item) =>
        item.classList.contains("active")
      );
      const safeIndex = activeIndex !== -1 ? activeIndex : 0;

      const containerRect = navContainer.getBoundingClientRect();
      const itemRect = navItems[safeIndex].getBoundingClientRect();

      // Jeśli z jakiegoś powodu jesteśmy przed pełnym renderem i rect ma 0, przerywamy
      if (itemRect.width === 0) return;

      const itemCenter =
        itemRect.left - containerRect.left + itemRect.width / 2;
      const targetX = itemCenter - indicatorWidth / 2;

      indicator.style.setProperty("--target-x", `${targetX}px`);
    };

    // 1. Zdejmij animację na start, żeby bąbel nie leciał z kosmosu (pozycja 0)
    indicator.classList.remove("animate");

    // 2. Pierwsze pozycjonowanie robimy po pełnym załadowaniu drzewa i stylów
    updatePosition();

    // 3. PANCERNE ZABEZPIECZENIE: Odpalamy po pełnym załadowaniu okna (czcionki, layout)
    window.addEventListener("load", () => {
      updatePosition();
      indicator.classList.add("animate");
    });

    // 4. Mobilny ratunek – jeśli layout zmieni się przy obrocie ekranu lub zmianie viewportu
    window.addEventListener("resize", updatePosition);

    // Jeśli window.load już minął (bo to SPA/PWA i komponent montuje się później)
    if (document.readyState === "complete") {
      updatePosition();
      // Dajemy minimalny timeout na ułożenie się bąbelkowego layoutu mobile
      setTimeout(() => {
        updatePosition();
        indicator.classList.add("animate");
      }, 50);
    }

    // Obsługa kliknięć
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
   * 🫧 INICJALIZACJA OBSŁUGI WIELOEKRANOWEGO PRZEWODNIKA (PANCERNY FIX)
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
      // Łapiemy kropeczki dynamicznie na żywo
      const dynamicDots = overlay.querySelectorAll(".guide-dot");
      const totalSlides = dynamicDots.length || 3; // fallback na 3 slajdy jeśli pusto

      if (index < 0 || index >= totalSlides) return;
      currentSlide = index;

      // Przesuwamy tor sprzętowo na GPU
      track.style.transform = `translateX(-${currentSlide * 100}%)`;

      // Aktualizujemy kropeczki podstron
      dynamicDots.forEach((dot) => dot.classList.remove("active"));
      if (dynamicDots[currentSlide])
        dynamicDots[currentSlide].classList.add("active");

      // Podmiana etykiety przycisku akcji na finiszu
      if (currentSlide === totalSlides - 1) {
        nextBtn.innerHTML = "Wszystko jasne, lecimy! 🚀";
      } else {
        nextBtn.innerHTML = "Dalej ➡️";
      }
    };

    // Usuwamy stare listenery (na wypadek podwójnego wywołania) i dodajemy nowy
    nextBtn.replaceWith(nextBtn.cloneNode(true));
    const freshNextBtn = document.getElementById("understandGuideBtn");

    freshNextBtn.addEventListener("click", (e) => {
      e.preventDefault(); // Blokujemy ewentualne przeładowanie/skoki strony

      const dynamicDots = overlay.querySelectorAll(".guide-dot");
      const totalSlides = dynamicDots.length || 3;

      if (currentSlide < totalSlides - 1) {
        goToSlide(currentSlide + 1);
      } else {
        // Zamykamy używając Twojej natywnej klasy .open
        overlay.classList.remove("open");
        setTimeout(() => goToSlide(0), 300); // Reset karuzeli w tle po zamknięciu
      }
    });

    // Skakanie po kropkach bezpośrednio kliknięciem (szukamy kontenera i nasłuchujemy na żywo)
    const dotsContainer = document.getElementById("guideDots");
    if (dotsContainer) {
      dotsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("guide-dot")) {
          const targetIndex = parseInt(e.target.getAttribute("data-index"));
          goToSlide(targetIndex);
        }
      });
    }

    // Wymuszone zamknięcie (X, kliknięcie w tło, ESC)
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

    // 👉 SWIPE: przesuwanie palcem po slajdach (mobile)
    let touchStartX = 0;
    let touchCurrentX = 0;
    let isSwiping = false;
    const SWIPE_THRESHOLD = 50; // min px, żeby uznać gest za swipe

    track.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        touchCurrentX = touchStartX;
        isSwiping = true;
        // Wyłączamy transition na czas przeciągania, żeby ślizgało się 1:1 z palcem
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

        // Bazowa pozycja aktualnego slajdu + delta przeciągania (w %)
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

      // Przywracamy płynną animację
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
   * 🔓 OTWARCIE MODALA PRZEWODNIKA (Wykorzystuje Twoją klasę .open)
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
   * 🔄 INICJALIZACJA MICRO-INTERACTION DLA UPRAWNIEŃ (OBRÓT + WLOT)
   */
  initPermissionsToggle() {
    const toggleBtn = document.getElementById("settingsToggleBtn");
    const panel = document.getElementById("permissionsPanel");

    if (!toggleBtn || !panel) return;

    toggleBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // Przełączamy klasę .open na przycisku (obrót zębatki) i na panelu (wjazd tekstu)
      toggleBtn.classList.toggle("open");
      panel.classList.toggle("open");
    });
  },
};

window.UI = UI;
