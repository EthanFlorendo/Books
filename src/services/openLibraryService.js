import { detectBookType } from '../utils/helpers.js';

const coverCache = new Map();

function createCoverUrl(coverId, size = 'M') {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : '';
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

export async function fetchCoverUrlByTitle(title) {
  const cacheKey = String(title || '').trim().toLowerCase();
  if (!cacheKey) return null;

  if (coverCache.has(cacheKey)) {
    return coverCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&fields=cover_i&limit=1`
    );

    if (!response.ok) throw new Error('Could not load cover');

    const payload = await response.json();
    const coverUrl = createCoverUrl(payload.docs?.[0]?.cover_i, 'M') || null;

    coverCache.set(cacheKey, coverUrl);
    return coverUrl;
  } catch {
    coverCache.set(cacheKey, null);
    return null;
  }
}
