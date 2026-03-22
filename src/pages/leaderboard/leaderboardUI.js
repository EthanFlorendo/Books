import { formatDate, toTimeValue } from '../../utils/dateUtils.js';
import { createCoverUrl } from '../../services/openLibraryService.js';
import { compareNumbers, compareStrings, escapeHtml } from '../../utils/helpers.js';

const STATUS_SORT_ORDER = {
  Completed: 3,
  Current: 2,
  Paused: 1,
};

function formatNotesMarkup(notes = '') {
  return escapeHtml(notes).replace(/\r?\n/g, '<br>');
}

export function renderLeaderboardRows(standings) {
  const rankClasses = ['first', 'second', 'third', ''];

  return standings.map((row, index) => `
    <div class="lb-row">
      <span class="lb-rank ${rankClasses[index] || ''}">${index + 1}</span>
      <span class="lb-name">${escapeHtml(row.reader)}</span>
      <span class="lb-stat"><strong>${row.monthlyBooks}</strong> completed this month</span>
      <span class="lb-stat"><strong>${row.monthlyPages}</strong> pages logged</span>
    </div>
  `).join('');
}

export function renderStatsCards(readerStatsPairs) {
  return readerStatsPairs.map(({ reader, stats }) => {
    const currentBooksMarkup = stats.current.length
      ? stats.current.map(book => `<span class="current-book-tag">${escapeHtml(book.title)}</span>`).join('')
      : '<em class="empty-current-books">No active books</em>';

    return `
      <div class="reader-card">
        <h3>${escapeHtml(reader)}</h3>
        <div class="stat-row"><span>Total Books</span><span class="stat-val">${stats.books.length}</span></div>
        <div class="stat-row"><span>Completed</span><span class="stat-val">${stats.finished.length}</span></div>
        <div class="stat-row"><span>Pages Logged</span><span class="stat-val">${stats.allPages.toLocaleString()}</span></div>
        <div class="stat-row"><span>Novels</span><span class="stat-val">${stats.byType.Novel}</span></div>
        <div class="stat-row"><span>Poetry</span><span class="stat-val">${stats.byType.Poetry}</span></div>
        <div class="stat-row"><span>Short Stories</span><span class="stat-val">${stats.byType['Short Story']}</span></div>
        <div class="stat-row"><span>Plays</span><span class="stat-val">${stats.byType.Play}</span></div>
        <div class="current-books">
          <div class="current-books-label">Currently Reading</div>
          ${currentBooksMarkup}
        </div>
      </div>
    `;
  }).join('');
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

export function compareBooksForSort(sortBy, a, b) {
  switch (sortBy) {
    case 'rating':
      return compareNumbers(b.rating, a.rating)
        || compareStrings(a.author, b.author)
        || compareStrings(a.title, b.title);
    case 'author':
      return compareStrings(a.author, b.author)
        || compareStrings(a.title, b.title)
        || compareNumbers(toTimeValue(getBookSortDate(b)), toTimeValue(getBookSortDate(a)));
    case 'completion':
      return compareNumbers(getCompletionPercent(b), getCompletionPercent(a))
        || compareNumbers(getCompletionRank(b), getCompletionRank(a))
        || compareStrings(a.title, b.title);
    case 'date':
    default:
      return compareNumbers(toTimeValue(getBookSortDate(b)), toTimeValue(getBookSortDate(a)))
        || compareStrings(a.title, b.title);
  }
}

export function comparePlannerEntriesForSort(sortBy, a, b) {
  switch (sortBy) {
    case 'author':
      return compareStrings(a.author, b.author)
        || compareStrings(a.title, b.title);
    case 'date':
      return compareNumbers(toTimeValue(b.created_at), toTimeValue(a.created_at))
        || compareStrings(a.title, b.title);
    case 'rating':
    case 'completion':
    default:
      return compareStrings(a.title, b.title)
        || compareStrings(a.author, b.author);
  }
}

export function buildBookDetailViewModel({ book, details, errorMessage = '' }) {
  const doc = details?.doc || null;
  const coverId = doc?.cover_i || book.cover_id || null;
  const completionPercent = book.total_pages > 0
    ? Math.min(100, Math.round((book.pages / book.total_pages) * 100))
    : 0;

  const metaMarkup = [
    book.entryKind === 'planner' ? '<span class="book-modal-tag status-tag">Planner</span>' : '',
    book.status ? `<span class="book-modal-tag status-tag">${escapeHtml(book.status)}</span>` : '',
    `<span class="book-modal-tag">${escapeHtml(book.type || 'Novel')}</span>`,
    book.rating ? `<span class="book-modal-tag">Rating ${book.rating}/5</span>` : '',
    book.reread ? '<span class="book-modal-tag">Reread</span>' : '',
  ].filter(Boolean).join('');

  const progressMarkup = book.total_pages > 0 ? `
    <div class="book-modal-progress-bar"><div class="book-modal-progress-fill" style="width:${completionPercent}%"></div></div>
    <div class="book-modal-progress-label">${book.pages} of ${book.total_pages} pages read (${completionPercent}%)</div>
  ` : '';

  const openLibraryMetaMarkup = doc ? [
    doc.first_publish_year ? `<span><strong>First Published</strong>${doc.first_publish_year}</span>` : '',
    doc.number_of_pages_median ? `<span><strong>Pages</strong>${doc.number_of_pages_median}</span>` : '',
    doc.subject?.length ? `<span><strong>Genres</strong>${escapeHtml(doc.subject.slice(0, 4).join(', '))}</span>` : '',
  ].filter(Boolean).join('') : '';

  const descriptionText = errorMessage
    || (doc
      ? (details?.description || 'No description available for this edition.')
      : 'No description found for this book.');

  const coverMarkup = coverId
    ? `
      <img
        class="book-modal-cover"
        src="${createCoverUrl(coverId, 'L')}"
        alt=""
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
      >
      <div class="book-modal-cover-placeholder" style="display:none">Book</div>
    `
    : '<div class="book-modal-cover-placeholder">Book</div>';

  const datesMarkup = [
    book.date_started ? `<span><strong>Started</strong> ${formatDate(book.date_started)}</span>` : '',
    book.date_finished ? `<span><strong>Finished</strong> ${formatDate(book.date_finished)}</span>` : '',
  ].filter(Boolean).join('');

  return {
    headerTitle: book.title,
    titleText: book.title,
    authorText: `by ${book.author || 'Unknown'}`,
    metaMarkup,
    progressMarkup,
    coverMarkup,
    descriptionText,
    openLibraryMetaMarkup,
    datesMarkup,
    notesMarkup: book.notes ? `<div class="book-modal-notes">Notes: ${formatNotesMarkup(book.notes)}</div>` : '',
  };
}
