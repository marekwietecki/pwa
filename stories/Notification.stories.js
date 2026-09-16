import '../css/global.css';
import { UI } from '../js/ui.js';

function buildToastDemo({ message, type }) {
  const root = document.createElement('div');
  root.style.cssText =
    'min-height: 140px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 16px;';

  const hint = document.createElement('p');
  hint.style.cssText =
    'color: rgba(255, 255, 255, 0.4); font-size: 12px; text-align: center; margin: 0;';
  hint.textContent = 'Auto-dismisses after 4s, or on click.';
  root.appendChild(hint);

  // Wait a frame so the toast's own container is already mounted in the
  // document before UI.showToast appends into document.body.
  requestAnimationFrame(() => UI.showToast(message, type));

  return root;
}

function buildBadgeDemo({ text }) {
  const root = document.createElement('div');
  root.style.cssText =
    'min-height: 140px; display: flex; align-items: center; justify-content: center;';

  const anchor = document.createElement('div');
  anchor.textContent = '☑ Task checkbox';
  anchor.style.cssText =
    'padding: 10px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #fff; font-size: 13px;';
  root.appendChild(anchor);

  // UI.createFloatingBadge reads the anchor's live bounding rect, so it
  // needs to already be laid out in the document - wait a frame.
  requestAnimationFrame(() => {
    UI.createFloatingBadge({ currentTarget: anchor }, text);
  });

  return root;
}

export default {
  title: 'App/Notification',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Two lightweight feedback patterns, both driven by real UI functions rather than mocked markup: `UI.showToast` (a top banner for info/error messages) and `UI.createFloatingBadge` (a bubble that pops up next to whatever was just clicked - used for XP gained and the "no points for past tasks" nudge).',
      },
    },
  },
};

export const ToastInfo = {
  render: () =>
    buildToastDemo({
      message: 'Task "Read" has been permanently deleted.',
      type: 'info',
    }),
};

export const ToastError = {
  render: () =>
    buildToastDemo({
      message:
        'You cannot check a future task. Build your habits day by day!',
      type: 'error',
    }),
};

export const BadgeXpGained = {
  render: () => buildBadgeDemo({ text: '+15 XP 🫧' }),
};

export const BadgeNoPointsForPastTasks = {
  render: () => buildBadgeDemo({ text: 'No points for past tasks' }),
};
