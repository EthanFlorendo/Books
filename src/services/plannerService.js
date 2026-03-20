import { createEmptyPlannerByReader } from '../state/appState.js';
import { requireSupabaseClient } from './supabaseClient.js';

const PLANNER_TABLE = 'planned_books';

export async function verifyPlannerTable() {
  const supabaseClient = requireSupabaseClient();
  const { error } = await supabaseClient.from(PLANNER_TABLE).select('id').limit(1);

  if (error) throw error;
}

export async function fetchPlannerEntries() {
  const supabaseClient = requireSupabaseClient();
  const { data, error } = await supabaseClient.from(PLANNER_TABLE).select('*').order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export function groupPlannerEntriesByReader(entries) {
  const plannerByReader = createEmptyPlannerByReader();

  for (const entry of entries) {
    if (plannerByReader[entry.reader]) {
      plannerByReader[entry.reader].push(entry);
    }
  }

  return plannerByReader;
}

export async function addPlannerEntry(entryPayload) {
  const supabaseClient = requireSupabaseClient();
  const { error } = await supabaseClient.from(PLANNER_TABLE).insert(entryPayload);

  if (error) throw error;
}

export async function updatePlannerEntry(entryId, entryPayload) {
  const supabaseClient = requireSupabaseClient();
  const { error } = await supabaseClient.from(PLANNER_TABLE).update(entryPayload).eq('id', entryId);

  if (error) throw error;
}

export async function deletePlannerEntry(entryId) {
  const supabaseClient = requireSupabaseClient();
  const { error } = await supabaseClient.from(PLANNER_TABLE).delete().eq('id', entryId);

  if (error) throw error;
}

export function getPlannerEntryById(plannerByReader, reader, entryId) {
  return (plannerByReader[reader] || []).find(entry => String(entry.id) === String(entryId)) || null;
}
