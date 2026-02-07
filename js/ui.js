import { Utils, DataManager, LevelManager } from "./data.js";
import { elements } from "./elements.js";
import { ICONS } from "./icons.js";

export const GRADIENTS = [
  "linear-gradient(90deg, #AD22B6, #FF00FF)",
  "linear-gradient(90deg, #4facfe, #00f2fe)",
  "linear-gradient(90deg, #43e97b, #38f9d7)",
  "linear-gradient(90deg, #fa709a, #fee140)",
  "linear-gradient(90deg, #667eea, #764ba2)",
  "linear-gradient(90deg, #f093fb, #f5576c)",
];

const parser = new DOMParser();

const getIcon = (name) => {
  const iconString = ICONS[name];
  if (!iconString) return document.createElement("span");

  const parser = new DOMParser();
  // Ważne: parsowanie jako xml
  const doc = parser.parseFromString(iconString, "image/svg+xml");
  const svg = doc.documentElement;

  // Sprawdź czy nie ma błędu parsowania
  if (svg.querySelector("parsererror")) {
    console.error("SVG Parse Error", name);
    return document.createElement("span");
  }

  // Importujemy do naszego dokumentu
  const importedSvg = document.importNode(svg, true);

  // Dodajemy klasy bazowe, żeby łatwiej było stylować w CSS
  importedSvg.classList.add("lucide-icon");

  return importedSvg;
};

