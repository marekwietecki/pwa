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

  isHabitDue(habit, date) {
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();
    const schedule = habit.schedule || [];

    switch (habit.frequency) {
      case "daily":
      case "everyday":
        return true;
      case "weekly":
        return schedule.includes(dayOfWeek);
      case "monthly":
        return schedule.includes(dayOfMonth);
      default:
        return false;
    }
  },

  getFrequencyText: (habit) => {
    const freqMap = {
      daily: "Everyday",
      weekly: " ",
      monthly: " ",
    };

    let text = freqMap[habit.frequency] || habit.frequency;
    const schedule = habit.schedule || [];

    if (schedule.length > 0) {
      if (habit.frequency === "weekly") {
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const selectedDays = [...schedule]
          .sort((a, b) => a - b)
          .map((dayNum) => dayNames[dayNum]);
        text += `${selectedDays.join(", ")}`;
      } else if (habit.frequency === "monthly") {
        const selectedDays = [...schedule].sort((a, b) => a - b);
        text += `${selectedDays.join(", ")}`;
      }
    }
    return text;
  },

  getStreakUnit: (frequency, streakValue) => {
    if (frequency === "daily") {
      return streakValue === 1 ? "day" : "days";
    }
    return streakValue === 1 ? "time" : "times";
  },
};

