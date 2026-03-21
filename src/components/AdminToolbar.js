import { ADMIN_EMAIL } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';

export function renderAdminToolbar({ isAdmin, isDarkMode }) {
  const statusText = isAdmin
    ? `Signed in as ${ADMIN_EMAIL}. Click to log out and lock editing.`
    : 'Log in to unlock editing.';
  const themeText = isDarkMode
    ? 'Switch to light mode.'
    : 'Switch to dark mode.';

  return `
    <button
      class="nav-admin-button ${isAdmin ? 'is-unlocked' : ''}"
      id="admin-toggle-btn"
      aria-label="${escapeHtml(statusText)}"
      title="${escapeHtml(statusText)}"
      type="button"
    >
      ${isAdmin ? 'Logout' : 'Login'}
    </button>
    <button
      class="nav-admin-button ${isDarkMode ? 'is-theme-active' : ''}"
      id="theme-toggle-btn"
      aria-label="${escapeHtml(themeText)}"
      title="${escapeHtml(themeText)}"
      type="button"
    >
      ${isDarkMode ? 'Light Mode' : 'Dark Mode'}
    </button>
  `;
}
