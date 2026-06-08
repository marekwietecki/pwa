import { DataManager } from "./data.js";
import { DB } from "./db.js";
import { UI } from "./ui.js";

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

    // Definicja kroków z nową nazwą marki Habit Bubbl 🫧
    const steps = {
      1: {
        title: "Welcome to Habit Bubbl! 🫧",
        html: `
            <div class="onboarding-step-content">
              <p>You enter a game where your everyday discipline increases the level of your Hero.</p> 
              <p>What should we call you?</p>
              <input type="text" id="onboardingName" placeholder="Enter your nickname..." class="modal-input">
            </div>
          `,
      },
      2: {
        title: "Senses of Habit Bubbl 🔔",
        html: `
            <div class="onboarding-step-content">
              <p>To make your app fully working, send you morning briefings, and keep track of your location-based habits, please enable the system permissions below:</p>
              <div style="display:flex; flex-direction:column; gap:12px; margin-top: 20px; width: 100%;">
                <button id="btnAuthNotify" class="addTask" style="background:var(--hero-gradient); width:100%; margin:0; border-radius: 14px;">Enable Notifications</button>
                <button id="btnAuthGeo" class="addTask" style="background: linear-gradient(90deg, #4facfe, #00f2fe); width:100%; margin:0; border-radius: 14px;">Allow Geolocation</button>
              </div>
            </div>
          `,
      },
      3: {
        title: "Your First Mission! 🎯",
        html: `
            <div class="onboarding-step-content">
              <p>Let's build your very first daily habit right now to kickstart your journey.</p> <p>Type the name and choose a visual badge:</p>
              <input type="text" id="onboardingHabit" placeholder="e.g., Drink water, Meditate, Exercise..." class="modal-input">
              <div id="onboardingIconPicker" style="
                  display: flex;
                  gap: 12px;
                  width: 100%;
                  margin-top: 20px;
                  padding: 10px 5px;
                  overflow-x: auto;
                  justify-content: start;
                  scrollbar-width: thin;
                  scrollbar-color: rgba(255,255,255,0.2) transparent;
                  -webkit-overflow-scrolling: touch;">
              </div>
            </div>
          `,
      },
      4: {
        title: "You Are Ready, Hero! ⚔️",
        html: `
            <div class="onboarding-step-content" style="text-align: center;">
              <p style="font-size: 16px; margin-bottom: 16px;">Your character profile has been successfully initialized.</p>
              <div style="
                background: rgba(255, 255, 255, 0.04); 
                border: 1px solid rgba(255, 255, 255, 0.1); 
                border-radius: 16px; 
                padding: 16px; 
                margin: 20px 0;
                box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.02);">
                <p style="margin: 0; font-weight: 600; color: #fff;"><!--🎁 Beginner's Chest Unlocked!--> First level acheived! ✅</p>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.6);">Your first habit is live. Track it daily to stack multiplier combos and earn bonus XP.</p>
              </div>
              <p style="font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 500; text-shadow: 0 0 10px rgba(255,255,255,0.5);">May the discipline be with you.</p>
            </div>
          `,
      },
    };

    const totalSteps = Object.keys(steps).length;
    let currentStep = 1;
    let selectedIconId = "💧";

    const onboardingIcons = [
      "💧",
      "🧘",
      "🏃‍♂️",
      "📚",
      "🍏",
      "💪",
      "🛌",
      "🧠",
      "🎯",
      "🌟",
    ];

    const renderWizard = (stepNum) => {
      modal.textContent = "";

      const card = document.createElement("div");
      card.className = "onboarding-card";
      card.style.position = "relative";
      card.style.overflow = "hidden";

      const progressBarTrack = document.createElement("div");
      progressBarTrack.className = "onboarding-progress-track";
      progressBarTrack.style.cssText = `
        position: absolute;
        top: 10px;                  /* Przesunięty lekko w dół od krawędzi karty */
        left: 16px;                 /* Boczne marginesy, żeby nie dotykał ścian */
        right: 16px;
        height: 12px;               /* Podwójna grubość */
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 100px;       /* 🔥 Pełne zaokrąglenie kontenera w styl kapsuły */
        overflow: hidden;           /* 🔥 Kluczowe: Przycina progress bar w środku do kształtu zaokrąglenia! */
      `;

      const progressBarFill = document.createElement("div");
      progressBarFill.className = "onboarding-progress-fill";
      const progressPercent = (stepNum / totalSteps) * 100;

      progressBarFill.style.cssText = `
        height: 100%;
        width: ${progressPercent}%;
        background: var(--hero-gradient);
        box-shadow: 0 0 15px var(--accent-color, rgba(255, 0, 255, 0.6));
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 0;           /* Brak własnego zaokrąglenia - kontener nadrzędny je wymusza */
      `;

      progressBarTrack.appendChild(progressBarFill);
      card.appendChild(progressBarTrack);

      // Tytuł kroku (czysto biały)
      const title = document.createElement("h2");
      title.className = "onboarding-title";
      title.style.marginTop = "36px"; // Większy margines, żeby tytuł nie nachodził na grubą kapsułę
      title.style.color = "#ffffff";
      title.style.textShadow = "0 2px 4px rgba(0,0,0,0.3)";
      title.textContent = steps[stepNum].title;

      // Reszta ciała modala
      const body = document.createElement("div");
      body.className = "onboarding-body";
      body.innerHTML = steps[stepNum].html;

      const applyGlassmorphismStyle = (inputEl) => {
        if (!inputEl) return;
        inputEl.style.width = "100%";
        inputEl.style.marginTop = "20px";
        inputEl.style.padding = "14px 16px";
        inputEl.style.background = "rgba(255, 255, 255, 0.05)";
        inputEl.style.border = "1px solid rgba(255, 255, 255, 0.15)";
        inputEl.style.borderRadius = "14px";
        inputEl.style.color = "#ffffff";
        inputEl.style.fontSize = "15px";
        inputEl.style.textAlign = "center";
        inputEl.style.outline = "none";
        inputEl.style.transition = "all 0.3s ease";

        inputEl.addEventListener("focus", () => {
          inputEl.style.border = "1px solid rgba(255, 0, 255, 0.6)";
          inputEl.style.background = "rgba(255, 255, 255, 0.09)";
          inputEl.style.boxShadow = "0 0 15px rgba(255, 0, 255, 0.2)";
        });
        inputEl.addEventListener("blur", () => {
          inputEl.style.border = "1px solid rgba(255, 255, 255, 0.15)";
          inputEl.style.background = "rgba(255, 255, 255, 0.05)";
          inputEl.style.boxShadow = "none";
        });
      };

      if (stepNum === 1) {
        applyGlassmorphismStyle(body.querySelector("#onboardingName"));
      } else if (stepNum === 3) {
        applyGlassmorphismStyle(body.querySelector("#onboardingHabit"));

        const picker = body.querySelector("#onboardingIconPicker");
        if (picker) {
          onboardingIcons.forEach((emoji) => {
            const iconWrapper = document.createElement("div");
            iconWrapper.className = "onboarding-icon-item";
            iconWrapper.textContent = emoji;
            iconWrapper.style.cssText = `
                flex: 0 0 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255,255,255,0.04);
                border: 2px solid transparent;
                border-radius: 12px;
                cursor: pointer;
                font-size: 22px;
                transition: all 0.25s ease;
                user-select: none;
            `;

            if (emoji === selectedIconId) {
              iconWrapper.style.border = "2px solid rgba(255, 0, 255, 0.6)";
              iconWrapper.style.background = "rgba(255, 255, 255, 0.12)";
              iconWrapper.style.boxShadow = "0 0 10px rgba(255, 0, 255, 0.3)";
            }

            iconWrapper.addEventListener("click", () => {
              picker
                .querySelectorAll(".onboarding-icon-item")
                .forEach((item) => {
                  item.style.border = "2px solid transparent";
                  item.style.background = "rgba(255,255,255,0.04)";
                  item.style.boxShadow = "none";
                });

              selectedIconId = emoji;
              iconWrapper.style.border = "2px solid rgba(255, 0, 255, 0.6)";
              iconWrapper.style.background = "rgba(255, 255, 255, 0.12)";
              iconWrapper.style.boxShadow = "0 0 10px rgba(255, 0, 255, 0.3)";
            });

            picker.appendChild(iconWrapper);
          });
        }
      }

      const footer = document.createElement("div");
      footer.className = "onboarding-footer";

      const nextBtn = document.createElement("button");
      nextBtn.id = "onboardingNextBtn";
      nextBtn.className = "addTask";
      nextBtn.style.width = "100%";
      nextBtn.style.margin = "0";
      nextBtn.style.borderRadius = "14px";
      nextBtn.style.cursor = "pointer";
      nextBtn.style.transition = "opacity 0.2s ease";

      nextBtn.textContent = stepNum === 4 ? "Start the Adventure! 🚀" : "Next";

      nextBtn.addEventListener("mouseenter", () => {
        nextBtn.style.opacity = "0.72";
      });
      nextBtn.addEventListener("mouseleave", () => {
        nextBtn.style.opacity = "1";
      });

      footer.appendChild(nextBtn);
      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(footer);
      modal.appendChild(card);

      if (stepNum === 2) {
        document
          .getElementById("btnAuthNotify")
          .addEventListener("click", async (e) => {
            e.preventDefault();
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
              localStorage.setItem("user_notifications_enabled", "true");
              e.target.textContent = "✅ Notifications Active!";
              e.target.style.opacity = "0.6";
              e.target.disabled = true;
            }
          });

        document
          .getElementById("btnAuthGeo")
          .addEventListener("click", async (e) => {
            e.preventDefault();
            navigator.geolocation.getCurrentPosition(
              () => {
                localStorage.setItem("user_location_enabled", "true");
                e.target.textContent = "✅ Geolocation Active!";
                e.target.style.opacity = "0.6";
                e.target.disabled = true;
              },
              () => {
                alert("Location access was denied.");
              }
            );
          });
      }

      nextBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        if (stepNum === 1) {
          const nameInputEl = document.getElementById("onboardingName");
          const nameInput = nameInputEl ? nameInputEl.value.trim() : "";
          if (!nameInput) {
            alert("Please choose a name, Warrior!");
            return;
          }
          const currentStats = await DataManager.getUserStats();
          currentStats.userName = nameInput;
          await DataManager.saveUserStats(currentStats);
          await UI.updateUserHeader();
        }

        if (stepNum === 3) {
          const habitInputEl = document.getElementById("onboardingHabit");
          const habitInput = habitInputEl ? habitInputEl.value.trim() : "";

          if (!habitInput) {
            alert("Please define your first habit to proceed!");
            return;
          }

          await DB.put("habits", {
            id: Date.now(),
            name: habitInput,
            icon: selectedIconId,
            frequency: "daily",
            streak: 0,
            history: {},
            createdAt: new Date().toISOString(),
          });
        }

        currentStep++;

        if (steps[currentStep]) {
          renderWizard(currentStep);
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
    renderWizard(1);
  },
};
