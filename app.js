// Tworzymy pasek, jeśli go nie ma
if (!document.getElementById("offline-banner")) {
  const banner = document.createElement("div");
  banner.id = "offline-banner";
  banner.textContent = "Brak połączenia z internetem";
  document.body.prepend(banner);
}

// Obsługa zmian stanu sieci
window.addEventListener("online", () => {
  document.body.classList.remove("offline");
});

window.addEventListener("offline", () => {
  document.body.classList.add("offline");
});

// Jeśli użytkownik startuje już bez neta
if (!navigator.onLine) {
  document.body.classList.add("offline");
}
