import { READERS } from '../utils/constants.js';
import { toTabKey } from '../utils/helpers.js';

function renderNavButton(label, tabKey, isActive) {
  return `<button class="${isActive ? 'active' : ''}" data-tab="${tabKey}" type="button">${label}</button>`;
}

export function renderNavbar(activeTab) {
  const readerButtons = READERS
    .map(reader => renderNavButton(reader, toTabKey(reader), activeTab === toTabKey(reader)))
    .join('');

  return `
    <nav id="main-nav">
      ${renderNavButton('League Table', 'stats', activeTab === 'stats')}
      ${readerButtons}
    </nav>
  `;
}
