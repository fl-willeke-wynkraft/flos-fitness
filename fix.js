(() => {
  const modal = document.querySelector('#motivationModal');
  const startButton = document.querySelector('#startTraining');
  const dailyBoost = document.querySelector('#dailyBoostImage');
  const heroImage = document.querySelector('#motivationImage');
  const quote = document.querySelector('#motivationQuote');
  const boostText = document.querySelector('#dailyBoostText');

  const messages = [
    'Comfort never made history.',
    'Get up bro, it is time to show them your prime.',
    'Ein Satz mehr als gestern.',
    'Heute wird geliefert.'
  ];

  const visualFallbacks = [
    'linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.62)), radial-gradient(circle at 50% 18%, #7dd3fc, #1e293b 48%, #050505 78%)',
    'linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.68)), radial-gradient(circle at 35% 48%, #facc15, #14532d 36%, #020617 74%)',
    'linear-gradient(180deg, rgba(0,0,0,.1), rgba(0,0,0,.7)), radial-gradient(circle at 52% 55%, #fde68a, #334155 42%, #0f172a 76%)',
    'linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.72)), radial-gradient(circle at 60% 35%, #f97316, #7f1d1d 44%, #050505 78%)'
  ];

  const index = Math.floor(Math.random() * messages.length);
  const visual = visualFallbacks[index % visualFallbacks.length];

  if (quote) quote.textContent = messages[index];
  if (boostText) boostText.textContent = messages[(index + 1) % messages.length];
  if (heroImage) heroImage.style.backgroundImage = visual;
  if (dailyBoost) dailyBoost.style.backgroundImage = visual;

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    modal.style.display = 'grid';
    modal.removeAttribute('aria-hidden');
  }

  if (startButton) {
    startButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
    });
  }

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
  }

  const seenKey = 'flos-fitness-motivation-seen-fix-v1';
  const today = new Date().toISOString().slice(0, 10);
  if (sessionStorage.getItem(seenKey) !== today) {
    sessionStorage.setItem(seenKey, today);
    openModal();
  }
})();
