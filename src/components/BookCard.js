import { formatDate } from '../utils/dateUtils.js';
import { createCoverUrl } from '../services/openLibraryService.js';
import { escapeHtml, formatTenPointRating, hasRating } from '../utils/helpers.js';

function renderStaticCoverPlaceholder(style = '') {
  return `<div class="book-cover-placeholder"${style ? ` style="${style}"` : ''}>Book</div>`;
}

function renderCoverPlaceholder({ title, author = '', entryId, entryKind }) {
  return `
    <div
      class="book-cover-placeholder"
      data-cover-title="${escapeHtml(title)}"
      data-cover-author="${escapeHtml(author)}"
      data-entry-id="${escapeHtml(String(entryId ?? ''))}"
      data-entry-kind="${escapeHtml(entryKind)}"
    >Book</div>
  `;
}

function renderCoverMarkup({ title, author = '', coverId, entryId, entryKind }) {
  if (!coverId) {
    return renderCoverPlaceholder({ title, author, entryId, entryKind });
  }

  return `
    <img
      class="book-cover"
      src="${escapeHtml(createCoverUrl(coverId, 'M'))}"
      alt=""
      loading="lazy"
      decoding="async"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
    >
    ${renderStaticCoverPlaceholder('display:none')}
  `;
}

function renderMobileMeta(items) {
  const visibleItems = items.filter(Boolean);

  if (visibleItems.length === 0) return '';

  return `<span class="mobile-meta">${visibleItems.join('')}</span>`;
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
        ${renderCoverMarkup({
          title: book.title,
          author: book.author,
          coverId: book.cover_id,
          entryId: book.id,
          entryKind: 'book',
        })}
      </td>
      <td class="padded title-cell" data-label="Title">
        <strong>${escapeHtml(book.title)}</strong>
        ${book.reread ? ' <span class="reread-flag" title="Reread">R</span>' : ''}
        ${renderMobileMeta([
          book.author ? `<span class="mobile-meta-item">${escapeHtml(book.author)}</span>` : '',
          book.type ? `<span class="mobile-meta-item">${escapeHtml(book.type)}</span>` : '',
          hasRating(book.rating) ? `<span class="mobile-meta-item mobile-meta-rating">${formatTenPointRating(book.rating)}</span>` : '',
          book.date_finished
            ? `<span class="mobile-meta-item">${formatDate(book.date_finished)}</span>`
            : book.date_started
              ? `<span class="mobile-meta-item">${formatDate(book.date_started)}</span>`
              : '',
        ])}
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
      <td class="padded rating-cell" data-label="Rating"><span class="rating-value">${formatTenPointRating(book.rating)}</span></td>
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
        ${renderCoverMarkup({
          title: entry.title,
          author: entry.author,
          coverId: entry.cover_id,
          entryId: entry.id,
          entryKind: 'planner',
        })}
      </td>
      <td class="padded title-cell" data-label="Title">
        <strong>${escapeHtml(entry.title)}</strong>
        ${renderMobileMeta([
          entry.author ? `<span class="mobile-meta-item">${escapeHtml(entry.author)}</span>` : '',
          entry.type ? `<span class="mobile-meta-item">${escapeHtml(entry.type)}</span>` : '',
        ])}
      </td>
      <td class="padded author-cell" data-label="Author">${escapeHtml(entry.author || '')}</td>
      <td class="padded type-cell" data-label="Type">${escapeHtml(entry.type || '')}</td>
      <td class="padded actions-cell">${editButtonMarkup}</td>
    </tr>
  `;
}
