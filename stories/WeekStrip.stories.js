import '../css/calendar.css';
import { UI } from '../js/ui.js';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildWeekView({ monthLabel, days, dropdownOpen, months }) {
  const root = document.createElement('div');
  // Storybook's canvas is wider than the 600px breakpoint that normally
  // gates this view, so it's forced visible here instead of relying on
  // the media query.
  root.style.maxWidth = '375px';
  root.style.margin = '0 auto';

  const view = document.createElement('div');
  view.className = 'week-view';
  view.style.display = 'block';

  const dropdownContainer = document.createElement('div');
  dropdownContainer.className = `month-year-dropdown-container${dropdownOpen ? ' open' : ''}`;

  const trigger = document.createElement('button');
  trigger.className = 'month-year-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-label', 'Choose month and year');
  const label = document.createElement('span');
  label.textContent = monthLabel;
  trigger.appendChild(label);
  trigger.insertAdjacentHTML(
    'beforeend',
    `<svg class="dropdown-chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg>`
  );

  const list = document.createElement('div');
  list.className = 'month-year-dropdown-list';
  if (dropdownOpen) {
    list.style.maxHeight = '260px';
  }
  months.forEach((m) => {
    const item = document.createElement('div');
    item.className = `month-year-item${m === monthLabel ? ' selected' : ''}`;
    item.textContent = m;
    list.appendChild(item);
  });

  dropdownContainer.append(trigger, list);

  const dayLabels = document.createElement('div');
  dayLabels.className = 'week-day-labels';
  DAY_LABELS.forEach((d) => {
    const el = document.createElement('div');
    el.textContent = d;
    el.className = 'day-label';
    dayLabels.appendChild(el);
  });

  const stripRow = document.createElement('div');
  stripRow.className = 'week-strip-row';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'monthArrow';
  prevBtn.setAttribute('aria-label', 'Previous week');
  prevBtn.textContent = '‹';

  const strip = document.createElement('div');
  strip.className = 'week-strip';
  days.forEach((day) => {
    const el = document.createElement('div');
    el.className = `day${day.active ? ' active' : ''}`;
    const num = document.createElement('span');
    num.textContent = day.date;
    el.appendChild(num);
    if (day.goal) {
      const wrapper = document.createElement('div');
      wrapper.className = `day-goal-wrapper${day.overdue ? ' is-overdue' : ''}`;
      wrapper.appendChild(UI.createGoalIcon());
      el.appendChild(wrapper);
    }
    strip.appendChild(el);
  });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'monthArrow';
  nextBtn.setAttribute('aria-label', 'Next week');
  nextBtn.textContent = '›';

  stripRow.append(prevBtn, strip, nextBtn);
  view.append(dropdownContainer, dayLabels, stripRow);
  root.appendChild(view);
  return root;
}

const MONTH_OPTIONS = [
  'July 2026',
  'August 2026',
  'September 2026',
  'October 2026',
  'November 2026',
];

export default {
  title: 'App/WeekStrip',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Mobile-only calendar view (`@media (max-width: 600px)`) shown in place of the full month grid. Chevrons flank the week strip directly, and the month/year label opens a scrollable picker.',
      },
    },
  },
  render: (args) => buildWeekView(args),
};

export const Default = {
  args: {
    monthLabel: 'September 2026',
    dropdownOpen: false,
    months: MONTH_OPTIONS,
    days: [
      { date: 7 },
      { date: 8 },
      { date: 9 },
      { date: 10 },
      { date: 11, active: true },
      { date: 12 },
      { date: 13 },
    ],
  },
};

export const WithGoalDeadline = {
  args: {
    ...Default.args,
    days: [
      { date: 7 },
      { date: 8 },
      { date: 9, goal: true, overdue: true },
      { date: 10 },
      { date: 11, active: true },
      { date: 12, goal: true },
      { date: 13 },
    ],
  },
};

export const MonthYearPickerOpen = {
  args: {
    ...Default.args,
    dropdownOpen: true,
  },
};
