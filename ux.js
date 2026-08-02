(() => {
  const TIMER_KEY = 'flos-fitness-rest-timer-v10';
  const DONE_KEY = 'flos-fitness-rest-timer-done-v10';
  const TIMER_SECONDS = 90;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  let tickHandle = null;

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
    toast('Pause läuft: 90 Sekunden.');
  }

  function clearTimer() {
    localStorage.removeItem(TIMER_KEY);
    document.body.classList.remove('timer-running');
    updateTimerText(TIMER_SECONDS);
  }

  function updateTimerText(seconds) {
    const display = $('#globalTimer');
    if (!display) return;
    display.textContent = String(Math.max(0, Math.ceil(seconds)));
  }

  function tickTimer() {
    const end = getTimerEnd();
    if (!end) {
      updateTimerText(TIMER_SECONDS);
      return;
    }

    const remainingMs = end - Date.now();
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    if (remainingSeconds > 0) {
      document.body.classList.add('timer-running');
      updateTimerText(remainingSeconds);
      return;
    }

    updateTimerText(0);
    localStorage.removeItem(TIMER_KEY);
    document.body.classList.remove('timer-running');

    if (localStorage.getItem(DONE_KEY) !== 'shown') {
      localStorage.setItem(DONE_KEY, 'shown');
      finishTimer();
    }
  }

  function finishTimer() {
    toast('Pause vorbei. Nächster Satz.', true);
    if ('vibrate' in navigator) {
      try { navigator.vibrate([180, 80, 180]); } catch (_) {}
    }
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (_) {}
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
    const exerciseCards = $('#exerciseCards');
    if (!fitnessView || !exerciseCards || $('#workoutFocusBar')) return;

    const bar = document.createElement('section');
    bar.id = 'workoutFocusBar';
    bar.className = 'workout-focus-bar';
    bar.innerHTML = `
      <div>
        <p class="eyebrow">Workout Flow</p>
        <h2>Heute sauber durchziehen.</h2>
      </div>
      <div class="focus-actions">
        <button id="focusFirstExercise" class="primary-button">Erste Übung</button>
        <button id="focusNextExercise" class="soft-button">Nächste offene</button>
      </div>`;
    fitnessView.prepend(bar);

    $('#focusFirstExercise')?.addEventListener('click', () => focusExercise(0));
    $('#focusNextExercise')?.addEventListener('click', focusNextOpenExercise);
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

  function boot() {
    document.body.classList.add('ux-v10');
    buildWorkoutFocus();
    enhanceCards();
    interceptTimerClicks();
    startTicking();
    tickTimer();
    window.addEventListener('focus', tickTimer);
    document.addEventListener('visibilitychange', tickTimer);
    window.setTimeout(() => { buildWorkoutFocus(); enhanceCards(); tickTimer(); }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
