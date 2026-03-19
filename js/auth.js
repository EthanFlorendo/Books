import { ADMIN_LABEL } from './config.js';
import { state } from './state.js';

export async function restoreSession() {
  if (!state.sb) return;

  const { data, error } = await state.sb.auth.getSession();
  if (error) throw error;

  await applySession(data.session ?? null);
}

export async function applySession(session) {
  state.session = session;
  state.user = session?.user ?? null;
  state.access = null;

  if (state.user) {
    state.access = await fetchAccessProfile(state.user.id);
  }
}

async function fetchAccessProfile(userId) {
  const { data, error } = await state.sb
    .from('editor_accounts')
    .select('role, reader')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('Access profile lookup failed:', error);
    return null;
  }

  return data;
}

export async function signIn(email, password) {
  if (!state.sb) throw new Error('Database client unavailable.');

  const { data, error } = await state.sb.auth.signInWithPassword({ email, password });
  if (error) throw error;

  await applySession(data.session ?? null);
}

export async function signOut() {
  if (!state.sb) return;

  const { error } = await state.sb.auth.signOut();
  if (error) throw error;

  await applySession(null);
}

export function subscribeToAuthChanges(onChange) {
  if (!state.sb) return () => {};

  const { data } = state.sb.auth.onAuthStateChange(async (_event, session) => {
    await applySession(session);
    onChange?.();
  });

  return () => data.subscription.unsubscribe();
}

export function isSignedIn() {
  return Boolean(state.user);
}

export function isAdmin() {
  return state.access?.role === 'admin';
}

export function canEditUser(user) {
  if (!isSignedIn()) return false;
  if (isAdmin()) return true;
  return state.access?.role === 'editor' && state.access?.reader === user;
}

export function canEditBook(book) {
  if (!book?.reader) return false;
  return canEditUser(book.reader);
}

export function currentAccessLabel() {
  if (!isSignedIn()) return 'Viewing only';
  if (isAdmin()) return ADMIN_LABEL;
  if (state.access?.reader) return state.access.reader;
  return 'No editor access';
}
