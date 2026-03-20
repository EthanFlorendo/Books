import { ADMIN_EMAIL } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';

export function renderAdminToolbar({ isAdmin }) {
  const statusText = isAdmin
    ? `Signed in as ${ADMIN_EMAIL}. Click to log out and lock editing.`
    : 'Log in to unlock editing.';

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
  `;
}
