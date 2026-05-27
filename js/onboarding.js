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

    // 🔥 KEEP ORIGINAL: Save the default task form to restore it later
    const originalHTML = modal.innerHTML;

    // Definition of steps with unified design tokens
    const steps = {
      1: {
        title: "Welcome to Habit Bubble! 🫧",
        html: `
          <div class="onboarding-step-content">
            <p>You enter a game where your everyday discipline increases the level of your Hero. What should we call you in the hall of fame?</p>
            <input type="text" id="onboardingName" placeholder="Enter your nickname..." class="modal-input">
          </div>
        `,
      },
      2: {
        title: "Senses of Habit Bubble 🔔",
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
            <p>Let's build your very first daily habit right now to kickstart your journey. Type the name and choose a visual badge:</p>
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
    };

    const totalSteps = Object.keys(steps).length;
    let currentStep = 1;
    // Domyślna bezpieczna ikonka na start
    let selectedIconId = "💧"; 

    // Lista pięknych ikon do wyboru (Dopasowane do nawyków)
    const onboardingIcons = ["💧", "🧘", "🏃‍♂️", "📚", "🍏", "💪", "🛌", "🧠", "🎯", "🌟"];

    // Beautiful and secure DOM-based rendering wizard
    const renderWizard = (stepNum) => {
      // 1. Clear modal contents safely
      modal.textContent = "";

      // 2. Build layout wrapper
      const card = document.createElement("div");
      card.className = "onboarding-card";
      // Zapewniamy, że karta ma pozycjonowanie relative i schowane rogi, żeby pasek ładnie przylegał
      card.style.position = "relative";
      card.style.overflow = "hidden";

      // 🔥 NOWOŚĆ: Pasek postępu (Progress Bar) na samej górze karty
      const progressBarTrack = document.createElement("div");
      progressBarTrack.className = "onboarding-progress-track";
      progressBarTrack.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.05);
      `;

      const progressBarFill = document.createElement("div");
      progressBarFill.className = "onboarding-progress-fill";
      
      // Obliczamy dynamicznie procent zapełnienia paska
      const progressPercent = (stepNum / totalSteps) * 100;
      
      progressBarFill.style.cssText = `
        height: 100%;
        width: ${progressPercent}%;
        background: var(--hero-gradient);
        box-shadow: 0 0 12px var(--accent-color, rgba(255, 0, 255, 0.5));
        transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      `;

      progressBarTrack.appendChild(progressBarFill);
      card.appendChild(progressBarTrack);

      // Header title
      const title = document.createElement("h2");
      title.className = "onboarding-title";
      title.style.marginTop = "15px"; // Mały margines, aby odsunąć tytuł od paska postępu
      title.textContent = steps[stepNum].title;

      // Body context
      const body = document.createElement("div");
      body.className = "onboarding-body";
      body.innerHTML = steps[stepNum].html;

      // Helper function to style onboarding inputs beautifully
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

      // Step 1: Input styling
      if (stepNum === 1) {
        applyGlassmorphismStyle(body.querySelector("#onboardingName"));
      }
      
      // Step 3: Input styling & Dynamiczna generacja wyboru ikon
      else if (stepNum === 3) {
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

            // Podświetlenie domyślnie wybranej ikonki
            if (emoji === selectedIconId) {
                iconWrapper.style.border = "2px solid rgba(255, 0, 255, 0.6)";
                iconWrapper.style.background = "rgba(255, 255, 255, 0.12)";
                iconWrapper.style.boxShadow = "0 0 10px rgba(255, 0, 255, 0.3)";
            }

            // Obsługa kliknięcia (wybór nowej ikony)
            iconWrapper.addEventListener("click", () => {
                picker.querySelectorAll(".onboarding-icon-item").forEach(item => {
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

      // Footer action area
      const footer = document.createElement("div");
      footer.className = "onboarding-footer";

      const nextBtn = document.createElement("button");
      nextBtn.id = "onboardingNextBtn";
      nextBtn.className = "addTask";
      nextBtn.style.width = "100%";
      nextBtn.style.margin = "0";
      nextBtn.style.borderRadius = "14px";
      nextBtn.textContent = stepNum === 3 ? "Start the Adventure! 🚀" : "Next";

      footer.appendChild(nextBtn);
      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(footer);
      modal.appendChild(card);

      // System Permissions Click Handlers (Step 2)
      if (stepNum === 2) {
        document.getElementById("btnAuthNotify").addEventListener("click", async (e) => {
          e.preventDefault();
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            localStorage.setItem("user_notifications_enabled", "true");
            e.target.textContent = "✅ Notifications Active!";
            e.target.style.opacity = "0.6";
            e.target.disabled = true;
          }
        });

        document.getElementById("btnAuthGeo").addEventListener("click", async (e) => {
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

      // Main Navigation Logic
      nextBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        // Step 1 Nickname
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

        // Step 3 Validation & Save to IndexedDB
        if (stepNum === 3) {
          const habitInputEl = document.getElementById("onboardingHabit");
          const habitInput = habitInputEl ? habitInputEl.value.trim() : "";

          if (!habitInput) {
            alert("Please define your first habit to proceed!");
            return;
          }

          // Zapisujemy nowy nawyk bezpośrednio w IndexedDB do tabeli 'habits'
          await DB.put("habits", {
            id: "habit_" + Date.now(),
            name: habitInput,
            icon: selectedIconId, // Przekazujemy emoji wybrane przez usera
            frequency: "daily",
            streak: 0,
            createdAt: new Date().toISOString()
          });
        }

        currentStep++;

        if (steps[currentStep]) {
          renderWizard(currentStep);
        } else {
          // FINAL SUBMISSION & TEARDOWN
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