export const UI = {
  createDeadlineIcon: () => getIcon("deadline"),
  createLocationIcon: () => getIcon("location"),
  createRepeatIcon: () => getIcon("repeat"),
  createCheckIcon: () => getIcon("check"),
  createEllipsisIcon: () => getIcon("ellipsis"),
  createDeleteIcon: () => getIcon("trash"),
  createGoalIcon: () => getIcon("goal"),
  createDescriptionIcon: () => getIcon("description"),
  createPencilIcon: () => getIcon("pencil"),

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

  resetModal: (AppState) => {
    if (elements.taskName) elements.taskName.value = "";
    if (elements.taskDate) elements.taskDate.value = "";
    if (elements.descriptionInput) elements.descriptionInput.value = "";
    if (elements.goalDeadline) elements.goalDeadline.value = "";
    if (elements.goalHabitSelect) elements.goalHabitSelect.selectedIndex = 0;
    if (elements.locationInput) {
      elements.locationInput.value = "";
      elements.locationInput.classList.remove("success", "error");
    }

    if (elements.modalTitle) modalTitle.textContent = "New";
    const btn = document.getElementById("confirmAddBtn");
    if (btn) {
      btn.textContent = "Create";
      btn.removeAttribute("data-edit-id");
      btn.removeAttribute("data-edit-type");
    }
    /* 
    to było dodane przez te edity chyba
    const sectionsToReset = [
      { sel: ".typePickers", display: "flex" },
      { sel: ".nameSection", display: "flex" },
      { sel: "#habitIconWrapper", display: "flex" },
      { sel: "#locationSection", display: "flex" },
      { sel: "#habitSection .modalSubTitle", text: "Icon" },
    ];

    sectionsToReset.forEach((item) => {
      const el = document.querySelector(item.sel);
      if (el) {
        if (item.display) el.style.display = item.display;
        if (item.text) el.textContent = item.text;
      }
    });
    

    // title reset
    const dateTitle = document.querySelector("#dateSection .modalSubTitle");
    if (dateTitle) dateTitle.textContent = "Date";

    */

    const url = window.location.href.toLowerCase();
    if (url.includes("habit")) {
      AppState.currentCreateType = "habit";
    } else if (url.includes("hero")) {
      AppState.currentCreateType = "goal";
    } else {
      AppState.currentCreateType = "task";
    }

    UI.toggleModalFields(AppState.currentCreateType);

    const typePickers = document.querySelectorAll(".typePicker");
    typePickers.forEach((btn) => {
      const btnType = btn.getAttribute("data-type");
      btn.classList.toggle("active", btnType === AppState.currentCreateType);
    });

    // checkbox reset
    const allCheckboxes = document.querySelectorAll(
      "#daysPicker input, #monthDaysGrid input"
    );
    allCheckboxes.forEach((cb) => (cb.checked = false));
  },

  applyRandomGradient: () => {
    const randomIndex = Math.floor(Math.random() * GRADIENTS.length);
    const selectedGradient = GRADIENTS[randomIndex];

    document.documentElement.style.setProperty(
      "--hero-gradient",
      selectedGradient
    );
  },

  toggleModalFields: (type) => {
    const isHabit = type === "habit";
    const isGoal = type === "goal";
    const isTask = type === "task";

    const dSection = document.getElementById("dateSection");
    const hSection = document.getElementById("habitSection");
    const gSection = document.getElementById("goalSection");
    const lSection = document.getElementById("locationSection");

    if (dSection) dSection.style.display = "none";
    if (hSection) hSection.style.display = "none";
    if (gSection) gSection.style.display = "none";

    if (isTask && dSection) dSection.style.display = "flex";
    if (isHabit && hSection) hSection.style.display = "flex";
    if (isGoal && gSection) gSection.style.display = "flex";

    if (lSection) {
      lSection.style.display = isTask || isHabit ? "flex" : "none";
    }

    if (elements.daysPicker) elements.daysPicker.style.display = "none";
    if (elements.monthlyDayPicker)
      elements.monthlyDayPicker.style.display = "none";

    if (isGoal) {
      UI.fillHabitSelect();
    }
  },

  openEditHabitModal: (habit, AppState) => {
    UI.resetModal(AppState);

    document.querySelector(".typePickers").style.display = "none";
    document.querySelector(".nameSection").style.display = "none";
    document.getElementById("locationSection").style.display = "none";
    document.getElementById("goalSection").style.display = "none";
    document.getElementById("habitIconWrapper").style.display = "none";

    document.getElementById("habitSection").style.display = "flex";
    document.getElementById("dateSection").style.display = "flex";
    document.querySelector("#dateSection .modalSubTitle").textContent =
      "Start Date";
    document.getElementById("modalTitle").textContent = "Edit Habit";

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
    btn.textContent = "Save Changes";

    btn.setAttribute("data-edit-id", habit.id);

    elements.modalOverlay.classList.add("open");
  },

  openEditGoalModal: (goal) => {
    console.log("Próba edycji celu:", goal);

    // 1. Reset na start
    UI.resetModal();

    // 2. Łapiemy przycisk bezpośrednio z DOM (olewamy na chwilę obiekt elements)
    const btn = document.getElementById("confirmAddBtn");
    const title = document.getElementById("modalTitle");

    if (!btn) {
      console.error(
        "KATASTROFA: Nie znaleziono przycisku confirmAddBtn w HTML!"
      );
      return;
    }

    // 3. Forsujemy zmiany (używamy style.display bezpośrednio)
    btn.textContent = "Save Changes";
    btn.setAttribute("data-edit-id", goal.id);
    btn.setAttribute("data-edit-type", "goal");

    if (title) title.textContent = "Edit Goal";

    // 4. Ukrywamy zbędne rzeczy - agresywnie
    const toHide = [
      ".typePickers",
      "#habitSection",
      "#locationSection",
      "#dateSection",
    ];
    toHide.forEach((s) => {
      const el = document.querySelector(s);
      if (el) el.style.setProperty("display", "none", "important");
    });

    // 5. Pokazujemy sekcje celu
    const goalSec = document.getElementById("goalSection");
    const nameSec = document.querySelector(".nameSection");
    if (goalSec) goalSec.style.setProperty("display", "flex", "important");
    if (nameSec) nameSec.style.setProperty("display", "flex", "important");

    // 6. Wpychamy dane do pól
    document.getElementById("taskName").value = goal.name || "";
    if (elements.descriptionInput)
      elements.descriptionInput.value = goal.description || "";
    if (elements.goalDeadline)
      elements.goalDeadline.value = goal.deadline || "";

    // Ustawienie nawyku
    if (elements.goalHabitSelect) {
      elements.goalHabitSelect.value = goal.linkedHabitId
        ? String(goal.linkedHabitId)
        : "";
    }

    // 7. Otwieramy modal
    elements.modalOverlay.classList.add("open");
    console.log("Modal powinien być otwarty w trybie EDIT");
  },

  fillHabitSelect: () => {
    const select = elements.goalHabitSelect;
    if (!select) return;

    const habits = DataManager.getHabits();

    select.replaceChildren();

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "No linked habit";
    select.appendChild(defaultOpt);

    habits.forEach((habit) => {
      const opt = document.createElement("option");
      opt.value = habit.id;
      opt.textContent = habit.name;
      select.appendChild(opt);
    });
  },

  renderGoals: () => {
    const list = document.getElementById("goalsList");
    if (!list) return;

    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }

    const goals = DataManager.getGoals();

    if (elements.emptyListMessageWrapper) {
      if (goals.length === 0) {
        elements.emptyListMessageWrapper.style.display = "flex";
        if (elements.messageGoals)
          elements.messageGoals.style.display = "block";
      } else {
        elements.emptyListMessageWrapper.style.display = "none";
        if (elements.messageGoals) elements.messageGoals.style.display = "none";
      }
    }

    goals.forEach((goal) => {
      const goalNode = UI.createItem(goal.name, goal, null, "goal");
      list.appendChild(goalNode);
    });
  },

  setupMonthlyGrid: () => {
    const grid = document.getElementById("monthDaysGrid");
    if (!grid) return;

    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }

    for (let i = 1; i <= 31; i++) {
      const label = document.createElement("label");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = i.toString();

      const span = document.createElement("span");
      span.textContent = i.toString();

      label.appendChild(checkbox);
      label.appendChild(span);

      grid.appendChild(label);
    }
  },

  renderTasksForDay: (AppState, isCalendar = false) => {
    const prefix = isCalendar ? "calendar" : "";
    const listId = isCalendar ? "calendarToDoList" : "toDoList";
    const titleId = isCalendar ? "calendarTaskDateTitle" : "taskDateTitle";
    const wrapperId = isCalendar
      ? "calendarEmptyListMessageWrapper"
      : "emptyListMessageWrapper";
    const msgTodayId = isCalendar ? "calendarMessageToday" : "messageToday";
    const msgFutureId = isCalendar ? "calendarMessageFuture" : "messageFuture";

    const listEl = document.getElementById(listId);
    const titleEl = document.getElementById(titleId);
    const wrapperEl = document.getElementById(wrapperId);
    const msgTodayEl = document.getElementById(msgTodayId);
    const msgFutureEl = document.getElementById(msgFutureId);

    if (!listEl) return console.log("ej mordo nie ma listy!");

    const targetDate = AppState.selectedDate;
    const dateKey = Utils.formatDateKey(targetDate);
    const dayOfWeek = targetDate.getDay();
    const dayOfMonth = targetDate.getDate();
    const todayKey = Utils.formatDateKey(new Date());

    if (titleEl) {
      titleEl.textContent =
        dateKey === todayKey
          ? "Today's Tasks:"
          : `Tasks for ${targetDate.toDateString()}:`;
    }

    //elements.toDoList.innerHTML = "";

    const savedTasks = DataManager.getTasks();
    const savedHabits = DataManager.getHabits();
    const savedGoals = DataManager.getGoals();

    console.log("Rendering for key:", dateKey);
    console.log("Tasks found:", savedTasks[dateKey]);

    const undoneNodes = [];
    const doneNodes = [];

    // --- 1. ZADANIA (Tasks) ---
    console.log("DEBUG: Szukam klucza:", dateKey);
    console.log("DEBUG: Cała baza zadań:", savedTasks);

    const showCompleted = isCalendar;

    // Sprawdzamy, czy savedTasks to na pewno obiekt
    if (savedTasks && typeof savedTasks === "object") {
      const tasksForDate = savedTasks[dateKey];

      if (tasksForDate) {
        console.log("DEBUG: Znaleziono zadania dla tej daty:", tasksForDate);

        Object.entries(tasksForDate).forEach(([name, data]) => {
          const type = "task";
          const li = UI.createItem(name, data, dateKey, type, AppState);
          if (data.done) {
            if (showCompleted) {
              li.classList.add("is-completed");
              const cb = li.querySelector('input[type="checkbox"]');
              if (cb) cb.checked = true;
              doneNodes.push(li);
            }
          } else {
            undoneNodes.push(li);
          }
        });
      } else {
        console.warn(
          "DEBUG: Klucz istnieje w bazie, ale savedTasks[dateKey] jest puste/undefined!"
        );
      }
    }

    // --- 2. NAWYKI (Habits) ---
    savedHabits.forEach((habit) => {
      const viewingDate = Utils.formatDateKey(targetDate);
      const createdDate = Utils.formatDateKey(new Date(habit.createdAt));

      if (viewingDate < createdDate) return;

      let isDueToday = false;
      const schedule = habit.schedule || [];

      if (habit.frequency === "daily") {
        isDueToday = true;
      } else if (habit.frequency === "weekly") {
        isDueToday = schedule.includes(dayOfWeek);
      } else if (habit.frequency === "monthly") {
        isDueToday = schedule.includes(dayOfMonth);
      }

      if (isDueToday) {
        const isDone = habit.history && habit.history[dateKey];
        const li = UI.createItem(habit.name, habit, dateKey, "habit", AppState);

        if (isDone) {
          if (showCompleted) {
            li.classList.add("is-completed");
            const cb = li.querySelector('input[type="checkbox"]');
            if (cb) cb.checked = true;
            doneNodes.push(li);
          }
        } else {
          undoneNodes.push(li);
        }
      }
    });

    // --- 3. CELE (Goals) ---
    savedGoals.forEach((goal) => {
      if (goal.deadline === dateKey) {
        const li = UI.createItem(goal.name, goal, dateKey, "goal", AppState);

        if (goal.done) {
          if (showCompleted) {
            li.classList.add("is-completed");
            const cb = li.querySelector('input[type="checkbox"]');
            if (cb) cb.checked = true;
            doneNodes.push(li);
          }
        } else {
          undoneNodes.push(li);
        }
      }
    });

    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }

    if (wrapperEl) {
      wrapperEl.style.display = "none";
      if (msgTodayEl) msgTodayEl.style.display = "none";
      if (msgFutureEl) msgFutureEl.style.display = "none";
    }

    if (
      undoneNodes.length === 0 &&
      (doneNodes.length === 0 || !showCompleted)
    ) {
      if (wrapperEl) {
        wrapperEl.style.display = "flex";
        const isToday = dateKey === todayKey;

        if (isToday && msgTodayEl) {
          msgTodayEl.style.display = "block";
        } else if (!isToday && msgFutureEl) {
          msgFutureEl.style.display = "block";
        }
      }
    }

    console.log("--- DIAGNOSTYKA RENDEROWANIA ---");
    console.log("Węzły do dodania:", undoneNodes.length + doneNodes.length);
    console.log("Czy listEl istnieje?:", !!listEl);
    if (listEl) console.log("ID elementu docelowego:", listEl.id);

    // Łączymy listy
    const listFragment = document.createDocumentFragment();
    undoneNodes.forEach((node) => {
      console.log(
        "Dodaję do fragmentu:",
        node.querySelector(".taskNodeName")?.textContent
      );
      listFragment.appendChild(node);
    });
    doneNodes.forEach((node) => listFragment.appendChild(node));
    listEl.appendChild(listFragment);
    console.log(
      "DOM po appendChild - ile dzieci ma lista?:",
      listEl.children.length
    );
  },

  updateGoalHabitSelect: () => {
    const select = document.getElementById("goalHabitSelect");
    if (!select) return;

    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "No linked habit";
    select.appendChild(defaultOption);

    const habits = DataManager.getHabits();
    console.log(DataManager.getHabits());
    habits.forEach((habit) => {
      const option = document.createElement("option");
      option.value = habit.id;
      option.textContent = habit.name;
      select.appendChild(option);
    });
  },

  createItem: (name, data, dateKey, type, AppState) => {
    const li = document.createElement("li");
    li.className = `taskItem ${
      type === "habit" ? "is-habit" : type === "goal" ? "is-goal" : "is-task"
    }`;

    const taskContent = document.createElement("div");
    taskContent.className = "taskContent";

    const taskLabel = document.createElement("label");
    taskLabel.className = "taskLabel";
    const statusIcon =
      type === "habit"
        ? UI.createRepeatIcon()
        : type === "goal"
        ? UI.createGoalIcon()
        : UI.createCheckIcon();
    statusIcon.classList.add("task-type-icon");
    taskLabel.appendChild(statusIcon);

    if (type === "habit") {
      const habitIconEmoji = document.createElement("span");
      habitIconEmoji.className = "habit-mini-emoji";
      habitIconEmoji.textContent = data.icon || name.charAt(0).toUpperCase();
      taskLabel.appendChild(habitIconEmoji);
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "taskNodeName";
    nameSpan.textContent = name;
    taskLabel.appendChild(nameSpan);

    if (type === "goal") {
      const editGoalBtn = document.createElement("button");
      editGoalBtn.className = "edit-inline-btn";
      const pencilIcon = UI.createPencilIcon();
      editGoalBtn.appendChild(pencilIcon);
      editGoalBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        UI.openEditGoalModal(data);
      });

      taskLabel.appendChild(editGoalBtn);
    }

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

    //console.log("Dane dla node'a:", type, data);
    if (type === "goal") {
      if (data.deadline) {
        const deadlineSpan = document.createElement("span");
        deadlineSpan.style.marginTop = "4px";

        deadlineSpan.className = "goalDeadline";
        const deadlineIcon = UI.createDeadlineIcon();
        deadlineIcon.style.verticalAlign = "center";
        deadlineIcon.style.marginRight = "6px";
        const dateObj = new Date(data.deadline);
        const dateText = document.createTextNode(
          `Deadline: ${dateObj.toLocaleDateString()}`
        );

        deadlineSpan.appendChild(deadlineIcon);
        deadlineSpan.appendChild(dateText);
        metaWrapper.appendChild(deadlineSpan);
      }

      if (data.linkedHabitId) {
        const habits = DataManager.getHabits();
        console.log(DataManager.getHabits());
        const habit = habits.find(
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
        descIcon.style.marginRight = "6px";
        descIcon.style.opacity = "0.7";
        descIcon.style.verticalAlign = "middle";

        const descText = document.createElement("span");
        descText.textContent = data.description;

        descDiv.appendChild(descIcon);
        descDiv.appendChild(descText);
        metaWrapper.appendChild(descDiv);
      }
    }

    taskContent.appendChild(taskLabel);
    taskContent.appendChild(metaWrapper);

    // 2. Kontener na akcje
    const taskActions = document.createElement("div");
    taskActions.className = "taskActions";

    /* 
      if (type === "habit" || type === "goal") {
        const progress = DataManager.calculateHabitProgress(data);
        const circle = UI.createProgressCircle(progress);
        taskActions.appendChild(circle);
      }
      */

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "taskCheckbox";

    // checkbox setting
    const isActuallyDone =
      type === "task" ? data.done : data.history && data.history[dateKey];
    checkbox.checked = isActuallyDone;

    const moreBtn = document.createElement("button");
    moreBtn.className = "moreBtn";
    const ellipsisIcon = UI.createEllipsisIcon();
    const deleteIcon = UI.createDeleteIcon();
    moreBtn.appendChild(ellipsisIcon);

    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      const isReadyToDelete = li.classList.contains("show-delete");

      if (isReadyToDelete) {
        if (type === "task") {
          const tasks = DataManager.getTasks();
          if (tasks[dateKey]) {
            delete tasks[dateKey][name];
            if (Object.keys(tasks[dateKey]).length === 0) delete tasks[dateKey];
            DataManager.saveTasks(tasks);
          }
        } else if (type === "habit") {
          const habits = DataManager.getHabits();
          const filtered = habits.filter((h) => h.id !== data.id);
          DataManager.saveHabits(filtered);
          if (elements.habitSection) UI.renderHabits();
        } else if (type === "goal") {
          const goals = DataManager.getGoals();
          const filtered = goals.filter((g) => g.id !== data.id);
          DataManager.saveGoals(filtered);
          if (elements.goalsList) UI.renderGoals();
          if (elements.calendarGrid) UI.renderCalendar();
        }

        const calendarEl = document.getElementById("calendarGrid");
        const isCalendar =
          calendarEl && window.getComputedStyle(calendarEl).display !== "none";
        UI.renderTasksForDay(AppState, isCalendar);
      } else {
        li.classList.add("show-delete");
        moreBtn.replaceChildren(deleteIcon);

        setTimeout(() => {
          if (li.classList.contains("show-delete")) {
            li.classList.remove("show-delete");
            moreBtn.replaceChildren(ellipsisIcon);
          }
        }, 2500);
      }
    });

    taskActions.appendChild(checkbox);
    taskActions.appendChild(moreBtn);

    // 3. Składanie całości
    li.appendChild(taskContent);
    li.appendChild(taskActions);

    // --- LISTENERY ---
    checkbox.addEventListener("change", function () {
      const isChecked = this.checked;
      const todayKey = Utils.formatDateKey(new Date());
      const isToday = dateKey === todayKey;

      if (type === "task") {
        const tasks = DataManager.getTasks();
        if (tasks[dateKey] && tasks[dateKey][name]) {
          tasks[dateKey][name].done = isChecked;
          DataManager.saveTasks(tasks);
        }
      } else if (type === "habit") {
        DataManager.toggleHabitDone(data.id, dateKey, isChecked);
      } else if (type === "goal") {
        const goals = DataManager.getGoals();
        const goal = goals.find((g) => g.id === data.id);
        if (goal) {
          goal.done = isChecked;
          DataManager.saveGoals(goals);
        }
      }

      if (isToday) {
        const xpValue = LevelManager.calculateXP(type, data);

        LevelManager.applyXP(isChecked ? xpValue : -xpValue);

        if (isChecked && navigator.vibrate) {
          navigator.vibrate(50);
        }
      }

      if (isChecked) li.classList.add("is-completed");
      else li.classList.remove("is-completed");

      setTimeout(() => {
        const calendarListExists =
          !!document.getElementById("calendarToDoList");
        UI.renderTasksForDay(AppState, calendarListExists);
      }, 300);
    });

    return li;
  },

  renderCalendar: (AppState) => {
    if (!elements.calendarGrid) return;

    elements.calendarGrid.innerHTML = "";

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
      elements.calendarGrid.appendChild(el);
    });

    const firstDay = new Date(year, month, 1);
    const startIndex = Utils.getMondayFirstDay(firstDay);

    for (let i = 0; i < startIndex; i++) {
      elements.calendarGrid.appendChild(document.createElement("div"));
    }

    const allGoals = DataManager.getGoals();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const el = document.createElement("div");
      el.className = "day";

      const currentLoopDate = new Date(year, month, day);
      const dateKey = Utils.formatDateKey(currentLoopDate);

      const goalsForThisDay = allGoals.filter(
        (goal) => goal.deadline === dateKey
      );
      const hasGoalDeadline = goalsForThisDay.length > 0;

      const dayNumber = document.createElement("span");
      dayNumber.textContent = day;
      el.appendChild(dayNumber);

      if (hasGoalDeadline) {
        const deadlineIconWrapper = document.createElement("div");
        deadlineIconWrapper.className = "day-goal-wrapper";

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isAnyUnfinishedOverdue = goalsForThisDay.some(
          (goal) => !goal.done && currentLoopDate < today
        );

        if (isAnyUnfinishedOverdue) {
          deadlineIconWrapper.classList.add("is-overdue");
        }

        deadlineIconWrapper.appendChild(UI.createGoalIcon());
        el.appendChild(deadlineIconWrapper);
      }

      if (
        AppState.selectedDate.getFullYear() === year &&
        AppState.selectedDate.getMonth() === month &&
        AppState.selectedDate.getDate() === day
      ) {
        el.classList.add("active");
      }

      el.onclick = () => {
        document
          .querySelectorAll(".day")
          .forEach((d) => d.classList.remove("active"));
        el.classList.add("active");
        AppState.selectedDate = new Date(year, month, day);
        UI.renderTasksForDay(AppState, true);
      };

      elements.calendarGrid.appendChild(el);
    }
  },

  renderHabits: (AppState) => {
    const container = document.getElementById("habitCarousel");
    if (!container) return;

    const habits = DataManager.getHabits();
    container.innerHTML = "";

    if (habits.length === 0) {
      const noHabitsMsg = document.createElement("p");
      noHabitsMsg.textContent =
        "No habits added yet! Add one to see its statistics.";
      noHabitsMsg.className = "noHabitsMsg";
      container.appendChild(noHabitsMsg);
      return;
    }

    habits.forEach((habit, index) => {
      try {
        const card = document.createElement("div");
        card.className = "habit-card-mini";

        const iconCircle = document.createElement("div");
        iconCircle.className = "habit-card-icon";
        iconCircle.textContent =
          habit.icon || habit.name.charAt(0).toUpperCase();
        card.appendChild(iconCircle);

        const name = document.createElement("p");
        name.textContent = habit.name;
        name.className = "habit-name-label";
        card.appendChild(name);

        card.onclick = () => {
          document
            .querySelectorAll(".habit-card-icon")
            .forEach((c) => c.classList.remove("active-habit-icon"));
          iconCircle.classList.add("active-habit-icon");
          UI.showHabitDetails(habit, AppState);
          card.scrollIntoView({ behavior: "smooth", inline: "center" });
        };

        container.appendChild(card);

        // PRZENIESIONE TUTAJ - do środka try
        if (index === 0) {
          iconCircle.classList.add("active-habit-icon");
          UI.showHabitDetails(habit, AppState);
        }
      } catch (error) {
        console.error(`Błąd przy nawyku: ${habit.name}`, error);
      }
    });
  },

  showHabitDetails: (habit, AppState) => {
    AppState.selectedHabitForStats = habit;

    const progress = DataManager.calculateHabitProgress(habit);
    const freqMap = {
      daily: "Everyday",
      weekly: "Every", //Days of the week
      monthly: "Every", //Days of the month
    };
    let frequencyText = freqMap[habit.frequency] || habit.frequency;
    if (
      habit.frequency === "weekly" &&
      habit.schedule &&
      habit.schedule.length > 0
    ) {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const selectedDays = habit.schedule
        .sort((a, b) => a - b)
        .map((dayNum) => dayNames[dayNum]);
      frequencyText += `: ${selectedDays.join(", ")}`;
    }
    if (
      habit.frequency === "monthly" &&
      habit.schedule &&
      habit.schedule.length > 0
    ) {
      const selectedDays = habit.schedule.sort((a, b) => a - b);
      frequencyText += `: ${selectedDays.join(", ")}`;
    }
    const startDate = habit.createdAt
      ? new Date(habit.createdAt).toLocaleDateString("en-US")
      : "Unknown";

    document.getElementById("habitDetails").style.display = "block";
    document.getElementById("detailHabitName").textContent = habit.name;
    const streakValue = DataManager.calculateStreak(habit);
    const unit =
      habit.frequency === "daily"
        ? streakValue === 1
          ? "day"
          : "days"
        : streakValue === 1
        ? "time"
        : "times";

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
    if (!AppState)
      return console.error(
        "Mordo, zapomniałeś o AppState w renderActivityGrid!"
      );

    const viewDate = AppState.statsViewDate;

    const grid = document.getElementById("activityGrid");
    if (!grid) return;

    grid.innerHTML = "";

    const year = AppState.statsViewDate.getFullYear();
    const month = AppState.statsViewDate.getMonth();

    const monthLabel = document.querySelector(".activity-section h4");
    if (monthLabel) {
      monthLabel.textContent = AppState.statsViewDate.toLocaleDateString(
        "en-US",
        {
          month: "long",
          year: "numeric",
        }
      );
    }

    let scheduledThisMonth = 0;
    let completedThisMonth = 0;
    let currentStreak = 0;
    let bestStreak = 0;

    const firstDay = new Date(year, month, 1);
    const startIndex = Utils.getMondayFirstDay(firstDay);

    for (let i = 0; i < startIndex; i++) {
      grid.appendChild(document.createElement("div"));
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const el = document.createElement("div");
      el.className = "mini-day";
      el.textContent = day;

      const currentIterDate = new Date(year, month, day);
      const dateKey = Utils.formatDateKey(currentIterDate);
      const dayOfWeek = currentIterDate.getDay();

      const createdDate = new Date(habit.createdAt);
      createdDate.setHours(0, 0, 0, 0);

      let isScheduled = false;
      if (habit.frequency === "daily") {
        isScheduled = true;
      } else if (habit.frequency === "weekly") {
        isScheduled = habit.schedule.includes(dayOfWeek);
      } else if (habit.frequency === "monthly") {
        isScheduled = habit.schedule.includes(day);
      }

      const isDone = habit.history && habit.history[dateKey] === true;

      if (isScheduled && currentIterDate >= createdDate) {
        scheduledThisMonth++;
        if (isDone) {
          completedThisMonth++;
          currentStreak++;
          bestStreak = Math.max(bestStreak, currentStreak);
          el.classList.add("habit-done");
        } else {
          currentStreak = 0; // Streak crash
        }
      } else {
        el.classList.add("inactive");
      }

      grid.appendChild(el);
    }

    // ---  STATS UPDATE ---
    const percentage =
      scheduledThisMonth === 0
        ? 0
        : Math.round((completedThisMonth / scheduledThisMonth) * 100);

    const streakEl = document.getElementById("monthBestStreak");
    const percentEl = document.getElementById("monthPercentage");
    const countEl = document.getElementById("monthCount");

    if (streakEl) streakEl.textContent = `${bestStreak} days`;
    if (percentEl) percentEl.textContent = `${percentage}%`;
    if (countEl)
      countEl.textContent = `${completedThisMonth} / ${scheduledThisMonth}`;
  },

  updateXPBar: () => {
    const stats = DataManager.getUserStats();
    const threshold = LevelManager.getXpThreshold(stats.level);

    const progressPercent = (stats.currentXp / threshold) * 100;

    const bar = document.getElementById("xp-progress-bar");
    const lvlDisplay = document.getElementById("user-level-value");
    const curLvlDisplay = document.getElementById("currentLevel");
    const nextLvlDisplay = document.getElementById("next-level-value");
    const xpRatio = document.getElementById("xp-next-level");
    const totalXpDisplay = document.getElementById("total-xp-value");

    if (bar) bar.style.width = `${progressPercent}%`;
    if (lvlDisplay) lvlDisplay.textContent = stats.level;
    if (curLvlDisplay) curLvlDisplay.textContent = stats.level;
    if (nextLvlDisplay) nextLvlDisplay.textContent = stats.level + 1;

    if (xpRatio)
      xpRatio.textContent = `${Math.floor(stats.currentXp)} / ${threshold}`;

    if (totalXpDisplay) totalXpDisplay.textContent = stats.totalXp;
  },

  showModalMessage: (text, duration = 3000) => {
    const wrapper = document.getElementById("modalMessageWrapper");
    const msgSpan = document.getElementById("modalMessage");

    if (!wrapper || !msgSpan) return;

    msgSpan.textContent = text;
    wrapper.style.display = "flex";

    wrapper.classList.add("shake-animation");

    setTimeout(() => {
      wrapper.style.display = "none";
      wrapper.classList.remove("shake-animation");
    }, duration);
  },
};
