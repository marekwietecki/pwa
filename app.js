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
let date = new Date(); // aktualny miesiąc dla kalendarza
let selectedDate = new Date(); // domyślnie dzisiaj
let currentCreateType = "task"; // Domyślny typ

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
      habit.history[dateKey] = isDone;
      DataManager.saveHabits(habits);
    }
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

  


  renderAllUndoneTasks: (targetDate = new Date()) => {
    if (!elements.toDoList) return;

    // Pobieramy dane dla wybranej daty (targetDate), nie tylko dla dzisiaj
    const dateKey = Utils.formatDateKey(targetDate);
    const dayOfWeek = targetDate.getDay(); 
    const todayKey = Utils.formatDateKey(new Date());

    // Ustawiamy tytuł
    elements.taskDateTitle.textContent = (dateKey === todayKey) 
      ? "Today's Hero Goals:" 
      : `Goals for ${targetDate.toDateString()}:`;

    elements.toDoList.innerHTML = "";

    const savedTasks = DataManager.getTasks();
    const savedHabits = DataManager.getHabits();
    const listFragment = document.createDocumentFragment();

    // --- 1. FILTROWANIE ZADAŃ (Używamy dateKey!) ---
    const tasksForDate = savedTasks[dateKey] || {};
    Object.entries(tasksForDate).forEach(([name, data]) => {
      if (!data.done) {
        const li = UI.createTaskNode(name, data, dateKey, "task");
        listFragment.appendChild(li);
      }
    });

    // --- 2. FILTROWANIE NAWYKÓW (Używamy dayOfWeek!) ---
    savedHabits.forEach(habit => {
      let isDueToday = false;
      if (habit.frequency === "daily") isDueToday = true;
      else if (habit.frequency === "specific" && habit.selectedDays.includes(dayOfWeek)) {
        isDueToday = true;
      }

      const isDoneToday = habit.history && habit.history[dateKey];
      
      if (isDueToday && !isDoneToday) {
        const li = UI.createTaskNode(habit.name, habit, dateKey, "habit");
        listFragment.appendChild(li);
      }
    });

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
    // Używamy textContent - to neutralizuje wszelkie skrypty!
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
  
    // --- LISTENERY (Logika pozostaje ta sama) ---
    checkbox.addEventListener("change", () => {
      if (type === "task") {
        const tasks = DataManager.getTasks();
        tasks[dateKey][name].done = true;
        DataManager.saveTasks(tasks);
      } else {
        DataManager.toggleHabitDone(data.id, dateKey, true);
      }
      li.style.opacity = "0.3";
      setTimeout(() => UI.renderAllUndoneTasks(), 300);
    });
  
    deleteBtn.addEventListener("click", () => {
      // ... tutaj logika usuwania ...
      UI.renderAllUndoneTasks();
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
        UI.renderAllUndoneTasks(selectedDate);
      };

      elements.grid.appendChild(el);
    }
  },
  
  
  renderDailyTasks: () => {
    // To może być Twoje renderAllUndoneTasks lub inna funkcja
    UI.renderAllUndoneTasks();
  },

  renderHabitStats: () => {
    console.log("Tutaj pojawi się logika wykresów");
  }
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
    UI.renderAllUndoneTasks();
  } else {
    console.log("To nie jest strona Dashboard (brak toDoList)");
  }

  // calendar
  if (elements.grid) {
    UI.renderCalendar();
    UI.renderAllUndoneTasks(selectedDate);
  }
});