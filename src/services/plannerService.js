import { createEmptyPlannerByReader } from '../state/appState.js';
import { requireSupabaseClient } from './supabaseClient.js';

const PLANNER_TABLE = 'planned_books';
const OPTIONAL_PLANNER_METADATA_COLUMNS = ['cover_id', 'open_library_work_key', 'open_library_edition_key'];
const plannerOptionalColumnSupport = Object.fromEntries(OPTIONAL_PLANNER_METADATA_COLUMNS.map(column => [column, true]));

function hasOptionalPlannerMetadataFields(payload) {
  return OPTIONAL_PLANNER_METADATA_COLUMNS.some(column => Boolean(payload) && Object.prototype.hasOwnProperty.call(payload, column));
}

function omitUnsupportedPlannerMetadata(payload) {
  if (!payload) return {};

  const sanitizedPayload = { ...payload };
  OPTIONAL_PLANNER_METADATA_COLUMNS.forEach(column => {
    if (!plannerOptionalColumnSupport[column]) {
      delete sanitizedPayload[column];
    }
  });

  return sanitizedPayload;
}

function getMissingPlannerMetadataColumn(error) {
  const message = String(error?.message || error?.details || error?.hint || '').toLowerCase();
  if (!(message.includes('column') || message.includes('schema cache') || message.includes('could not find'))) {
    return '';
  }

  return OPTIONAL_PLANNER_METADATA_COLUMNS.find(column => message.includes(column)) || '';
}

async function insertPlannerPayload(supabaseClient, entryPayload) {
  return supabaseClient.from(PLANNER_TABLE).insert(entryPayload);
}

async function updatePlannerPayload(supabaseClient, entryId, entryPayload) {
  return supabaseClient.from(PLANNER_TABLE).update(entryPayload).eq('id', entryId);
}

export function hasPlannerCoverIdSupport() {
  return plannerOptionalColumnSupport.cover_id;
}

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
  let didPersistOptionalMetadata = hasOptionalPlannerMetadataFields(entryPayload);
  let nextPayload = { ...entryPayload };
  let { error } = await insertPlannerPayload(supabaseClient, nextPayload);

  while (error && hasOptionalPlannerMetadataFields(nextPayload)) {
    const missingColumn = getMissingPlannerMetadataColumn(error);
    if (!missingColumn) break;

    plannerOptionalColumnSupport[missingColumn] = false;
    didPersistOptionalMetadata = false;
    nextPayload = omitUnsupportedPlannerMetadata(nextPayload);

    if (!Object.keys(nextPayload).length) {
      error = null;
      break;
    }

    ({ error } = await insertPlannerPayload(supabaseClient, nextPayload));
  }

  if (error) throw error;
  if (didPersistOptionalMetadata) {
    OPTIONAL_PLANNER_METADATA_COLUMNS.forEach(column => {
      if (Object.prototype.hasOwnProperty.call(entryPayload, column)) {
        plannerOptionalColumnSupport[column] = true;
      }
    });
  }

  return didPersistOptionalMetadata;
}

export async function updatePlannerEntry(entryId, entryPayload) {
  const supabaseClient = requireSupabaseClient();
  let didPersistOptionalMetadata = hasOptionalPlannerMetadataFields(entryPayload);
  let nextPayload = { ...entryPayload };
  let { error } = await updatePlannerPayload(supabaseClient, entryId, nextPayload);

  while (error && hasOptionalPlannerMetadataFields(nextPayload)) {
    const missingColumn = getMissingPlannerMetadataColumn(error);
    if (!missingColumn) break;

    plannerOptionalColumnSupport[missingColumn] = false;
    didPersistOptionalMetadata = false;
    nextPayload = omitUnsupportedPlannerMetadata(nextPayload);

    if (!Object.keys(nextPayload).length) {
      error = null;
      break;
    }

    ({ error } = await updatePlannerPayload(supabaseClient, entryId, nextPayload));
  }

  if (error) throw error;
  if (didPersistOptionalMetadata) {
    OPTIONAL_PLANNER_METADATA_COLUMNS.forEach(column => {
      if (Object.prototype.hasOwnProperty.call(entryPayload, column)) {
        plannerOptionalColumnSupport[column] = true;
      }
    });
  }

  return didPersistOptionalMetadata;
}

export async function deletePlannerEntry(entryId) {
  const supabaseClient = requireSupabaseClient();
  const { error } = await supabaseClient.from(PLANNER_TABLE).delete().eq('id', entryId);

  if (error) throw error;
}

export function getPlannerEntryById(plannerByReader, reader, entryId) {
  return (plannerByReader[reader] || []).find(entry => String(entry.id) === String(entryId)) || null;
}
