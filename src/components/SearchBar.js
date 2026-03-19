import { escapeHtml } from '../utils/helpers.js';

export function renderSearchBar(reader) {
  return `
    <div class="search-wrap">
      <span class="search-icon">Find</span>
      <input
        type="text"
        id="${reader}-search"
        placeholder="Search by title or author to autofill..."
        autocomplete="off"
      >
      <div class="search-results" id="${reader}-search-results" style="display:none"></div>
    </div>
    <div class="search-hint">Type to search Open Library and click a result to autofill the fields below</div>
  `;
}

export function renderSearchResults(results) {
  if (!results.length) {
    return '<div class="search-results-message">No results found</div>';
  }

  return results.map((result, index) => {
    const coverHtml = result.coverUrl
      ? `<img class="sri-cover" src="${escapeHtml(result.coverUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="sri-cover-placeholder" style="display:none">Book</div>`
      : '<div class="sri-cover-placeholder">Book</div>';

    const metaText = [result.pages ? `${result.pages} pages` : '', result.year].filter(Boolean).join(' | ');

    return `
      <div class="search-result-item" data-result-index="${index}">
        ${coverHtml}
        <div class="sri-info">
          <div class="sri-title">${escapeHtml(result.title)}</div>
          <div class="sri-author">${escapeHtml(result.author)}</div>
          ${metaText ? `<div class="sri-meta">${escapeHtml(metaText)}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}
