import '../css/global.css';

function buildEmptyState({ icon, title, subtitle }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'emptyState';

  const iconEl = document.createElement('div');
  iconEl.className = 'emptyState-icon';
  iconEl.textContent = icon;

  const titleEl = document.createElement('p');
  titleEl.className = 'emptyState-title';
  titleEl.textContent = title;

  const subtitleEl = document.createElement('p');
  subtitleEl.className = 'emptyState-subtitle';
  subtitleEl.textContent = subtitle;

  wrapper.append(iconEl, titleEl, subtitleEl);
  return wrapper;
}

export default {
  title: 'App/EmptyState',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The shared `.emptyState` pattern (icon + title + subtitle) used whenever a list has nothing to show. Four real variants exist across the app, shown below verbatim.',
      },
    },
  },
  render: (args) => buildEmptyState(args),
};

export const NothingPlanned = {
  args: {
    icon: '📅',
    title: 'Nothing planned',
    subtitle: 'No tasks planned for this day.',
  },
};

export const AllTasksDone = {
  args: {
    icon: '🎉',
    title: 'All tasks done!',
    subtitle: "Keep it up, you're on a roll.",
  },
};

export const NoGoalsYet = {
  args: {
    icon: '🎯',
    title: 'No goals yet',
    subtitle: 'Set one to start tracking real progress.',
  },
};

export const NoHabitsYet = {
  args: {
    icon: '🔥',
    title: 'No habits yet',
    subtitle: 'Add one to start your streak.',
  },
};
