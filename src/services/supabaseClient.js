import { getSupabaseClient, setSupabaseClient } from '../state/appState.js';
import { SUPABASE_KEY, SUPABASE_URL } from '../utils/constants.js';

export function initializeSupabaseClient() {
  const existingClient = getSupabaseClient();
  if (existingClient) return existingClient;

  if (!window.supabase?.createClient) {
    throw new Error('Supabase client library is not available.');
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    { auth: { persistSession: true, autoRefreshToken: true } }
  );

  return setSupabaseClient(client);
}

export function requireSupabaseClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Not connected to the database.');
  }

  return client;
}
