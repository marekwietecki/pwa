export const STATS_KEY = "habit_hero_stats";

export const defaultStats = {
  totalXp: 0,
  currentXp: 0,
  level: 1,
  userName: "New Hero",
};

export const Utils = {
  getMondayFirstDay: (date) => {
    const day = date.getDay(); // 0 = sunday
    return day === 0 ? 6 : day - 1;
  },

  formatDateKey: (date) => {
    if (!date || !(date instanceof Date)) {
      console.error(
        "Mordziu, formatDateKey dostało lipną datę,",
        date,
        "| zamiast tego dałem dzisiejszą"
      );
      date = new Date();
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  formatLocation: (address) => {
    if (!address) return "";
    const street =
      address.road || address.pedestrian || address.cycleway || address.footway;
    const house = address.house_number;
    const city =
      address.city || address.town || address.village || address.hamlet;
    const country = address.country;

    if (street && house && city) return `${street} ${house}, ${city}`;
    if (street && city) return `${street}, ${city}`;
    if (city && country) return `${city}, ${country}`;
    return country || "";
  },
};

export const DataManager = {
  getTasks: () => JSON.parse(localStorage.getItem("tasksState")) || {},
  saveTasks: (tasks) =>
    localStorage.setItem("tasksState", JSON.stringify(tasks)),

  //getHabits: () => JSON.parse(localStorage.getItem("habitsState")) || [],
  getHabits: () => {
    const data = JSON.parse(localStorage.getItem("habitsState")) || [];
    if (Array.isArray(data)) return data;
    if (data && data.habits) return data.habits;

    return [];
  },
  saveHabits: (habits) =>
    localStorage.setItem("habitsState", JSON.stringify(habits)),

  addTask: (name, date, location) => {
    const tasks = DataManager.getTasks();
    if (!tasks[date]) tasks[date] = {};
    tasks[date][name] = {
      done: false,
      location: location,
      createdAt: new Date().toISOString(),
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
    const habit = habits.find((h) => h.id === habitId);
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
    const index = habits.findIndex((h) => h.id === habitId);

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

      const createdDate = habit.createdAt
        ? new Date(habit.createdAt)
        : new Date();
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

      console.log(
        `Habit: ${habit.name} | Sched: ${scheduledDaysCount} | Done: ${completedDaysCount}`
      );
      return scheduledDaysCount === 0
        ? 0
        : Math.round((completedDaysCount / scheduledDaysCount) * 100);
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

  countTasksForDate: (date = new Date()) => {
    const dateKey = Utils.formatDateKey(date);
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();

    const tasks = DataManager.getTasks()[dateKey] || {};
    const habits = DataManager.getHabits();
    const goals = DataManager.getGoals();

    let count = Object.values(tasks).filter((t) => !t.done).length;

    habits.forEach((h) => {
      let isDue =
        h.frequency === "daily" ||
        (h.frequency === "weekly" && h.schedule.includes(dayOfWeek)) ||
        (h.frequency === "monthly" && h.schedule.includes(dayOfMonth));

      const isDone = h.history && h.history[dateKey];
      if (isDue && !isDone) count++;
    });

    //goals?
    //count += goals.filter((g) => g.deadline === dateKey && !g.done).length;

    return count;
  },

  updateGoalDetails: (goalId, newData) => {
    const goals = DataManager.getGoals();
    const index = goals.findIndex((g) => g.id === goalId);

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
  },
};

export const LevelManager = {
  // lvl 1 = 100xp, lvl 2 = 200xp, ... lvl 100 = 10000|
  getXpThreshold: (level) => {
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
        goalXP += monthlyBonuses * 1000;

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

    let leveledUp = false;

    while (stats.currentXp >= LevelManager.getXpThreshold(stats.level)) {
      stats.currentXp -= LevelManager.getXpThreshold(stats.level);
      stats.level++;
      leveledUp = true;

      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    }

    while (stats.currentXp < 0 && stats.level > 1) {
      stats.level--;
      stats.currentXp += LevelManager.getXpThreshold(stats.level);
    }

    DataManager.saveUserStats(stats);
    document.dispatchEvent(
      new CustomEvent("statsUpdated", {
        detail: { leveledUp: leveledUp },
      })
    );
    return leveledUp;
  },
};
