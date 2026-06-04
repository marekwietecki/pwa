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
  "🧘",
  "🏃‍♂️",
  "📚",
  "🍏",
  "💪",
  "🛌",
  "🧠",
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

  updateUserHeader: async () => {
    const stats = await DataManager.getUserStats();
    const nameLabel = document.getElementById("displayUserName");
    if (nameLabel) nameLabel.textContent = stats.userName;
    await UI.updateXPBar();
  },

  renderCurrentPage: async (AppState) => {
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

  // 🔥 HYBRYDOWY PICKER: Z natychmiastowym gaszeniem gotowych ikon po kliknięciu w input customowy!
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

    // 2. GŁÓWNY KONTENER JEDNOLINIJKOWY (Dba o to, żeby suwak i plus stały obok siebie w jednej linii)
    const rowContainer = document.createElement("div");
    rowContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between; /* Spycha suwak w lewo, a plusa maksymalnie w prawo */
      gap: 12px;
      width: 100%;
    `;

    // 3. Kontener na kafelki z emoji (Przywracamy poziomą taśmę/slider)
    const pickerContainer = document.createElement("div");
    pickerContainer.id = "mainHabitIconPicker";
    pickerContainer.style.cssText = `
      display: flex;
      gap: 12px;
      flex: 1;               /* Zajmuje całą przestrzeń od lewej krawędzi aż do przycisku plus */
      padding: 5px 0;
      overflow-x: auto;      /* 🔥 Przywracamy przewijanie poziome */
      justify-content: start;
      scrollbar-width: none; /* Ukrywa scrollbar na Firefox */
      min-width: 0;          /* 🔥 KLUCZOWE: pozwala kontenerowi zwężać się i aktywować scroll, zamiast wypychać plusa */
    `;
    // Ukrywamy scrollbar na Chrome/Safari
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `#mainHabitIconPicker::-webkit-scrollbar { display: none; }`;
    document.head.appendChild(styleSheet);

    UI.selectedHabitIcon = activeEmoji || "💧";
    const isPreset = ONBOARDING_ICONS.includes(UI.selectedHabitIcon);

    ONBOARDING_ICONS.forEach((emoji) => {
      const iconWrapper = document.createElement("div");
      iconWrapper.className = "main-icon-item";
      iconWrapper.textContent = emoji;
      iconWrapper.style.cssText = `
        flex: 0 0 44px;      /* 🔥 Przywracamy sztywne 44px: ikonki NIE BĘDĄ rosnąć ani się kurczyć */
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.04);
        border: 2px solid transparent;
        border-radius: 12px;
        cursor: pointer;
        font-size: 20px;
        transition: all 0.25s ease;
        user-select: none;
        box-sizing: border-box;
      `;
      
      if (isPreset && emoji === UI.selectedHabitIcon) {
        iconWrapper.style.border = "2px solid rgba(255, 0, 255, 0.6)";
        iconWrapper.style.background = "rgba(255, 255, 255, 0.12)";
        iconWrapper.style.boxShadow = "0 0 10px rgba(255, 0, 255, 0.3)";
      }

      iconWrapper.addEventListener("click", () => {
        pickerContainer.querySelectorAll(".main-icon-item").forEach((item) => {
          item.style.border = "2px solid transparent";
          item.style.background = "rgba(255,255,255,0.04)";
          item.style.boxShadow = "none";
        });

        if (customInput) {
          customInput.value = "";
          customInput.placeholder = "+";
        }

        UI.selectedHabitIcon = emoji;
        iconWrapper.style.border = "2px solid rgba(255, 0, 255, 0.6)";
        iconWrapper.style.background = "rgba(255, 255, 255, 0.12)";
        iconWrapper.style.boxShadow = "0 0 10px rgba(255, 0, 255, 0.3)";
      });

      pickerContainer.appendChild(iconWrapper);
    });

    rowContainer.appendChild(pickerContainer);

    // 4. KWADRATOWY INPUT PO PRAWEJ Z NATYCHMIASTOWYM ODZNACZANIEM
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
      customInput.style.border = "1px solid rgba(255, 0, 255, 0.5)";
      customInput.style.background = "rgba(255, 255, 255, 0.07)";
    }

    customInput.addEventListener("input", (e) => {
      const val = e.target.value.trim();
      UI.selectedHabitIcon = val !== "" ? val : "💧";
    });

    // 🔥 FOCUS: Kliknięcie od razu gasi podświetlenia ikon z karuzeli po lewej!
    customInput.addEventListener("focus", () => {
      customInput.placeholder = "";
      customInput.style.border = "1px solid rgba(255, 0, 255, 0.6)";
      customInput.style.background = "rgba(255, 255, 255, 0.12)";
      customInput.style.boxShadow = "0 0 10px rgba(255, 0, 255, 0.2)";

      // ⚡ TU DZIEJE SIĘ MAGIA: Natychmiastowe czyszczenie podświetleń z gotowych ikon
      pickerContainer.querySelectorAll(".main-icon-item").forEach((item) => {
        item.style.border = "2px solid transparent";
        item.style.background = "rgba(255,255,255,0.04)";
        item.style.boxShadow = "none";
      });

      // Jeśli w polu nic nie ma, jako bezpiecznik dajemy domyślny stan (kropelka)
      if (customInput.value.trim() === "") {
        UI.selectedHabitIcon = "💧";
      }

      setTimeout(() => customInput.select(), 10);
    });

    // BLUR: Opuszczenie pola
    customInput.addEventListener("blur", () => {
      if (customInput.value === "") {
        customInput.placeholder = "+";
        customInput.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        customInput.style.background = "rgba(255, 255, 255, 0.03)";
        customInput.style.boxShadow = "none";

        // Jeśli user kliknął w input, nic nie wpisał i kliknął w tło modala,
        // przywracamy podświetlenie domyślnej kropelki na karuzeli, żeby nie było pustki!
        const firstIcon = pickerContainer.querySelector(".main-icon-item");
        if (firstIcon && firstIcon.textContent === "💧") {
          firstIcon.style.border = "2px solid rgba(255, 0, 255, 0.6)";
          firstIcon.style.background = "rgba(255, 255, 255, 0.12)";
          firstIcon.style.boxShadow = "0 0 10px rgba(255, 0, 255, 0.3)";
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
    scheduleCheckboxes.forEach(cb => cb.checked = false);

    // 3. Przełączanie widoczności pól na bazie aktualnego typu
    UI.toggleModalFields(AppState.currentCreateType, false);
    UI.refreshTypePickerButtons(AppState.currentCreateType);

    // 4. Reset ikony na domyślną kropelkę
    UI.setupHabitIconPicker("💧");
  },

  applyRandomGradient: () => {
    const randomIndex = Math.floor(Math.random() * GRADIENTS.length);
    const selectedGradient = GRADIENTS[randomIndex];

    document.documentElement.style.setProperty(
      "--hero-gradient",
      selectedGradient
    );
  },

  setModalMode: (mode = "create") => {
    const btn = document.getElementById("confirmAddBtn");
    const title = elements.modalTitle;

    if (mode === "create") {
      if (title) title.textContent = "New";
      if (btn) {
        btn.textContent = "Create";
        btn.removeAttribute("data-edit-id");
        btn.removeAttribute("data-edit-type");
      }
    } else {
      // EDIT MODE
      if (title) title.textContent = "Edit";
      if (btn) btn.textContent = "Save Changes";
    }
  },

  openEditHabitModal: async (habit, AppState) => {
    if (!AppState) return;
    
    AppState.currentCreateType = "habit"; 
    UI.resetModal(AppState);
    UI.setModalMode("edit");
    await UI.toggleModalFields("habit", true);

    document.getElementById("taskName").value = habit.name || "";

    if (habit.createdAt) {
      const startDate = new Date(habit.createdAt).toISOString().split("T")[0];
      const dateInput = document.getElementById("taskDate");
      if (dateInput) dateInput.value = startDate;
    }

    const freqSelect = document.getElementById("habitFrequency");
    if (freqSelect) {
      // 1. Najpierw ustawiamy wartość częstotliwości (weekly/monthly)
      freqSelect.value = habit.frequency || "daily";
      
      // 2. Natychmiast odpalamy event change, żeby UI wyrenderowało odpowiedni picker (dni tygodnia lub siatkę)
      freqSelect.dispatchEvent(new Event("change"));
    }

    // 3. 🔥 DOPIERO TUTAJ, gdy UI przemieliło event 'change' i pokazało właściwy kontener,
    // bezpiecznie aplikujemy zaznaczenia harmonogramu
    if (habit.schedule && Array.isArray(habit.schedule)) {
      const container = habit.frequency === "weekly" 
        ? elements.daysPicker 
        : document.getElementById("monthDaysGrid");
        
      if (container) {
        // Dodatkowe bezpieczeństwo: na wszelki wypadki czyścimy tylko ten konkretny kontener przed nałożeniem
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

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

    if (elements.modalTitle) elements.modalTitle.textContent = "Edit Habit";
    if (elements.modalOverlay) elements.modalOverlay.classList.add("open");
  },

  openEditGoalModal: async (goal, AppState) => {
    if (!AppState) return;

    // 🔥 Aktualizujemy stan przed wywołaniem reszt logiki
    AppState.currentCreateType = "goal";

    // 🔥 Naprawione: Teraz poprawnie przekazujemy AppState do resetModal
    UI.resetModal(AppState); 
    UI.setModalMode("edit");
    await UI.toggleModalFields("goal", true);

    if (elements.modalTitle) elements.modalTitle.textContent = "Edit Goal";

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

    // 🔥 NOWOŚĆ: Sortowanie zadań (Najstarsze/Przeterminowane na górę)
    undoneTasks.sort((a, b) => {
      // 1. Najpierw porównujemy po dacie (np. "2026-05-27" < "2026-05-29")
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      // 2. Jeśli daty są identyczne, sortujemy alfabetycznie po nazwie zadania
      return a.name.localeCompare(b.name);
    });

    const undoneNodes = [];

    // TASKS
    undoneTasks.forEach((task) => {
      const isOverdue = task.date < dateKey;
      undoneNodes.push(
        UI.createItem(task.name, task, dateKey, "task", AppState, isOverdue)
      );
    });

    // HABITS
    // (Sortowanie nawyków opcjonalnie alfabetycznie, żeby nie skakały losowo)
    const sortedHabits = [...savedHabits].sort((a, b) => a.name.localeCompare(b.name));

    sortedHabits.forEach((habit) => {
      if (dateKey < Utils.formatDateKey(new Date(habit.createdAt))) return;

      const isDue = Utils.isHabitDue(habit, targetDate);
      const isDone = habit.history && habit.history[dateKey];

      if (isDue && !isDone) {
        undoneNodes.push(
          UI.createItem(habit.name, habit, dateKey, "habit", AppState)
        );
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
      .map((goal) => {
        const li = UI.createItem(goal.name, goal, null, "goal", AppState);
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

    UI.renderToContainer(listEl, [...undoneNodes, ...doneNodes]);
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
      const calendarSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      calendarSvg.setAttribute("width", "12");
      calendarSvg.setAttribute("height", "12");
      calendarSvg.setAttribute("viewBox", "0 0 24 24");
      calendarSvg.setAttribute("fill", "none");
      calendarSvg.setAttribute("stroke", "currentColor");
      calendarSvg.setAttribute("stroke-width", "2");
      calendarSvg.setAttribute("stroke-linecap", "round");
      calendarSvg.setAttribute("stroke-linejoin", "round");
      
      // 🔥 TUTAJ BYŁ PIES POGRZEBANY: Używamy setAttribute zamiast .className
      calendarSvg.setAttribute("class", "lucide lucide-calendar overdue-calendar-icon");

      // Ścieżki SVG dla klasycznego kalendarza
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", "14");
      rect.setAttribute("height", "14");
      rect.setAttribute("x", "5");
      rect.setAttribute("y", "6");
      rect.setAttribute("rx", "1.5"); // Lekko mniejszy zaokrąglony róg, żeby pasował do skali
      rect.setAttribute("ry", "1.5");
      
      const line1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line1.setAttribute("x1", "15");
      line1.setAttribute("x2", "15");
      line1.setAttribute("y1", "4");
      line1.setAttribute("y2", "8");

      const line2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line2.setAttribute("x1", "9");
      line2.setAttribute("x2", "9");
      line2.setAttribute("y1", "4");
      line2.setAttribute("y2", "8");

      const line3 = document.createElementNS("http://www.w3.org/2000/svg", "line");
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
    const container = document.getElementById("habitCarousel");
    if (!container) return;

    const habits = await DataManager.getHabits();
    container.innerHTML = "";

    if (habits.length === 0) {
      const noHabitsMsg = document.createElement("p");
      noHabitsMsg.textContent =
        "No habits added yet! Add one to see its statistics.";
      noHabitsMsg.className = "noHabitsMsg";
      container.appendChild(noHabitsMsg);
      return;
    }

    const fragment = document.createDocumentFragment();
    habits.forEach((habit, index) => {
      const card = document.createElement("div");
      card.className = "habit-card-mini";
      card.dataset.id = habit.id;

      const iconCircle = document.createElement("div");
      iconCircle.className = "habit-card-icon";
      iconCircle.textContent = habit.icon || habit.name.charAt(0).toUpperCase();

      const nameLabel = document.createElement("p");
      nameLabel.textContent = habit.name;
      nameLabel.className = "habit-name-label";

      card.appendChild(iconCircle);
      card.appendChild(nameLabel);

      const isSelected =
        AppState.selectedHabitForStats?.id === habit.id ||
        (!AppState.selectedHabitForStats && index === 0);

      if (isSelected) {
        iconCircle.classList.add("active-habit-icon");
        nameLabel.classList.add("active-habit-label");

        if (!AppState.selectedHabitForStats) {
          AppState.selectedHabitForStats = habit;
          UI.showHabitDetails(habit, AppState);
        }
      }

      card.onclick = () => {
        container
          .querySelectorAll(".active-habit-icon")
          .forEach((el) => el.classList.remove("active-habit-icon"));
        container
          .querySelectorAll(".active-habit-label")
          .forEach((el) => el.classList.remove("active-habit-label"));

        iconCircle.classList.add("active-habit-icon");
        nameLabel.classList.add("active-habit-label");

        AppState.selectedHabitForStats = habit;
        UI.showHabitDetails(habit, AppState);
        card.scrollIntoView({ behavior: "smooth", inline: "center" });
      };

      fragment.appendChild(card);
    });
    container.appendChild(fragment);
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

  updateXPBar: async () => {
    const stats = await DataManager.getUserStats();
    const threshold = LevelManager.getXpThreshold(stats.level);
    const progressPercent = (stats.currentXp / threshold) * 100;

    document
      .getElementById("xp-progress-bar")
      ?.style.setProperty("width", `${progressPercent}%`);

    const elementsToUpdate = {
      "user-level-value": stats.level,
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
};
