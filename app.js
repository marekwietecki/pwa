/*
  Offline Mode
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
  APP STATE & CONFIG
*/ 
let date = new Date(); // actual month for calendar view
let selectedDate = new Date(); // default today 
let currentCreateType = "task"; // default type
let statsViewDate = new Date(); // mini calendar data
let selectedHabitForStats = null; // currently clicked habit

/*
  DOM Elements
*/ 
const elements = {
  get grid() { return document.getElementById("calendarGrid"); },
  get label() { return document.getElementById("currentMonth"); },
  get toDoList() { return document.getElementById("toDoList"); },
  get taskDateTitle() { return document.getElementById("taskDateTitle"); },
  get modalOverlay() { return document.getElementById("modalOverlay"); },
  get taskType() { return document.getElementById("taskType"); },
  get taskName() { return document.getElementById("taskName"); },
  get taskDate() { return document.getElementById("taskDate"); },
  get locationInput() { return document.getElementById("locationInput"); },
  get taskDateSection() { return document.getElementById("taskDateSection"); },
  get habitSection() { return document.getElementById("habitSection"); },
  get habitFrequency() { return document.getElementById("habitFrequency"); },
  get daysPicker() { return document.getElementById("daysPicker"); },
  get addTaskBtn() { return document.getElementById("addTaskBtn"); }, 
  get closeModal() { return document.getElementById("closeModal"); },
  get confirmAddBtn() { return document.querySelector(".addTask"); },
  get searchLocBtn() { return document.getElementById("searchLocation"); },
  get geoLocBtn() { return document.getElementById("useMyLocation"); }
};




