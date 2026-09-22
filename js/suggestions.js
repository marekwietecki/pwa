// Curated common habit names, most common first - the matcher below always
// returns the first prefix match, so order here doubles as priority.
export const HABIT_NAME_SUGGESTIONS = [
  "Drink water",
  "Read 10 pages",
  "Meditate",
  "Exercise",
  "Sleep 8 hours",
  "Journal",
  "Stretch",
  "No sugar",
  "Walk 10k steps",
  "Cold shower",
  "No phone before bed",
  "Wake up early",
  "Eat vegetables",
  "Floss",
  "Learn a language",
  "Practice guitar",
  "Go to the gym",
  "No alcohol",
  "Take vitamins",
  "Plan tomorrow",
  "Clean the house",
  "Save money",
  "Call family",
  "No junk food",
  "Yoga",
  "Run",
  "Take a walk",
  "Study",
  "Write",
  "Breathing exercise",
];

/**
 * Returns the first suggestion whose name starts with `typed`
 * (case-insensitive), or null if nothing matches or `typed` is empty.
 */
export function getHabitSuggestion(typed) {
  const query = typed.trim().toLowerCase();
  if (!query) return null;

  const match = HABIT_NAME_SUGGESTIONS.find((name) =>
    name.toLowerCase().startsWith(query)
  );
  return match || null;
}
