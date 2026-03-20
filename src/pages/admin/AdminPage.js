import { renderAdminToolbar } from '../../components/AdminToolbar.js';
import { renderSearchResults } from '../../components/SearchBar.js';
import { clearEditSession, getAppState, getSearchTimer, setReaderFormOpen, setSearchTimer, startEditSession } from '../../state/appState.js';
import { ensureAdminAccess } from '../../services/authService.js';
import { addBook, deleteBook, getBookById, updateBook } from '../../services/booksService.js';
import { searchOpenLibrary, validateLiterature } from '../../services/openLibraryService.js';
import { BOOK_STATUSES, BOOK_TYPES } from '../../utils/constants.js';
import { escapeHtml, parseInteger, renderSelectOptions } from '../../utils/helpers.js';

let adminHandlers = {
  onToggleAdmin: async () => {},
  onRefreshData: async () => {},
  onRenderApp: () => {},
};

export function setAdminPageHandlers(handlers) {
  adminHandlers = { ...adminHandlers, ...handlers };
}

export function bindAdminShellEvents() {
  document.getElementById('save-edit-btn')?.addEventListener('click', saveEditChanges);
  document.getElementById('delete-edit-btn')?.addEventListener('click', deleteCurrentEdit);
}

export function renderAdminPage() {
  const adminRegion = document.getElementById('nav-admin-region');
  if (!adminRegion) return;

  adminRegion.innerHTML = renderAdminToolbar({ isAdmin: getAppState().isAdmin });
  adminRegion.querySelector('#admin-toggle-btn')?.addEventListener('click', async () => {
    await adminHandlers.onToggleAdmin();
  });
}

function getReaderFieldValue(reader, fieldName) {
  return document.getElementById(`${reader}-${fieldName}`)?.value.trim() || '';
}

function buildBookPayloadFromReaderForm(reader) {
  return {
    reader,
    title: getReaderFieldValue(reader, 'title'),
    author: getReaderFieldValue(reader, 'author'),
    pages: parseInteger(getReaderFieldValue(reader, 'pages')),
    total_pages: parseInteger(getReaderFieldValue(reader, 'totalPages')),
    type: getReaderFieldValue(reader, 'type') || 'Novel',
    status: getReaderFieldValue(reader, 'status') || 'Current',
    date_started: getReaderFieldValue(reader, 'dateStarted') || null,
    date_finished: getReaderFieldValue(reader, 'dateFinished') || null,
    rating: getReaderFieldValue(reader, 'rating') ? parseInteger(getReaderFieldValue(reader, 'rating')) : null,
    reread: getReaderFieldValue(reader, 'reread') === 'true',
    notes: getReaderFieldValue(reader, 'notes') || '',
  };
}

function buildBookPayloadFromEditForm() {
  const getValue = fieldName => document.getElementById(`edit-${fieldName}`)?.value.trim() || '';

  return {
    title: getValue('title'),
    author: getValue('author'),
    pages: parseInteger(getValue('pages')),
    total_pages: parseInteger(getValue('totalPages')),
    type: getValue('type'),
    status: getValue('status'),
    date_started: getValue('dateStarted') || null,
    date_finished: getValue('dateFinished') || null,
    rating: getValue('rating') ? parseInteger(getValue('rating')) : null,
    reread: getValue('reread') === 'true',
    notes: getValue('notes') || '',
  };
}

function setAddButtonState(reader, { disabled, label }) {
  const button = document.getElementById(`${reader}-add-btn`);
  if (!button) return;

  button.disabled = disabled;
  button.textContent = label;
}

function renderSearchStatus(message, type = 'muted') {
  const statusClassName = type === 'error' ? 'search-results-message error' : 'search-results-message';
  return `<div class="${statusClassName}">${message}</div>`;
}

function applySearchResult(reader, result) {
  const setFieldValue = (fieldName, value) => {
    const field = document.getElementById(`${reader}-${fieldName}`);
    if (field) field.value = value;
  };

  setFieldValue('title', result.title);
  setFieldValue('author', result.author);
  if (result.pages) setFieldValue('totalPages', String(result.pages));
  if (result.type) setFieldValue('type', result.type);

  const resultsDropdown = document.getElementById(`${reader}-search-results`);
  if (resultsDropdown) resultsDropdown.style.display = 'none';

  const searchInput = document.getElementById(`${reader}-search`);
  if (searchInput) searchInput.value = '';

  document.getElementById(`${reader}-title`)?.focus();
}

export async function handleSearchInput(reader) {
  const query = document.getElementById(`${reader}-search`)?.value.trim() || '';
  const resultsDropdown = document.getElementById(`${reader}-search-results`);
  const existingTimer = getSearchTimer(reader);

  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  if (!resultsDropdown) return;

  if (query.length < 2) {
    resultsDropdown.style.display = 'none';
    return;
  }

  resultsDropdown.innerHTML = renderSearchStatus('Searching...');
  resultsDropdown.style.display = 'block';

  const timerId = window.setTimeout(async () => {
    try {
      const results = await searchOpenLibrary(query);
      resultsDropdown.innerHTML = renderSearchResults(results);
      resultsDropdown.style.display = 'block';

      resultsDropdown.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('mousedown', () => {
          const resultIndex = Number(item.dataset.resultIndex);
          applySearchResult(reader, results[resultIndex]);
        });
      });
    } catch {
      resultsDropdown.innerHTML = renderSearchStatus('Search failed', 'error');
      resultsDropdown.style.display = 'block';
    }
  }, 420);

  setSearchTimer(reader, timerId);
}

