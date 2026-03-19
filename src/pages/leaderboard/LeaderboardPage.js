import { renderReaderSection } from '../../components/ReaderSection.js';
import { getAppState } from '../../state/appState.js';
import { fetchBookDetails, fetchCoverUrlByTitle } from '../../services/openLibraryService.js';
import { getBookById, getLeaderboardStandings, getReaderStats } from '../../services/booksService.js';
import { READERS } from '../../utils/constants.js';
import { buildBookDetailViewModel, compareBooksForSort, renderLeaderboardRows, renderStatsCards } from './leaderboardUI.js';
import { getReaderPanel } from '../home/index.js';

let leaderboardHandlers = {
  onToggleAdminForm: () => {},
  onAddBook: () => {},
  onSearchInput: () => {},
  onHideSearch: () => {},
  onSortChange: () => {},
  onEditBook: () => {},
};

export function setLeaderboardPageHandlers(handlers) {
  leaderboardHandlers = { ...leaderboardHandlers, ...handlers };
}

export function renderLeaderboardPage() {
  const { booksByReader } = getAppState();
  const leaderboardList = document.getElementById('leaderboard-list');
  const statsGrid = document.getElementById('stats-grid');

  if (!leaderboardList || !statsGrid) return;

  const standings = getLeaderboardStandings(booksByReader);
  const readerStatsPairs = READERS.map(reader => ({ reader, stats: getReaderStats(booksByReader, reader) }));

  leaderboardList.innerHTML = renderLeaderboardRows(standings);
  statsGrid.innerHTML = renderStatsCards(readerStatsPairs);
}

export function renderReaderPage(reader) {
  const { booksByReader, isAdmin, readerSorts, readerFormOpen } = getAppState();
  const panel = getReaderPanel(reader);

  if (!panel) return;

  const stats = getReaderStats(booksByReader, reader);
  const sortBy = readerSorts[reader];
  const sortedBooks = [...stats.books].sort((a, b) => compareBooksForSort(sortBy, a, b));

  panel.innerHTML = renderReaderSection({
    reader,
    stats,
    books: sortedBooks,
    sortBy,
    isAdmin,
    isFormOpen: readerFormOpen[reader],
  });

  bindReaderEvents(reader, panel);
  hydrateMissingBookCovers(panel);
}

function bindReaderEvents(reader, panel) {
  panel.querySelector(`#${reader}-toggle`)?.addEventListener('click', () => {
    leaderboardHandlers.onToggleAdminForm(reader);
  });

  panel.querySelector(`#${reader}-search`)?.addEventListener('input', () => {
    leaderboardHandlers.onSearchInput(reader);
  });

  panel.querySelector(`#${reader}-search`)?.addEventListener('blur', () => {
    leaderboardHandlers.onHideSearch(reader);
  });

  panel.querySelector(`#${reader}-add-btn`)?.addEventListener('click', () => {
    leaderboardHandlers.onAddBook(reader);
  });

  panel.querySelector(`#${reader}-sort`)?.addEventListener('change', event => {
    leaderboardHandlers.onSortChange(reader, event.target.value);
  });

  panel.querySelectorAll('[data-book-row]').forEach(row => {
    row.addEventListener('click', event => {
      if (event.target.closest('[data-edit-book]')) return;
      openBookDetail(reader, row.dataset.bookId);
    });
  });

  panel.querySelectorAll('[data-edit-book]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      leaderboardHandlers.onEditBook(button.dataset.reader, button.dataset.editBook);
    });
  });
}

async function hydrateMissingBookCovers(scopeElement) {
  const placeholders = scopeElement.querySelectorAll('.book-cover-placeholder[data-fetch]');

  for (const placeholder of placeholders) {
    const coverUrl = await fetchCoverUrlByTitle(placeholder.dataset.fetch);
    if (!coverUrl) continue;

    placeholder.removeAttribute('data-fetch');
    const image = document.createElement('img');
    image.className = 'book-cover';
    image.src = coverUrl;
    image.alt = '';
    image.loading = 'lazy';
    image.onerror = () => {
      image.style.display = 'none';
      placeholder.style.display = 'flex';
    };

    placeholder.parentNode.insertBefore(image, placeholder);
    placeholder.style.display = 'none';
  }
}

async function openBookDetail(reader, bookId) {
  const { booksByReader } = getAppState();
  const book = getBookById(booksByReader, reader, bookId);

  if (!book) return;

  const modal = document.getElementById('book-detail-modal');
  const headerTitle = document.getElementById('bm-header-title');
  const title = document.getElementById('bm-title');
  const author = document.getElementById('bm-author');
  const meta = document.getElementById('bm-meta');
  const progress = document.getElementById('bm-progress');
  const cover = document.getElementById('bm-cover-wrap');
  const description = document.getElementById('bm-desc');
  const openLibraryMeta = document.getElementById('bm-ol-meta');
  const dates = document.getElementById('bm-dates');
  const notes = document.getElementById('bm-notes');

  modal?.classList.add('open');

  if (headerTitle) headerTitle.textContent = book.title;
  if (title) title.textContent = book.title;
  if (author) author.textContent = `by ${book.author || 'Unknown'}`;
  if (meta) meta.innerHTML = '';
  if (progress) progress.innerHTML = '';
  if (cover) cover.innerHTML = '<div class="book-modal-cover-loading">Loading cover...</div>';
  if (description) {
    description.textContent = 'Fetching description...';
    description.className = 'book-modal-desc loading';
  }
  if (openLibraryMeta) openLibraryMeta.innerHTML = '';
  if (dates) dates.innerHTML = '';
  if (notes) notes.innerHTML = '';

  try {
    const details = await fetchBookDetails(book.title, book.author);
    const viewModel = buildBookDetailViewModel({ book, details });
    applyBookDetailViewModel(viewModel);
  } catch {
    const viewModel = buildBookDetailViewModel({
      book,
      details: null,
      errorMessage: 'Could not connect to Open Library.',
    });
    applyBookDetailViewModel(viewModel);
  }
}

function applyBookDetailViewModel(viewModel) {
  document.getElementById('bm-header-title').textContent = viewModel.headerTitle;
  document.getElementById('bm-title').textContent = viewModel.titleText;
  document.getElementById('bm-author').textContent = viewModel.authorText;
  document.getElementById('bm-meta').innerHTML = viewModel.metaMarkup;
  document.getElementById('bm-progress').innerHTML = viewModel.progressMarkup;
  document.getElementById('bm-cover-wrap').innerHTML = viewModel.coverMarkup;
  document.getElementById('bm-desc').textContent = viewModel.descriptionText;
  document.getElementById('bm-desc').className = 'book-modal-desc';
  document.getElementById('bm-ol-meta').innerHTML = viewModel.openLibraryMetaMarkup;
  document.getElementById('bm-dates').innerHTML = viewModel.datesMarkup;
  document.getElementById('bm-notes').innerHTML = viewModel.notesMarkup;
}

export function closeBookDetailModal() {
  document.getElementById('book-detail-modal')?.classList.remove('open');
}
