/*
  Offline Mode  ////////////////////////////////////////////////////////////////////
*/

// Tworzymy pasek, jeśli go nie ma
if (!document.getElementById("offline-banner")) {
  const banner = document.createElement("div");
  banner.id = "offline-banner";
  banner.textContent = "Brak połączenia z internetem";
  document.body.prepend(banner);
}

// Obsługa zmian stanu sieci
window.addEventListener("online", () => {
  document.body.classList.remove("offline");
});

window.addEventListener("offline", () => {
  document.body.classList.add("offline");
});

// Jeśli użytkownik startuje już bez neta
if (!navigator.onLine) {
  document.body.classList.add("offline");
}
/*
  APP STATE & CONFIG  //////////////////////////////////////////////////////////////////
*/ 
let date = new Date(); // actual month for calendar view
let selectedDate = new Date(); // default today 
let currentCreateType = "task"; // default type
let statsViewDate = new Date(); // mini calendar data
let selectedHabitForStats = null; // currently clicked habit

const STATS_KEY = 'habit_hero_stats';

const defaultStats = {
    totalXp: 0,
    currentXp: 0,
    level: 1,
    userName: "New Hero"
};

const GRADIENTS = [
  "linear-gradient(90deg, #AD22B6, #FF00FF)", // Twój oryginał
  "linear-gradient(90deg, #4facfe, #00f2fe)", // Błękitny
  "linear-gradient(90deg, #43e97b, #38f9d7)", // Zielony
  "linear-gradient(90deg, #fa709a, #fee140)", // Różowo-żółty
  "linear-gradient(90deg, #667eea, #764ba2)", // Fioletowy "Deep Blue"
  "linear-gradient(90deg, #f093fb, #f5576c)"  // Ciepły róż
];
/*
  DOM Elements /////////////////////////////////////////////////////////////////////
*/ 
const elements = {};

