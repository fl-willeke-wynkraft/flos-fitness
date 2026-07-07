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
    'Never give up brother.',
    'Heute wird geliefert.'
  ];

  const imagePaths = [
    './1.jpeg',
    './2.jpeg',
    './3.jpeg',
    './4.jpeg'
  ];

  const visualFallbacks = [
    'linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.62)), radial-gradient(circle at 50% 18%, #7dd3fc, #1e293b 48%, #050505 78%)',
    'linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.68)), radial-gradient(circle at 35% 48%, #facc15, #14532d 36%, #020617 74%)',
    'linear-gradient(180deg, rgba(0,0,0,.1), rgba(0,0,0,.7)), radial-gradient(circle at 52% 55%, #fde68a, #334155 42%, #0f172a 76%)',
    'linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.72)), radial-gradient(circle at 60% 35%, #f97316, #7f1d1d 44%, #050505 78%)'
  ];

  const index = Math.floor(Math.random() * messages.length);
  const fallback = visualFallbacks[index % visualFallbacks.length];
  const path = imagePaths[index % imagePaths.length];
  const imageCss = `linear-gradient(180deg, rgba(0,0,0,.08), rgba(0,0,0,.62)), url('${path}')`;

  if (quote) quote.textContent = messages[index];
  if (boostText) boostText.textContent = messages[(index + 1) % messages.length];

  function applyVisual(cssValue) {
    if (heroImage) heroImage.style.backgroundImage = cssValue;
    if (dailyBoost) dailyBoost.style.backgroundImage = cssValue;
  }

  const probe = new Image();
  probe.onload = () => applyVisual(imageCss);
  probe.onerror = () => applyVisual(fallback);
  probe.src = path;

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.classList.add('is-hidden');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
  }

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    modal.classList.remove('is-hidden');
    modal.style.display = 'grid';
    modal.removeAttribute('aria-hidden');
  }

  if (startButton) {
    startButton.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
    };
  }

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
  }

  const seenKey = 'flos-fitness-motivation-seen-v7';
  const today = new Date().toISOString().slice(0, 10);
  if (sessionStorage.getItem(seenKey) !== today) {
    sessionStorage.setItem(seenKey, today);
    openModal();
  }
})();
