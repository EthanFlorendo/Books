import { BOOK_STATUSES, BOOK_TYPES, SORT_OPTIONS } from '../utils/constants.js';
import { renderSelectOptions } from '../utils/helpers.js';
import { renderBookCardRow } from './BookCard.js';
import { renderSearchBar } from './SearchBar.js';

function renderAdminForm(reader) {
  return `
    ${renderSearchBar(reader)}
    <div class="form-grid">
      <div class="field-group two">
        <label>Title *</label>
        <input type="text" id="${reader}-title" placeholder="Book title">
      </div>
      <div class="field-group">
        <label>Author *</label>
        <input type="text" id="${reader}-author" placeholder="Author">
      </div>
      <div class="field-group">
        <label>Pages Read</label>
        <input type="number" id="${reader}-pages" placeholder="0" min="0">
      </div>
      <div class="field-group">
        <label>Total Pages</label>
        <input type="number" id="${reader}-totalPages" placeholder="0" min="0">
      </div>
      <div class="field-group">
        <label>Type</label>
        <select id="${reader}-type">${renderSelectOptions(BOOK_TYPES, 'Novel')}</select>
      </div>
      <div class="field-group">
        <label>Status</label>
        <select id="${reader}-status">${renderSelectOptions(BOOK_STATUSES, 'Current')}</select>
      </div>
      <div class="field-group">
        <label>Date Started</label>
        <input type="date" id="${reader}-dateStarted">
      </div>
      <div class="field-group">
        <label>Date Finished</label>
        <input type="date" id="${reader}-dateFinished">
      </div>
      <div class="field-group">
        <label>Rating</label>
        <select id="${reader}-rating">${renderSelectOptions([1, 2, 3, 4, 5], '', true)}</select>
      </div>
      <div class="field-group">
        <label>Reread?</label>
        <select id="${reader}-reread">
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </div>
      <div class="field-group two">
        <label>Notes</label>
        <input type="text" id="${reader}-notes" placeholder="Optional...">
      </div>
      <div class="full form-actions-row">
        <button class="btn btn-primary" id="${reader}-add-btn" type="button">Add to List</button>
      </div>
    </div>
  `;
}

export function renderReaderSection({ reader, stats, books, sortBy, isAdmin, isFormOpen }) {
  const tableMarkup = books.length === 0
    ? '<div class="no-books">No books recorded yet.</div>'
    : `
      <table>
        <thead>
          <tr>
            <th style="width:58px"></th>
            <th>Title</th>
            <th>Author</th>
            <th>Type</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Rating</th>
            <th>Started</th>
            <th>Finished</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${books.map(book => renderBookCardRow({ reader, book, isAdmin })).join('')}
        </tbody>
      </table>
    `;

  return `
    <div class="section-title">This Month</div>
    <div class="monthly-strip">
      <div class="monthly-cell"><div class="mc-val">${stats.monthlyCompleted.length}</div><div class="mc-lbl">Completed</div></div>
      <div class="monthly-cell"><div class="mc-val">${stats.monthlyPages}</div><div class="mc-lbl">Pages Read</div></div>
      <div class="monthly-cell"><div class="mc-val">${stats.finished.length}</div><div class="mc-lbl">Total Finished</div></div>
      <div class="monthly-cell"><div class="mc-val">${stats.books.length}</div><div class="mc-lbl">Total Books</div></div>
    </div>

    ${isAdmin ? `
      <div class="add-form-toggle ${isFormOpen ? 'open' : ''}" id="${reader}-toggle">
        <span>Add a Book</span>
        <span class="toggle-arrow">Open</span>
      </div>
      <div class="add-form-body ${isFormOpen ? 'open' : ''}" id="${reader}-form-body">
        ${renderAdminForm(reader)}
      </div>
    ` : ''}

    <div class="section-title">Reading List</div>
    <div class="list-toolbar">
      <label class="sort-control" for="${reader}-sort">
        <span>Sort By</span>
        <select id="${reader}-sort">
          ${SORT_OPTIONS.map(option => `
            <option value="${option.value}" ${sortBy === option.value ? 'selected' : ''}>${option.label}</option>
          `).join('')}
        </select>
      </label>
    </div>

    <div class="book-table-wrap">
      ${tableMarkup}
    </div>
  `;
}
