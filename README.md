# 🏆 HabitHero - Gamified Task Manager PWA

HabitHero is a Progressive Web App (PWA) that turns daily responsibilities into an RPG adventure. Earn experience points (XP), level up your character, and track your habits through an interactive calendar.

---

## 📖 Table of Contents
* [🚀 Features](#-features)
* [🛠️ Technologies](#️-technologies)
* [📱 Native Features](#-native-features)
* [🌐 API & Data Strategies](#-api--data-strategies)
* [⚙️ Deployment](#️-deployment)
* [📊 Gamification System](#-gamification-system)

---

## 🚀 Features

* **Daily Motivation:** Daily advice/quotes fetched from an external REST API to keep you inspired.
* **Task Management:** Add, delete, and mark tasks as completed with ease.
* **Habit System:** Create habits with flexible frequencies (daily, weekly, monthly) and track your consistency.
* **Goal Tracking:** Set long-term goals with deadlines, descriptions, and the ability to link them to specific habits.
* **Interactive Calendar:** Monthly view for a clear overview of your tasks, habits, and upcoming deadlines.
* **Geolocation:** Attach locations to tasks using GPS coordinates or an address search engine.
* **Hero Profile:** Personalize your username and monitor progress with a visual XP bar.

---

## 🛠️ Technologies

Built with a **Vanilla JavaScript** architecture (no heavy frameworks) to ensure lightning-fast performance and a small footprint.

* **Frontend:** HTML5, CSS3 (Flexbox/Grid), JavaScript (ES6+).
* **Maps & Location:** OpenStreetMap API (Nominatim).
* **Motivation Engine:** External REST API (Adviceslip).
* **Data Storage:** `localStorage` API (with a planned migration to `IndexedDB`).
* **Hosting:** Netlify with automated SSL (HTTPS) certification.

---

## 📱 Native Features

The app leverages modern Web APIs to deliver an experience comparable to native mobile applications:

1. **Push & Notifications API:** System-level notifications for "Daily Briefings" (morning task summaries) and goal deadline reminders.
2. **Vibration API:** Haptic feedback for key actions, such as leveling up or updating profile data.
3. **Geolocation API:** Retrieves precise user coordinates and converts them into human-readable addresses (Reverse Geocoding).

---

## 🌐 Caching Strategies

A **Service Worker** is implemented to manage network traffic and provide robust **Offline Support**:

* **Network First:** Used for motivational quotes – prioritizes fresh data while falling back to cache when offline.
* **Stale-While-Revalidate:** Applied to core logic (JS/HTML) – ensures instant loading while updating resources in the background.
* **Cache First:** Utilized for assets and CSS stylesheets to maximize rendering speed.



---

## ⚙️ Deployment

### Live Demo
The application is hosted on Netlify and is available at:
[https://habit-hero-pwa.netlify.app](https://habit-hero-pwa.netlify.app)

---

## 📊 Gamification System

The app features a built-in `LevelManager` logic engine to handle user progression:

* **XP Calculation:** Every task and habit completion rewards the user with experience points.
* **Level Thresholds:** The XP required to level up scales dynamically according to the formula:
$$XP = level \times 100$$
Up to level 100, after which the requirement caps at a flat 10,000 XP per level.
* **Persistence:** All statistics (XP, Level, Nickname) are synchronized via `DataManager` and securely stored in the browser's memory.

---

Created with passion for productivity.  
**Marek Wietecki**