import { getAppState } from '../state/appState.js';
import { hasBookCoverIdSupport, updateBook } from './booksService.js';
import { fetchCoverMetadata } from './openLibraryService.js';
import { hasPlannerCoverIdSupport, updatePlannerEntry } from './plannerService.js';

const attemptedEntryKeys = new Set();
let backfillPromise = null;

function buildEntryKey(kind, id) {
  return `${kind}:${String(id)}`;
}

function getEntriesMissingCoverIds() {
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
      }))
    : [];

  return [...bookEntries, ...plannerEntries]
    .filter(entry => entry.id && !entry.coverId && String(entry.title || '').trim())
    .filter(entry => !attemptedEntryKeys.has(buildEntryKey(entry.kind, entry.id)));
}

async function persistCoverIdForEntry(entry, coverId) {
  if (entry.kind === 'planner') {
    return updatePlannerEntry(entry.id, { cover_id: coverId });
  }

  return updateBook(entry.id, { cover_id: coverId });
}

export async function backfillMissingCoverIds() {
  if (backfillPromise) {
    return backfillPromise;
  }

  const entriesToBackfill = getEntriesMissingCoverIds();
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
          const coverMetadata = await fetchCoverMetadata(entry.title, entry.author || '');
          if (!coverMetadata?.coverId) return false;

          return Boolean(await persistCoverIdForEntry(entry, coverMetadata.coverId));
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