function cacheElements() {
  const ids = [
    "calendarGrid", "currentMonth", "toDoList", "taskDateTitle", 
    "modalOverlay", "taskType", "taskName", "taskDate", 
    "locationInput", "locationSection", "dateSection", "habitSection", 
    "habitFrequency", "daysPicker", "monthlyDayPicker", 
    "addTaskBtn", "closeModal", "searchLocation", "useMyLocation", 
    "goalSection", "goalsList", "goalDeadline", "descriptionInput", 
    "emptyListMessageWrapper", "editUserName", "habitIconWrapper", 
    "modalTitle", "goalHabitSelect", "displayUserName", "userNameInput",
    "editUserName", "messageToday", "messageFuture", "messageGoals",
    "goalsList",
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      elements[id] = el;
    } else {
      console.warn(`Element #${id} not found in DOM`);
      elements[id] = null; 
    }
  });

  elements.confirmAddBtn = document.querySelector(".addTask");
  elements.searchLocBtn = elements["searchLocation"];
  elements.geoLocBtn = elements["useMyLocation"];
}
/*
  LOGIC: Location Service  //////////////////////////////////////////////////////////////////
*/
const LocationService = {
  // Wyszukiwanie po tekście
  search: async (query) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    return await res.json();
  },

  // Zamiana współrzędnych na adres (Reverse Geocoding)
  reverse: async (lat, lon) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const res = await fetch(url);
    return await res.json();
  }
};
/*
  1. FORMATTING & UTILS //////////////////////////////////////////////////////////////////
*/
const Utils = {
  getMondayFirstDay: (date) => {
    const day = date.getDay(); // 0 = sunday
    return day === 0 ? 6 : day - 1;
  },

  formatDateKey: (date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  formatLocation: (address) => {
    if (!address) return "";
    const street = address.road || address.pedestrian || address.cycleway || address.footway;
    const house = address.house_number;
    const city = address.city || address.town || address.village || address.hamlet;
    const country = address.country;

    if (street && house && city) return `${street} ${house}, ${city}`;
    if (street && city) return `${street}, ${city}`;
    if (city && country) return `${city}, ${country}`;
    return country || "";
  }
};
/*
  2. DATA MANAGEMENT (LocalStorage) //////////////////////////////////////////////////////////////////
*/
const DataManager = {
  getTasks: () => JSON.parse(localStorage.getItem("tasksState")) || {},
  saveTasks: (tasks) => localStorage.setItem("tasksState", JSON.stringify(tasks)),
  
  //getHabits: () => JSON.parse(localStorage.getItem("habitsState")) || [],
  getHabits: () => {
    const data = JSON.parse(localStorage.getItem("habitsState")) || [];
    if (Array.isArray(data)) return data;
    if (data && data.habits) return data.habits;
    
    return [];
  },
  saveHabits: (habits) => localStorage.setItem("habitsState", JSON.stringify(habits)),

  addTask: (name, dateStr, location) => {
    const tasks = DataManager.getTasks();
    // Inicjalizacja klucza daty, jeśli nie istnieje
    if (!tasks[dateStr]) tasks[dateStr] = {};
    
    tasks[dateStr][name] = { 
      done: false, 
      location: location || null, 
      type: "task" 
    };
    DataManager.saveTasks(tasks);
  },

  addHabit: (habitObj) => {
    const habits = DataManager.getHabits();
    habits.push(habitObj);
    DataManager.saveHabits(habits);
  },

  toggleHabitDone: (habitId, dateKey, isDone) => {
    const habits = DataManager.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      habit.history = habit.history || {};
      if (isDone) {
        habit.history[dateKey] = true;
      } else {
        delete habit.history[dateKey]; 
      }
      DataManager.saveHabits(habits);
    }
  },

  updateHabitDetails: (habitId, newFrequency, newSchedule, newStartDate) => {
    const habits = DataManager.getHabits();
    const index = habits.findIndex(h => h.id === habitId);
    
    if (index !== -1) {
        habits[index].frequency = newFrequency;
        habits[index].schedule = newSchedule;
        habits[index].createdAt = new Date(newStartDate).toISOString();
        
        DataManager.saveHabits(habits);
        console.log("Successfully updated habit in habitsState!");
    } else {
        console.error("Habit not found for ID:", habitId);
    }
  },

  calculateHabitProgress: (habit) => {
    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const createdDate = habit.createdAt ? new Date(habit.createdAt) : new Date();
        if (isNaN(createdDate)) return 0; 
        createdDate.setHours(0, 0, 0, 0);

        let scheduledDaysCount = 0;
        let completedDaysCount = 0;

        let d = new Date(createdDate.getTime());

        while (d <= now) {
            const dateKey = Utils.formatDateKey(d);
            const dayOfWeek = d.getDay();
            const dayOfMonth = d.getDate();

            let isScheduled = false;
            if (habit.frequency === "everyday" || habit.frequency === "daily") {
                isScheduled = true;
            } else if (habit.frequency === "weekly") {
                isScheduled = (habit.schedule || []).includes(dayOfWeek);
            } else if (habit.frequency === "monthly") {
                isScheduled = (habit.schedule || []).includes(dayOfMonth);
            }

            if (isScheduled) {
                scheduledDaysCount++;
                if (habit.history && habit.history[dateKey] === true) {
                    completedDaysCount++;
                }
            }
            d.setDate(d.getDate() + 1); 
        }

        console.log(`Habit: ${habit.name} | Sched: ${scheduledDaysCount} | Done: ${completedDaysCount}`);
        return scheduledDaysCount === 0 ? 0 : Math.round((completedDaysCount / scheduledDaysCount) * 100);

    } catch (e) {
        console.error("Critical error in progress calculation:", e);
        return 0;
    }
  },

  calculateStreak: (habit) => {
    if (!habit.history || Object.keys(habit.history).length === 0) return 0;

    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    
    const todayKey = Utils.formatDateKey(checkDate);
    const createdDate = new Date(habit.createdAt);
    createdDate.setHours(0, 0, 0, 0);

    while (checkDate >= createdDate) {
      const dateKey = Utils.formatDateKey(checkDate);
      const dayOfWeek = checkDate.getDay();
      const dayOfMonth = checkDate.getDate();

      let isScheduled = false;
      if (habit.frequency === "daily") {
        isScheduled = true;
      } else if (habit.frequency === "weekly") {
        isScheduled = habit.schedule.includes(dayOfWeek);
      } else if (habit.frequency === "monthly") {
        isScheduled = habit.schedule.includes(dayOfMonth);
      }

      if (isScheduled) {
        if (habit.history[dateKey] === true) {
          streak++;
        } else {
          if (dateKey === todayKey) {
          } else {
            break;
          }
        }
      } 
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  },

  getGoals: () => {
    return JSON.parse(localStorage.getItem("goalsState")) || [];
  },

  saveGoals: (goals) => {
    localStorage.setItem("goalsState", JSON.stringify(goals));
  },

  addGoal: (goal) => {
    const goals = DataManager.getGoals();
    goals.push(goal);
    DataManager.saveGoals(goals);
  },

  updateGoalDetails: (goalId, newData) => {
    const goals = DataManager.getGoals();
    const index = goals.findIndex(g => g.id === goalId);
    
    if (index !== -1) {
        goals[index].name = newData.name;
        goals[index].description = newData.description;
        goals[index].deadline = newData.deadline;
        goals[index].linkedHabitId = newData.linkedHabitId;
        
        DataManager.saveGoals(goals);
        console.log("Goal updated!");
    }
  },

  getUserStats: () => {
    const stats = localStorage.getItem(STATS_KEY);
    return stats ? JSON.parse(stats) : defaultStats;
  },

  saveUserStats: (stats) => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  },

  updateUserName: (newName) => {
    const stats = DataManager.getUserStats();
    stats.userName = newName;
    DataManager.saveUserStats(stats);
  }
};

