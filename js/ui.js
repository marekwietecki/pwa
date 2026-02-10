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

export const UI = {
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
    const url = window.location.href.toLowerCase();
    if (url.includes("habit")) return "habit";
    if (url.includes("hero")) return "goal";
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

  toggleModalFields: async (type, isEdit = false) => {
    const dSection = document.getElementById("dateSection");
    const hSection = document.getElementById("habitSection");
    const gSection = document.getElementById("goalSection");
    const lSection = document.getElementById("locationSection");
    const typePickers = document.querySelector(".typePickers");
    const dateTitle = document.querySelector("#dateSection .modalSubTitle");
    const nameSection = document.querySelector(".nameSection");
    const habitIcon = document.getElementById("habitIconWrapper");

    [dSection, hSection, gSection, lSection, typePickers, habitIcon].forEach((el) => {
      if (el) el.style.display = "none";
    });

    if (dateTitle) dateTitle.textContent = "Date";
    if (nameSection) nameSection.style.display = "flex";

    if (type === "task") {
      if (dSection) dSection.style.display = "flex";
      if (lSection) lSection.style.display = "flex";
    }

    if (type === "habit") {
      if (hSection) hSection.style.display = "flex";
      if (habitIcon) habitIcon.style.display = "flex";

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
    UI.clearModalInputs();

    AppState.currentCreateType = UI.detectModalDefaultType();

    UI.toggleModalFields(AppState.currentCreateType, false);

    UI.refreshTypePickerButtons(AppState.currentCreateType);
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
    UI.resetModal(AppState);

    UI.setModalMode("edit");
    await UI.toggleModalFields("habit", true);

    document.getElementById("taskName").value = habit.name;

    const freqSelect = document.getElementById("habitFrequency");
    freqSelect.value = habit.frequency;

    const startDate = new Date(habit.createdAt).toISOString().split("T")[0];
    document.getElementById("taskDate").value = startDate;

    freqSelect.dispatchEvent(new Event("change"));

    if (habit.schedule) {
      const container =
        habit.frequency === "weekly"
          ? elements.daysPicker
          : document.getElementById("monthDaysGrid");
      habit.schedule.forEach((val) => {
        const cb = container.querySelector(`input[value="${val}"]`);
        if (cb) cb.checked = true;
      });
    }

    const btn = document.getElementById("confirmAddBtn");
    btn.setAttribute("data-edit-id", habit.id);
    btn.setAttribute("data-edit-type", "habit");
    //await UI.toggleModalFields("habit");

    if (elements.modalTitle) elements.modalTitle.textContent = "Edit Habit";

    elements.modalOverlay.classList.add("open");
  },

  openEditGoalModal: async (goal) => {
    UI.resetModal();
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

    elements.modalOverlay.classList.add("open");
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

    const undoneNodes = [];

    // TASKS
    undoneTasks.forEach((task) => {
      const isOverdue = task.date < dateKey;
      undoneNodes.push(
        UI.createItem(task.name, task, dateKey, "task", AppState, isOverdue)
      );
    });

    // HABITS
    savedHabits.forEach((habit) => {
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

    const uniqueId = `${type}-${data.id}-${dateKey || 'fixed'}`;
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

    taskContent.appendChild(taskLabel);
    taskContent.appendChild(UI.getItemMetadata(data, type, allHabits));

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

    grid.appendChild(fragment); // JEDNA OPERACJA NA DOM
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
      monthLabel.textContent = AppState.statsViewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }

    const firstDay = new Date(year, month, 1);
    const startIndex = Utils.getMondayFirstDay(firstDay);
    for (let i = 0; i < startIndex; i++) {
      fragment.appendChild(document.createElement("div"));
    }

    days.forEach(dayData => {
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
