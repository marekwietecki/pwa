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
/*
  DOM Elements /////////////////////////////////////////////////////////////////////
*/ 
const elements = {};

function cacheElements() {
  const ids = [
    "calendarGrid", "currentMonth", "toDoList", "taskDateTitle", 
    "modalOverlay", "taskType", "taskName", "taskDate", 
    "locationInput", "taskDateSection", "habitSection", 
    "habitFrequency", "daysPicker", "monthlyDayPicker", 
    "addTaskBtn", "closeModal", "searchLocation", "useMyLocation", 
    "goalSection"
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
  
  getHabits: () => JSON.parse(localStorage.getItem("habitsState")) || [],
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

  calculateHabitProgress: (habit) => {
    try {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Zabezpieczenie: jeśli brak createdAt, przyjmij dzisiaj
        const createdDate = habit.createdAt ? new Date(habit.createdAt) : new Date();
        if (isNaN(createdDate)) return 0; // Jeśli data jest nieprawidłowa
        createdDate.setHours(0, 0, 0, 0);

        let scheduledDaysCount = 0;
        let completedDaysCount = 0;

        // Ważne: Tworzymy nową instancję daty do pętli, 
        // żeby nie modyfikować oryginału
        let d = new Date(createdDate.getTime());

        while (d <= now) {
            const dateKey = Utils.formatDateKey(d);
            const dayOfWeek = d.getDay();
            const dayOfMonth = d.getDate();

            let isScheduled = false;
            // Spójność nazw z Twoim zapisywaniem:
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
            d.setDate(d.getDate() + 1); // Przejdź do kolejnego dnia
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

  //sorting
  const completedDates = Object.keys(habit.history)
    .filter(key => habit.history[key] === true)
    .sort()
    .reverse();

  if (completedDates.length === 0) return 0;

  let streak = 0;
  let today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayKey = Utils.formatDateKey(today);
  const yesterdayKey = Utils.formatDateKey(yesterday);

  if (!habit.history[todayKey] && !habit.history[yesterdayKey]) {
    return 0;
  }

  // ciągłość dzień po dniu
  let checkDate = habit.history[todayKey] ? today : yesterday;
  
  while (true) {
    const key = Utils.formatDateKey(checkDate);
    if (habit.history[key]) {
      streak++;
      // Jeśli streak to 5, pętla leci 5 razy, a nie 365.
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
};
/*
  3. UI RENDERING //////////////////////////////////////////////////////////////////
*/
const UI = {
  resetModal: () => {
    if (elements.taskName) elements.taskName.value = "";
    if (elements.taskDate) elements.taskDate.value = "";
    if (elements.locationInput) {
      elements.locationInput.value = "";
      elements.locationInput.classList.remove("success", "error");
    }

    const url = window.location.href.toLowerCase();
    if (url.includes("habit")) {
        currentCreateType = "habit";
    } else if (url.includes("hero")) {
        currentCreateType = "goal";
    } else {
        currentCreateType = "task";
    }

    const typePickers = document.querySelectorAll('.typePicker');

    if (typePickers.length > 0) {
        typePickers.forEach(btn => {
            const btnType = btn.getAttribute('data-type');
            btn.classList.remove('active');
            
            if (btnType === currentCreateType) {
                btn.classList.add('active');
            }
        });
    }

    const isHabit = currentCreateType === "habit";
    const isGoal = currentCreateType === "goal";

    if (elements.taskDateSection) elements.taskDateSection.style.display = (isHabit || isGoal) ? "none" : "block";
    if (elements.habitSection) elements.habitSection.style.display = isHabit ? "block" : "none";
    if (elements.daysPicker) elements.daysPicker.style.display = "none";
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
    progressCircle.setAttribute("stroke", "#4caf50");
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


  renderTasksForDay: (targetDate = new Date(), showCompleted = false) => {
    if (!elements.toDoList) return;

    const dateKey = Utils.formatDateKey(targetDate);
    const dayOfWeek = targetDate.getDay();
    const dayOfMonth = targetDate.getDate(); 
    const todayKey = Utils.formatDateKey(new Date());

    elements.taskDateTitle.textContent = (dateKey === todayKey) 
      ? "Today's Goals:" 
      : `Goals for ${targetDate.toDateString()}:`;

    elements.toDoList.innerHTML = "";

    const savedTasks = DataManager.getTasks();
    const savedHabits = DataManager.getHabits();
    
    const undoneNodes = [];
    const doneNodes = [];

    // --- 1. ZADANIA (Tasks) ---
    const tasksForDate = savedTasks[dateKey] || {};
    Object.entries(tasksForDate).forEach(([name, data]) => {

      const li = UI.createTaskNode(name, data, dateKey, "task");

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
      const createdDate = new Date(habit.createdAt);
      createdDate.setHours(0,0,0,0);
      const viewingDate = new Date(targetDate);
      viewingDate.setHours(0,0,0,0);

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
        const li = UI.createTaskNode(habit.name, habit, dateKey, "habit");

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

    // Łączymy listy
    const listFragment = document.createDocumentFragment();
    undoneNodes.forEach(node => listFragment.appendChild(node));
    doneNodes.forEach(node => listFragment.appendChild(node));

    elements.toDoList.appendChild(listFragment);
  },

  createTaskNode: (name, data, dateKey, type) => {
    const li = document.createElement("li");
    li.className = `taskItem ${type === "habit" ? "is-habit" : "is-task"}`;
  
    // 1. Kontener na treść
    const taskContent = document.createElement("div");
    taskContent.className = "taskContent";
  
    const taskLabel = document.createElement("label");
    taskLabel.className = "taskLabel";
    taskLabel.textContent = `${type === "habit" ? "🔁" : "✅"} ${name}`;
  
    const metaWrapper = document.createElement("div");
    metaWrapper.className = "taskMetaWrapper";
    
    if (data.location) {
      const locSpan = document.createElement("span");
      locSpan.textContent = `📍 ${data.location}`;
      metaWrapper.appendChild(locSpan);
    }
  
    taskContent.appendChild(taskLabel);
    taskContent.appendChild(metaWrapper);
  
    // 2. Kontener na akcje
    const taskActions = document.createElement("div");
    taskActions.className = "taskActions";

    if (type === "habit" || type === "goal") {
      const progress = DataManager.calculateHabitProgress(data);
      const circle = UI.createProgressCircle(progress);
      taskActions.appendChild(circle);
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "taskCheckbox";
  
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "deleteTaskBtn";
    deleteBtn.textContent = "🗑️";

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Żeby nie kliknąć przy okazji w li
      
      if (confirm(`Delete "${name}"?`)) {
          if (type === "task") {
              const tasks = DataManager.getTasks();
              if (tasks[dateKey]) {
                  delete tasks[dateKey][name];
                  // Czyścimy pusty dzień
                  if (Object.keys(tasks[dateKey]).length === 0) delete tasks[dateKey];
                  DataManager.saveTasks(tasks);
              }
          } else {
              const habits = DataManager.getHabits();
              const filtered = habits.filter(h => h.name !== name); // Proste usuwanie po nazwie
              DataManager.saveHabits(filtered);
          }
          UI.renderTasksForDay(selectedDate);
      }
  });
  
    taskActions.appendChild(checkbox);
    taskActions.appendChild(deleteBtn);
  
    // 3. Składanie całości
    li.appendChild(taskContent);
    li.appendChild(taskActions);
  
    // --- LISTENERY ---
    checkbox.addEventListener("change", function() {
      const isChecked = this.checked; 

      if (type === "task") {
        const tasks = DataManager.getTasks();
        if (tasks[dateKey] && tasks[dateKey][name]) {
          tasks[dateKey][name].done = isChecked; 
          DataManager.saveTasks(tasks);
        }
      } else {
        DataManager.toggleHabitDone(data.id, dateKey, isChecked);
      }
    
      li.style.opacity = isChecked ? "0.3" : "1";
      
      const isCalendar = !!elements.grid; 
      setTimeout(() => {
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

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const el = document.createElement('div');
      el.className = 'day';
      el.textContent = day;

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
      container.innerHTML = "<p style='padding: 20px;'>No habits added yet!</p>";
      return;
    }

    habits.forEach((habit, index) => {
      try {
        const card = document.createElement("div");
        card.className = "habit-card-mini";
        
        const progress = DataManager.calculateHabitProgress(habit);
        
        card.appendChild(UI.createProgressCircle(progress));
        
        const percentage = document.createElement("div");
        percentage.className = "habit-percentage-label";
        //percentage.textContent = `${progress}%`;
        //card.appendChild(percentage);
        
        const name = document.createElement("p");
        name.textContent = habit.name;
        name.className = "habit-name-label"; 
        card.appendChild(name);

        card.onclick = () => {
          document.querySelectorAll('.habit-card-mini').forEach(c => c.classList.remove('active-card'));
          card.classList.add('active-card');
          UI.showHabitDetails(habit);
          card.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        };

        container.appendChild(card);

        // PRZENIESIONE TUTAJ - do środka try
        if (index === 0) {
          card.classList.add('active-card');
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
    document.getElementById("detailStreak").textContent = DataManager.calculateStreak(habit);
    
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

  //hero stats
  renderHeroStats: () => {},
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
      document.querySelectorAll('.typePicker').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
  
      const selectedType = btn.getAttribute('data-type');
      currentCreateType = selectedType;
  
      const isHabit = selectedType === "habit";
      const isGoal = selectedType === "goal";
  
      if (elements.taskDateSection) {
        elements.taskDateSection.style.display = (isHabit || isGoal) ? "none" : "block";
      }
      
      if (elements.habitSection) {
        elements.habitSection.style.display = isHabit ? "block" : "none";
      }

      //goal section
      if (elements.goalSection) elements.goalSection.style.display = isGoal ? "block" : "none";
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

    try {
      const data = await LocationService.search(query);

      if (!data.length) {
        elements.locationInput.value = "";
        elements.locationInput.classList.remove("success");
        elements.locationInput.classList.add("error");
        alert("Location not found");
        return;
      }

      const place = data[0];
      const shortName = Utils.formatLocation(place.address);
      
      elements.locationInput.value = shortName || place.display_name;
      elements.locationInput.classList.remove("error");
      elements.locationInput.classList.add("success");
    } catch (e) {
      console.error("Search location error", e);
      elements.locationInput.value = "";
    }
  });

  // 2. Lokalizacja z GPS (przycisk pinezki)
  elements.geoLocBtn.addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
  
    // --- START LOADING ---
    const btn = elements.geoLocBtn;
    const input = elements.locationInput;
    const originalPlaceholder = input.placeholder;
  
    btn.classList.add("loading");
    btn.disabled = true;
    input.placeholder = "Locating... ⏳";
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
        alert("Address not found, but we have your coords!");
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
      input.placeholder = originalPlaceholder;
      
      const messages = {
        1: "Permission denied. Enable location in settings.",
        2: "Position unavailable. Check your GPS.",
        3: "Timeout. Try again."
      };
      alert(messages[err.code] || "Could not get location.");
    }, {
      enableHighAccuracy: true,
      timeout: 10000 // 10 sekund na odpowiedź GPS
    });
  });

  //adding logic
  elements.confirmAddBtn.addEventListener("click", () => {
    let name = elements.taskName.value.trim();
    if (!name) return alert("Wpisz nazwę!");
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
      let schedule = [];
      
      if (frequency === "weekly") {
        schedule = Array.from(elements.daysPicker.querySelectorAll("input[type='checkbox']:checked"))
        .map(cb => parseInt(cb.value));
        if (schedule.length === 0) return alert("Select at least one day!");
      } else if (frequency === "monthly") {
        const monthlyGrid = document.getElementById("monthDaysGrid");
        schedule = Array.from(monthlyGrid.querySelectorAll("input[type='checkbox']:checked"))
        .map(cb => parseInt(cb.value));
        if (schedule.length === 0) return alert("Enter days of the month!");
      }
      
      const habit = {
        id: Date.now(),
        name,
        location: location,
        frequency: frequency,
        schedule: schedule,
        createdAt: new Date().toISOString(),
        history: {}
      };
      DataManager.addHabit(habit);
    }
    
    // (Goal) - przygotowane miejsce
    else if (type === "goal") {
      console.log("Dodaję Goal: ", name);
      // Tutaj w przyszłości dodasz DataManager.addGoal(...)
    }

    if (elements.grid) UI.renderCalendar();
    UI.renderTasksForDay(selectedDate);

    if (elements.habitSection) UI.renderHabits();

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
  UI.setupMonthlyGrid();

  // index
  if (elements.toDoList && !elements.grid) {
    console.log("Dashboard wykryty: Renderuję zadania...");
    UI.renderTasksForDay();
  } else {
    console.log("To nie jest strona Dashboard (brak toDoList)");
  }
  // calendar
  if (elements.calendarGrid) {
    UI.renderCalendar();
    UI.renderTasksForDay(selectedDate, true);
  }
  // hero
  if (elements.habitSection) {
    UI.renderHabits();
  }
});