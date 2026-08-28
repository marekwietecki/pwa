import '../css/index.css';
import { UI } from '../js/ui.js';

const dateKey = '2026-08-28';

function buildTaskData({ type, done, overdue, location, icon, deadline, description }) {
  if (type === 'habit') {
    return { id: 1, location, icon, history: done ? { [dateKey]: true } : {} };
  }
  if (type === 'goal') {
    return { id: 1, location, done, deadline, description };
  }
  return { id: 1, location, done, date: overdue ? '2026-08-20' : dateKey };
}

function renderTaskBubble(args) {
  const data = buildTaskData(args);
  const isOverdue = args.type === 'task' && args.overdue;
  const li = UI.createItem(args.name, data, dateKey, args.type, {}, isOverdue, []);

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  list.appendChild(li);
  return list;
}

export default {
  title: 'App/TaskBubble',
  tags: ['autodocs'],
  render: renderTaskBubble,
  argTypes: {
    type: { control: { type: 'select' }, options: ['task', 'habit', 'goal'] },
    done: { control: 'boolean' },
    overdue: { control: 'boolean' },
    location: { control: 'text' },
  },
  args: {
    name: 'Drink water',
    type: 'task',
    done: false,
    overdue: false,
    location: '',
  },
};

export const Task = {};

export const OverdueTask = {
  args: { overdue: true },
};

export const CompletedTask = {
  args: { done: true },
};

export const HabitItem = {
  args: { name: 'Meditate', type: 'habit', icon: '🧘' },
};

export const GoalItem = {
  args: {
    name: 'Run a marathon',
    type: 'goal',
    deadline: '2026-12-31',
    description: 'Train consistently and finish under 5 hours.',
  },
};