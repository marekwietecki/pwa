function renderTypePicker({ label, type, active }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'typePicker' + (active ? ' active' : '');
  btn.dataset.type = type;
  btn.textContent = label;
  return btn;
}

export default {
  title: 'App/TypePicker',
  tags: ['autodocs'],
  render: (args) => renderTypePicker(args),
  argTypes: {
    label: { control: 'text' },
    type: {
      control: { type: 'select' },
      options: ['task', 'habit', 'goal'],
    },
    active: { control: 'boolean' },
  },
  args: {
    label: 'Task',
    type: 'task',
    active: false,
  },
};

export const Default = {};

export const Selected = {
  args: { active: true },
};

export const HabitVariant = {
  args: { label: 'Habit', type: 'habit' },
};

export const GoalVariant = {
  args: { label: 'Goal', type: 'goal' },
};