import { renderBookDetailModalShell, renderEditModalShell } from '../../components/Modal.js';
import { renderAdminLoginShell } from '../../components/AdminLoginOverlay.js';
import { renderNavbar } from '../../components/Navbar.js';
import { renderReviewsSection } from '../reviews/ReviewsPage.js';
import { DEFAULT_TAB, READERS } from '../../utils/constants.js';
import { toTabKey } from '../../utils/helpers.js';

function getTabContentClass(tabKey, activeTab) {
  return `tab-content${activeTab === tabKey ? ' active' : ''}`;
}

function renderReaderTabs(activeTab) {
  return READERS.map(reader => `
    <section id="tab-${toTabKey(reader)}" class="${getTabContentClass(toTabKey(reader), activeTab)}">
      <div class="user-panel" data-reader="${reader}"></div>
    </section>
  `).join('');
}

export function renderHomePage(activeTab = DEFAULT_TAB) {
  return `
    <header class="site-header">
      <div id="nav-admin-home" class="site-header-admin-slot">
        <div id="nav-admin-region" class="site-header-admin" aria-live="polite"></div>
      </div>
      <div class="site-header-copy">
        <p class="site-kicker">Shared Reading Tracker</p>
        <h1 class="site-title">Reading Dashboard</h1>
        <p class="subtitle">Track monthly activity, current books, and reading plans in one place.</p>
      </div>
    </header>

    ${renderNavbar(activeTab)}

    <main class="site-main">
      <section id="tab-stats" class="${getTabContentClass('stats', activeTab)}">
        <div class="leaderboard">
          <h2>Monthly Activity</h2>
          <div id="leaderboard-list"></div>
        </div>
        <div class="stats-grid" id="stats-grid"></div>
      </section>

      ${renderReviewsSection(activeTab)}

      ${renderReaderTabs(activeTab)}
    </main>

    ${renderEditModalShell()}
    ${renderBookDetailModalShell()}
    ${renderAdminLoginShell()}
  `;
}
