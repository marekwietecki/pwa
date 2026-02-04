# 🏆 HabitHero - Gamified Task Manager PWA

HabitHero to progresywna aplikacja internetowa (PWA), która zamienia codzienne obowiązki w przygodę RPG. Zdobywaj punkty doświadczenia (XP), awansuj na wyższe poziomy i śledź swoje nawyki w interaktywnym kalendarzu.

---

## 📖 Spis Treści
* [🚀 Funkcjonalności](#-funkcjonalności)
* [🛠️ Technologie](#️-technologie)
* [📱 Funkcje Natywne i PWA](#-funkcje-natywne-i-pwa)
* [⚙️ Instalacja i Uruchomienie](#️-instalacja-i-uruchomienie)
* [📊 System Gamifikacji](#-system-gamifikacji)

---

## 🚀 Funkcjonalności

* **Zarządzanie Zadaniami:** Dodawanie, usuwanie i oznaczanie zadań jako ukończone.
* **System Nawyków:** Tworzenie nawyków o różnej częstotliwości (dzienne, tygodniowe, miesięczne).
* **Śledzenie Celów:** Wyznaczanie długoterminowych celów z terminami (deadline).
* **Interaktywny Kalendarz:** Podgląd aktywności i zadań w widoku miesięcznym.
* **Geolokalizacja:** Dodawanie lokalizacji do zadań przy użyciu GPS lub wyszukiwarki adresów.
* **Profil Bohatera:** Personalizacja nazwy użytkownika i wizualny pasek postępu XP.

---

## 🛠️ Technologie

Aplikacja została zbudowana w architekturze **vanilla JavaScript** (bez ciężkich frameworków), co zapewnia jej błyskawiczne działanie.

* **Frontend:** HTML5, CSS3 (Flexbox/Grid), JavaScript (ES6+).
* **Mapy i Lokacje:** API OpenStreetMap (Nominatim) - darmowa alternatywa dla Google Maps.
* **Przechowywanie danych:** `localStorage` API (dane zostają na urządzeniu użytkownika).
* **Hosting:** Netlify z automatycznym certyfikatem SSL (HTTPS).

---

## 📱 Funkcje Natywne i PWA

Aplikacja wykorzystuje nowoczesne Web API, aby oferować doświadczenie zbliżone do natywnych aplikacji mobilnych:

1. **Vibration API:** Telefon generuje krótkie wibracje (haptic feedback) przy zmianie nazwy użytkownika lub zdobywaniu XP.
2. **Geolocation API:** Pozwala na pobranie dokładnych współrzędnych użytkownika i zamianę ich na czytelny adres (Reverse Geocoding).
3. **PWA (Progressive Web App):**
   * Możliwość instalacji na ekranie głównym (Add to Home Screen).
   * Działanie w trybie pełnoekranowym (bez paska adresu).
   * Responsywny design dopasowany do telefonów i tabletów.

---

## ⚙️ Instalacja i Uruchomienie

### Wersja deweloperska (Lokalna)
Aplikacja jest hostowana na platformie Netlify i dostępna pod adresem:https://twoja-nazwa.netlify.app📊 

## System Gamifikacji
Aplikacja posiada wbudowany silnik logiczny LevelManager, który zarządza progresją użytkownika:
- Obliczanie XP: Każde zadanie i nawyk ma przypisaną wartość punktową.
- Próg Poziomu: Wymagana ilość XP rośnie z każdym poziomem według wzoru:$$XP = level \times 100$$ aż do poziomu setnego, od którego ilość xp do wbicia każdego kolejnego poziomu wynosi 10 000.
- Trwałość: Wszystkie statystyki (XP, Level, Nickname) są synchronizowane z DataManager i bezpiecznie przechowywane w pamięci przeglądarki.

---

Projekt stworzony z pasją do produktywności.
Marek Wietecki