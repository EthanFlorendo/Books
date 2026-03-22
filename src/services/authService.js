import { getAppState, setAdminStatus } from '../state/appState.js';
import { ADMIN_EMAIL } from '../utils/constants.js';
import { requireSupabaseClient } from './supabaseClient.js';

let pendingAdminLogin = null;
let adminLoginEventsBound = false;
let adminLoginBusy = false;
let lastAdminFocusTarget = null;

function isConfiguredAdmin(email = '') {
  return String(email).toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function getAdminLoginElements() {
  return {
    overlay: document.getElementById('admin-login-overlay'),
    title: document.getElementById('admin-login-title'),
    copy: document.getElementById('admin-login-copy'),
    actionLabel: document.getElementById('admin-login-action'),
    form: document.getElementById('admin-login-form'),
    passwordInput: document.getElementById('admin-login-password'),
    visibilityButton: document.getElementById('admin-login-visibility'),
    error: document.getElementById('admin-login-error'),
    cancelButton: document.getElementById('admin-login-cancel'),
    closeButton: document.getElementById('admin-login-close'),
    submitButton: document.getElementById('admin-login-submit'),
  };
}

function normalizeAdminAction(action = 'unlock editing') {
  return String(action).trim().replace(/[.?!]+$/, '') || 'unlock editing';
}

function setAdminLoginCopy(action = 'unlock editing') {
  const { title, copy, actionLabel } = getAdminLoginElements();
  const normalizedAction = normalizeAdminAction(action);

  if (title) {
    title.textContent = 'Sign in to continue';
  }

  if (copy) {
    copy.textContent = `Enter the shared admin password to ${normalizedAction}.`;
  }

  if (actionLabel) {
    actionLabel.textContent = normalizedAction;
  }
}

function setAdminLoginError(message = '') {
  const { error } = getAdminLoginElements();
  if (!error) return;

  error.hidden = !message;
  error.textContent = message;
}

function setAdminPasswordVisibility(isVisible) {
  const { passwordInput, visibilityButton } = getAdminLoginElements();
  if (!passwordInput || !visibilityButton) return;

  passwordInput.type = isVisible ? 'text' : 'password';
  visibilityButton.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
  visibilityButton.setAttribute('title', isVisible ? 'Hide password' : 'Show password');
  visibilityButton.setAttribute('aria-pressed', String(isVisible));
}

function setAdminLoginBusy(isBusy) {
  const { passwordInput, visibilityButton, cancelButton, closeButton, submitButton } = getAdminLoginElements();
  adminLoginBusy = isBusy;

  if (passwordInput) passwordInput.disabled = isBusy;
  if (visibilityButton) visibilityButton.disabled = isBusy;
  if (cancelButton) cancelButton.disabled = isBusy;
  if (closeButton) closeButton.disabled = isBusy;
  if (submitButton) submitButton.disabled = isBusy;
  if (submitButton) submitButton.textContent = isBusy ? 'Signing In...' : 'Unlock Editing';
}

function hideAdminLoginOverlay({ restoreFocus = true } = {}) {
  const { overlay, form } = getAdminLoginElements();
  if (!overlay) return;

  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('admin-login-open');
  setAdminLoginBusy(false);
  setAdminLoginError('');
  setAdminPasswordVisibility(false);
  form?.reset();

  if (restoreFocus && lastAdminFocusTarget instanceof HTMLElement) {
    lastAdminFocusTarget.focus();
  }

  lastAdminFocusTarget = null;
}

function resolvePendingAdminLogin(result) {
  if (!pendingAdminLogin) {
    hideAdminLoginOverlay({ restoreFocus: !result });
    return;
  }

  const { resolve } = pendingAdminLogin;
  pendingAdminLogin = null;
  hideAdminLoginOverlay({ restoreFocus: !result });
  resolve(result);
}

function cancelPendingAdminLogin() {
  resolvePendingAdminLogin(false);
}

function focusAdminPasswordInput() {
  window.requestAnimationFrame(() => {
    getAdminLoginElements().passwordInput?.focus();
  });
}

function openAdminLoginOverlay(action = 'unlock editing') {
  bindAdminLoginEvents();

  if (pendingAdminLogin) {
    setAdminLoginCopy(action);
    setAdminLoginError('');
    focusAdminPasswordInput();
    return pendingAdminLogin.promise;
  }

  const { overlay, form } = getAdminLoginElements();
  if (!overlay || !form) {
    window.alert('Admin login form is unavailable. Refresh the page and try again.');
    return Promise.resolve(false);
  }

  lastAdminFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  setAdminLoginCopy(action);
  setAdminLoginError('');
  setAdminLoginBusy(false);
  setAdminPasswordVisibility(false);
  form.reset();
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('admin-login-open');
  focusAdminPasswordInput();

  const promise = new Promise(resolve => {
    pendingAdminLogin = {
      action,
      resolve,
      promise: null,
    };
  });

  pendingAdminLogin.promise = promise;
  return promise;
}

async function handleAdminLoginSubmit(event) {
  event.preventDefault();

  if (!pendingAdminLogin || adminLoginBusy) return;

  const { passwordInput } = getAdminLoginElements();
  const password = passwordInput?.value ?? '';

  if (!password) {
    setAdminLoginError('Enter the shared admin password to continue.');
    passwordInput?.focus();
    return;
  }

  try {
    setAdminLoginBusy(true);
    setAdminLoginError('');
    await loginAdmin(password);
    resolvePendingAdminLogin(true);
  } catch (error) {
    setAdminLoginBusy(false);
    setAdminLoginError(`Admin sign-in failed: ${error.message}`);
    passwordInput?.select();
  }
}

function handleAdminLoginBackdropClick(event) {
  if (!adminLoginBusy && event.target === event.currentTarget) {
    cancelPendingAdminLogin();
  }
}

function handleAdminLoginEscape(event) {
  if (event.key === 'Escape' && pendingAdminLogin && !adminLoginBusy) {
    event.preventDefault();
    cancelPendingAdminLogin();
  }
}

function toggleAdminPasswordVisibility() {
  const { passwordInput } = getAdminLoginElements();
  if (!passwordInput) return;

  setAdminPasswordVisibility(passwordInput.type === 'password');
  passwordInput.focus();
}

export function bindAdminLoginEvents() {
  if (adminLoginEventsBound) return;

  const { overlay, form, visibilityButton, cancelButton, closeButton } = getAdminLoginElements();
  if (!overlay || !form || !visibilityButton || !cancelButton || !closeButton) return;

  form.addEventListener('submit', handleAdminLoginSubmit);
  overlay.addEventListener('click', handleAdminLoginBackdropClick);
  visibilityButton.addEventListener('click', toggleAdminPasswordVisibility);
  cancelButton.addEventListener('click', cancelPendingAdminLogin);
  closeButton.addEventListener('click', cancelPendingAdminLogin);
  document.addEventListener('keydown', handleAdminLoginEscape);

  adminLoginEventsBound = true;
}

export async function syncAdminState() {
  const supabaseClient = requireSupabaseClient();
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) throw error;

  const isAdmin = isConfiguredAdmin(data.session?.user?.email || '');
  setAdminStatus(isAdmin);
  if (isAdmin) resolvePendingAdminLogin(true);

  return isAdmin;
}

