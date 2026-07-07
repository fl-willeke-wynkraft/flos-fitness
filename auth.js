(() => {
  const AUTH_KEY = 'flos-fitness-auth-v1';
  const EXPECTED_HASH = '36c0e4f2a2b612fe01242de39213159d80ebc0630fa571cbcba2e0ae3fe72036';
  const overlay = document.querySelector('#loginOverlay');
  const form = document.querySelector('#loginForm');
  const userInput = document.querySelector('#loginUser');
  const passwordInput = document.querySelector('#loginPassword');
  const errorBox = document.querySelector('#loginError');
  const logoutButton = document.querySelector('#logoutButton');

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function lock() {
    document.body.classList.add('auth-locked');
    if (overlay) {
      overlay.hidden = false;
      overlay.classList.remove('is-hidden');
      overlay.style.display = 'grid';
    }
  }

  function unlock() {
    document.body.classList.remove('auth-locked');
    if (overlay) {
      overlay.hidden = true;
      overlay.classList.add('is-hidden');
      overlay.style.display = 'none';
    }
  }

  function isAuthenticated() {
    return localStorage.getItem(AUTH_KEY) === 'ok';
  }

  if (isAuthenticated()) unlock(); else lock();

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const user = (userInput?.value || '').trim();
      const password = passwordInput?.value || '';
      const hash = await sha256(`${user}:${password}`);
      if (hash === EXPECTED_HASH) {
        localStorage.setItem(AUTH_KEY, 'ok');
        if (passwordInput) passwordInput.value = '';
        if (errorBox) errorBox.textContent = '';
        unlock();
        return;
      }
      if (errorBox) errorBox.textContent = 'Login falsch. Versuch es nochmal.';
      if (passwordInput) passwordInput.value = '';
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem(AUTH_KEY);
      lock();
    });
  }
})();
