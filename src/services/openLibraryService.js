import { detectBookType } from '../utils/helpers.js';

const coverCache = new Map();
const coverRequestCache = new Map();

export function createCoverUrl(coverId, size = 'M') {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : '';
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

function getCoverCacheKey(title, author = '') {
  return `${normalizeLookupValue(title)}::${normalizeLookupValue(author)}`;
}

function countWordOverlap(left, right) {
  if (!left || !right) return 0;

  const leftWords = left.split(' ').filter(word => word.length > 2);
  if (!leftWords.length) return 0;

  return leftWords.filter(word => right.includes(word)).length;
}

function selectBestCoverDoc(docs, title, author) {
  const normalizedTitle = normalizeSearchValue(title);
  const normalizedAuthor = normalizeSearchValue(author);

  const bestMatch = (docs || [])
    .filter(doc => doc?.cover_i)
    .map(doc => {
      const candidateTitle = normalizeSearchValue(doc.title);
      const candidateAuthor = normalizeSearchValue((doc.author_name || []).join(' '));
      const titleExactBonus = normalizedTitle && candidateTitle === normalizedTitle ? 200 : 0;
      const authorExactBonus = normalizedAuthor && candidateAuthor.includes(normalizedAuthor) ? 90 : 0;
      const titleOverlapScore = countWordOverlap(normalizedTitle, candidateTitle) * 20;
      const authorOverlapScore = countWordOverlap(normalizedAuthor, candidateAuthor) * 12;

      return {
        doc,
        score: titleExactBonus + authorExactBonus + titleOverlapScore + authorOverlapScore,
      };
    })
    .sort((left, right) => right.score - left.score)[0];

  return bestMatch?.score > 0 ? bestMatch.doc : null;
}

export async function searchOpenLibrary(query) {
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,number_of_pages_median,cover_i,first_publish_year,subject&limit=7`
  );

  if (!response.ok) {
    throw new Error('Search failed');
  }

  const payload = await response.json();

  return (payload.docs || []).map(doc => ({
    title: doc.title || '',
    author: (doc.author_name || []).slice(0, 2).join(', '),
    coverId: doc.cover_i || null,
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

export async function fetchBookDetails(title, author) {
  const response = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(`${title} ${author || ''}`)}&fields=key,title,author_name,cover_i,number_of_pages_median,first_publish_year,subject,publisher&limit=1`
  );

  if (!response.ok) {
    throw new Error('Could not reach Open Library.');
  }

  const payload = await response.json();
  const doc = payload.docs?.[0];
  if (!doc) return null;

  let description = null;

  if (doc.key) {
    try {
      const workResponse = await fetch(`https://openlibrary.org${doc.key}.json`);
      if (!workResponse.ok) throw new Error('Could not load work details.');

      const workPayload = await workResponse.json();
      description = workPayload.description;

      if (description && typeof description === 'object') {
        description = description.value;
      }

      if (description) {
        description = description
          .replace(/\(\[.*?\]\(.*?\)\)/g, '')
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
          .trim();
      }
    } catch {
      description = null;
    }
  }

  return { doc, description };
}

export async function fetchCoverMetadata(title, author = '') {
  const normalizedTitle = String(title || '').trim();
  const normalizedAuthor = String(author || '').trim();
  const cacheKey = getCoverCacheKey(normalizedTitle, normalizedAuthor);

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
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=title,author_name,cover_i&limit=8`
      );

      if (!response.ok) throw new Error('Could not load cover');

      const payload = await response.json();
      const coverDoc = selectBestCoverDoc(payload.docs, normalizedTitle, normalizedAuthor);
      const coverMetadata = coverDoc?.cover_i
        ? {
            coverId: Number(coverDoc.cover_i),
            coverUrl: createCoverUrl(coverDoc.cover_i, 'M'),
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
