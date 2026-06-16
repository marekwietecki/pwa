import { DataManager } from "./data.js";
import { DB } from "./db.js";
import { UI } from "./ui.js";

const ONBOARDING_ICONS = ["💧", "🛌", "💪", "🍏", "🏃‍♂️", "📚", "💵", "🚭", "📱", "🐶", "🧠", "🧘", "🎯", "🌟"];

const onboardingSteps = [
  {
    id: 1,
    title: "Welcome to Habit Bubbl! 🫧",
    renderBody: () => `
      <div class="onboarding-step-content">
        <p>You enter a game where your everyday discipline increases the level of your Hero.</p> 
        <p>What should we call you?</p>
        <input type="text" id="onboardingName" placeholder="Enter your nickname..." class="modal-input">
      </div>
    `,
    validate: (container) => container.querySelector("#onboardingName")?.value.trim().length > 0,
    onSave: async (container) => {
      const name = container.querySelector("#onboardingName").value.trim();
      const currentStats = await DataManager.getUserStats();
      currentStats.userName = name;
      await DataManager.saveUserStats(currentStats);
      await UI.updateUserHeader();
    }
  },
  {
    id: 2,
    title: "Senses of Habit Bubbl 🔔",
    renderBody: () => `
      <div class="onboarding-step-content">
        <p>To make your app fully working, send you morning briefings, and keep track of your location-based habits, please enable the system permissions below:</p>
        <div style="display:flex; flex-direction:column; gap:12px; margin-top: 20px; width: 100%;">
          <button id="btnAuthNotify" class="addTask" style="background:var(--hero-gradient); color: #ffffff; cursor: pointer; transition: opacity 0.3s ease; width:100%; margin:0; border-radius: 14px;">Enable Notifications</button>
          <button id="btnAuthGeo" class="addTask" style="background: var(--hero-gradient); color: #ffffff; cursor: pointer; transition: opacity 0.3s ease; width:100%; margin:0; border-radius: 14px;">Allow Geolocation</button>
        </div>
      </div>
    `,
    initEvents: (container) => {
      container.querySelector("#btnAuthNotify").addEventListener("click", async (e) => {
        e.preventDefault();
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          localStorage.setItem("user_notifications_enabled", "true");
          e.target.textContent = "✅ Notifications Active!";
          e.target.style.opacity = "0.6";
          e.target.disabled = true;
        }
      });

      container.querySelector("#btnAuthGeo").addEventListener("click", async (e) => {
        e.preventDefault();
        navigator.geolocation.getCurrentPosition(
          () => {
            localStorage.setItem("user_location_enabled", "true");
            e.target.textContent = "✅ Geolocation Active!";
            e.target.style.opacity = "0.6";
            e.target.disabled = true;
          },
          () => {
            UI.showToast("Location access was denied.", "error");
          }
        );
      });
    }
  },
  {
    id: 3,
    title: "Your First Mission! 🎯",
    renderBody: () => `
      <div class="onboarding-step-content">
        <p>Let's build your very first daily habit right now to kickstart your journey.</p>
        <p>Type the name and choose a visual badge:</p>
        <input type="text" id="onboardingHabit" placeholder="e.g., Drink water, Sleep 8h, Exercise..." class="modal-input">
        <div id="onboardingIconPicker"></div>
      </div>
    `,
    validate: (container) => container.querySelector("#onboardingHabit")?.value.trim().length > 0,
    initEvents: (container, state) => {
      const picker = container.querySelector("#onboardingIconPicker");
      if (picker) {
        UI.createEmojiPicker({
          container: picker,
          icons: ONBOARDING_ICONS,
          activeIcon: state.selectedIconId,
          itemFlex: "48px",
          fontSize: "22px",
          onSelect: (emoji) => { 
            state.selectedIconId = emoji; // Poprawnie aktualizujemy stan współdzielony
          },
        });
      }
    },
    onSave: async (container, state) => {
      const name = container.querySelector("#onboardingHabit").value.trim();
      await DB.put("habits", {
        id: Date.now(),
        name,
        icon: state.selectedIconId,
        frequency: "daily",
        streak: 0,
        history: {},
        createdAt: new Date().toISOString(),
      });
    }
  },
  {
    id: 4,
    title: "You Are Ready, Hero! ⚔️",
    renderBody: (container, state) => `
      <div class="onboarding-step-content" style="text-align: center;">
        <p style="font-size: 16px; margin-bottom: 16px;">Welcome to the ranks, <strong>@${state.userName}</strong>! Your character profile has been successfully initialized.</p>
        <div style="
          background: rgba(255, 255, 255, 0.04); 
          border: 1px solid rgba(255, 255, 255, 0.1); 
          border-radius: 16px; 
          padding: 16px; 
          margin: 20px 0;
          box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.02);">
          <p style="margin: 0; font-weight: 600; color: #fff;"> First level achieved! ✅</p>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.6);">Your first habit is live. Track it daily to stack multiplier combos and earn bonus XP.</p>
        </div>
        <p style="font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 500; text-shadow: 0 0 10px rgba(255,255,255,0.2);">May the discipline be with you.</p>
      </div>
    `
  }
];