const LevelManager = {
  // lvl 1 = 100xp, lvl 2 = 200xp, ... lvl 100 = 10000|
  getXpThreshold: (level) =>  {
    const standardThreshold = level * 100;
    return Math.min(standardThreshold, 10000);
  },

  calculateXP: (type, data) => {
    let xpGain = 0;

    switch (type) {
      case "task":
        // Standardowy task = 100 XP
        xpGain = 100;
        break;

      case "habit": // 100xp * streak
        const streak = data.streak || 1; 
        xpGain = streak * 100;
        break;

      case "goal":
        let goalXP = 1000;
        
        const created = new Date(goal.createdAt);
        const deadline = new Date(goal.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // every 30 days of goal duration +1000 XP
        const diffTime = Math.abs(deadline - created);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const monthlyBonuses = Math.floor(diffDays / 30);
        goalXP += (monthlyBonuses * 1000);

        // if before deadline +1000 XP
        if (today <= deadline) {
          goalXP += 1000;
        }
        
        xpGain = goalXP;
        break;
    }
    return xpGain;
  },


  applyXP: (amount) => {
    const stats = DataManager.getUserStats(); // { totalXp: 0, currentXp: 0, level: 1 }
    stats.totalXp += amount;
    stats.currentXp += amount;

    while (stats.currentXp >= LevelManager.getXpThreshold(stats.level)) {
      stats.currentXp -= LevelManager.getXpThreshold(stats.level);
      stats.level++;
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    }

    while (stats.currentXp < 0 && stats.level > 1) {
      stats.level--;
      stats.currentXp += LevelManager.getXpThreshold(stats.level);
    }

    DataManager.saveUserStats(stats);
    UI.updateXPBar(); // refresh
  }
};
/*
  3. UI RENDERING //////////////////////////////////////////////////////////////////
*/
const UI = {
  resetModal: () => {
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

    const sectionsToReset = [
      { sel: ".typePickers", display: "flex" },
      { sel: ".nameSection", display: "flex" },
      { sel: "#habitIconWrapper", display: "flex" }, 
      { sel: "#locationSection", display: "flex" },
      { sel: "#habitSection .modalSubTitle", text: "Icon" } 
    ];

    sectionsToReset.forEach(item => {
      const el = document.querySelector(item.sel);
      if (el) {
          if (item.display) el.style.display = item.display;
          if (item.text) el.textContent = item.text;
      }
    });

    // oryginalny tytuł sekcji daty
    const dateTitle = document.querySelector("#dateSection .modalSubTitle");
    if (dateTitle) dateTitle.textContent = "Date";

    const url = window.location.href.toLowerCase();
    if (url.includes("habit")) {
        currentCreateType = "habit";
    } else if (url.includes("hero")) {
        currentCreateType = "goal";
    } else {
        currentCreateType = "task";
    }

    const typePickers = document.querySelectorAll('.typePicker');
    typePickers.forEach(btn => {
      const btnType = btn.getAttribute('data-type');
      btn.classList.toggle('active', btnType === currentCreateType);
    });

    // Odświeżenie pól pod konkretny typ
    UI.toggleModalFields(currentCreateType);

    // Odznaczanie checkboxów w pickerach dni
    const allCheckboxes = document.querySelectorAll('#daysPicker input, #monthDaysGrid input');
    allCheckboxes.forEach(cb => cb.checked = false);
  },

  applyRandomGradient: () => {
    const randomIndex = Math.floor(Math.random() * GRADIENTS.length);
    const selectedGradient = GRADIENTS[randomIndex];
    
    document.documentElement.style.setProperty('--hero-gradient', selectedGradient);
  },

  toggleModalFields: (type) => {
    const isHabit = type === "habit";
    const isGoal = type === "goal";
    const isTask = type === "task";

    if (elements.dateSection) elements.dateSection.style.display = (isTask) ? "flex" : "none";
    if (elements.habitSection) elements.habitSection.style.display = isHabit ? "flex" : "none";
    if (elements.goalSection) elements.goalSection.style.display = isGoal ? "flex" : "none";
    
    if (elements.locationSection) elements.locationSection.style.display = (isTask || isHabit) ? "flex" : "none";

    if (elements.daysPicker) elements.daysPicker.style.display = "none";
    if (elements.monthlyDayPicker) elements.monthlyDayPicker.style.display = "none";
    
    if (isGoal) {
        UI.fillHabitSelect();
    }
  },

  openEditHabitModal: (habit) => {
    UI.resetModal(); 
    
    document.querySelector(".typePickers").style.display = "none";
    document.querySelector(".nameSection").style.display = "none";
    document.getElementById("locationSection").style.display = "none";
    document.getElementById("goalSection").style.display = "none";
    document.getElementById("habitIconWrapper").style.display = "none";

    document.getElementById("habitSection").style.display = "flex";
    document.getElementById("dateSection").style.display = "flex";
    document.querySelector("#dateSection .modalSubTitle").textContent = "Start Date";
    document.getElementById("modalTitle").textContent = "Edit Habit";

    const freqSelect = document.getElementById("habitFrequency");
    freqSelect.value = habit.frequency;
    
    const startDate = new Date(habit.createdAt).toISOString().split('T')[0];
    document.getElementById("taskDate").value = startDate;

    freqSelect.dispatchEvent(new Event('change'));

    if (habit.schedule) {
        const container = habit.frequency === "weekly" ? elements.daysPicker : document.getElementById("monthDaysGrid");
        habit.schedule.forEach(val => {
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
        console.error("KATASTROFA: Nie znaleziono przycisku confirmAddBtn w HTML!");
        return;
    }

    // 3. Forsujemy zmiany (używamy style.display bezpośrednio)
    btn.textContent = "Save Changes";
    btn.setAttribute("data-edit-id", goal.id);
    btn.setAttribute("data-edit-type", "goal");

    if (title) title.textContent = "Edit Goal";

    // 4. Ukrywamy zbędne rzeczy - agresywnie
    const toHide = [".typePickers", "#habitSection", "#locationSection", "#dateSection"];
    toHide.forEach(s => {
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
    if (elements.descriptionInput) elements.descriptionInput.value = goal.description || "";
    if (elements.goalDeadline) elements.goalDeadline.value = goal.deadline || "";
    
    // Ustawienie nawyku
    if (elements.goalHabitSelect) {
        elements.goalHabitSelect.value = goal.linkedHabitId ? String(goal.linkedHabitId) : "";
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

    habits.forEach(habit => {
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
        if (elements.messageGoals) elements.messageGoals.style.display = "block";
      } else {
        elements.emptyListMessageWrapper.style.display = "none";
        if (elements.messageGoals) elements.messageGoals.style.display = "none";
      }
    }

    goals.forEach(goal => {
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

  createProgressCircle: (percentage) => {
    const size = 28;
    const stroke = 4;
    const radius = (size - stroke) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    const svgNS = "http://www.w3.org/2000/svg";

    const container = document.createElement('div');
    container.className = 'progress-ring-container';

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
    progressCircle.setAttribute("stroke-dasharray", `${circumference} ${circumference}`);
    progressCircle.style.strokeDashoffset = offset;
    progressCircle.setAttribute("stroke-linecap", "round");

    svg.appendChild(bgCircle);
    svg.appendChild(progressCircle);
    container.appendChild(svg);

    return container;
  },

  createDeadlineIcon: () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "10");
    svg.setAttribute("height", "10");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("lucide", "lucide-calendar-clock");

    const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path1.setAttribute("d", "M16 14v2.2l1.6 1");
    
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path2.setAttribute("d", "M16 2v4");
    const path5 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path5.setAttribute("d", "M8 2v4");
    
    const path3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path3.setAttribute("d", "M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5");
    
    const path4 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path4.setAttribute("d", "M3 10h5");
    
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "16");
    circle.setAttribute("cy", "16");
    circle.setAttribute("r", "6");

    svg.append(path1, path2, path3, path4, path5, circle);
    return svg;
  },

  createLocationIcon: () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "10"); 
    svg.setAttribute("height", "10");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("lucide", "lucide-map-pin");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0");
    
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "10");
    circle.setAttribute("r", "3");

    svg.append(path, circle);
    return svg;
  },

  createRepeatIcon: () => {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("lucide", "lucide-repeat");

    // Definicja wszystkich ścieżek (path) z Twojego SVG
    const paths = [
      "m17 2 4 4-4 4",
      "M3 11v-1a4 4 0 0 1 4-4h14",
      "m7 22-4-4 4-4",
      "M21 13v1a4 4 0 0 1-4 4H3"
    ];

    paths.forEach(d => {
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    });

    return svg;
  },

  createCheckIcon: () => {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    const path1 = document.createElementNS(svgNS, "path");
    path1.setAttribute("d", "M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344");

    const path2 = document.createElementNS(svgNS, "path");
    path2.setAttribute("d", "m9 11 3 3L22 4");

    svg.appendChild(path1);
    svg.appendChild(path2);
    return svg;
  },

  createEllipsisIcon: () => {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("lucide", "lucide-ellipsis");

    const circles = [
        { cx: "12", cy: "12" },
        { cx: "19", cy: "12" },
        { cx: "5", cy: "12" }
    ];

    circles.forEach(coords => {
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", coords.cx);
        circle.setAttribute("cy", coords.cy);
        circle.setAttribute("r", "1");
        svg.appendChild(circle);
    });

    return svg;
  },

  createDeleteIcon: () => {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("lucide", "lucide-trash");

    const path1 = document.createElementNS(svgNS, "path");
    path1.setAttribute("d", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6");
    
    const path2 = document.createElementNS(svgNS, "path");
    path2.setAttribute("d", "M3 6h18");
    
    const path3 = document.createElementNS(svgNS, "path");
    path3.setAttribute("d", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2");

    svg.appendChild(path1);
    svg.appendChild(path2);
    svg.appendChild(path3);
    
    return svg;
  },

  createGoalIcon: () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("lucide", "lucide-goal");

    const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path1.setAttribute("d", "M12 13V2l8 4-8 4");
    
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path2.setAttribute("d", "M20.561 10.222a9 9 0 1 1-12.55-5.29");
    
    const path3 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path3.setAttribute("d", "M8.002 9.997a5 5 0 1 0 8.9 2.02");

    svg.appendChild(path1);
    svg.appendChild(path2);
    svg.appendChild(path3);

    return svg;
  },

  createDescriptionIcon: () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "10"); 
    svg.setAttribute("height", "10");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.classList.add("lucide", "lucide-align-left");

    const paths = [
        "M21 6H3",
        "M21 12H3",
        "M17 18H3"
    ];
    paths.forEach(d => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", d);
        svg.appendChild(path);
    });

    return svg;
  },

  createEllipsisIcon: () => {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.classList.add("lucide", "lucide-ellipsis");

    const circles = [{cx: "12", cy: "12"}, {cx: "19", cy: "12"}, {cx: "5", cy: "12"}];
    circles.forEach(c => {
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", c.cx);
        circle.setAttribute("cy", c.cy);
        circle.setAttribute("r", "1");
        svg.appendChild(circle);
    });
    return svg;
  },

  renderTasksForDay: (targetDate = new Date(), showCompleted = false) => {
    if (!elements.toDoList) return;

    const dateKey = Utils.formatDateKey(targetDate);
    const dayOfWeek = targetDate.getDay();
    const dayOfMonth = targetDate.getDate(); 
    const todayKey = Utils.formatDateKey(new Date());

    elements.taskDateTitle.textContent = (dateKey === todayKey) 
      ? "Today's Tasks:" 
      : `Tasks for ${targetDate.toDateString()}:`;

    //elements.toDoList.innerHTML = "";

    const savedTasks = DataManager.getTasks();
    const savedHabits = DataManager.getHabits();
    const savedGoals = DataManager.getGoals();
    
    const undoneNodes = [];
    const doneNodes = [];

    // --- 1. ZADANIA (Tasks) ---
    const tasksForDate = savedTasks[dateKey] || {};
    Object.entries(tasksForDate).forEach(([name, data]) => {

      const li = UI.createItem(name, data, dateKey, "task");

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

    // --- 2. NAWYKI (Habits) ---
    savedHabits.forEach(habit => {
      const viewingDate = Utils.formatDateKey(targetDate); 
      const createdDate = Utils.formatDateKey(new Date(habit.createdAt));

      if (viewingDate < createdDate) return;

      let isDueToday = false;
      const schedule = habit.schedule || []; 

      if ( habit.frequency === "daily") {
        isDueToday = true;
      } else if (habit.frequency === "weekly") {
        isDueToday = schedule.includes(dayOfWeek);
      } else if (habit.frequency === "monthly") {
        isDueToday = schedule.includes(dayOfMonth);
      }

      if (isDueToday) {
        const isDone = habit.history && habit.history[dateKey];
        const li = UI.createItem(habit.name, habit, dateKey, "habit");

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
    savedGoals.forEach(goal => {
      if (goal.deadline === dateKey) {
        const li = UI.createItem(goal.name, goal, dateKey, "goal");
        
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

    while (elements.toDoList.firstChild) {
      elements.toDoList.removeChild(elements.toDoList.firstChild);
    }

    if (elements.emptyListMessageWrapper) elements.emptyListMessageWrapper.style.display = "none";

    if (undoneNodes.length === 0 && (doneNodes.length === 0 || !showCompleted)) {
      if (elements.emptyListMessageWrapper) elements.emptyListMessageWrapper.style.display = "flex";
      const isToday = dateKey === todayKey;
      if (isToday) {
        if (elements.messageToday) elements.messageToday.style.display = "block";
      } else {
        if (elements.messageFuture) elements.messageFuture.style.display = "block";
      }
    }

    // Łączymy listy
    const listFragment = document.createDocumentFragment();
    undoneNodes.forEach(node => listFragment.appendChild(node));
    doneNodes.forEach(node => listFragment.appendChild(node));
    elements.toDoList.appendChild(listFragment);
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
    habits.forEach(habit => {
        const option = document.createElement("option");
        option.value = habit.id;
        option.textContent = habit.name;
        select.appendChild(option);
    });
  },

  createItem: (name, data, dateKey, type) => {
    const li = document.createElement("li");
    li.className = `taskItem ${type === "habit" ? "is-habit" : type === "goal" ? "is-goal" : "is-task"}`;
  
    const taskContent = document.createElement("div");
    taskContent.className = "taskContent";
  
    const taskLabel = document.createElement("span");
    taskLabel.className = "taskLabel";
    const statusIcon = type === "habit" ? UI.createRepeatIcon() : type === "goal" ? UI.createGoalIcon() : UI.createCheckIcon();
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
      editGoalBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>`;
      
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
        const dateText = document.createTextNode(`Deadline: ${dateObj.toLocaleDateString()}`);
        
        deadlineSpan.appendChild(deadlineIcon);
        deadlineSpan.appendChild(dateText);
        metaWrapper.appendChild(deadlineSpan);
      }

      if (data.linkedHabitId) {
        const habits = DataManager.getHabits();
        console.log(DataManager.getHabits());
        const habit = habits.find(h => Number(h.id) === Number(data.linkedHabitId));        
        if (habit) {
          const linkedSpan = document.createElement("span");
          linkedSpan.className = "linkedHabitBadge";
          
          const icon = UI.createRepeatIcon ? UI.createRepeatIcon() : document.createTextNode("🔄 ");
          icon.classList.add("small-icon");

          linkedSpan.appendChild(icon);
          linkedSpan.appendChild(document.createTextNode(` Linked: ${habit.name}`));
          
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
    const isActuallyDone = type === "task" ? data.done : (data.history && data.history[dateKey]);
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
          const filtered = habits.filter(h => h.id !== data.id); 
          DataManager.saveHabits(filtered);
          if (elements.habitSection) UI.renderHabits();
        } else if (type === "goal") {
          const goals = DataManager.getGoals();
          const filtered = goals.filter(g => g.id !== data.id);
          DataManager.saveGoals(filtered);
          if (elements.goalsList) UI.renderGoals();
          if (elements.calendarGrid) UI.renderCalendar();
        }
        
        const calendarEl = document.getElementById("calendarGrid");
        const isCalendar = calendarEl && window.getComputedStyle(calendarEl).display !== "none";
        UI.renderTasksForDay(selectedDate, isCalendar);


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
    checkbox.addEventListener("change", function() {
      const isChecked = this.checked; 
      const todayKey = Utils.formatDateKey(new Date());
      const isToday = (dateKey === todayKey);

      if (type === "task") {
        const tasks = DataManager.getTasks();
        if (tasks[dateKey] && tasks[dateKey][name]) {
          tasks[dateKey][name].done = isChecked; 
          DataManager.saveTasks(tasks);
        }
      } else if (type === "habit") {
        DataManager.toggleHabitDone(data.id, dateKey, isChecked);
      }
      else if (type === "goal") {
        const goals = DataManager.getGoals();
        const goal = goals.find(g => g.id === data.id);
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
        const isCalendar = !!elements.calendarGrid; 
        UI.renderTasksForDay(selectedDate, isCalendar);
      }, 300);
    });
  
    return li;
  },
  

  renderCalendar: () => {
    if (!elements.calendarGrid) return;

    elements.calendarGrid.innerHTML = '';
    
    elements.currentMonth.textContent = date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    const year = date.getFullYear();
    const month = date.getMonth();

    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(d => {
      const el = document.createElement('div');
      el.textContent = d;
      el.className = 'day-label';
      elements.calendarGrid.appendChild(el);
    });

    const firstDay = new Date(year, month, 1);
    const startIndex = Utils.getMondayFirstDay(firstDay);

    for (let i = 0; i < startIndex; i++) {
      elements.calendarGrid.appendChild(document.createElement('div'));
    }

    const allGoals = DataManager.getGoals();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const el = document.createElement('div');
      el.className = 'day';

      const currentLoopDate = new Date(year, month, day);
      const dateKey = Utils.formatDateKey(currentLoopDate); 

      const goalsForThisDay = allGoals.filter(goal => goal.deadline === dateKey);
      const hasGoalDeadline = goalsForThisDay.length > 0;

      const dayNumber = document.createElement('span');
      dayNumber.textContent = day;
      el.appendChild(dayNumber);

      if (hasGoalDeadline) {
        const deadlineIconWrapper = document.createElement('div');
        deadlineIconWrapper.className = 'day-goal-wrapper';

        const today = new Date();
        today.setHours(0, 0, 0, 0); 

        const isAnyUnfinishedOverdue = goalsForThisDay.some(goal => !goal.done && currentLoopDate < today);

        if (isAnyUnfinishedOverdue) {
            deadlineIconWrapper.classList.add('is-overdue');
        }

        deadlineIconWrapper.appendChild(UI.createGoalIcon()); 
        el.appendChild(deadlineIconWrapper);
      }

      if (selectedDate.getFullYear() === year && 
          selectedDate.getMonth() === month && 
          selectedDate.getDate() === day) {
        el.classList.add('active');
      }

      el.onclick = () => {
        document.querySelectorAll('.day').forEach(d => d.classList.remove('active'));
        el.classList.add('active');
        selectedDate = new Date(year, month, day);
        UI.renderTasksForDay(selectedDate, true);      
      };

      elements.calendarGrid.appendChild(el);
    }
  },
  
  
  renderHabits: () => {
    const container = document.getElementById("habitCarousel");
    if (!container) return;

    const habits = DataManager.getHabits();
    container.innerHTML = "";

    if (habits.length === 0) {
      const noHabitsMsg = document.createElement("p");
      noHabitsMsg.textContent = "No habits added yet! Add one to see its statistics.";
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
        iconCircle.textContent = habit.icon || habit.name.charAt(0).toUpperCase();
        card.appendChild(iconCircle);
        
        const name = document.createElement("p");
        name.textContent = habit.name;
        name.className = "habit-name-label"; 
        card.appendChild(name);

        card.onclick = () => {
          document.querySelectorAll('.habit-card-icon').forEach(c => c.classList.remove('active-habit-icon'));
          iconCircle.classList.add('active-habit-icon');
          UI.showHabitDetails(habit);
          card.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        };

        container.appendChild(card);

        // PRZENIESIONE TUTAJ - do środka try
        if (index === 0) {
          iconCircle.classList.add('active-habit-icon');
          UI.showHabitDetails(habit);
        }

      } catch (error) {
        console.error(`Błąd przy nawyku: ${habit.name}`, error);
      }
    });
  },

  showHabitDetails: (habit) => {
    selectedHabitForStats = habit;

    const progress = DataManager.calculateHabitProgress(habit);
    const freqMap = {
      "daily": "Everyday",
      "weekly": "Days of the week",
      "monthly": "Days of the month"
    };
    let frequencyText = freqMap[habit.frequency] || habit.frequency;
    if (habit.frequency === "weekly" && habit.schedule && habit.schedule.length > 0) {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const selectedDays = habit.schedule
        .sort((a, b) => a - b)
        .map(dayNum => dayNames[dayNum]);
      frequencyText += `: ${selectedDays.join(", ")}`;
    }
    if (habit.frequency === "monthly" && habit.schedule && habit.schedule.length > 0) {
      const selectedDays = habit.schedule.sort((a, b) => a - b);
      frequencyText += `: ${selectedDays.join(", ")}`;
    }
    const startDate = habit.createdAt ? new Date(habit.createdAt).toLocaleDateString('en-US') : "Unknown";
    
    document.getElementById("habitDetails").style.display = "block";
    document.getElementById("detailHabitName").textContent = habit.name;
    const streakValue = DataManager.calculateStreak(habit);
    if (habit.frequency === "daily") {
      unit = streakValue === 1 ? "day" : "days";
    } else {
      unit = streakValue === 1 ? "time" : "times";
    }
    document.getElementById("detailStreak").textContent = `${streakValue} ${unit}`;

    document.getElementById("completionPercent").textContent = `${progress}\u00A0%`;
    document.getElementById("frequencyData").textContent = frequencyText;
    document.getElementById("startData").textContent = startDate;
    


    const circleContainer = document.getElementById("detailProgressCircle");
    circleContainer.innerHTML = "";
    circleContainer.appendChild(UI.createProgressCircle(progress));
    UI.renderActivityGrid(habit);
  },

  renderActivityGrid: (habit) => {
    const grid = document.getElementById("activityGrid");
    if (!grid) return;

    grid.innerHTML = "";
    
    const year = statsViewDate.getFullYear();
    const month = statsViewDate.getMonth();

    const monthLabel = document.querySelector(".activity-section h4");
    if (monthLabel) {
        monthLabel.textContent = statsViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    let scheduledThisMonth = 0;
    let completedThisMonth = 0;
    let currentStreak = 0;
    let bestStreak = 0;

    const firstDay = new Date(year, month, 1);
    const startIndex = Utils.getMondayFirstDay(firstDay);

    for (let i = 0; i < startIndex; i++) {
        grid.appendChild(document.createElement('div'));
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const el = document.createElement('div');
        el.className = 'mini-day';
        el.textContent = day;

        const currentIterDate = new Date(year, month, day);
        const dateKey = Utils.formatDateKey(currentIterDate);
        const dayOfWeek = currentIterDate.getDay();
        
        const createdDate = new Date(habit.createdAt);
        createdDate.setHours(0,0,0,0);

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
                el.classList.add('habit-done');
            } else {
                currentStreak = 0; // Streak crash
            }
        } else {
            el.classList.add('inactive');
        }

        grid.appendChild(el);
    }

    // ---  STATS UPDATE ---
    const percentage = scheduledThisMonth === 0 ? 0 : Math.round((completedThisMonth / scheduledThisMonth) * 100);

    const streakEl = document.getElementById("monthBestStreak");
    const percentEl = document.getElementById("monthPercentage");
    const countEl = document.getElementById("monthCount");

    if (streakEl) streakEl.textContent = `${bestStreak} days`;
    if (percentEl) percentEl.textContent = `${percentage}%`;
    if (countEl) countEl.textContent = `${completedThisMonth} / ${scheduledThisMonth}`;
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
    
    if (xpRatio) xpRatio.textContent = `${Math.floor(stats.currentXp)} / ${threshold}`;
    
    if (totalXpDisplay) totalXpDisplay.textContent = stats.totalXp;
  },  

  showModalMessage: (text, duration = 3000) => {
    const wrapper = document.getElementById('modalMessageWrapper');
    const msgSpan = document.getElementById('modalMessage');

    if (!wrapper || !msgSpan) return;

    msgSpan.textContent = text;
    wrapper.style.display = 'flex'; 

    wrapper.classList.add('shake-animation');

    setTimeout(() => {
      wrapper.style.display = 'none';
      wrapper.classList.remove('shake-animation');
    }, duration);
  },

};
/*
  EVENT LISTENERS ///////////////////////////////////////////////////////////////////////////////
*/
function initEventListeners() {
  // Modal Toggles
  elements.addTaskBtn?.addEventListener("click", () => {
    UI.resetModal(); // Najpierw ustawia typ i czyści pola
    elements.modalOverlay.classList.add("open"); // Potem otwiera
  });

  // Editing habit
  document.getElementById("editHabitFrequency")?.addEventListener("click", () => {
    if (selectedHabitForStats) UI.openEditHabitModal(selectedHabitForStats);
  });

  document.getElementById("editHabitStartDate")?.addEventListener("click", () => {
    if (selectedHabitForStats) UI.openEditHabitModal(selectedHabitForStats);
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
  document.getElementById('prevStatMonth')?.addEventListener('click', () => {
    statsViewDate.setMonth(statsViewDate.getMonth() - 1);
    if (selectedHabitForStats) UI.renderActivityGrid(selectedHabitForStats);
  });

  document.getElementById('nextStatMonth')?.addEventListener('click', () => {
    statsViewDate.setMonth(statsViewDate.getMonth() + 1);
    if (selectedHabitForStats) UI.renderActivityGrid(selectedHabitForStats);
  });

  //calendar arrows
  document.getElementById('prevMonth')?.addEventListener('click', () => {
    date.setMonth(date.getMonth() - 1);
    UI.renderCalendar();
  });
  
  document.getElementById('nextMonth')?.addEventListener('click', () => {
    date.setMonth(date.getMonth() + 1);
    UI.renderCalendar();
  });

  // modal type switch
  document.querySelectorAll('.typePicker').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.target.getAttribute("data-type");
      currentCreateType = type;
      
      document.querySelectorAll(".typePicker").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");

      UI.toggleModalFields(type);
    });
  });


  // habit frequency listeners
  elements.habitFrequency?.addEventListener("change", () => {
    elements.daysPicker.style.display = elements.habitFrequency.value === "weekly" ? "flex" : "none";
  });
  elements.habitFrequency?.addEventListener("change", () => {
    elements.monthlyDayPicker.style.display = elements.habitFrequency.value === "monthly" ? "block" : "none";
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
        UI.showModalMessage("Location not found")
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
    if (!navigator.geolocation) return UI.showModalMessage("Geolocation not supported");
  
    // --- START LOADING ---
    const btn = elements.geoLocBtn;
    const input = elements.locationInput;
    const originalPlaceholder = input.placeholder;
  
    btn.classList.add("loading");
    btn.disabled = true;
    input.value = "Locating... ⏳";
    input.classList.remove("success", "error");
  
    navigator.geolocation.getCurrentPosition(async (position) => {
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
        UI.showModalMessage("Address not found, but we have your coords!")
      } finally {
        // --- END LOADING (Success/Error) ---
        btn.classList.remove("loading");
        btn.disabled = false;
        input.placeholder = originalPlaceholder;
      }
    }, (err) => {
      // --- END LOADING (Permission Denied/Timeout) ---
      btn.classList.remove("loading");
      btn.disabled = false;
      input.disabled = false;
      input.placeholder = originalPlaceholder;
      
      const messages = {
        1: "Permission denied. Enable location in settings.",
        2: "Position unavailable. Check your GPS.",
        3: "Timeout. Try again."
      };
      UI.showModalMessage(messages[err.code] || "Could not get location.")
    }, {
      enableHighAccuracy: true,
      timeout: 10000 // 10 sekund na odpowiedź GPS
    });
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
        elements.userNameInput.value = stats.userName || elements.displayUserName.textContent;
        
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
              linkedHabitId: elements.goalHabitSelect.value ? parseInt(elements.goalHabitSelect.value) : null
          };

          if (!newData.name || !newData.deadline) {
              return UI.showModalMessage("Name and Deadline are required!");
          }

          DataManager.updateGoalDetails(parseInt(editId), newData);
          if (elements.goalsList) UI.renderGoals(); 
      } 
      else {
        const newFreq = document.getElementById("habitFrequency").value;
        const newStartDate = document.getElementById("taskDate").value;
        let newSchedule = [];

        if (newFreq === "weekly") {
          newSchedule = Array.from(elements.daysPicker.querySelectorAll("input[type='checkbox']:checked")).map(cb => parseInt(cb.value));
        } else if (newFreq === "monthly") {
          newSchedule = Array.from(document.getElementById("monthDaysGrid").querySelectorAll("input[type='checkbox']:checked")).map(cb => parseInt(cb.value));
        }

        DataManager.updateHabitDetails(parseInt(editId), newFreq, newSchedule, newStartDate);
        
        const updatedHabit = DataManager.getHabits().find(h => h.id === parseInt(editId));
        if (updatedHabit) {
          selectedHabitForStats = updatedHabit;
          UI.showHabitDetails(updatedHabit);
        }
        UI.renderHabits();
        UI.renderTasksForDay(selectedDate, true);
      }
      elements.modalOverlay.classList.remove("open");
        UI.resetModal();
        return; 
    }

    let name = elements.taskName.value.trim();
    if (!name) {
      UI.showModalMessage("Provide a name! ✍️");
      return; 
    }
    name = name.charAt(0).toUpperCase() + name.slice(1);

    const type = currentCreateType; 
    const location = elements.locationInput?.value.trim() || null;

    // (Task)
    if (type === "task") {
      const dateStr = elements.taskDate.value || Utils.formatDateKey(selectedDate);
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
        schedule = Array.from(elements.daysPicker.querySelectorAll("input[type='checkbox']:checked"))
        .map(cb => parseInt(cb.value));
        if (schedule.length === 0) return UI.showModalMessage("Select at least one day!");
      } else if (frequency === "monthly") {
        const monthlyGrid = document.getElementById("monthDaysGrid");
        schedule = Array.from(monthlyGrid.querySelectorAll("input[type='checkbox']:checked"))
        .map(cb => parseInt(cb.value));
        if (schedule.length === 0) return UI.showModalMessage("Enter days of the month!");
      }
      
      const habit = {
        id: Date.now(),
        name,
        icon: finalIcon,
        location: location,
        frequency: frequency,
        schedule: schedule,
        createdAt: new Date().toISOString(),
        history: {}
      };
      DataManager.addHabit(habit);
    }
    
    else if (type === "goal") {
      const description = elements.descriptionInput?.value.trim() || "";
      const deadline = elements.goalDeadline?.value || null;
      const habitSelectEl = document.getElementById("goalHabitSelect");
      
      if (!deadline) {
        UI.showModalMessage("Provide a deadline for your goal! 📅");
        if (elements.taskDate) elements.taskDate.focus();
        return;
      }

      const goal = {
        id: Date.now(),
        name: name,
        description: description,
        deadline: deadline,
        linkedHabitId: (habitSelectEl && habitSelectEl.value) ? parseInt(habitSelectEl.value) : null,        
        createdAt: new Date().toISOString(),
        done: false
      };

      console.log("Dodaję Goal: ", goal);
      DataManager.addGoal(goal);
    }

    if (elements.grid) UI.renderCalendar();
    
    if (elements.toDoList && !elements.habitSection) UI.renderTasksForDay(selectedDate, false);

    if (elements.habitSection) {
      UI.renderHabits();
      UI.renderTasksForDay(selectedDate, true);
    }

    if (elements.goalsList) UI.renderGoals();

    elements.modalOverlay.classList.remove("open");
    UI.resetModal();
  });
}
/*
  GŁÓWNY INICJATOR  //////////////////////////////////////////////////////////////////
*/
document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  initEventListeners(); 
  UI.applyRandomGradient();
  UI.setupMonthlyGrid();
  UI.updateGoalHabitSelect();
  const stats = DataManager.getUserStats();
  const nameLabel = document.getElementById("displayUserName");
  if (nameLabel) {
    nameLabel.textContent = stats.userName;
  }
  DataManager.getUserStats();
  UI.updateXPBar();

  // index
  if (elements.toDoList && !elements.grid) {
    UI.renderTasksForDay();
  } 
  // calendar
  if (elements.calendarGrid) {
    UI.renderCalendar();
    UI.renderTasksForDay(selectedDate, true);
  }
  // habits
  if (elements.habitSection) {
    UI.renderHabits();
  }
  // goals
  if (elements.goalsList) {
    UI.renderGoals();
  }
});