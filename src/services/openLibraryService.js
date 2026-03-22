import { detectBookType } from '../utils/helpers.js';

const coverCache = new Map();
const coverRequestCache = new Map();

export function createCoverUrl(coverId, size = 'M') {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : '';
}

function normalizeOpenLibraryKey(key, kind = 'work') {
  const normalizedKey = String(key || '').trim();
  if (!normalizedKey) return '';

  if (normalizedKey.startsWith('/works/') || normalizedKey.startsWith('/books/')) {
    return normalizedKey;
  }

  if (/^OL.+W$/i.test(normalizedKey)) {
    return `/works/${normalizedKey}`;
  }

  if (/^OL.+M$/i.test(normalizedKey)) {
    return `/books/${normalizedKey}`;
  }

  return kind === 'edition' ? `/books/${normalizedKey}` : `/works/${normalizedKey}`;
}

function extractYear(value) {
  const yearMatch = String(value || '').match(/\b\d{4}\b/);
  return yearMatch ? Number(yearMatch[0]) : '';
}

function sanitizeDescription(description) {
  let normalizedDescription = description;

  if (normalizedDescription && typeof normalizedDescription === 'object') {
    normalizedDescription = normalizedDescription.value;
  }

  if (!normalizedDescription) {
    return null;
  }

  return String(normalizedDescription)
    .replace(/\(\[.*?\]\(.*?\)\)/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .trim();
}

async function fetchJsonOrNull(path) {
  if (!path) return null;

  const response = await fetch(`https://openlibrary.org${path}.json`);
  if (!response.ok) {
    throw new Error('Could not load Open Library details.');
  }

  return response.json();
}

function normalizeLookupValue(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSearchValue(value) {
  return normalizeLookupValue(value)
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCoverCacheKey(title, author = '', preferredCoverId = null) {
  return `${normalizeLookupValue(title)}::${normalizeLookupValue(author)}::${Number(preferredCoverId) || 0}`;
}

function countWordOverlap(left, right) {
  if (!left || !right) return 0;

  const leftWords = left.split(' ').filter(word => word.length > 2);
  if (!leftWords.length) return 0;

  return leftWords.filter(word => right.includes(word)).length;
}

function getEditionKeyFromDoc(doc) {
  return normalizeOpenLibraryKey(
    doc?.cover_edition_key || doc?.edition_key?.[0] || doc?.editions?.docs?.[0]?.key,
    'edition'
  );
}

function scoreSearchDoc(doc, title, author, preferredCoverId = null) {
  const normalizedTitle = normalizeSearchValue(title);
  const normalizedAuthor = normalizeSearchValue(author);
  const candidateTitle = normalizeSearchValue(doc?.title);
  const candidateAuthor = normalizeSearchValue((doc?.author_name || []).join(' '));
  const preferredCoverBonus = preferredCoverId && Number(doc?.cover_i) === Number(preferredCoverId) ? 500 : 0;
  const titleExactBonus = normalizedTitle && candidateTitle === normalizedTitle ? 200 : 0;
  const authorExactBonus = normalizedAuthor && candidateAuthor.includes(normalizedAuthor) ? 90 : 0;
  const titleOverlapScore = countWordOverlap(normalizedTitle, candidateTitle) * 20;
  const authorOverlapScore = countWordOverlap(normalizedAuthor, candidateAuthor) * 12;

  return preferredCoverBonus + titleExactBonus + authorExactBonus + titleOverlapScore + authorOverlapScore;
}

function selectBestSearchDoc(docs, title, author, preferredCoverId = null) {
  const bestMatch = (docs || [])
    .map(doc => ({
      doc,
      score: scoreSearchDoc(doc, title, author, preferredCoverId),
    }))
    .sort((left, right) => right.score - left.score)[0];

  return bestMatch?.score > 0 ? bestMatch.doc : null;
}

function selectBestCoverDoc(docs, title, author, preferredCoverId = null) {
  const bestMatch = (docs || [])
    .filter(doc => doc?.cover_i)
    .map(doc => ({
      doc,
      score: scoreSearchDoc(doc, title, author, preferredCoverId),
    }))
    .sort((left, right) => right.score - left.score)[0];

  return bestMatch?.score > 0 ? bestMatch.doc : null;
}

export async function searchOpenLibrary(query) {
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=key,title,author_name,number_of_pages_median,cover_i,cover_edition_key,edition_key,first_publish_year,subject&limit=7`
  );

  if (!response.ok) {
    throw new Error('Search failed');
  }

  const payload = await response.json();

  return (payload.docs || []).map(doc => ({
    title: doc.title || '',
    author: (doc.author_name || []).slice(0, 2).join(', '),
    coverId: doc.cover_i || null,
    workKey: normalizeOpenLibraryKey(doc.key, 'work'),
    editionKey: getEditionKeyFromDoc(doc),
    pages: doc.number_of_pages_median || 0,
    year: doc.first_publish_year || '',
    coverUrl: createCoverUrl(doc.cover_i, 'M'),
    subjects: (doc.subject || []).slice(0, 15),
    type: detectBookType((doc.subject || []).join('|')),
  }));
}

export async function validateLiterature(title, author) {
  try {
    const query = encodeURIComponent(`${title} ${author}`);
    const response = await fetch(`https://openlibrary.org/search.json?q=${query}&fields=title,author_name&limit=5`);
    if (!response.ok) throw new Error('Validation failed');

    const payload = await response.json();
    if (!payload.docs?.length) return false;

    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    return payload.docs.some(doc => {
      const candidateTitle = (doc.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      const words = normalizedTitle.split(' ').filter(word => word.length > 2);
      const matches = words.filter(word => candidateTitle.includes(word));

      return words.length > 0 && matches.length / words.length >= 0.5;
    });
  } catch {
    return true;
  }
}

async function fetchBookDetailsBySearch(title, author, preferredCoverId = null) {
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(`${title} ${author || ''}`)}&fields=key,title,author_name,cover_i,cover_edition_key,edition_key,number_of_pages_median,first_publish_year,subject,publisher&limit=8`
  );

  if (!response.ok) {
    throw new Error('Could not reach Open Library.');
  }

  const payload = await response.json();
  const doc = selectBestSearchDoc(payload.docs, title, author, preferredCoverId);
  if (!doc) return null;

  const exactDetails = await fetchBookDetailsByKey({
    title,
    author,
    open_library_work_key: normalizeOpenLibraryKey(doc.key, 'work'),
    open_library_edition_key: getEditionKeyFromDoc(doc),
  });

  if (exactDetails) {
    return {
      doc: {
        ...doc,
        ...exactDetails.doc,
        cover_i: exactDetails.doc.cover_i || doc.cover_i || null,
        number_of_pages_median: exactDetails.doc.number_of_pages_median || doc.number_of_pages_median || 0,
        first_publish_year: exactDetails.doc.first_publish_year || doc.first_publish_year || '',
        subject: exactDetails.doc.subject?.length ? exactDetails.doc.subject : (doc.subject || []),
        publisher: exactDetails.doc.publisher?.length ? exactDetails.doc.publisher : (doc.publisher || []),
      },
      description: exactDetails.description,
    };
  }

  let description = null;

  if (doc.key) {
    try {
      const workPayload = await fetchJsonOrNull(normalizeOpenLibraryKey(doc.key, 'work'));
      description = sanitizeDescription(workPayload?.description);
    } catch {
      description = null;
    }
  }

  return { doc, description };
}

async function fetchBookDetailsByKey(entry) {
  const title = String(entry?.title || '').trim();
  const author = String(entry?.author || '').trim();
  const editionKey = normalizeOpenLibraryKey(entry?.open_library_edition_key, 'edition');
  let workKey = normalizeOpenLibraryKey(entry?.open_library_work_key, 'work');

  if (!editionKey && !workKey) {
    return null;
  }

  try {
    const editionPayload = editionKey ? await fetchJsonOrNull(editionKey) : null;
    if (!workKey) {
      workKey = normalizeOpenLibraryKey(editionPayload?.works?.[0]?.key, 'work');
    }

    const workPayload = workKey ? await fetchJsonOrNull(workKey) : null;
    const subjects = Array.isArray(workPayload?.subjects) && workPayload.subjects.length
      ? workPayload.subjects
      : Array.isArray(editionPayload?.subjects)
        ? editionPayload.subjects
        : [];
    const publishers = Array.isArray(editionPayload?.publishers) && editionPayload.publishers.length
      ? editionPayload.publishers
      : [];

    const doc = {
      key: workKey,
      title: editionPayload?.title || workPayload?.title || title,
      author_name: author ? [author] : [],
      cover_i: editionPayload?.covers?.[0] || workPayload?.covers?.[0] || null,
      number_of_pages_median: editionPayload?.number_of_pages || 0,
      first_publish_year: extractYear(workPayload?.first_publish_date || editionPayload?.publish_date),
      subject: subjects,
      publisher: publishers,
    };

    return {
      doc,
      description: sanitizeDescription(workPayload?.description || editionPayload?.description),
    };
  } catch {
    return null;
  }
}

export async function fetchBookDetails(entryOrTitle, author = '') {
  const entry = typeof entryOrTitle === 'object' && entryOrTitle !== null
    ? entryOrTitle
    : { title: entryOrTitle, author };

  const exactDetails = await fetchBookDetailsByKey(entry);
  if (exactDetails) {
    return exactDetails;
  }

  return fetchBookDetailsBySearch(entry.title, entry.author, entry.cover_id || null);
}

export async function fetchCoverMetadata(title, author = '', preferredCoverId = null) {
  const normalizedTitle = String(title || '').trim();
  const normalizedAuthor = String(author || '').trim();
  const cacheKey = getCoverCacheKey(normalizedTitle, normalizedAuthor, preferredCoverId);

  if (!normalizedTitle) return null;

  if (coverCache.has(cacheKey)) {
    return coverCache.get(cacheKey);
  }

  if (coverRequestCache.has(cacheKey)) {
    return coverRequestCache.get(cacheKey);
  }

  const request = (async () => {
    try {
      const query = [normalizedTitle, normalizedAuthor].filter(Boolean).join(' ');
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=key,title,author_name,cover_i,cover_edition_key,edition_key&limit=8`
      );

      if (!response.ok) throw new Error('Could not load cover');

      const payload = await response.json();
      const coverDoc = selectBestCoverDoc(payload.docs, normalizedTitle, normalizedAuthor, preferredCoverId);
      const coverMetadata = coverDoc?.cover_i
        ? {
            coverId: Number(coverDoc.cover_i),
            coverUrl: createCoverUrl(coverDoc.cover_i, 'M'),
            workKey: normalizeOpenLibraryKey(coverDoc.key, 'work'),
            editionKey: getEditionKeyFromDoc(coverDoc),
          }
        : null;

      coverCache.set(cacheKey, coverMetadata);
      return coverMetadata;
    } catch {
      coverCache.set(cacheKey, null);
      return null;
    } finally {
      coverRequestCache.delete(cacheKey);
    }
  })();

  coverRequestCache.set(cacheKey, request);
  return request;
}

export async function fetchCoverUrl(title, author = '') {
  const coverMetadata = await fetchCoverMetadata(title, author);
  return coverMetadata?.coverUrl || null;
}

export async function fetchCoverUrlByTitle(title) {
  return fetchCoverUrl(title);
}
