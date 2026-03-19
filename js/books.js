import { state } from './state.js';
import { esc } from './utils.js';
import { loadAll } from './data.js';
import { validateLiterature } from './openLibrary.js';
import { canEditBook, canEditUser } from './auth.js';

export async function addBook(user) {
  if (!state.sb) {
    alert('Not connected to database.');
    return;
  }

  if (!canEditUser(user)) {
    alert('You do not have permission to add books for this reader.');
    return;
  }

  const getValue = id => document.getElementById(`${user}-${id}`)?.value.trim();
  const title = getValue('title');
  const author = getValue('author');

  if (!title || !author) {
    alert('Title and Author are required.');
    return;
  }

  const button = document.getElementById(`${user}-add-btn`);
  button.disabled = true;
  button.textContent = 'Validating…';

  const isReal = await validateLiterature(title, author);
  if (!isReal) {
    button.disabled = false;
    button.textContent = 'Add to List';
    alert(`"${title}" could not be found in Open Library. Please check the title and author, or use the search bar above to find the correct book.`);
    return;
  }

  button.textContent = 'Saving…';

  const { error } = await state.sb.from('books').insert({
    reader: user,
    title,
    author,
    pages: parseInt(getValue('pages'), 10) || 0,
    total_pages: parseInt(getValue('totalPages'), 10) || 0,
    type: getValue('type') || 'Novel',
    status: getValue('status') || 'Current',
    date_started: getValue('dateStarted') || null,
    date_finished: getValue('dateFinished') || null,
    rating: getValue('rating') ? parseInt(getValue('rating'), 10) : null,
    reread: getValue('reread') === 'true',
    notes: getValue('notes') || '',
  });

  button.disabled = false;
  button.textContent = 'Add to List';

  if (error) {
    alert(`Save failed: ${error.message}`);
    return;
  }

  state.selectedCover[user] = null;
  await loadAll();
}

export function openEdit(user, bookId) {
  const book = (state.db[user] || []).find(item => item.id === bookId);
  if (!book) return;
  if (!canEditBook(book)) {
    alert('You do not have permission to edit this book.');
    return;
  }

  state.editCtx = { user, bookId };
  document.getElementById('edit-form-container').innerHTML = `
    <div class="add-form" style="border:none;padding:0;background:none;">
      <div class="field-group"><label>Title</label><input type="text" id="edit-title" value="${esc(book.title)}"></div>
      <div class="field-group"><label>Author</label><input type="text" id="edit-author" value="${esc(book.author || '')}"></div>
      <div class="field-group"><label>Pages Read</label><input type="number" id="edit-pages" value="${book.pages || 0}"></div>
      <div class="field-group"><label>Total Pages</label><input type="number" id="edit-totalPages" value="${book.total_pages || 0}"></div>
      <div class="field-group"><label>Type</label><select id="edit-type">${['Novel','Short Story','Poetry','Play'].map(type => `<option${book.type === type ? ' selected' : ''}>${type}</option>`).join('')}</select></div>
      <div class="field-group"><label>Status</label><select id="edit-status">${['Current','Completed','Paused'].map(status => `<option${book.status === status ? ' selected' : ''}>${status}</option>`).join('')}</select></div>
      <div class="field-group"><label>Date Started</label><input type="date" id="edit-dateStarted" value="${book.date_started || ''}"></div>
      <div class="field-group"><label>Date Finished</label><input type="date" id="edit-dateFinished" value="${book.date_finished || ''}"></div>
      <div class="field-group"><label>Rating</label><select id="edit-rating"><option value="">—</option>${[1,2,3,4,5].map(n => `<option${+book.rating === n ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="field-group"><label>Reread?</label><select id="edit-reread"><option value="false"${!book.reread ? ' selected' : ''}>No</option><option value="true"${book.reread ? ' selected' : ''}>Yes</option></select></div>
      <div class="field-group full"><label>Notes</label><input type="text" id="edit-notes" value="${esc(book.notes || '')}"></div>
    </div>`;

  document.getElementById('edit-modal').classList.add('open');
}

export async function saveEdit() {
  if (!state.editCtx || !state.sb) return;
  const book = (state.db[state.editCtx.user] || []).find(item => item.id === state.editCtx.bookId);
  if (!canEditBook(book)) {
    alert('You do not have permission to update this book.');
    return;
  }

  const getValue = id => document.getElementById(`edit-${id}`)?.value.trim();
  const { error } = await state.sb.from('books').update({
    title: getValue('title'),
    author: getValue('author'),
    pages: parseInt(getValue('pages'), 10) || 0,
    total_pages: parseInt(getValue('totalPages'), 10) || 0,
    type: getValue('type'),
    status: getValue('status'),
    date_started: getValue('dateStarted') || null,
    date_finished: getValue('dateFinished') || null,
    rating: getValue('rating') ? parseInt(getValue('rating'), 10) : null,
    reread: getValue('reread') === 'true',
    notes: getValue('notes') || '',
  }).eq('id', state.editCtx.bookId);

  if (error) {
    alert(`Update failed: ${error.message}`);
    return;
  }

  closeEditModal();
  await loadAll();
}

export async function deleteEdit() {
  if (!state.editCtx || !state.sb) return;
  const book = (state.db[state.editCtx.user] || []).find(item => item.id === state.editCtx.bookId);
  if (!canEditBook(book)) {
    alert('You do not have permission to delete this book.');
    return;
  }
  if (!confirm('Delete this book?')) return;

  const { error } = await state.sb.from('books').delete().eq('id', state.editCtx.bookId);
  if (error) {
    alert(`Delete failed: ${error.message}`);
    return;
  }

  closeEditModal();
  await loadAll();
}

export function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
  state.editCtx = null;
}
