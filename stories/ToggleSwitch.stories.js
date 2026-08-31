import '../css/hero.css';

function renderToggleSwitch({ checked, id }) {
  const label = document.createElement('label');
  label.className = 'switch';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = id;
  input.checked = checked;

  const slider = document.createElement('span');
  slider.className = 'slider round';

  label.append(input, slider);
  return label;
}

export default {
  title: 'App/ToggleSwitch',
  tags: ['autodocs'],
  render: ({ checked, id }) => renderToggleSwitch({ checked, id }),
  argTypes: {
    checked: { control: 'boolean' },
  },
  args: {
    checked: false,
    id: 'toggleExample',
  },
};

export const Off = {};

export const On = {
  args: { checked: true },
};
