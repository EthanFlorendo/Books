import { getAppState } from '../state/appState.js';
import { hasBookCoverIdSupport, updateBook } from './booksService.js';
import { fetchCoverMetadata } from './openLibraryService.js';
import { hasPlannerCoverIdSupport, updatePlannerEntry } from './plannerService.js';

const attemptedEntryKeys = new Set();
let backfillPromise = null;

function buildEntryKey(kind, id) {
  return `${kind}:${String(id)}`;
}

function getEntriesMissingMetadata() {
  const { booksByReader, plannerByReader, isAdmin } = getAppState();
  if (!isAdmin) return [];

  const bookEntries = hasBookCoverIdSupport()
    ? Object.values(booksByReader)
      .flat()
      .map(book => ({
        kind: 'book',
        id: book.id,
        title: book.title,
        author: book.author,
        coverId: book.cover_id,
        workKey: book.open_library_work_key || null,
        editionKey: book.open_library_edition_key || null,
      }))
    : [];

  const plannerEntries = hasPlannerCoverIdSupport()
    ? Object.values(plannerByReader)
      .flat()
      .map(entry => ({
        kind: 'planner',
        id: entry.id,
        title: entry.title,
        author: entry.author,
        coverId: entry.cover_id,
        workKey: entry.open_library_work_key || null,
        editionKey: entry.open_library_edition_key || null,
      }))
    : [];

  return [...bookEntries, ...plannerEntries]
    .filter(entry => entry.id && String(entry.title || '').trim())
    .filter(entry => !entry.coverId || !entry.workKey || !entry.editionKey)
    .filter(entry => !attemptedEntryKeys.has(buildEntryKey(entry.kind, entry.id)));
}

async function persistMetadataForEntry(entry, metadata) {
  const nextPayload = {};

  if (!entry.coverId && metadata?.coverId) {
    nextPayload.cover_id = metadata.coverId;
  }
  if (!entry.workKey && metadata?.workKey) {
    nextPayload.open_library_work_key = metadata.workKey;
  }
  if (!entry.editionKey && metadata?.editionKey) {
    nextPayload.open_library_edition_key = metadata.editionKey;
  }

  if (!Object.keys(nextPayload).length) {
    return false;
  }

  if (entry.kind === 'planner') {
    return updatePlannerEntry(entry.id, nextPayload);
  }

  return updateBook(entry.id, nextPayload);
}

export async function backfillMissingCoverIds() {
  if (backfillPromise) {
    return backfillPromise;
  }

  const entriesToBackfill = getEntriesMissingMetadata();
  if (!entriesToBackfill.length) {
    return false;
  }

  backfillPromise = (async () => {
    let updatedAnyEntries = false;
    const batchSize = 4;

    for (let index = 0; index < entriesToBackfill.length; index += batchSize) {
      const batch = entriesToBackfill.slice(index, index + batchSize);
      const batchResults = await Promise.all(batch.map(async entry => {
        attemptedEntryKeys.add(buildEntryKey(entry.kind, entry.id));

        try {
          const coverMetadata = await fetchCoverMetadata(entry.title, entry.author || '', entry.coverId || null);
          if (!coverMetadata) return false;

          return Boolean(await persistMetadataForEntry(entry, coverMetadata));
        } catch {
          return false;
        }
      }));

      if (batchResults.some(Boolean)) {
        updatedAnyEntries = true;
      }
    }

    return updatedAnyEntries;
  })().finally(() => {
    backfillPromise = null;
  });

  return backfillPromise;
}
