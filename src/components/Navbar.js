import { READERS } from '../utils/constants.js';
import { toTabKey } from '../utils/helpers.js';

function renderNavButton(label, tabKey, isActive, variant = 'reader') {
  const className = ['nav-tab-button', `nav-tab-button-${variant}`, isActive ? 'active' : '']
    .filter(Boolean)
    .join(' ');

  return `
    <button class="${className}" data-tab="${tabKey}" type="button">
      <span class="nav-button-label">${label}</span>
    </button>
  `;
}

export function renderNavbar(activeTab) {
  const readerButtons = READERS
    .map(reader => renderNavButton(reader, toTabKey(reader), activeTab === toTabKey(reader)))
    .join('');

  return `
    <nav id="main-nav" aria-label="Primary">
      <div class="nav-primary-row">
        <div class="nav-group nav-group-primary">
          ${renderNavButton('Overview', 'stats', activeTab === 'stats', 'primary')}
          ${renderNavButton('Reviews', 'reviews', activeTab === 'reviews', 'primary')}
        </div>
        <div class="nav-group nav-group-admin" id="nav-admin-dock"></div>
      </div>
      <div class="nav-group nav-group-readers" aria-label="Readers">
        ${readerButtons}
      </div>
    </nav>
  `;
}
