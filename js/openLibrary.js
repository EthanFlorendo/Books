import { detectType, esc } from './utils.js';
import { state } from './state.js';

export async function fetchMissingCovers() {
  const placeholders = document.querySelectorAll('.book-cover-placeholder[data-fetch]');

  for (const el of placeholders) {
    const title = el.dataset.fetch;
    const id = el.dataset.id;
    if (!title || !id) continue;

    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&fields=cover_i&limit=1`);
      const data = await res.json();
      const coverId = data.docs?.[0]?.cover_i;
      if (!coverId) continue;

      const url = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
      el.removeAttribute('data-fetch');
      el.removeAttribute('data-id');

      const img = document.createElement('img');
      img.className = 'book-cover';
      img.src = url;
      img.alt = '';
      img.loading = 'lazy';
      img.onerror = () => {
        img.style.display = 'none';
        el.style.display = 'flex';
      };

      el.parentNode.insertBefore(img, el);
      el.style.display = 'none';
    } catch {
      // ignore cover errors
    }
  }
}

export function onBookSearch(user) {
  const q = document.getElementById(`${user}-search`)?.value.trim();
  const results = document.getElementById(`${user}-search-results`);

  clearTimeout(state.searchTimers[user]);

  if (!q || q.length < 2) {
    results.style.display = 'none';
    return;
  }

  results.innerHTML = '<div style="padding:10px;font-style:italic;font-size:.78rem;color:var(--paused)">Searching…</div>';
  results.style.display = 'block';
  state.searchTimers[user] = setTimeout(() => doBookSearch(user, q), 420);
}

async function doBookSearch(user, q) {
  const results = document.getElementById(`${user}-search-results`);

  try {
    const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=title,author_name,number_of_pages_median,cover_i,first_publish_year,subject&limit=7`);
    const data = await res.json();

    if (!data.docs?.length) {
      results.innerHTML = '<div style="padding:10px;font-style:italic;font-size:.78rem;color:var(--paused)">No results found</div>';
      return;
    }

    results.innerHTML = data.docs.map(book => {
      const title = esc(book.title || '');
      const author = esc((book.author_name || []).slice(0, 2).join(', '));
      const pages = book.number_of_pages_median || 0;
      const year = book.first_publish_year || '';
      const coverId = book.cover_i;
      const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : '';
      const coverHtml = coverUrl
        ? `<img class="sri-cover" src="${coverUrl}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="sri-cover-placeholder" style="display:none">📖</div>`
        : '<div class="sri-cover-placeholder">📖</div>';
      const meta = [pages ? `${pages} pages` : '', year].filter(Boolean).join(' · ');

      return `
        <div class="search-result-item"
          data-title="${esc(book.title || '')}"
          data-author="${esc((book.author_name || []).slice(0, 2).join(', '))}"
          data-pages="${pages}"
          data-cover="${esc(coverUrl)}"
          data-subjects="${esc((book.subject || []).slice(0, 15).join('|'))}"
          data-user="${user}">
          ${coverHtml}
          <div class="sri-info">
            <div class="sri-title">${title}</div>
            <div class="sri-author">${author}</div>
            ${meta ? `<div class="sri-meta">${meta}</div>` : ''}
          </div>
        </div>`;
    }).join('');

    results.style.display = 'block';

    results.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('mousedown', () => selectBookFromElement(item));
    });
  } catch {
    results.innerHTML = '<div style="padding:10px;font-size:.78rem;color:var(--rust)">Search failed</div>';
  }
}

function selectBookFromElement(el) {
  const user = el.dataset.user;
  const title = el.dataset.title;
  const author = el.dataset.author;
  const pages = parseInt(el.dataset.pages, 10) || 0;
  const coverUrl = el.dataset.cover || '';
  const subjects = el.dataset.subjects || '';
  const type = detectType(subjects);

  selectBook(user, title, author, pages, coverUrl, type);
}

function selectBook(user, title, author, pages, coverUrl, type) {
  const set = (id, value) => {
    const el = document.getElementById(`${user}-${id}`);
    if (el) el.value = value;
  };

  set('title', title);
  set('author', author);
  if (pages) set('totalPages', pages);
  if (type) set('type', type);

  state.selectedCover[user] = coverUrl || null;

  const results = document.getElementById(`${user}-search-results`);
  if (results) results.style.display = 'none';

  const searchEl = document.getElementById(`${user}-search`);
  if (searchEl) searchEl.value = '';

  const titleEl = document.getElementById(`${user}-title`);
  if (titleEl) titleEl.focus();
}

export function hideDropdown(user) {
  setTimeout(() => {
    const results = document.getElementById(`${user}-search-results`);
    if (results) results.style.display = 'none';
  }, 200);
}

export async function validateLiterature(title, author) {
  try {
    const q = encodeURIComponent(`${title} ${author}`);
    const res = await fetch(`https://openlibrary.org/search.json?q=${q}&fields=title,author_name&limit=5`);
    const data = await res.json();
    if (!data.docs?.length) return false;

    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    return data.docs.some(doc => {
      const docTitle = (doc.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
      const words = normalizedTitle.split(' ').filter(word => word.length > 2);
      const matches = words.filter(word => docTitle.includes(word));
      return words.length > 0 && matches.length / words.length >= 0.5;
    });
  } catch {
    return true;
  }
}

export async function fetchBookDetails(title, author) {
  const searchRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(`${title} ${author || ''}`)}&fields=key,title,author_name,cover_i,number_of_pages_median,first_publish_year,subject,publisher&limit=1`);
  const searchData = await searchRes.json();
  const doc = searchData.docs?.[0];

  if (!doc) return null;

  let description = null;
  if (doc.key) {
    try {
      const workRes = await fetch(`https://openlibrary.org${doc.key}.json`);
      const workData = await workRes.json();
      description = workData.description;
      if (description && typeof description === 'object') description = description.value;
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
