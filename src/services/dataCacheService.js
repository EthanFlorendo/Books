const READING_DATA_CACHE_KEY = 'bl-reading-data-cache-v1';

function canUseLocalStorage() {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function isValidSnapshot(snapshot) {
  return Boolean(snapshot)
    && Array.isArray(snapshot.books)
    && Array.isArray(snapshot.plannerEntries);
}

export function loadCachedReadingData() {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const rawSnapshot = window.localStorage.getItem(READING_DATA_CACHE_KEY);
    if (!rawSnapshot) {
      return null;
    }

    const snapshot = JSON.parse(rawSnapshot);
    if (!isValidSnapshot(snapshot)) {
      window.localStorage.removeItem(READING_DATA_CACHE_KEY);
      return null;
    }

    return {
      books: snapshot.books,
      plannerEntries: snapshot.plannerEntries,
      cachedAt: Number(snapshot.cachedAt) || 0,
    };
  } catch {
    window.localStorage.removeItem(READING_DATA_CACHE_KEY);
    return null;
  }
}

export function saveCachedReadingData({ books, plannerEntries }) {
  if (!canUseLocalStorage()) {
    return false;
  }

  try {
    window.localStorage.setItem(READING_DATA_CACHE_KEY, JSON.stringify({
      cachedAt: Date.now(),
      books: Array.isArray(books) ? books : [],
      plannerEntries: Array.isArray(plannerEntries) ? plannerEntries : [],
    }));
    return true;
  } catch {
    return false;
  }
}
