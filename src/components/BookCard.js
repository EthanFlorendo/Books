import { formatDate } from '../utils/dateUtils.js';
import { escapeHtml, formatStarsMarkup } from '../utils/helpers.js';

function renderCoverPlaceholder(title) {
  return `<div class="book-cover-placeholder" data-fetch="${escapeHtml(title)}">Book</div>`;
}

export function renderBookCardRow({ reader, book, isAdmin }) {
  const completionPercent = book.total_pages > 0
    ? Math.min(100, Math.round((book.pages / book.total_pages) * 100))
    : 0;

  const editButtonMarkup = isAdmin
    ? `<button class="btn btn-danger" data-edit-book="${book.id}" data-reader="${reader}" type="button">Edit</button>`
    : '';

  return `
    <tr class="clickable-row" data-book-row data-reader="${reader}" data-book-id="${book.id}">
      <td class="cover-cell">
        ${renderCoverPlaceholder(book.title)}
      </td>
      <td class="padded title-cell" data-label="Title">
        <strong>${escapeHtml(book.title)}</strong>
        ${book.reread ? ' <span class="reread-flag" title="Reread">R</span>' : ''}
      </td>
      <td class="padded author-cell" data-label="Author">${escapeHtml(book.author || '')}</td>
      <td class="padded type-cell" data-label="Type">${escapeHtml(book.type || '')}</td>
      <td class="padded status-cell" data-label="Status">
        <span class="status-badge status-${book.status}">${escapeHtml(book.status)}</span>
      </td>
      <td class="padded progress-cell" data-label="Progress">
        <div class="progress-bar"><div class="progress-fill" style="width:${completionPercent}%"></div></div>
        <span class="progress-text">${book.pages}/${book.total_pages || '?'}</span>
      </td>
      <td class="padded rating-cell" data-label="Rating"><span class="stars">${formatStarsMarkup(book.rating)}</span></td>
      <td class="padded started-cell" data-label="Started">${formatDate(book.date_started)}</td>
      <td class="padded finished-cell" data-label="Finished">${formatDate(book.date_finished)}</td>
      <td class="padded actions-cell">${editButtonMarkup}</td>
    </tr>
  `;
}

export function renderPlannerCardRow({ reader, entry, isAdmin }) {
  const editButtonMarkup = isAdmin
    ? `<button class="btn btn-danger" data-edit-plan="${entry.id}" data-reader="${reader}" type="button">Edit</button>`
    : '';

  return `
    <tr class="clickable-row" data-planner-row data-reader="${reader}" data-plan-id="${entry.id}">
      <td class="cover-cell">
        ${renderCoverPlaceholder(entry.title)}
      </td>
      <td class="padded title-cell" data-label="Title"><strong>${escapeHtml(entry.title)}</strong></td>
      <td class="padded author-cell" data-label="Author">${escapeHtml(entry.author || '')}</td>
      <td class="padded type-cell" data-label="Type">${escapeHtml(entry.type || '')}</td>
      <td class="padded actions-cell">${editButtonMarkup}</td>
    </tr>
  `;
}
