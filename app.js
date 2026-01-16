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
    elements.taskName.value = "";
    elements.taskDate.value = "";
    elements.locationInput.value = "";
    elements.taskType.value = "task";
    elements.taskDateSection.style.display = "block";
    elements.habitSection.style.display = "none";
    
    // Czyścimy zaznaczone dni tygodnia
    elements.daysPicker.querySelectorAll("input:checked").forEach(cb => cb.checked = false);
    elements.daysPicker.style.display = "none";
    
    if (elements.modalOverlay) {
      elements.modalOverlay.classList.remove("open");
    }
  },

  renderAllUndoneTasks: () => {
    // 1. Sprawdź czy używasz poprawnej nazwy z elements!
    if (!elements.toDoList) {
      console.error("BŁĄD: Nie znaleziono elementu toDoList w DOM!");
      return;
    }

    const today = new Date();
    const todayKey = Utils.formatDateKey(today);
    const todayDayOfWeek = today.getDay(); // 0-6

    elements.taskDateTitle.textContent = "To Do Today:";
    // Czyścimy listę przed ponownym renderowaniem
    elements.toDoList.innerHTML = "";

    const savedTasks = DataManager.getTasks();
    const savedHabits = DataManager.getHabits();
    
    // Używamy fragmentu dla lepszej wydajności
    const listFragment = document.createDocumentFragment();

    // --- 1. FILTROWANIE ZADAŃ ---
    const tasksForToday = savedTasks[todayKey] || {};
    Object.entries(tasksForToday).forEach(([name, data]) => {
      if (!data.done) {
        const li = UI.createTaskNode(name, data, todayKey, "task");
        listFragment.appendChild(li);
      }
    });

    // --- 2. FILTROWANIE NAWYKÓW ---
    savedHabits.forEach(habit => {
      let isDueToday = false;
      if (habit.frequency === "daily") isDueToday = true;
      else if (habit.frequency === "specific" && habit.selectedDays.includes(todayDayOfWeek)) {
        isDueToday = true;
      }

      const isDoneToday = habit.history && habit.history[todayKey];
      
      if (isDueToday && !isDoneToday) {
        const li = UI.createTaskNode(habit.name, habit, todayKey, "habit");
        listFragment.appendChild(li);
      }
    });

    // KLUCZOWA LINIA: Dodaj zebrane elementy do widocznej listy
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

  // DODAJ TO:
  renderCalendar: () => {
    if (!elements.grid) return;
    console.log("Tutaj pojawi się logika rysowania kalendarza");
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
  elements.addTaskBtn?.addEventListener("click", () => elements.modalOverlay.classList.add("open"));
  elements.closeModal?.addEventListener("click", UI.resetModal);
  
  // closing while tapping the background
  elements.modalOverlay?.addEventListener("click", (e) => {
    if (e.target === elements.modalOverlay) UI.resetModal();
  });

  


  // Modal Type Switch
  elements.taskType?.addEventListener("change", (e) => {
    const isHabit = e.target.value === "habit";
    elements.taskDateSection.style.display = isHabit ? "none" : "block";
    elements.habitSection.style.display = isHabit ? "block" : "none";
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

    const type = elements.taskType.value;
    const location = elements.locationInput.value.trim();

    if (elements.taskType.value === "task") {
      const dateStr = elements.taskDate.value || Utils.formatDateKey(selectedDate);
      DataManager.addTask(name, dateStr, elements.locationInput.value);
    } else {
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
        location: location || null,
        frequency: frequency,
        selectedDays: selectedDays,
        createdAt: new Date().toISOString(),
        history: {}
      };
      DataManager.addHabit(habit);
    }

    if (typeof UI.renderAllUndoneTasks === "function") UI.renderAllUndoneTasks();
    if (typeof UI.renderCalendar === "function") UI.renderCalendar();
     
    UI.resetModal();
    UI.renderAllUndoneTasks(); 
  });
}




/*
  GŁÓWNY INICJATOR
*/
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners(); // To musi być pierwsze

  // Sprawdzamy, czy w obiekcie elements (który pobrał toDoList) jest ten element
  if (elements.toDoList) {
    console.log("Dashboard wykryty: Renderuję zadania...");
    UI.renderAllUndoneTasks();
  } else {
    console.log("To nie jest strona Dashboard (brak toDoList)");
  }

  if (elements.grid) {
    UI.renderCalendar();
  }
});