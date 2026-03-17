import { USERS } from './config.js';
import { state } from './state.js';
import { userStats } from './data.js';
import { esc, fmt, stars } from './utils.js';
import { fetchBookDetails, fetchMissingCovers, hideDropdown, onBookSearch } from './openLibrary.js';
import { addBook, openEdit } from './books.js';

const STATUS_SORT_ORDER = {
  Completed: 3,
  Current: 2,
  Paused: 1,
};

export function renderStats() {
  const ranked = USERS
    .map(user => {
      const s = userStats(user);
      return { user, monthlyPages: s.monthlyPages, monthlyBooks: s.monthlyCompleted.length };
    })
    .sort((a, b) => b.monthlyPages - a.monthlyPages || b.monthlyBooks - a.monthlyBooks);

  const rankClasses = ['first', 'second', 'third', ''];

  document.getElementById('leaderboard-list').innerHTML = ranked.map((row, index) => `
    <div class="lb-row">
      <span class="lb-rank ${rankClasses[index] || ''}">${index + 1}</span>
      <span class="lb-name">${row.user}</span>
      <span class="lb-stat"><strong>${row.monthlyBooks}</strong>books this month</span>
      <span class="lb-stat"><strong>${row.monthlyPages}</strong>pages this month</span>
    </div>
  `).join('');

  document.getElementById('stats-grid').innerHTML = USERS.map(user => {
    const s = userStats(user);
    const currentBooks = s.current.map(book => `<span class="current-book-tag">${esc(book.title)}</span>`).join('') || '<em style="color:var(--paused);font-size:.75rem">Nothing current</em>';

    return `
      <div class="reader-card">
        <h3>${user}</h3>
        <div class="stat-row"><span>Total Started</span><span class="stat-val">${s.books.length}</span></div>
        <div class="stat-row"><span>Completed</span><span class="stat-val">${s.finished.length}</span></div>
        <div class="stat-row"><span>Pages Read</span><span class="stat-val">${s.allPages.toLocaleString()}</span></div>
        <div class="stat-row"><span>Novels</span><span class="stat-val">${s.byType['Novel']}</span></div>
        <div class="stat-row"><span>Poetry</span><span class="stat-val">${s.byType['Poetry']}</span></div>
        <div class="stat-row"><span>Short Stories</span><span class="stat-val">${s.byType['Short Story']}</span></div>
        <div class="stat-row"><span>Plays</span><span class="stat-val">${s.byType['Play']}</span></div>
        <div class="current-books">
          <div style="font-size:.65rem;letter-spacing:2px;text-transform:uppercase;color:var(--paused);margin-bottom:5px">Currently Reading</div>
          ${currentBooks}
        </div>
      </div>`;
  }).join('');
}

export function renderUserTab(user) {
  const panel = document.querySelector(`#tab-${user.toLowerCase()} .user-panel`);
  const s = userStats(user);
  const sortBy = state.sorts[user] || 'date';
  const sortedBooks = [...s.books].sort((a, b) => compareBooks(a, b, sortBy));

  panel.innerHTML = `
    <div class="section-title">— This Month —</div>
    <div class="monthly-strip">
      <div class="monthly-cell"><div class="mc-val">${s.monthlyCompleted.length}</div><div class="mc-lbl">Completed</div></div>
      <div class="monthly-cell"><div class="mc-val">${s.monthlyPages}</div><div class="mc-lbl">Pages Read</div></div>
      <div class="monthly-cell"><div class="mc-val">${s.finished.length}</div><div class="mc-lbl">Total Finished</div></div>
      <div class="monthly-cell"><div class="mc-val">${s.books.length}</div><div class="mc-lbl">Total Books</div></div>
    </div>

    <div class="add-form-toggle" id="${user}-toggle">
      <span>＋ Add a Book</span>
      <span class="toggle-arrow">▼</span>
    </div>
    <div class="add-form-body" id="${user}-form-body">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="${user}-search" placeholder="Search by title or author to autofill…" autocomplete="off">
        <div class="search-results" id="${user}-search-results" style="display:none"></div>
      </div>
      <div class="search-hint">Type to search Open Library — click a result to autofill fields below</div>
      <div class="form-grid">
        <div class="field-group two"><label>Title *</label><input type="text" id="${user}-title" placeholder="Book title"></div>
        <div class="field-group"><label>Author *</label><input type="text" id="${user}-author" placeholder="Author"></div>
        <div class="field-group"><label>Pages Read</label><input type="number" id="${user}-pages" placeholder="0" min="0"></div>
        <div class="field-group"><label>Total Pages</label><input type="number" id="${user}-totalPages" placeholder="0" min="0"></div>
        <div class="field-group"><label>Type</label><select id="${user}-type"><option>Novel</option><option>Short Story</option><option>Poetry</option><option>Play</option></select></div>
        <div class="field-group"><label>Status</label><select id="${user}-status"><option>Current</option><option>Completed</option><option>Paused</option></select></div>
        <div class="field-group"><label>Date Started</label><input type="date" id="${user}-dateStarted"></div>
        <div class="field-group"><label>Date Finished</label><input type="date" id="${user}-dateFinished"></div>
        <div class="field-group"><label>Rating</label><select id="${user}-rating"><option value="">—</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>
        <div class="field-group"><label>Reread?</label><select id="${user}-reread"><option value="false">No</option><option value="true">Yes</option></select></div>
        <div class="field-group two"><label>Notes</label><input type="text" id="${user}-notes" placeholder="Optional…"></div>
        <div class="full" style="margin-top:4px"><button class="btn btn-primary" id="${user}-add-btn">Add to List</button></div>
      </div>
    </div>

    <div class="section-title">— Reading List —</div>
    <div class="list-toolbar">
      <label class="sort-control" for="${user}-sort">
        <span>Sort By</span>
        <select id="${user}-sort">
          <option value="date" ${sortBy === 'date' ? 'selected' : ''}>Date</option>
          <option value="rating" ${sortBy === 'rating' ? 'selected' : ''}>Rating</option>
          <option value="author" ${sortBy === 'author' ? 'selected' : ''}>Author</option>
          <option value="completion" ${sortBy === 'completion' ? 'selected' : ''}>Completion</option>
        </select>
      </label>
    </div>
    <div class="book-table-wrap">
      ${s.books.length === 0
        ? '<div class="no-books">No books recorded yet.</div>'
        : `<table>
            <thead>
              <tr>
                <th style="width:58px"></th><th>Title</th><th>Author</th><th>Type</th><th>Status</th><th>Progress</th><th>Rating</th><th>Started</th><th>Finished</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${sortedBooks.map(book => renderBookRow(user, book)).join('')}
            </tbody>
          </table>`}
    </div>`;

  bindUserTabEvents(user);
  fetchMissingCovers();
}