export function subscribeToAuthChanges(onChange) {
  const supabaseClient = requireSupabaseClient();

  return supabaseClient.auth.onAuthStateChange((event, session) => {
    const isAdmin = isConfiguredAdmin(session?.user?.email || '');
    setAdminStatus(isAdmin);
    if (isAdmin) resolvePendingAdminLogin(true);

    if (typeof onChange === 'function') {
      onChange(event, isAdmin);
    }
  });
}

export async function loginAdmin(password) {
  const supabaseClient = requireSupabaseClient();
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password,
  });

  if (error) throw error;

  const sessionEmail = data.user?.email || data.session?.user?.email || '';
  if (!isConfiguredAdmin(sessionEmail)) {
    await supabaseClient.auth.signOut();
    setAdminStatus(false);
    throw new Error('Signed in, but this account is not the configured admin user.');
  }

  setAdminStatus(true);
  return true;
}

export async function logoutAdmin() {
  const supabaseClient = requireSupabaseClient();
  const { error } = await supabaseClient.auth.signOut();

  if (error) throw error;

  setAdminStatus(false);
  return true;
}

export async function ensureAdminAccess(action = 'make changes') {
  if (getAppState().isAdmin) return true;

  if (!ADMIN_EMAIL || ADMIN_EMAIL.includes('replace-with-admin-email')) {
    window.alert('Set ADMIN_EMAIL in src/utils/constants.js before using admin mode.');
    return false;
  }

  return openAdminLoginOverlay(action);
}

export async function toggleAdminAccess() {
  try {
    if (getAppState().isAdmin) {
      await logoutAdmin();
      return false;
    }

    return ensureAdminAccess('unlock editing');
  } catch (error) {
    window.alert(error.message);
    return getAppState().isAdmin;
  }
}
