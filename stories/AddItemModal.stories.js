function buildModal({ type, title }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'modalOverlay';

  const sheet = document.createElement('div');
  sheet.className = 'modal-sheet';

  const header = document.createElement('header');
  header.className = 'modal-header';
  const pickerWrapper = document.createElement('div');
  pickerWrapper.className = 'typePickersWrapper';
  const h3 = document.createElement('h3');
  h3.id = 'modalTitle';
  h3.textContent = title;
  const pickers = document.createElement('div');
  pickers.className = 'typePickers';
  ['task', 'habit', 'goal'].forEach((t) => {
    const btn = document.createElement('button');
    btn.className = 'typePicker' + (t === type ? ' active' : '');
    btn.dataset.type = t;
    btn.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    pickers.appendChild(btn);
  });
  pickerWrapper.append(h3, pickers);
  const closeBtn = document.createElement('button');
  closeBtn.id = 'closeModal';
  closeBtn.setAttribute('aria-label', 'Close modal');
  closeBtn.textContent = '✕';
  header.append(pickerWrapper, closeBtn);

  const nameSection = document.createElement('div');
  nameSection.className = 'nameSection';
  nameSection.innerHTML = `
    <label class="modalSubTitle" for="taskName">Name</label>
    <input type="text" placeholder="Enter name" id="taskName" name="taskName" />
  `;

  const habitSection = document.createElement('div');
  habitSection.id = 'habitSection';
  habitSection.style.display = type === 'habit' ? 'flex' : 'none';
  habitSection.style.flexDirection = 'column';
  habitSection.innerHTML = `
    <div id="habitIconWrapper" style="display: flex; flex-direction: column">
      <label class="modalSubTitle" for="habitIcon">Icon</label>
      <input type="text" id="habitIcon" placeholder="★" maxlength="2" autocomplete="off" spellcheck="false" />
    </div>
    <div style="display: flex; flex-direction: column">
      <label class="modalSubTitle" for="habitFrequency">Frequency</label>
      <select id="habitFrequency">
        <option value="daily">Everyday</option>
        <option value="weekly">Select days of the week</option>
        <option value="monthly">Select days of the month</option>
      </select>
    </div>
  `;

  const goalSection = document.createElement('div');
  goalSection.id = 'goalSection';
  goalSection.style.display = type === 'goal' ? 'flex' : 'none';
  goalSection.style.flexDirection = 'column';
  goalSection.innerHTML = `
    <div class="deadlinePlusLinkHabit">
      <div class="deadlineSection">
        <label class="modalSubTitle" for="goalDeadline">Deadline</label>
        <input type="date" id="goalDeadline" name="goalDeadline" />
      </div>
      <div class="linkHabitSection">
        <label class="modalSubTitle" for="goalHabitSelect">Link Habit - make goal measurable</label>
        <select id="goalHabitSelect" name="goalHabitSelect">
          <option value="">No linked habit</option>
        </select>
      </div>
    </div>
    <div class="descriptionSection">
      <label class="modalSubTitle" for="descriptionInput">Description</label>
      <textarea id="descriptionInput" name="descriptionInput" placeholder="Any more details about your goal?"></textarea>
    </div>
  `;

  const dateSection = document.createElement('div');
  dateSection.id = 'dateSection';
  dateSection.style.display = type === 'task' ? 'flex' : 'none';
  dateSection.style.flexDirection = 'column';
  dateSection.innerHTML = `
    <label class="modalSubTitle" for="taskDate">Date</label>
    <input type="date" id="taskDate" name="taskDate" />
  `;

  const locationSection = document.createElement('div');
  locationSection.className = 'locationSection';
  locationSection.id = 'locationSection';
  locationSection.style.display = type === 'task' || type === 'habit' ? 'flex' : 'none';
  locationSection.innerHTML = `
    <label class="modalSubTitle" for="locationInput">Location</label>
    <div class="locationContentWrapper">
      <input type="text" id="locationInput" name="locationInput" placeholder="Enter location" />
      <button id="searchLocation" aria-label="Search location">🔍</button>
      <button id="useMyLocation" aria-label="Use my current location">📍</button>
    </div>
  `;

  const submitBtn = document.createElement('button');
  submitBtn.className = 'addTask';
  submitBtn.id = 'confirmAddBtn';
  submitBtn.textContent = 'Create';

  sheet.append(header, nameSection, habitSection, goalSection, dateSection, locationSection, submitBtn);
  overlay.appendChild(sheet);
  return overlay;
}

export default {
  title: 'App/AddItemModal',
  tags: ['autodocs'],
  render: ({ type, title }) => buildModal({ type, title }),
  argTypes: {
    type: { control: { type: 'select' }, options: ['task', 'habit', 'goal'] },
    title: { control: 'text' },
  },
  args: { type: 'task', title: 'New' },
};

export const AddTask = {};
export const AddHabit = { args: { type: 'habit' } };
export const AddGoal = { args: { type: 'goal' } };
