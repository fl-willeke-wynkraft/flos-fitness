(() => {
  const STORE_KEY = "flos-fitness:v2";
  const today = () => new Date().toISOString().slice(0, 10);

  const plan = [
    { id: "bd", name: "BD", fullName: "Brustdrücken / Bankdrücken", icon: "🏋️", target: "20 kg extra", note: "hoch?", sets: [{ kg: 15, reps: 13 }, { kg: 15, reps: 7 }, { kg: 10, reps: 10 }] },
    { id: "butterfly", name: "Butterfly", fullName: "Butterfly Maschine", icon: "🦋", target: "107 kg", note: "hoch?", sets: [{ kg: 66, reps: 11 }, { kg: 66, reps: 9 }, { kg: 59, reps: 10 }] },
    { id: "shoulder", name: "E Schultern", fullName: "Schulterdrücken Maschine", icon: "💪", target: "50 kg", note: "hoch?!!", sets: [{ kg: 18, reps: 16 }, { kg: 23, reps: 12 }, { kg: 23, reps: 11 }] },
    { id: "side", name: "O Seitheben", fullName: "Seitheben", icon: "🪽", target: "32 kg", note: "", sets: [{ kg: 0, reps: 14 }, { kg: 36, reps: 12 }, { kg: 41, reps: 11 }] },
    { id: "lat", name: "Lat", fullName: "Latzug", icon: "🔽", target: "66 kg", note: "hoch?", sets: [{ kg: 39, reps: 15 }, { kg: 45, reps: 13 }, { kg: 45, reps: 11 }] },
    { id: "reverse", name: "Reverse Butterfly", fullName: "Reverse Butterfly", icon: "🧲", target: "45 kg", note: "", sets: [{ kg: 0, reps: 0 }, { kg: 0, reps: 0 }, { kg: 0, reps: 0 }] },
    { id: "row", name: "Rudern", fullName: "Rudern Maschine", icon: "🚣", target: "73 kg", note: "hoch?", sets: [{ kg: 39, reps: 14 }, { kg: 39, reps: 15 }, { kg: 43, reps: 13 }] },
    { id: "biceps", name: "Bizeps", fullName: "Bizeps + Stange", icon: "💪", target: "20 kg + Stange", note: "hoch?", coaching: "Runter mit den Armen du Sau!", sets: [{ kg: 10, reps: 10 }, { kg: 10, reps: 12 }, { kg: 10, reps: 5 }] },
    { id: "cablecurl", name: "O Kabelzug-Bizeps", fullName: "Kabelzug-Bizeps", icon: "🪢", target: "14 kg", note: "hoch?", sets: [{ kg: 14, reps: 12 }, { kg: 14, reps: 11 }, { kg: 14, reps: 10 }] },
    { id: "triceps", name: "Trizeps", fullName: "Trizepsdrücken", icon: "🔱", target: "45 kg", note: "hoch?", sets: [{ kg: 32, reps: 12 }, { kg: 32, reps: 9 }, { kg: 27, reps: 10 }] },
    { id: "abs", name: "Bauch", fullName: "Hanging Sit-Ups", icon: "🔥", target: "Körpergewicht", note: "", sets: [{ kg: 0, reps: 14 }, { kg: 0, reps: 16 }, { kg: 0, reps: 0 }] }
  ];

  const seedLogs = [
    { id: cryptoId(), type: "run", date: today(), title: "Laufen Zone 2", distance: 4, minutes: 34, note: "Aus deinem bisherigen Plan übernommen." },
    { id: cryptoId(), type: "run", date: today(), title: "Laufen Zone 2", distance: 4.1, minutes: 26, note: "Aus deinem bisherigen Plan übernommen." },
    { id: cryptoId(), type: "bike", date: today(), title: "Fahrrad Gym", speed: 32.3, note: "Referenz-Speed aus deinem Plan." }
  ];

  const state = loadState();
  let activeMode = "fitness";
  let timerInterval = null;
  let timerLeft = 90;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  const els = {
    installButton: $("#installButton"),
    modeCards: $$(".mode-card"),
    views: { fitness: $("#fitnessView"), run: $("#runView"), bike: $("#bikeView") },
    exerciseCards: $("#exerciseCards"),
    finishWorkout: $("#finishWorkout"),
    trainingCount: $("#trainingCount"),
    strengthGain: $("#strengthGain"),
    readyToIncrease: $("#readyToIncrease"),
    globalTimer: $("#globalTimer"),
    globalTimerButton: $("#globalTimerButton"),
    runForm: $("#runForm"),
    bikeForm: $("#bikeForm"),
    insights: $("#insights"),
    logList: $("#logList"),
    exportJson: $("#exportJson"),
    importJson: $("#importJson"),
    resetData: $("#resetData"),
    exerciseTemplate: $("#exerciseTemplate")
  };

  init();

  function init() {
    $("#runDate").value = today();
    $("#bikeDate").value = today();
    bindEvents();
    render();
    registerServiceWorker();
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (error) {
      console.warn("State konnte nicht geladen werden", error);
    }
    return {
      logs: seedLogs,
      progression: Object.fromEntries(plan.map((exercise) => [exercise.id, { markers: countExclamationMarks(exercise.note), increases: 0, baseVolume: getPlannedVolume(exercise), bestVolume: getPlannedVolume(exercise) }])),
      draft: Object.fromEntries(plan.map((exercise) => [exercise.id, exercise.sets.map((set) => ({ ...set }))]))
    };
  }

  function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }

  function bindEvents() {
    els.modeCards.forEach((card) => card.addEventListener("click", () => switchMode(card.dataset.mode)));
    els.finishWorkout.addEventListener("click", finishWorkout);
    els.globalTimerButton.addEventListener("click", () => startTimer(90));
    els.runForm.addEventListener("submit", saveRun);
    els.bikeForm.addEventListener("submit", saveBike);
    els.exportJson.addEventListener("click", exportJson);
    els.importJson.addEventListener("change", importJson);
    els.resetData.addEventListener("click", resetData);

    let deferredInstallPrompt = null;
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

  function switchMode(mode) {
    activeMode = mode;
    els.modeCards.forEach((card) => card.classList.toggle("active", card.dataset.mode === mode));
    Object.entries(els.views).forEach(([key, view]) => view.classList.toggle("active-view", key === mode));
  }

  function render() {
    renderExercises();
    renderDashboard();
    renderInsights();
    renderLogs();
  }

  function renderExercises() {
    els.exerciseCards.textContent = "";
    plan.forEach((exercise) => {
      const card = els.exerciseTemplate.content.firstElementChild.cloneNode(true);
      const progression = getProgression(exercise.id);
      card.dataset.id = exercise.id;
      card.querySelector(".exercise-image").textContent = exercise.icon;
      card.querySelector("h3").textContent = exercise.name;
      card.querySelector(".exercise-meta").textContent = `${exercise.fullName} · Ziel/Referenz: ${exercise.target}`;
      const ready = progression.markers >= 3;
      card.querySelector(".progression-box").innerHTML = `
        <strong>${ready ? "Bereit für Gewicht hoch" : "Progression sammeln"}</strong>
        <span>${progression.markers}/3 Hoch-Marker · ${progression.increases} echte Steigerungen bisher</span>
        <span class="progression-pill ${ready ? "ready" : ""}">${ready ? "Jetzt erhöhen" : "Noch beobachten"}</span>
        ${exercise.coaching ? `<span>${escapeHtml(exercise.coaching)}</span>` : ""}
      `;
      const sets = card.querySelector(".sets");
      const draftSets = state.draft[exercise.id] || exercise.sets;
      draftSets.forEach((set, index) => {
        const row = document.createElement("label");
        row.className = "set-row";
        row.innerHTML = `<span>Satz ${index + 1}</span><input type="number" step="0.5" inputmode="decimal" value="${set.kg || 0}" aria-label="Gewicht Satz ${index + 1}"><input type="number" step="1" inputmode="numeric" value="${set.reps || 0}" aria-label="Wiederholungen Satz ${index + 1}">`;
        const [kgInput, repsInput] = row.querySelectorAll("input");
        kgInput.addEventListener("input", () => updateDraft(exercise.id, index, "kg", kgInput.value));
        repsInput.addEventListener("input", () => updateDraft(exercise.id, index, "reps", repsInput.value));
        sets.append(row);
      });
      card.querySelector(".timer-button").addEventListener("click", () => startTimer(90));
      card.querySelector(".hoch-button").addEventListener("click", () => markHoch(exercise.id));
      card.querySelector(".done-button").addEventListener("click", () => logExercise(exercise.id));
      els.exerciseCards.append(card);
    });
  }

  function updateDraft(id, index, key, value) {
    if (!state.draft[id]) state.draft[id] = [];
    if (!state.draft[id][index]) state.draft[id][index] = { kg: 0, reps: 0 };
    state.draft[id][index][key] = Number(value) || 0;
    saveState();
  }

  function markHoch(id) {
    const progression = getProgression(id);
    progression.markers += 1;
    if (progression.markers >= 3) {
      showMessage("Dreimal hoch markiert: Diese Übung sollte jetzt wirklich erhöht werden.");
    } else {
      showMessage(`Hoch-Marker gespeichert: ${progression.markers}/3.`);
    }
    saveState();
    render();
  }

  function logExercise(id) {
    const exercise = plan.find((entry) => entry.id === id);
    const sets = (state.draft[id] || exercise.sets).map((set) => ({ kg: Number(set.kg) || 0, reps: Number(set.reps) || 0 }));
    const volume = sets.reduce((sum, set) => sum + set.kg * set.reps, 0);
    const progression = getProgression(id);
    progression.bestVolume = Math.max(progression.bestVolume || 0, volume);
    state.logs.unshift({ id: cryptoId(), type: "fitness", date: today(), exerciseId: id, title: exercise.name, sets, volume, markersAtLog: progression.markers });
    saveState();
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) card.classList.add("done");
    renderDashboard();
    renderInsights();
    renderLogs();
  }

  function finishWorkout() {
    const loggedToday = state.logs.filter((log) => log.type === "fitness" && log.date === today()).length;
    showMessage(loggedToday ? `${loggedToday} Fitness-Logs für heute gespeichert.` : "Noch keine Übung geloggt. Tippe pro Übung auf ‚Übung loggen‘.");
  }

  function saveRun(event) {
    event.preventDefault();
    const distance = Number($("#runDistance").value) || 0;
    const minutes = Number($("#runMinutes").value) || 0;
    const pace = distance && minutes ? minutes / distance : 0;
    state.logs.unshift({ id: cryptoId(), type: "run", date: $("#runDate").value || today(), title: $("#runType").value || "Laufen", distance, minutes, pulse: Number($("#runPulse").value) || null, pace, note: $("#runNote").value.trim() });
    saveState();
    event.target.reset();
    $("#runDate").value = today();
    $("#runType").value = "Zone 2";
    render();
  }

  function saveBike(event) {
    event.preventDefault();
    const distance = Number($("#bikeDistance").value) || 0;
    const minutes = Number($("#bikeMinutes").value) || 0;
    const speed = Number($("#bikeSpeed").value) || (distance && minutes ? distance / (minutes / 60) : 0);
    state.logs.unshift({ id: cryptoId(), type: "bike", date: $("#bikeDate").value || today(), title: $("#bikeType").value || "Fahrrad", distance, minutes, speed, note: $("#bikeNote").value.trim() });
    saveState();
    event.target.reset();
    $("#bikeDate").value = today();
    $("#bikeType").value = "Gym-Bike";
    render();
  }

  function renderDashboard() {
    els.trainingCount.textContent = state.logs.length;
    const gains = plan.map((exercise) => getStrengthGain(exercise.id)).filter((value) => Number.isFinite(value));
    const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
    els.strengthGain.textContent = `${Math.round(avgGain)}%`;
    els.readyToIncrease.textContent = plan.filter((exercise) => getProgression(exercise.id).markers >= 3).length;
  }

  function renderInsights() {
    const runLogs = state.logs.filter((log) => log.type === "run" && log.distance);
    const bikeLogs = state.logs.filter((log) => log.type === "bike" && log.speed);
    const bestRun = runLogs.length ? Math.min(...runLogs.map((log) => log.pace || 999)) : null;
    const bestBike = bikeLogs.length ? Math.max(...bikeLogs.map((log) => log.speed || 0)) : null;
    const ready = plan.filter((exercise) => getProgression(exercise.id).markers >= 3).map((exercise) => exercise.name);
    els.insights.innerHTML = `
      <article class="insight"><strong>Progression</strong><span>${ready.length ? `${ready.join(", ")} sollte erhöht werden.` : "Noch keine Übung hat 3 Hoch-Marker."}</span></article>
      <article class="insight"><strong>Laufen</strong><span>${bestRun ? `Beste Pace: ${formatPace(bestRun)} min/km.` : "Noch keine Laufdaten mit Pace."}</span></article>
      <article class="insight"><strong>Fahrrad</strong><span>${bestBike ? `Bester Speed: ${bestBike.toFixed(1).replace(".", ",")} km/h.` : "Noch keine Bike-Daten mit Speed."}</span></article>
    `;
  }

  function renderLogs() {
    els.logList.textContent = "";
    state.logs.slice(0, 30).forEach((log) => {
      const item = document.createElement("article");
      item.className = "log-item";
      let details = "";
      if (log.type === "fitness") details = `${log.sets.map((set) => `${set.kg}kg x ${set.reps}`).join(" · ")} · Volumen ${Math.round(log.volume)} kg · Kraftzuwachs ${Math.round(getStrengthGain(log.exerciseId))}%`;
      if (log.type === "run") details = `${log.distance || "?"} km · ${log.minutes || "?"} min · ${log.pace ? formatPace(log.pace) + " min/km" : "Pace offen"}${log.pulse ? ` · Puls Ø ${log.pulse}` : ""}`;
      if (log.type === "bike") details = `${log.distance || "?"} km · ${log.minutes || "?"} min · ${log.speed ? log.speed.toFixed(1).replace(".", ",") + " km/h" : "Speed offen"}`;
      item.innerHTML = `<header><h3>${escapeHtml(log.title)}</h3><small>${formatDate(log.date)} · ${labelForType(log.type)}</small></header><p>${escapeHtml(details)}${log.note ? ` · ${escapeHtml(log.note)}` : ""}</p>`;
      els.logList.append(item);
    });
  }

  function startTimer(seconds) {
    clearInterval(timerInterval);
    timerLeft = seconds;
    updateTimerLabel();
    els.globalTimerButton.textContent = "läuft ...";
    timerInterval = setInterval(() => {
      timerLeft -= 1;
      updateTimerLabel();
      if (timerLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        els.globalTimerButton.textContent = "90s starten";
        showMessage("Pause vorbei. Nächster Satz.");
      }
    }, 1000);
  }

  function updateTimerLabel() { els.globalTimer.textContent = String(Math.max(0, timerLeft)); }
  function getProgression(id) { if (!state.progression[id]) state.progression[id] = { markers: 0, increases: 0, baseVolume: 0, bestVolume: 0 }; return state.progression[id]; }
  function getStrengthGain(id) { const p = getProgression(id); return p.baseVolume ? ((p.bestVolume - p.baseVolume) / p.baseVolume) * 100 : 0; }
  function getPlannedVolume(exercise) { return exercise.sets.reduce((sum, set) => sum + (set.kg || 0) * (set.reps || 0), 0); }
  function countExclamationMarks(value = "") { return (value.match(/!/g) || []).length; }
  function formatDate(value) { return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(value)); }
  function formatPace(value) { const min = Math.floor(value); const sec = Math.round((value - min) * 60); return `${min}:${String(sec).padStart(2, "0")}`; }
  function labelForType(type) { return type === "fitness" ? "Fitness" : type === "run" ? "Laufen" : "Fahrrad"; }
  function cryptoId() { return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function escapeHtml(value = "") { return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char])); }
  function showMessage(message) { window.alert(message); }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flos-fitness-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      if (!Array.isArray(imported.logs) || !imported.progression || !imported.draft) throw new Error("Ungültiges Backup." );
      Object.assign(state, imported);
      saveState();
      render();
    } catch (error) {
      alert(`Import fehlgeschlagen: ${error.message}`);
    } finally {
      event.target.value = "";
    }
  }

  function resetData() {
    if (!confirm("Alle lokalen Daten zurücksetzen?")) return;
    localStorage.removeItem(STORE_KEY);
    location.reload();
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("service-worker.js").catch((error) => console.warn("Service Worker konnte nicht registriert werden.", error));
    }
  }
})();
