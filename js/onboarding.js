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
                <button id="btnAuthNotify" class="addTask" style="background:var(--hero-gradient); color: #ffffff; cursor: pointer; transition: opacity 0.3s ease; width:100%; margin:0; border-radius: 14px;">Enable Notifications</button>
                <button id="btnAuthGeo" class="addTask" style="background: var(--hero-gradient); color: #ffffff; cursor: pointer; transition: opacity 0.3s ease; width:100%; margin:0; border-radius: 14px;">Allow Geolocation</button>
              </div>
            </div>
          `,
      },
      3: {
        title: "Your First Mission! 🎯",
        html: `
            <div class="onboarding-step-content">
              <p>Let's build your very first daily habit right now to kickstart your journey.</p> <p>Type the name and choose a visual badge:</p>
              <input type="text" id="onboardingHabit" placeholder="e.g., Drink water, Sleep 8h, Exercise..." class="modal-input">
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
                <p style="margin: 0; font-weight: 600; color: #fff;"> First level achieved! ✅</p>
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
      "🛌", 
      "💪",
      "🍏", 
      "🏃‍♂️", 
      "📚", 
      "💵",
      "🚭", 
      "📱", 
      "🐶", 
      "🧠",
      "🧘",
      "🎯", 
      "🌟"  
    ];

    const renderWizard = (stepNum) => {
      modal.textContent = "";

      // 🔥 Obejmujemy całe tło ekranu kolorem aplikacji
      modal.style.backgroundColor = "#121318";
      modal.style.backdropFilter = "none"; // Na pełnym tle nie potrzebujemy rozmywać tego, co pod spodem

      const card = document.createElement("div");
      card.className = "onboarding-card";

      // 🔥 Stylizujemy kartę jako bąbelek w czystym stylu Glassmorphism
      card.style.cssText = `
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.03);         /* Ultra delikatne, białe podbicie szkła */
          backdrop-filter: blur(20px);                     /* Silne rozmycie tła wewnątrz bąbelka */
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);    /* Cienka, lśniąca krawędź bąbelka */
          border-radius: 24px;                             /* Ładne, mocne zaokrąglenie w stylu bąbelka */
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4),      /* Głęboki cień na zewnątrz */
                      inset 0 1px 0 rgba(255, 255, 255, 0.1); /* Wewnętrzny błysk na górnej krawędzi szkła */
          padding: 24px;
          width: 90%;
          max-width: 420px;
          margin: auto;                                    /* Wyśrodkowanie w modalu */
        `;

      const progressBarTrack = document.createElement("div");
      // ... reszta kodu bez zmian ...
      progressBarTrack.className = "onboarding-progress-track";
      progressBarTrack.style.cssText = `
        position: absolute;
        top: 24px;                  
        left: 24px;                 
        right: 24px;
        height: 12px;               
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 100px;       
        overflow: hidden;           
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
        border-radius: 0;           
      `;

      progressBarTrack.appendChild(progressBarFill);
      card.appendChild(progressBarTrack);

      // Tytuł kroku
      const title = document.createElement("h2");
      title.className = "onboarding-title";
      title.style.marginTop = "36px";
      title.style.color = "#ffffff";
      title.style.textShadow = "0 2px 4px rgba(0,0,0,0.3)";
      title.textContent = steps[stepNum].title;

      // Reszta ciała modala
      const body = document.createElement("div");
      body.className = "onboarding-body";
      body.innerHTML = steps[stepNum].html;

      // 🔥 PRZENIESIONE WYŻEJ: Tworzenie stopki i przycisku Next (teraz checkInput bez problemu go znajdzie)
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

      // Styl szklany dla inputów
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
          inputEl.style.border = "1px solid rgba(255, 255, 255, 0.6)";
          inputEl.style.background = "rgba(255, 255, 255, 0.09)";
          inputEl.style.boxShadow = "0 0 15px rgba(255, 255, 255, 0.2)";
        });
        inputEl.addEventListener("blur", () => {
          inputEl.style.border = "1px solid rgba(255, 255, 255, 0.15)";
          inputEl.style.background = "rgba(255, 255, 255, 0.05)";
          inputEl.style.boxShadow = "none";
        });
      };

      // Logika kroków
      if (stepNum === 1) {
        const nameInput = body.querySelector("#onboardingName");
        applyGlassmorphismStyle(nameInput);

        const checkInput = () => {
          if (nameInput.value.trim().length > 0) {
            nextBtn.disabled = false;
            nextBtn.style.opacity = "1";
            nextBtn.style.cursor = "pointer";
            nextBtn.style.pointerEvents = "auto";
          } else {
            nextBtn.disabled = true;
            nextBtn.style.opacity = "0.35";
            nextBtn.style.cursor = "not-allowed";
            nextBtn.style.pointerEvents = "none";
          }
        };

        checkInput();
        nameInput.addEventListener("input", checkInput);
      } else if (stepNum === 3) {
        const habitInput = body.querySelector("#onboardingHabit");
        applyGlassmorphismStyle(habitInput);

        const checkInput = () => {
          if (habitInput.value.trim().length > 0) {
            nextBtn.disabled = false;
            nextBtn.style.opacity = "1";
            nextBtn.style.cursor = "pointer";
            nextBtn.style.pointerEvents = "auto";
          } else {
            nextBtn.disabled = true;
            nextBtn.style.opacity = "0.35";
            nextBtn.style.cursor = "not-allowed";
            nextBtn.style.pointerEvents = "none";
          }
        };

        checkInput();
        habitInput.addEventListener("input", checkInput);

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
              iconWrapper.style.border = "2px solid rgba(255, 255, 255, 0.6)";
              iconWrapper.style.background = "rgba(255, 255, 255, 0.12)";
              iconWrapper.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.3)";
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
              iconWrapper.style.border = "2px solid rgba(255, 255, 255, 0.6)";
              iconWrapper.style.background = "rgba(255, 255, 255, 0.12)";
              iconWrapper.style.boxShadow = "0 0 10px rgba(255, 255, 255, 0.3)";
            });

            picker.appendChild(iconWrapper);
          });
        }
      }

      // Składanie elementów do kupy
      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(footer); // footer ma już w sobie nextBtn
      modal.appendChild(card);

      // Obsługa uprawnień w kroku 2
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

      // Akcja po kliknięciu głównego przycisku
      nextBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        if (stepNum === 1) {
          const nameInputEl = document.getElementById("onboardingName");
          const nameInput = nameInputEl ? nameInputEl.value.trim() : "";
          if (!nameInput) return;

          const currentStats = await DataManager.getUserStats();
          currentStats.userName = nameInput;
          await DataManager.saveUserStats(currentStats);
          await UI.updateUserHeader();
        }

        if (stepNum === 3) {
          const habitInputEl = document.getElementById("onboardingHabit");
          const habitInput = habitInputEl ? habitInputEl.value.trim() : "";
          if (!habitInput) return;

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
