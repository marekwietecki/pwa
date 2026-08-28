import '../css/habits.css';

function buildMockMonth(daysInMonth, { doneDays = [], scheduledFrom = 1 } = {}) {
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const isScheduled = day >= scheduledFrom;
    return { day, isDone: doneDays.includes(day), isScheduled };
  });
}

function renderActivityGrid(days) {
  const wrapper = document.createElement('div');
  wrapper.className = 'activity-section';

  const labels = document.createElement('div');
  labels.className = 'activity-day-labels';
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((label) => {
    const el = document.createElement('div');
    el.textContent = label;
    labels.appendChild(el);
  });

  const grid = document.createElement('div');
  grid.className = 'activity-grid';
  days.forEach((dayData) => {
    const el = document.createElement('div');
    if (dayData === null) {
      grid.appendChild(el);
      return;
    }
    el.className = 'mini-day';
    el.textContent = dayData.day;
    if (dayData.isDone) el.classList.add('habit-done');
    if (!dayData.isScheduled) el.classList.add('inactive');
    grid.appendChild(el);
  });

  wrapper.append(labels, grid);
  return wrapper;
}

export default {
  title: 'App/ActivityGrid',
  tags: ['autodocs'],
  render: ({ days }) => renderActivityGrid(days),
};

export const GoodStreak = {
  args: {
    days: [null, null, ...buildMockMonth(30, { doneDays: [1,2,3,4,5,6,7,8,10,11,12,14,15,16,17,18] })],
  },
};

export const BrokenStreak = {
  args: {
    days: [null, null, ...buildMockMonth(28, { doneDays: [1,2,5,6,9,13,14,20,21] })],
  },
};

export const NewlyCreatedHabit = {
  args: {
    days: [null, null, ...buildMockMonth(30, { doneDays: [16,17,19,20], scheduledFrom: 15 })],
  },
};