export const OnboardingService = {
  async checkAndStart() {
    const stats = await DataManager.getUserStats();
    const isDone = localStorage.getItem("onboarding_done") === "true";

    if (stats.userName === "New Hero" && !isDone) {
      this.run();
    }
  },

  forceRun() {
    console.log("🫧 Forcing test onboarding configuration...");
    localStorage.removeItem("onboarding_done");
    this.run();
  },

  async run() {
    const modal = document.getElementById("modalOverlay");
    if (!modal) return;

    const originalHTML = modal.innerHTML;
    let currentStepIdx = 0;
    
    // 🌟 STAN WSPÓŁDZIELONY: Bezpieczne przekazywanie danych między krokami
    const state = {
      selectedIconId: "💧",
      userName: "Hero"
    };

    const renderWizard = async () => {
      modal.textContent = "";
      modal.style.backgroundColor = "#121318";
      modal.style.backdropFilter = "none";

      const step = onboardingSteps[currentStepIdx];
      const isLastStep = currentStepIdx === onboardingSteps.length - 1;

      // Dynamiczne ładowanie nicku w kroku finałowym
      if (step.id === 4) {
        const freshStats = await DataManager.getUserStats();
        state.userName = freshStats.userName || "Hero";
        step.title = `You Are Ready, ${state.userName}! ⚔️`;
      }

      const card = document.createElement("div");
      card.className = "onboarding-card";

      const progressBarTrack = document.createElement("div");
      progressBarTrack.className = "onboarding-progress-track";
      const progressBarFill = document.createElement("div");
      progressBarFill.className = "onboarding-progress-fill";
      progressBarFill.style.width = `${((currentStepIdx + 1) / onboardingSteps.length) * 100}%`;
      
      progressBarTrack.appendChild(progressBarFill);
      card.appendChild(progressBarTrack);

      const title = document.createElement("h2");
      title.className = "onboarding-title";
      title.textContent = step.title;

      const body = document.createElement("div");
      body.className = "onboarding-body";
      body.innerHTML = step.renderBody(body, state);

      const footer = document.createElement("div");
      footer.className = "onboarding-footer";

      const nextBtn = document.createElement("button");
      nextBtn.id = "onboardingNextBtn";
      nextBtn.className = "addTask";
      nextBtn.textContent = isLastStep ? "Start the Adventure! 🚀" : "Next";
      footer.appendChild(nextBtn);

      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(footer);
      modal.appendChild(card);

      // Inicjalizacja eventów wewnętrznych (np. EmojiPicker)
      if (step.initEvents) step.initEvents(body, state);

      // 🌟 POPRAWKA: Natychmiastowa blokada przycisku "Next" przy wejściu na krok z walidacją
      if (step.validate) {
        const inputEl = body.querySelector(".modal-input");
        const check = () => {
          const isValid = step.validate(body);
          nextBtn.disabled = !isValid;
          nextBtn.style.opacity = isValid ? "1" : "0.35";
          nextBtn.style.cursor = isValid ? "pointer" : "not-allowed";
          nextBtn.style.pointerEvents = isValid ? "auto" : "none";
        };
        check(); // Odpala walidację na dzień dobry
        inputEl?.addEventListener("input", check);
      }

      nextBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        if (step.onSave) {
          await step.onSave(body, state);
        }

        if (!isLastStep) {
          currentStepIdx++;
          renderWizard();
        } else {
          localStorage.setItem("onboarding_done", "true");
          modal.textContent = "";
          modal.innerHTML = originalHTML;
          modal.classList.remove("open");
          window.location.reload();
        }
      });
    };

    modal.classList.add("open");
    await renderWizard();
  },
};