function renderBookRow(user, book) {
  const pct = book.total_pages > 0 ? Math.min(100, Math.round((book.pages / book.total_pages) * 100)) : 0;
  const coverHtml = `<div class="book-cover-placeholder" data-fetch="${esc(book.title)}" data-id="${book.id}">📖</div>`;

  return `
    <tr class="clickable-row" data-book-row data-user="${user}" data-book-id="${book.id}">
      <td class="cover-cell">${coverHtml}</td>
      <td class="padded"><strong>${esc(book.title)}</strong>${book.reread ? ' <span title="Reread" style="color:var(--gold)">↺</span>' : ''}</td>
      <td class="padded">${esc(book.author || '')}</td>
      <td class="padded">${book.type || ''}</td>
      <td class="padded"><span class="status-badge status-${book.status}">${book.status}</span></td>
      <td class="padded">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <span style="font-size:.7rem;margin-left:5px;color:var(--paused)">${book.pages}/${book.total_pages || '?'}</span>
      </td>
      <td class="padded"><span class="stars">${stars(book.rating)}</span></td>
      <td class="padded">${fmt(book.date_started)}</td>
      <td class="padded">${fmt(book.date_finished)}</td>
      <td class="padded"><button class="btn btn-danger" data-edit-book="${book.id}" data-user="${user}">Edit</button></td>
    </tr>`;
}

function compareBooks(a, b, sortBy) {
  switch (sortBy) {
    case 'rating':
      return compareNumbers(b.rating, a.rating)
        || compareStrings(a.author, b.author)
        || compareStrings(a.title, b.title);
    case 'author':
      return compareStrings(a.author, b.author)
        || compareStrings(a.title, b.title)
        || compareDates(getBookSortDate(b), getBookSortDate(a));
    case 'completion':
      return compareNumbers(getCompletionRank(b), getCompletionRank(a))
        || compareNumbers(getCompletionPercent(b), getCompletionPercent(a))
        || compareStrings(a.title, b.title);
    case 'date':
    default:
      return compareDates(getBookSortDate(b), getBookSortDate(a))
        || compareStrings(a.title, b.title);
  }
}

function compareStrings(a = '', b = '') {
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
}

function compareNumbers(a, b) {
  return (Number(a) || 0) - (Number(b) || 0);
}

function compareDates(a, b) {
  return getTimeValue(a) - getTimeValue(b);
}

