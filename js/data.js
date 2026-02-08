import { DB } from "./db.js";
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
        "ejejej formatDateKey dostało lipną datę,",
        date,
        "| zamiast tego dzisiejsza"
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
  // TASKS
  async getTasks() {
    return await DB.getAll("tasks");
  },

  async getTasksByDate(dateKey) {
    const all = await this.getTasks();
    return all.filter((t) => t.date === dateKey);
  },

  async addTask(name, date, location) {
    const newTask = {
      name,
      date,
      location,
      done: false,
      createdAt: new Date().toISOString(),
    };
    return await DB.put("tasks", newTask);
  },

  async toggleTaskDone(taskId, isDone) {
    const db = await DB.open();
    return new Promise((resolve) => {
      const tx = db.transaction("tasks", "readwrite");
      const store = tx.objectStore("tasks");
      store.get(taskId).onsuccess = (e) => {
        const task = e.target.result;
        if (!task) return resolve(false);
        task.done = isDone;
        store.put(task).onsuccess = () => resolve(true);
      };
    });
  },

  // HABITS
  async getHabits() {
    return await DB.getAll("habits");
  },

  async addHabit(habitObj) {
    if (!habitObj.id) habitObj.id = Date.now();
    return await DB.put("habits", habitObj);
  },

  async toggleHabitDone(habitId, dateKey, isDone) {
    const db = await DB.open();
    return new Promise((resolve) => {
      const tx = db.transaction("habits", "readwrite");
      const store = tx.objectStore("habits");
      store.get(habitId).onsuccess = (e) => {
        const habit = e.target.result;
        if (!habit) return resolve(false);
        habit.history = habit.history || {};
        if (isDone) habit.history[dateKey] = true;
        else delete habit.history[dateKey];
        store.put(habit).onsuccess = () => resolve(true);
      };
    });
  },

  async updateHabitDetails(habitId, newFrequency, newSchedule, newStartDate) {
    const db = await DB.open();
    return new Promise((resolve) => {
      const tx = db.transaction("habits", "readwrite");
      const store = tx.objectStore("habits");
      store.get(habitId).onsuccess = (e) => {
        const habit = e.target.result;
        if (habit) {
          habit.frequency = newFrequency;
          habit.schedule = newSchedule;
          habit.createdAt = new Date(newStartDate).toISOString();
          store.put(habit).onsuccess = () => resolve(true);
        } else resolve(false);
      };
    });
  },

  // GOALS
  async getGoals() {
    return await DB.getAll("goals");
  },

  async addGoal(goal) {
    if (!goal.id) goal.id = Date.now();
    return await DB.put("goals", goal);
  },

  async updateGoalDetails(goalId, newData) {
    const db = await DB.open();
    return new Promise((resolve) => {
      const tx = db.transaction("goals", "readwrite");
      const store = tx.objectStore("goals");
      store.get(goalId).onsuccess = (e) => {
        const goal = e.target.result;
        if (goal) {
          Object.assign(goal, newData);
          store.put(goal).onsuccess = () => resolve(true);
        } else resolve(false);
      };
    });
  },

  /*
  saveTasks: (tasks) =>
    localStorage.setItem("tasksState", JSON.stringify(tasks)),

  saveHabits: (habits) =>
    localStorage.setItem("habitsState", JSON.stringify(habits)),

  saveGoals: (goals) => {
    localStorage.setItem("goalsState", JSON.stringify(goals));
  },
 */

  calculateHabitProgress: (habit) => {
    if (!habit) return 0;
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
    if (!habit || !habit.history) return 0;

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

  async countTasksForDate(date = new Date()) {
    const dateKey = Utils.formatDateKey(date);
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();

    const tasks = await this.getTasksByDate(dateKey);
    const habits = await this.getHabits();

    let count = tasks.filter((t) => !t.done).length;

    habits.forEach((h) => {
      let isDue =
        h.frequency === "daily" ||
        (h.frequency === "weekly" && h.schedule.includes(dayOfWeek)) ||
        (h.frequency === "monthly" && h.schedule.includes(dayOfMonth));

      const isDone = h.history && h.history[dateKey];
      if (isDue && !isDone) count++;
    });

    // goals doesn't count for now

    return count;
  },

  async deleteTask(id) {
    return await DB.delete("tasks", id);
  },
  async deleteHabit(id) {
    return await DB.delete("habits", id);
  },
  async deleteGoal(id) {
    return await DB.delete("goals", id);
  },

  async getUserStats() {
    const stats = await DB.get("stats", STATS_KEY);
    return stats || defaultStats;
  },

  async saveUserStats(stats) {
    stats.id = STATS_KEY;
    await DB.put("stats", stats);
  },

  async updateUserName(newName) {
    const stats = await this.getUserStats();
    stats.userName = newName;
    await this.saveUserStats(stats);
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

  async applyXP(amount) {
    const stats = await DataManager.getUserStats(); // { totalXp: 0, currentXp: 0, level: 1 }
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

    await DataManager.saveUserStats(stats);

    document.dispatchEvent(
      new CustomEvent("statsUpdated", {
        detail: { leveledUp: leveledUp },
      })
    );
    return leveledUp;
  },
};
