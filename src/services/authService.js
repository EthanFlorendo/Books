import { getAppState, setAdminStatus } from '../state/appState.js';
import { ADMIN_EMAIL } from '../utils/constants.js';
import { requireSupabaseClient } from './supabaseClient.js';

function isConfiguredAdmin(email = '') {
  return String(email).toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

export async function syncAdminState() {
  const supabaseClient = requireSupabaseClient();
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) throw error;

  const isAdmin = isConfiguredAdmin(data.session?.user?.email || '');
  setAdminStatus(isAdmin);

  return isAdmin;
}

export function subscribeToAuthChanges(onChange) {
  const supabaseClient = requireSupabaseClient();

  return supabaseClient.auth.onAuthStateChange((_event, session) => {
    const isAdmin = isConfiguredAdmin(session?.user?.email || '');
    setAdminStatus(isAdmin);

    if (typeof onChange === 'function') {
      onChange(isAdmin);
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

  const password = window.prompt(`Enter the shared admin password to ${action}.`);
  if (password === null) return false;

  try {
    await loginAdmin(password);
    return true;
  } catch (error) {
    window.alert(`Admin sign-in failed: ${error.message}`);
    return false;
  }
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