function getTimeValue(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getBookSortDate(book) {
  return book.date_finished || book.date_started || book.created_at || '';
}

function getCompletionRank(book) {
  return STATUS_SORT_ORDER[book.status] || 0;
}

function getCompletionPercent(book) {
  if (book.status === 'Completed') return 100;
  if (!book.total_pages) return 0;
  return Math.min(100, Math.round(((book.pages || 0) / book.total_pages) * 100));
}

function bindUserTabEvents(user) {
  const toggle = document.getElementById(`${user}-toggle`);
  const body = document.getElementById(`${user}-form-body`);
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('open');
    body.classList.toggle('open');
  });

  const searchInput = document.getElementById(`${user}-search`);
  searchInput.addEventListener('input', () => onBookSearch(user));
  searchInput.addEventListener('blur', () => hideDropdown(user));

  document.getElementById(`${user}-add-btn`).addEventListener('click', () => addBook(user));
  document.getElementById(`${user}-sort`).addEventListener('change', event => {
    state.sorts[user] = event.target.value;
    renderUserTab(user);
  });

  panelScopedQuery(user, '[data-book-row]').forEach(row => {
    row.addEventListener('click', event => {
      if (event.target.closest('[data-edit-book]')) return;
      openBookDetail(row.dataset.user, row.dataset.bookId);
    });
  });

  panelScopedQuery(user, '[data-edit-book]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      openEdit(button.dataset.user, button.dataset.editBook);
    });
  });
}

function panelScopedQuery(user, selector) {
  return document.querySelectorAll(`#tab-${user.toLowerCase()} ${selector}`);
}

export async function openBookDetail(user, bookId) {
  const book = (state.db[user] || []).find(item => item.id === bookId);
  if (!book) return;

  document.getElementById('book-detail-modal').classList.add('open');
  document.getElementById('bm-header-title').textContent = book.title;
  document.getElementById('bm-title').textContent = book.title;
  document.getElementById('bm-author').textContent = `by ${book.author || 'Unknown'}`;

  const pct = book.total_pages > 0 ? Math.min(100, Math.round((book.pages / book.total_pages) * 100)) : 0;
  document.getElementById('bm-meta').innerHTML = `
    <span class="book-modal-tag status-tag">${book.status}</span>
    <span class="book-modal-tag">${book.type || 'Novel'}</span>
    ${book.rating ? `<span class="book-modal-tag">★ ${book.rating}/5</span>` : ''}
    ${book.reread ? '<span class="book-modal-tag">↺ Reread</span>' : ''}`;

  document.getElementById('bm-progress').innerHTML = book.total_pages > 0 ? `
    <div class="book-modal-progress-bar"><div class="book-modal-progress-fill" style="width:${pct}%"></div></div>
    <div class="book-modal-progress-label">${book.pages} of ${book.total_pages} pages read (${pct}%)</div>` : '';

  const started = book.date_started ? `<span><strong>Started</strong> ${fmt(book.date_started)}</span>` : '';
  const finished = book.date_finished ? `<span><strong>Finished</strong> ${fmt(book.date_finished)}</span>` : '';
  document.getElementById('bm-dates').innerHTML = started + finished;
  document.getElementById('bm-notes').innerHTML = book.notes ? `<div class="book-modal-notes">📝 ${esc(book.notes)}</div>` : '';
  document.getElementById('bm-cover-wrap').innerHTML = '<div class="book-modal-cover-loading">Loading cover…</div>';
  document.getElementById('bm-desc').textContent = 'Fetching description…';
  document.getElementById('bm-desc').className = 'book-modal-desc loading';
  document.getElementById('bm-ol-meta').innerHTML = '';

  try {
    const result = await fetchBookDetails(book.title, book.author);

    if (!result?.doc) {
      document.getElementById('bm-cover-wrap').innerHTML = '<div class="book-modal-cover-placeholder">📖</div>';
      document.getElementById('bm-desc').textContent = 'No description found for this book.';
      document.getElementById('bm-desc').className = 'book-modal-desc';
      return;
    }

    const { doc, description } = result;

    if (doc.cover_i) {
      const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      document.getElementById('bm-cover-wrap').innerHTML = `<img class="book-modal-cover" src="${coverUrl}" alt="">`;
    } else {
      document.getElementById('bm-cover-wrap').innerHTML = '<div class="book-modal-cover-placeholder">📖</div>';
    }

    const meta = [];
    if (doc.first_publish_year) meta.push(`<span><strong>First Published</strong>${doc.first_publish_year}</span>`);
    if (doc.number_of_pages_median) meta.push(`<span><strong>Pages</strong>${doc.number_of_pages_median}</span>`);
    if (doc.subject?.length) meta.push(`<span><strong>Genres</strong>${doc.subject.slice(0, 4).join(', ')}</span>`);
    document.getElementById('bm-ol-meta').innerHTML = meta.join('');

    document.getElementById('bm-desc').textContent = description || 'No description available for this edition.';
    document.getElementById('bm-desc').className = 'book-modal-desc';
  } catch {
    document.getElementById('bm-cover-wrap').innerHTML = '<div class="book-modal-cover-placeholder">📖</div>';
    document.getElementById('bm-desc').textContent = 'Could not connect to Open Library.';
    document.getElementById('bm-desc').className = 'book-modal-desc';
  }
}

export function closeBookModal() {
  document.getElementById('book-detail-modal').classList.remove('open');
}

export function renderAll() {
  renderStats();
  document.querySelectorAll('.tab-content.active .user-panel').forEach(panel => {
    if (panel.dataset.user) renderUserTab(panel.dataset.user);
  });
}
