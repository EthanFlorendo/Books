import { ADMIN_EMAIL } from './config.js';
import { state } from './state.js';

function setAdminState(isAdmin) {
  state.isAdmin = isAdmin;
  updateAdminUi();
}

export function updateAdminUi() {
  const button = document.getElementById('admin-toggle-btn');
  const status = document.getElementById('admin-status-text');
  if (!button || !status) return;

  button.textContent = state.isAdmin ? 'Lock Editing' : 'Unlock Editing';
  button.classList.toggle('is-unlocked', state.isAdmin);
  status.textContent = state.isAdmin
    ? `Signed in as ${ADMIN_EMAIL}. Editing is enabled.`
    : 'Viewing is public. Unlock to sign in and edit.';
}

export async function syncAdminState() {
  if (!state.sb) {
    setAdminState(false);
    return false;
  }

  const { data, error } = await state.sb.auth.getSession();
  if (error) {
    console.error(error);
    setAdminState(false);
    return false;
  }

  const sessionEmail = data.session?.user?.email || '';
  setAdminState(sessionEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase());
  return state.isAdmin;
}

export function bindAuthStateListener(onChange) {
  if (!state.sb) return;

  state.sb.auth.onAuthStateChange((_event, session) => {
    const sessionEmail = session?.user?.email || '';
    setAdminState(sessionEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    if (typeof onChange === 'function') onChange(state.isAdmin);
  });
}

export async function lockAdmin() {
  if (!state.sb) {
    setAdminState(false);
    return false;
  }

  const { error } = await state.sb.auth.signOut();
  if (error) {
    window.alert(`Sign-out failed: ${error.message}`);
    return false;
  }

  setAdminState(false);
  return true;
}

async function signInAsAdmin(password) {
  if (!state.sb) {
    window.alert('Not connected to database.');
    return false;
  }

  const { data, error } = await state.sb.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password,
  });

  if (error) {
    window.alert(`Admin sign-in failed: ${error.message}`);
    setAdminState(false);
    return false;
  }

  const sessionEmail = data.user?.email || data.session?.user?.email || '';
  if (sessionEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    await state.sb.auth.signOut();
    setAdminState(false);
    window.alert('Signed in, but this account is not the configured admin user.');
    return false;
  }

  setAdminState(true);
  return true;
}

export async function ensureAdminAccess(action = 'make changes') {
  if (state.isAdmin) return true;

  if (!ADMIN_EMAIL || ADMIN_EMAIL.includes('replace-with-admin-email')) {
    window.alert('Set ADMIN_EMAIL in js/config.js before using admin mode.');
    return false;
  }

  const password = window.prompt(`Enter the shared admin password to ${action}.`);
  if (password === null) return false;

  return signInAsAdmin(password);
}

export async function toggleAdminAccess() {
  if (state.isAdmin) return lockAdmin();
  return ensureAdminAccess('unlock editing');
}
