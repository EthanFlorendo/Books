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
      <td class="padded">
        <strong>${escapeHtml(book.title)}</strong>
        ${book.reread ? ' <span class="reread-flag" title="Reread">R</span>' : ''}
      </td>
      <td class="padded">${escapeHtml(book.author || '')}</td>
      <td class="padded">${escapeHtml(book.type || '')}</td>
      <td class="padded">
        <span class="status-badge status-${book.status}">${escapeHtml(book.status)}</span>
      </td>
      <td class="padded">
        <div class="progress-bar"><div class="progress-fill" style="width:${completionPercent}%"></div></div>
        <span class="progress-text">${book.pages}/${book.total_pages || '?'}</span>
      </td>
      <td class="padded"><span class="stars">${formatStarsMarkup(book.rating)}</span></td>
      <td class="padded">${formatDate(book.date_started)}</td>
      <td class="padded">${formatDate(book.date_finished)}</td>
      <td class="padded">${editButtonMarkup}</td>
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
      <td class="padded"><strong>${escapeHtml(entry.title)}</strong></td>
      <td class="padded">${escapeHtml(entry.author || '')}</td>
      <td class="padded">${escapeHtml(entry.type || '')}</td>
      <td class="padded">${editButtonMarkup}</td>
    </tr>
  `;
}
