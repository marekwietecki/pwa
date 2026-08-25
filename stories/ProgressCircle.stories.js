import { UI } from "../js/ui.js";

export default {
  title: "App/ProgressCircle",
  tags: ["autodocs"],
  render: ({ percentage }) => UI.createProgressCircle(percentage),
  argTypes: {
    percentage: {
      control: { type: "range", min: 0, max: 100, step: 1 },
    },
  },
  args: {
    percentage: 65,
  },
};

export const InProgress = {};

export const Empty = {
  args: { percentage: 0 },
};

export const Complete = {
  args: { percentage: 100 },
};