export function hideSearchResults(reader) {
  window.setTimeout(() => {
    const resultsDropdown = document.getElementById(`${reader}-search-results`);
    if (resultsDropdown) resultsDropdown.style.display = 'none';
  }, 200);
}

export async function saveNewBookForReader(reader) {
  if (!(await ensureAdminAccess('add a book'))) return false;

  const bookPayload = buildBookPayloadFromReaderForm(reader);
  if (!bookPayload.title || !bookPayload.author) {
    window.alert('Title and Author are required.');
    return false;
  }

  try {
    setAddButtonState(reader, { disabled: true, label: 'Validating...' });

    const isValidBook = await validateLiterature(bookPayload.title, bookPayload.author);
    if (!isValidBook) {
      window.alert(`"${bookPayload.title}" could not be found in Open Library. Please check the title and author, or use the search bar above to find the correct book.`);
      return false;
    }

    setAddButtonState(reader, { disabled: true, label: 'Saving...' });
    await addBook(bookPayload);
    setReaderFormOpen(reader, false);
    await adminHandlers.onRefreshData();

    return true;
  } catch (error) {
    window.alert(`Save failed: ${error.message}`);
    return false;
  } finally {
    setAddButtonState(reader, { disabled: false, label: 'Add to List' });
  }
}

function renderEditFormMarkup(book) {
  return `
    <div class="edit-form-grid">
      <div class="field-group">
        <label>Title</label>
        <input type="text" id="edit-title" value="${escapeHtml(book.title)}">
      </div>
      <div class="field-group">
        <label>Author</label>
        <input type="text" id="edit-author" value="${escapeHtml(book.author || '')}">
      </div>
      <div class="field-group">
        <label>Pages Read</label>
        <input type="number" id="edit-pages" value="${book.pages || 0}" min="0">
      </div>
      <div class="field-group">
        <label>Total Pages</label>
        <input type="number" id="edit-totalPages" value="${book.total_pages || 0}" min="0">
      </div>
      <div class="field-group">
        <label>Type</label>
        <select id="edit-type">${renderSelectOptions(BOOK_TYPES, book.type)}</select>
      </div>
      <div class="field-group">
        <label>Status</label>
        <select id="edit-status">${renderSelectOptions(BOOK_STATUSES, book.status)}</select>
      </div>
      <div class="field-group">
        <label>Date Started</label>
        <input type="date" id="edit-dateStarted" value="${book.date_started || ''}">
      </div>
      <div class="field-group">
        <label>Date Finished</label>
        <input type="date" id="edit-dateFinished" value="${book.date_finished || ''}">
      </div>
      <div class="field-group">
        <label>Rating</label>
        <select id="edit-rating">${renderSelectOptions([1, 2, 3, 4, 5], Number(book.rating) || '', true)}</select>
      </div>
      <div class="field-group">
        <label>Reread?</label>
        <select id="edit-reread">
          <option value="false"${!book.reread ? ' selected' : ''}>No</option>
          <option value="true"${book.reread ? ' selected' : ''}>Yes</option>
        </select>
      </div>
      <div class="field-group full">
        <label>Notes</label>
        <input type="text" id="edit-notes" value="${escapeHtml(book.notes || '')}">
      </div>
    </div>
  `;
}

export async function openEditModal(reader, bookId) {
  if (!(await ensureAdminAccess('edit books'))) return false;

  const { booksByReader } = getAppState();
  const book = getBookById(booksByReader, reader, bookId);
  if (!book) return false;

  startEditSession(reader, bookId);
  document.getElementById('edit-form-container').innerHTML = renderEditFormMarkup(book);
  document.getElementById('edit-modal')?.classList.add('open');
  return true;
}

export function closeEditModal() {
  document.getElementById('edit-modal')?.classList.remove('open');
  clearEditSession();
}

async function saveEditChanges() {
  if (!(await ensureAdminAccess('save edits'))) return false;

  const { editSession } = getAppState();
  if (!editSession) return false;

  try {
    await updateBook(editSession.bookId, buildBookPayloadFromEditForm());
    closeEditModal();
    await adminHandlers.onRefreshData();
    return true;
  } catch (error) {
    window.alert(`Update failed: ${error.message}`);
    return false;
  }
}

async function deleteCurrentEdit() {
  if (!(await ensureAdminAccess('delete books'))) return false;

  const { editSession } = getAppState();
  if (!editSession) return false;
  if (!window.confirm('Delete this book?')) return false;

  try {
    await deleteBook(editSession.bookId);
    closeEditModal();
    await adminHandlers.onRefreshData();
    return true;
  } catch (error) {
    window.alert(`Delete failed: ${error.message}`);
    return false;
  }
}
