export const elements = {};

export function domElements() {
  const ids = [
    "calendarGrid",
    "currentMonth",
    "toDoList",
    "calendarToDoList",
    "taskDateTitle",
    "calendarTaskDateTitle",
    "modalOverlay",
    "taskName",
    "taskDate",
    "locationInput",
    "locationSection",
    "habitSection",
    "habitFrequency",
    "daysPicker",
    "monthlyDayPicker",
    "addTaskBtn",
    "closeModal",
    "searchLocation",
    "useMyLocation",
    "goalSection",
    "goalsList",
    "goalDeadline",
    "descriptionInput",
    "emptyListMessageWrapper",
    "calendarEmptyListMessageWrapper",
    "modalTitle",
    "goalHabitSelect",
    "editUserName",
    "displayUserName",
    "userNameInput",
    "messageToday",
    "messageFuture",
    "calendarMessageToday",
    "calendarMessageFuture",
  ];

  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      elements[id] = el;
    } else {
      elements[id] = null;
    }
  });

  elements.geoLocBtn = elements.useMyLocation; 
  elements.searchLocationBtn = elements.searchLocation;
  elements.confirmAddBtn = document.querySelector(".addTask");
}