export const DataManager = {
  async getItemByTypeAndId(type, id) {
    const stores = { task: "tasks", habit: "habits", goal: "goals" };
    return await DB.get(stores[type], id);
  },

  getMonthlyStats: (habit, month, year) => {
    let stats = { scheduled: 0, completed: 0, currentStreak: 0, bestStreak: 0 };
    let days = [];

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const createdDate = new Date(habit.createdAt).setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = Utils.formatDateKey(date);

      const isScheduled = Utils.isHabitDue(habit, date);
      const isDone = habit.history && habit.history[dateKey] === true;
      const isPostCreated = date >= createdDate;

      const finalIsScheduled = isScheduled && isPostCreated;

      if (finalIsScheduled) {
        stats.scheduled++;
        if (isDone) {
          stats.completed++;
          stats.currentStreak++;
          stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
        } else {
          stats.currentStreak = 0;
        }
      }

      days.push({
        day,
        isDone,
        isScheduled: finalIsScheduled,
      });
    }

    return { days, stats };
  },

  // TASKS
  async getTasks() {
    return await DB.getAll("tasks");
  },

  async getTasksByDate(dateKey) {
    const tasks = await DB.getAllFromIndex("tasks", "by_date", dateKey);
    //console.log(`DataManager zapytał indeks o ${dateKey}, baza zwróciła:`,tasks.length);
    return tasks;
  },

  async getUndoneTasks(dateKey) {
    const unfinished = await DB.getAllFromIndex("tasks", "by_done", 0);
    return unfinished.filter((t) => t.date <= dateKey);
  },

  async addTask(name, date, location) {
    const newTask = {
      name,
      date,
      location,
      done: 0,
      createdAt: new Date().toISOString(),
    };
    return await DB.put("tasks", newTask);
  },

  async toggleTaskDone(taskId, isDone) {
    const task = await DB.get("tasks", taskId);
    if (!task) return false;

    task.done = isDone ? 1 : 0;
    return await DB.put("tasks", task);
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
    const habit = await DB.get("habits", habitId);
    if (!habit) return false;

    habit.history = habit.history || {};
    if (isDone) habit.history[dateKey] = true;
    else delete habit.history[dateKey];

    return await DB.put("habits", habit);
  },

  async updateHabitDetails(habitId, newFrequency, newSchedule, newStartDate) {
    const habit = await DB.get("habits", habitId);
    if (!habit) return false;

    habit.frequency = newFrequency;
    habit.schedule = newSchedule;
    habit.createdAt = new Date(newStartDate).toISOString();

    return await DB.put("habits", habit);
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
    const goal = await DB.get("goals", goalId);
    if (!goal) return false;

    // Object.assign - kopiuje właściwości z newData do goal
    Object.assign(goal, newData);
    return await DB.put("goals", goal);
  },

  async toggleGoalDone(goalId, isDone) {
    const goal = await DB.get("goals", goalId);
    if (!goal) return false;

    goal.done = isDone;
    return await DB.put("goals", goal);
  },

  async getMetadata(key) {
    return await DB.get("metadata", key);
  },

  async setMetadata(key, value) {
    return await DB.put("metadata", value, key);
  },

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

        if (Utils.isHabitDue(habit, d)) {
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

      if (Utils.isHabitDue(habit, checkDate)) {
        if (habit.history[dateKey] === true) {
          streak++;
        } else {
          if (dateKey !== Utils.formatDateKey(new Date())) break;
        }
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }
    return streak;
  },

  async countUndoneTasks(dateInput = new Date()) {
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const dateKey = Utils.formatDateKey(date);

    const [tasksForDay, habits, goals] = await Promise.all([
      this.getTasksByDate(dateKey),
      this.getHabits(),
      this.getGoals(),
    ]);

    const undoneTasks = tasksForDay.filter((t) => !t.done).length;

    const undoneHabits = habits.filter((habit) => {
      const isDue = Utils.isHabitDue(habit, date);
      const isDone = habit.history && habit.history[dateKey];
      return isDue && !isDone;
    }).length;

    const undoneGoals = goals.filter((goal) => {
      return goal.deadline?.startsWith(dateKey) && !goal.done;
    }).length;

    return undoneTasks + undoneHabits + undoneGoals;
  },

  async deleteItemByType(type, id) {
    const stores = { task: "tasks", habit: "habits", goal: "goals" };
    return await DB.delete(stores[type], id);
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
  RULES: {
    TASK: 100,
    GOAL_BASE: 1000,
    GOAL_MONTHLY_BONUS: 1000,
    GOAL_ON_TIME_BONUS: 1000,
    HABIT_BASE: 100,
  },

  getXpThreshold: (level) => Math.min(level * 100, 10000),

  calculateXP: (type, data) => {
    const RULES = LevelManager.RULES;

    if (type === "task") return RULES.TASK;

    if (type === "habit") return (data.streak || 1) * RULES.HABIT_BASE;

    if (type === "goal") {
      let xp = RULES.GOAL_BASE;

      if (!data.createdAt || !data.deadline) return xp;

      const created = new Date(data.createdAt);
      const deadline = new Date(data.deadline);
      const today = new Date().setHours(0, 0, 0, 0);

      if (isNaN(created) || isNaN(deadline)) return xp;

      const diffDays = Math.floor(
        Math.abs(deadline - created) / (1000 * 60 * 60 * 24)
      );
      const monthlyBonus = Math.floor(diffDays / 30) * RULES.GOAL_MONTHLY_BONUS;
      xp += monthlyBonus;

      if (today <= deadline) xp += RULES.GOAL_ON_TIME_BONUS;
      return xp;
    }
    return 0;
  },

  processXpGain: (currentStats, xpAmount) => {
    const stats = {
      ...currentStats,
      totalXp: Number(currentStats.totalXp) || 0,
      currentXp: Number(currentStats.currentXp) || 0,
      level: Number(currentStats.level) || 1,
    }; // to not mutate the original

    const amount = Number(xpAmount) || 0;

    stats.totalXp += amount;
    stats.currentXp += amount;

    let leveledUp = false;

    while (stats.currentXp >= LevelManager.getXpThreshold(stats.level)) {
      stats.currentXp -= LevelManager.getXpThreshold(stats.level);
      stats.level++;
      leveledUp = true;
    }

    while (stats.currentXp < 0 && stats.level > 1) {
      stats.level--;
      stats.currentXp += LevelManager.getXpThreshold(stats.level);
    }

    return { stats, leveledUp };
  },
};
