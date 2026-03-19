import { renderAdminToolbar } from '../../components/AdminToolbar.js';
import { renderFooter } from '../../components/Footer.js';
import { renderBookDetailModalShell, renderEditModalShell } from '../../components/Modal.js';
import { renderNavbar } from '../../components/Navbar.js';
import { DEFAULT_TAB, READERS } from '../../utils/constants.js';
import { toTabKey } from '../../utils/helpers.js';

function renderReaderTabs() {
  return READERS.map(reader => `
    <section id="tab-${toTabKey(reader)}" class="tab-content">
      <div class="user-panel" data-reader="${reader}"></div>
    </section>
  `).join('');
}

export function renderHomePage() {
  return `
    <div id="loading">Loading...</div>

    <header class="site-header">
      <h1>The Reading League</h1>
      <p class="subtitle">A Competitive Reading Tracker</p>
    </header>

    ${renderNavbar(DEFAULT_TAB)}

    <div id="admin-toolbar-region">
      ${renderAdminToolbar({ isAdmin: false })}
    </div>

    <main class="site-main">
      <section id="tab-stats" class="tab-content active">
        <div class="leaderboard">
          <h2>Monthly Standings</h2>
          <div id="leaderboard-list"></div>
        </div>
        <div class="stats-grid" id="stats-grid"></div>
      </section>

      ${renderReaderTabs()}
    </main>

    ${renderEditModalShell()}
    ${renderBookDetailModalShell()}
    ${renderFooter()}
  `;
}
