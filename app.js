(() => {
  const STORE_KEY = "flos-fitness:data:v1";
  const defaultExercises = ["Kniebeuge", "Bankdrücken", "Kreuzheben", "Schulterdrücken", "Klimmzüge", "Rudern", "Ausfallschritte", "Plank", "Laufen", "Radfahren"];

  const presets = {
    Push: ["Bankdrücken: 10x60, 8x65, 6x70", "Schulterdrücken: 10x25, 10x25", "Trizepsdrücken: 12x30, 10x30"].join("\n"),
    Pull: ["Klimmzüge: 8x0, 6x0, 5x0", "Rudern: 10x45, 10x45, 8x50", "Bizepscurls: 12x12.5, 10x12.5"].join("\n"),
    Beine: ["Kniebeuge: 10x60, 8x70, 6x80", "Ausfallschritte: 10x20, 10x20", "Wadenheben: 15x40, 15x40"].join("\n"),
    "Ganzkörper": ["Kniebeuge: 8x60, 8x60", "Bankdrücken: 8x55, 8x55", "Rudern: 10x45, 10x45", "Plank: 60x0, 45x0"].join("\n")
  };

  const state = loadState();
  const els = {
    installButton: document.querySelector("#installButton"),
    todaySummary: document.querySelector("#todaySummary"),
    weekWorkouts: document.querySelector("#weekWorkouts"),
    totalVolume: document.querySelector("#totalVolume"),
    streakDays: document.querySelector("#streakDays"),
    workoutForm: document.querySelector("#workoutForm"),
    workoutDate: document.querySelector("#workoutDate"),
    workoutName: document.querySelector("#workoutName"),
    workoutExercises: document.querySelector("#workoutExercises"),
    workoutNotes: document.querySelector("#workoutNotes"),
    resetForm: document.querySelector("#resetForm"),
    exerciseForm: document.querySelector("#exerciseForm"),
    exerciseName: document.querySelector("#exerciseName"),
    exerciseList: document.querySelector("#exerciseList"),
    historySearch: document.querySelector("#historySearch"),
    historyList: document.querySelector("#historyList"),
    workoutTemplate: document.querySelector("#workoutTemplate"),
    exportJson: document.querySelector("#exportJson"),
    importJson: document.querySelector("#importJson"),
    clearData: document.querySelector("#clearData")
  };

  let deferredInstallPrompt = null;
  init();

  function init() {
    els.workoutDate.value = toISODate();
    bindEvents();
    render();
    registerServiceWorker();
  }

  function bindEvents() {
    els.workoutForm.addEventListener("submit", handleWorkoutSubmit);
    els.resetForm.addEventListener("click", resetWorkoutForm);
    els.exerciseForm.addEventListener("submit", handleExerciseSubmit);
    els.historySearch.addEventListener("input", renderHistory);
    els.exportJson.addEventListener("click", exportJson);
    els.importJson.addEventListener("change", importJson);
    els.clearData.addEventListener("click", clearData);

    document.querySelectorAll("[data-preset]").forEach((button) => {
      button.addEventListener("click", () => applyPreset(button.dataset.preset));
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      els.installButton.hidden = false;
    });

    els.installButton.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      els.installButton.hidden = true;
    });
  }

  function loadState() {
    const fallback = { exercises: [...defaultExercises], workouts: [], settings: { weeklyGoal: 3 } };
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        exercises: Array.isArray(parsed.exercises) && parsed.exercises.length ? parsed.exercises : fallback.exercises,
        workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
        settings: { ...fallback.settings, ...(parsed.settings || {}) }
      };
    } catch (error) {
      console.warn("Trainingsdaten konnten nicht geladen werden.", error);
      return fallback;
    }
  }

  function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  function render() { sortWorkouts(); renderStats(); renderExercises(); renderHistory(); }

  function handleWorkoutSubmit(event) {
    event.preventDefault();
    let parsedExercises;
    try { parsedExercises = parseExerciseInput(els.workoutExercises.value); } catch (error) { alert(error.message); return; }
    const workout = { id: createId(), date: els.workoutDate.value, name: els.workoutName.value.trim(), exercises: parsedExercises, notes: els.workoutNotes.value.trim(), createdAt: new Date().toISOString() };
    if (!workout.date || !workout.name) { alert("Bitte Datum und Fokus eintragen."); return; }
    workout.exercises.forEach((exercise) => addExerciseToCatalog(exercise.name));
    state.workouts.push(workout);
    saveState();
    render();
    resetWorkoutForm({ keepDate: true });
  }

  function handleExerciseSubmit(event) {
    event.preventDefault();
    const name = els.exerciseName.value.trim();
    if (!name) return;
    addExerciseToCatalog(name);
    els.exerciseName.value = "";
    saveState();
    renderExercises();
  }

  function addExerciseToCatalog(name) {
    const exists = state.exercises.some((exercise) => exercise.toLowerCase() === name.toLowerCase());
    if (!exists) state.exercises.push(name);
    state.exercises.sort((a, b) => a.localeCompare(b, "de"));
  }

  function removeExerciseFromCatalog(name) {
    state.exercises = state.exercises.filter((exercise) => exercise !== name);
    saveState();
    renderExercises();
  }

  function parseExerciseInput(input) {
    const lines = input.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) throw new Error("Bitte mindestens eine Übung eintragen.");
    return lines.map((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex === -1) throw new Error(`Ungültige Zeile: "${line}". Erwartet wird: Übung: 10x60, 8x65`);
      const name = line.slice(0, separatorIndex).trim();
      const setsRaw = line.slice(separatorIndex + 1).trim();
      if (!name || !setsRaw) throw new Error(`Ungültige Zeile: "${line}". Bitte Übung und Sätze eintragen.`);
      const sets = setsRaw.split(",").map((entry) => entry.trim()).filter(Boolean).map(parseSet);
      if (!sets.length) throw new Error(`Keine Sätze für "${name}" gefunden.`);
      return { name, sets };
    });
  }

  function parseSet(entry) {
    const match = entry.match(/^(\d+)\s*x\s*([0-9]+(?:[.,][0-9]+)?)$/i);
    if (!match) throw new Error(`Ungültiger Satz: "${entry}". Nutze z. B. 10x60 oder 12x7,5.`);
    const reps = Number.parseInt(match[1], 10);
    const weight = Number.parseFloat(match[2].replace(",", "."));
    if (!Number.isFinite(reps) || reps <= 0 || !Number.isFinite(weight) || weight < 0) throw new Error(`Ungültiger Satz: "${entry}".`);
    return { reps, weight };
  }

  function renderStats() {
    const today = toISODate();
    const todaysWorkouts = state.workouts.filter((workout) => workout.date === today);
    const weekStart = getWeekStart(new Date());
    const weeklyWorkouts = state.workouts.filter((workout) => parseDate(workout.date) >= weekStart);
    const volume = weeklyWorkouts.reduce((sum, workout) => sum + getWorkoutVolume(workout), 0);
    els.weekWorkouts.textContent = String(weeklyWorkouts.length);
    els.totalVolume.textContent = `${formatNumber(volume)} kg`;
    els.streakDays.textContent = String(getStreakDays());
    els.todaySummary.textContent = todaysWorkouts.length ? `Heute gespeichert: ${todaysWorkouts.map((workout) => workout.name).join(", ")}.` : `Noch kein Training für heute. Wochenziel: ${weeklyWorkouts.length}/${state.settings.weeklyGoal} Einheiten.`;
  }

  function renderExercises() {
    els.exerciseList.textContent = "";
    state.exercises.forEach((exercise) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      const label = document.createElement("span");
      label.textContent = exercise;
      const useButton = document.createElement("button");
      useButton.type = "button";
      useButton.textContent = "+";
      useButton.title = `${exercise} ins Training übernehmen`;
      useButton.addEventListener("click", () => appendExerciseLine(exercise));
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "×";
      removeButton.title = `${exercise} entfernen`;
      removeButton.addEventListener("click", () => removeExerciseFromCatalog(exercise));
      chip.append(label, useButton, removeButton);
      els.exerciseList.append(chip);
    });
  }

  function renderHistory() {
    const query = els.historySearch.value.trim().toLowerCase();
    const filtered = state.workouts.filter((workout) => {
      if (!query) return true;
      const haystack = [workout.date, workout.name, workout.notes, ...workout.exercises.map((exercise) => exercise.name)].join(" ").toLowerCase();
      return haystack.includes(query);
    });
    els.historyList.textContent = "";
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = state.workouts.length ? "Keine Trainings zu deiner Suche gefunden." : "Noch keine Trainings gespeichert.";
      els.historyList.append(empty);
      return;
    }
    filtered.forEach((workout) => {
      const node = els.workoutTemplate.content.firstElementChild.cloneNode(true);
      node.querySelector("h3").textContent = workout.name;
      node.querySelector(".workout-card-header p").textContent = formatDate(workout.date);
      node.querySelector(".delete-workout").addEventListener("click", () => deleteWorkout(workout.id));
      const list = node.querySelector(".exercise-summary");
      workout.exercises.forEach((exercise) => {
        const item = document.createElement("li");
        const sets = exercise.sets.map((set) => `${set.reps}x${formatWeight(set.weight)} kg`).join(", ");
        const name = document.createElement("strong");
        name.textContent = exercise.name;
        item.append(name, document.createTextNode(`: ${sets} · Volumen ${formatNumber(getExerciseVolume(exercise))} kg`));
        list.append(item);
      });
      node.querySelector(".notes").textContent = workout.notes ? `Notiz: ${workout.notes}` : "";
      els.historyList.append(node);
    });
  }

  function deleteWorkout(id) {
    const workout = state.workouts.find((entry) => entry.id === id);
    if (!workout) return;
    if (!confirm(`Training "${workout.name}" vom ${formatDate(workout.date)} löschen?`)) return;
    state.workouts = state.workouts.filter((entry) => entry.id !== id);
    saveState();
    render();
  }

  function applyPreset(name) { els.workoutName.value = name; els.workoutExercises.value = presets[name] || ""; els.workoutExercises.focus(); }
  function appendExerciseLine(name) { const prefix = els.workoutExercises.value.trim() ? "\n" : ""; els.workoutExercises.value += `${prefix}${name}: 10x0, 10x0`; els.workoutExercises.focus(); }
  function resetWorkoutForm() { els.workoutForm.reset(); els.workoutDate.value = toISODate(); }

  function exportJson() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flos-fitness-backup-${toISODate()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = JSON.parse(text);
      if (!Array.isArray(imported.workouts) || !Array.isArray(imported.exercises)) throw new Error("Die Datei enthält keine gültigen Trainingsdaten.");
      state.workouts = imported.workouts;
      state.exercises = imported.exercises;
      state.settings = { weeklyGoal: 3, ...(imported.settings || {}) };
      saveState();
      render();
      alert("Import abgeschlossen.");
    } catch (error) {
      alert(`Import fehlgeschlagen: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  }

  function clearData() {
    if (!confirm("Alle lokalen Trainingsdaten löschen? Exportiere vorher ein Backup, wenn du die Daten behalten willst.")) return;
    state.exercises = [...defaultExercises];
    state.workouts = [];
    state.settings = { weeklyGoal: 3 };
    saveState();
    resetWorkoutForm();
    render();
  }

  function getWorkoutVolume(workout) { return workout.exercises.reduce((sum, exercise) => sum + getExerciseVolume(exercise), 0); }
  function getExerciseVolume(exercise) { return exercise.sets.reduce((sum, set) => sum + set.reps * set.weight, 0); }

  function getStreakDays() {
    const trainingDates = new Set(state.workouts.map((workout) => workout.date));
    let cursor = new Date();
    let count = 0;
    if (!trainingDates.has(toISODate(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (trainingDates.has(toISODate(cursor))) { count += 1; cursor.setDate(cursor.getDate() - 1); }
    return count;
  }

  function getWeekStart(date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  function parseDate(value) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); }
  function toISODate(date = new Date()) { const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 10); }
  function formatDate(value) { return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(parseDate(value)); }
  function formatWeight(value) { return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ","); }
  function formatNumber(value) { return new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value); }
  function sortWorkouts() { state.workouts.sort((a, b) => `${b.date}${b.createdAt || ""}`.localeCompare(`${a.date}${a.createdAt || ""}`)); }
  function createId() { return window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch((error) => console.warn("Service Worker konnte nicht registriert werden.", error));
    }
  }
})();
