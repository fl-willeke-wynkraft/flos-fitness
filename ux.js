(() => {
  const STORE_KEY = 'flos-fitness:v4';
  const TIMER_KEY = 'flos-fitness-rest-timer-v13';
  const DONE_KEY = 'flos-fitness-rest-timer-done-v13';
  const TIMER_SECONDS = 90;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  let tickHandle = null;
  let timerCard = null;
  let timerAnchor = null;
  let dockScheduled = false;

  function localToday() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function readState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function getDoneExerciseIds() {
    const state = readState();
    if (!state || !Array.isArray(state.logs)) return new Set();
    const validDates = new Set([localToday(), new Date().toISOString().slice(0, 10)]);
    return new Set(
      state.logs
        .filter((log) => log?.type === 'fitness' && validDates.has(log.date) && log.exerciseId)
        .map((log) => log.exerciseId)
    );
  }

  function getTimerEnd() {
    const value = Number(localStorage.getItem(TIMER_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function setTimer(seconds = TIMER_SECONDS) {
    const end = Date.now() + seconds * 1000;
    localStorage.setItem(TIMER_KEY, String(end));
    localStorage.removeItem(DONE_KEY);
    document.body.classList.add('timer-running');
    tickTimer();
    startTicking();
    scheduleTimerDock();
    toast('90 Sekunden Pause gestartet.');
  }

  function updateTimerText(seconds) {
    const display = $('#globalTimer');
    if (!display) return;
    display.textContent = String(Math.max(0, Math.ceil(seconds)));
  }

  function updateTimerButton(running) {
    const button = $('#globalTimerButton');
    if (!button) return;
    button.textContent = running ? 'Neu starten' : '90s starten';
  }

  function tickTimer() {
    const end = getTimerEnd();

    if (!end) {
      const finishedAt = Number(localStorage.getItem(DONE_KEY));
      const recentlyFinished = Number.isFinite(finishedAt) && Date.now() - finishedAt < 5000;
      updateTimerText(recentlyFinished ? 0 : TIMER_SECONDS);
      updateTimerButton(false);
      if (!recentlyFinished) document.title = 'Flos Fitness';
      return;
    }

    const remainingSeconds = Math.ceil((end - Date.now()) / 1000);

    if (remainingSeconds > 0) {
      document.body.classList.add('timer-running');
      updateTimerText(remainingSeconds);
      updateTimerButton(true);
      document.title = `${remainingSeconds}s · Flos Fitness`;
      return;
    }

    updateTimerText(0);
    updateTimerButton(false);
    localStorage.removeItem(TIMER_KEY);
    document.body.classList.remove('timer-running');

    if (!localStorage.getItem(DONE_KEY)) {
      localStorage.setItem(DONE_KEY, String(Date.now()));
      finishTimer();
    }
  }

  function finishTimer() {
    document.title = 'Pause vorbei · Flos Fitness';
    toast('Pause vorbei. Nächster Satz.', true);
    if ('vibrate' in navigator) {
      try { navigator.vibrate([180, 80, 180]); } catch (_) {}
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('Pause vorbei', { body: 'Nächster Satz.' }); } catch (_) {}
    }
  }

  function startTicking() {
    if (tickHandle) window.clearInterval(tickHandle);
    tickHandle = window.setInterval(tickTimer, 250);
  }

  function toast(message, important = false) {
    let box = $('#uxToast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'uxToast';
      box.className = 'ux-toast';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.append(box);
    }
    box.textContent = message;
    box.classList.toggle('important', important);
    box.classList.add('show');
    window.clearTimeout(box._hideTimer);
    box._hideTimer = window.setTimeout(() => box.classList.remove('show'), important ? 4200 : 2200);
  }

  function buildWorkoutFocus() {
    const fitnessView = $('#fitnessView');
    if (!fitnessView || $('#workoutFocusBar')) return;

    const bar = document.createElement('section');
    bar.id = 'workoutFocusBar';
    bar.className = 'workout-focus-bar';
    bar.innerHTML = `
      <div class="workout-focus-copy">
        <p class="eyebrow">Heute</p>
        <h2>Workout</h2>
        <div class="workout-progress-row">
          <span id="workoutProgressText">0 / 0 Übungen</span>
          <div class="workout-progress-track" aria-hidden="true"><i id="workoutProgressFill"></i></div>
        </div>
      </div>
      <div class="focus-actions">
        <button id="focusFirstExercise" class="primary-button">Start</button>
        <button id="focusNextExercise" class="soft-button">Nächste offene</button>
      </div>`;
    fitnessView.prepend(bar);

    $('#focusFirstExercise')?.addEventListener('click', () => focusExercise(0));
    $('#focusNextExercise')?.addEventListener('click', focusNextOpenExercise);
  }

  function updateWorkoutProgress() {
    const cards = $$('.exercise-card');
    const done = cards.filter((card) => card.classList.contains('done')).length;
    const text = $('#workoutProgressText');
    const fill = $('#workoutProgressFill');
    if (text) text.textContent = `${done} / ${cards.length} Übungen`;
    if (fill) fill.style.width = `${cards.length ? (done / cards.length) * 100 : 0}%`;
  }

  function restoreDoneState() {
    const doneIds = getDoneExerciseIds();
    $$('.exercise-card').forEach((card) => {
      const isDone = doneIds.has(card.dataset.id);
      card.classList.toggle('done', isDone);
      const button = card.querySelector('.done-button');
      if (button) button.textContent = isDone ? 'Heute geloggt' : 'Übung loggen';
    });
    updateWorkoutProgress();
  }

  function focusExercise(index) {
    const cards = $$('.exercise-card');
    if (!cards.length) return;
    const safeIndex = Math.min(Math.max(index, 0), cards.length - 1);
    cards.forEach((card) => card.classList.remove('focus-card'));
    cards[safeIndex].classList.add('focus-card');
    cards[safeIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function focusNextOpenExercise() {
    restoreDoneState();
    const cards = $$('.exercise-card');
    const index = cards.findIndex((card) => !card.classList.contains('done'));
    focusExercise(index >= 0 ? index : 0);
  }

  function enhanceCards() {
    $$('.exercise-card').forEach((card, index) => {
      if (!card.querySelector('.exercise-number')) {
        const badge = document.createElement('span');
        badge.className = 'exercise-number';
        badge.textContent = String(index + 1).padStart(2, '0');
        card.querySelector('.exercise-head')?.prepend(badge);
      }
    });
  }

  function interceptTimerClicks() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('#globalTimerButton, .timer-button');
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setTimer(TIMER_SECONDS);
    }, true);
  }

  function setupTimerDocking() {
    timerCard = $('.timer-card');
    if (!timerCard || timerAnchor) return;

    timerAnchor = document.createElement('div');
    timerAnchor.className = 'timer-anchor';
    timerAnchor.setAttribute('aria-hidden', 'true');
    timerCard.before(timerAnchor);

    window.addEventListener('scroll', scheduleTimerDock, { passive: true });
    window.addEventListener('resize', scheduleTimerDock);
    scheduleTimerDock();
  }

  function scheduleTimerDock() {
    if (dockScheduled) return;
    dockScheduled = true;
    requestAnimationFrame(() => {
      dockScheduled = false;
      updateTimerDock();
    });
  }

  function updateTimerDock() {
    if (!timerCard || !timerAnchor) return;
    const modeGrid = $('.mode-grid');
    const navBottom = modeGrid ? modeGrid.getBoundingClientRect().bottom : 84;
    const dockTop = Math.max(8, navBottom + 8);
    document.documentElement.style.setProperty('--timer-dock-top', `${dockTop}px`);

    const shouldDock = timerAnchor.getBoundingClientRect().top <= dockTop;
    const isDocked = timerCard.classList.contains('timer-docked');

    if (shouldDock && !isDocked) {
      timerAnchor.style.height = `${timerCard.getBoundingClientRect().height}px`;
      document.body.append(timerCard);
      timerCard.classList.add('timer-docked');
    } else if (!shouldDock && isDocked) {
      timerCard.classList.remove('timer-docked');
      timerAnchor.after(timerCard);
      timerAnchor.style.height = '0px';
    }
  }

  function syncModeAccessibility() {
    $$('.mode-card').forEach((card) => {
      const active = card.classList.contains('active');
      card.setAttribute('aria-pressed', String(active));
    });
  }

  function addInputGuards() {
    $$('input[type="number"]').forEach((input) => {
      if (!input.hasAttribute('min')) input.min = '0';
    });
  }

  function polishCopy() {
    const title = $('.topbar h1');
    if (title) title.textContent = 'Flo';
    const workoutButton = $('#finishWorkout');
    if (workoutButton) workoutButton.textContent = 'Abschließen';

    const metricLabels = $$('.metric-card small');
    if (metricLabels[0]) metricLabels[0].textContent = 'Logs';
    if (metricLabels[1]) metricLabels[1].textContent = 'Volumen +Ø';
    if (metricLabels[2]) metricLabels[2].textContent = 'Bereit für hoch';

    const boostEyebrow = $('.daily-boost .eyebrow');
    if (boostEyebrow) boostEyebrow.textContent = 'Heute';
  }

  function observeExerciseRenders() {
    const root = $('#exerciseCards');
    if (!root) return;
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        enhanceCards();
        restoreDoneState();
        addInputGuards();
      });
    });
    observer.observe(root, { childList: true });
  }

  function replaceBlockingAlerts() {
    window.alert = (message) => toast(String(message), true);
  }

  function refreshServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js?v=13').catch(() => {});
    }
  }

  function boot() {
    document.body.classList.remove('ux-v10');
    document.body.classList.add('ux-v11', 'ux-v13');
    buildWorkoutFocus();
    enhanceCards();
    restoreDoneState();
    polishCopy();
    addInputGuards();
    syncModeAccessibility();
    interceptTimerClicks();
    setupTimerDocking();
    observeExerciseRenders();
    replaceBlockingAlerts();
    startTicking();
    tickTimer();
    refreshServiceWorker();

    document.addEventListener('click', (event) => {
      if (event.target.closest('.mode-card')) setTimeout(syncModeAccessibility, 0);
      if (event.target.closest('.done-button')) setTimeout(restoreDoneState, 30);
    });
    window.addEventListener('focus', () => { tickTimer(); restoreDoneState(); scheduleTimerDock(); });
    document.addEventListener('visibilitychange', () => { tickTimer(); scheduleTimerDock(); });

    window.setTimeout(() => {
      buildWorkoutFocus();
      enhanceCards();
      restoreDoneState();
      polishCopy();
      addInputGuards();
      syncModeAccessibility();
      scheduleTimerDock();
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