/*
  LOGIC: Location Service
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
  1. FORMATTING & UTILS
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
  2. DATA MANAGEMENT (LocalStorage)
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
    const history = Object.values(habit.history); // [true, false, true...]
    if (history.length === 0) return 0;
    
    const doneCount = history.filter(status => status === true).length;
    return Math.round((doneCount / history.length) * 100);
  },

  calculateStreak: (habit) => {
    let streak = 0;
    let checkDate = new Date();
    const history = habit.history || {};

    while (true) {
      const key = Utils.formatDateKey(checkDate);
      if (history[key] === true) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (streak === 0 && key === Utils.formatDateKey(new Date())) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
        }
        break;
      }
    }
    return streak;
  }
};






/*
  3. UI RENDERING
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

  createProgressCircle: (progress) => {
    const radius = 12;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    const svgNS = "http://www.w3.org/2000/svg";

    const wrapper = document.createElement("div");
    wrapper.className = "progress-ring-container";

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "34");
    svg.setAttribute("height", "34");
    svg.classList.add("progress-ring");

    // Funkcja wewnętrzna do tworzenia elementów SVG
    const createCircle = (isBg) => {
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", "17");
      circle.setAttribute("cy", "17");
      circle.setAttribute("r", radius);
      circle.setAttribute("stroke-width", "3");
      circle.setAttribute("fill", "transparent");
      
      if (isBg) {
        circle.classList.add("progress-ring__circle-bg");
        circle.setAttribute("stroke", "#e6e6e6");
      } else {
        circle.classList.add("progress-ring__circle");
        circle.setAttribute("stroke", "#4caf50");
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;
      }
      return circle;
    };

    svg.appendChild(createCircle(true));
    svg.appendChild(createCircle(false));

    const text = document.createElement("span");
    text.className = "progress-text";
    text.textContent = `${progress}%`;

    wrapper.appendChild(svg);
    wrapper.appendChild(text);
    return wrapper;
  },


  renderTasksForDay: (targetDate = new Date(), showCompleted = false) => {
    if (!elements.toDoList) return;

    const dateKey = Utils.formatDateKey(targetDate);
    const dayOfWeek = targetDate.getDay(); 
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
          const li = UI.createTaskNode(name, data, dateKey, "task");
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
      if (habit.frequency === "daily") isDueToday = true;
      else if (habit.frequency === "specific" && habit.selectedDays.includes(dayOfWeek)) {
        isDueToday = true;
      }

      if (isDueToday) {
        const isDone = habit.history && habit.history[dateKey];
        if (isDone) {
          if (showCompleted) {
            const li = UI.createTaskNode(habit.name, habit, dateKey, "habit");
            li.classList.add("is-completed");
            const cb = li.querySelector('input[type="checkbox"]');
            if (cb) cb.checked = true;
            doneNodes.push(li);
          }
        } else {
          const li = UI.createTaskNode(habit.name, habit, dateKey, "habit");
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
          UI.renderAllUndoneTasks(selectedDate);
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
    if (!elements.grid) return;

    elements.grid.innerHTML = '';
    elements.label.textContent = date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });

    const year = date.getFullYear();
    const month = date.getMonth();

    // Nagłówki dni tygodnia
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(d => {
      const el = document.createElement('div');
      el.textContent = d;
      el.className = 'day-label';
      elements.grid.appendChild(el);
    });

    const firstDay = new Date(year, month, 1);
    const startIndex = Utils.getMondayFirstDay(firstDay);

    for (let i = 0; i < startIndex; i++) {
      elements.grid.appendChild(document.createElement('div'));
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

      elements.grid.appendChild(el);
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
      const card = document.createElement("div");
      card.className = "habit-card-mini";
      
      const progress = DataManager.calculateHabitProgress(habit);
      card.appendChild(UI.createProgressCircle(progress));
      
      const name = document.createElement("p");
      name.textContent = habit.name;
      name.style.fontSize = "12px";
      card.appendChild(name);

      card.onclick = () => {
        document.querySelectorAll('.habit-card-mini').forEach(c => c.classList.remove('active-card'));
        card.classList.add('active-card');
        UI.showHabitDetails(habit);
      };

      container.appendChild(card);

      if (index === 0) {
        card.classList.add('active-card');
        UI.showHabitDetails(habit);
      }
    });
  },

  showHabitDetails: (habit) => {
    selectedHabitForStats = habit;

    document.getElementById("habitDetails").style.display = "block";
    if (!details) return;
    document.getElementById("detailHabitName").textContent = habit.name;
    document.getElementById("detailStreak").textContent = DataManager.calculateStreak(habit);
    
    const circleContainer = document.getElementById("detailProgressCircle");
    circleContainer.innerHTML = "";
    circleContainer.appendChild(UI.createProgressCircle(DataManager.calculateHabitProgress(habit)));

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

    ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach(d => {
        const el = document.createElement('div');
        el.textContent = d;
        el.className = 'mini-day-label';
        grid.appendChild(el);
    });

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
        const createdDate = new Date(habit.createdAt);
        createdDate.setHours(0,0,0,0);

        if (habit.history && habit.history[dateKey]) {
            el.classList.add('habit-done');
        }

        if (currentIterDate < createdDate) {
            el.classList.add('pre-habit');
        }

        grid.appendChild(el);
    }
},

  //hero stats
  renderHeroStats: () => {},
};





/*
  EVENT LISTENERS
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


  // habit frequency listener
  elements.habitFrequency?.addEventListener("change", () => {
    elements.daysPicker.style.display = elements.habitFrequency.value === "specific" ? "block" : "none";
  });


  //Wyszukiwanie lokalizacji przyciskiem lupy
  elements.searchLocBtn.addEventListener("click", async () => {
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

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        const data = await LocationService.reverse(latitude, longitude);
        if (!data || !data.display_name) return alert("Location not found");

        const shortName = Utils.formatLocation(data.address);
        elements.locationInput.value = shortName || data.display_name;
        elements.locationInput.classList.remove("error");
        elements.locationInput.classList.add("success");
      } catch (e) {
        console.error("Reverse geocoding failed", e);
        elements.locationInput.value = "";
      }
    }, (err) => {
      alert("Could not get location. Make sure you allowed it.");
    });
  });


  //adding logic
  elements.confirmAddBtn.addEventListener("click", () => {
    const name = elements.taskName.value.trim();
    if (!name) return alert("Wpisz nazwę!");

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
      let selectedDays = [];
      
      if (frequency === "specific") {
        selectedDays = Array.from(elements.daysPicker.querySelectorAll("input:checked"))
          .map(cb => parseInt(cb.value));
        if (selectedDays.length === 0) return alert("Wybierz przynajmniej jeden dzień!");
      }
      
      const habit = {
        id: Date.now(),
        name,
        location: location,
        frequency: frequency,
        selectedDays: selectedDays,
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
    UI.renderAllUndoneTasks(selectedDate);
     
    UI.resetModal();
  });
}




/*
  GŁÓWNY INICJATOR
*/
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners(); // To musi być pierwsze

  // index
  if (elements.toDoList && !elements.grid) {
    console.log("Dashboard wykryty: Renderuję zadania...");
    UI.renderTasksForDay();
  } else {
    console.log("To nie jest strona Dashboard (brak toDoList)");
  }

  // calendar
  if (elements.grid) {
    UI.renderCalendar();
    UI.renderTasksForDay(selectedDate, true);
  }

  // hero
  if (elements.habitSection) {
    UI.renderHabits();

  }
});