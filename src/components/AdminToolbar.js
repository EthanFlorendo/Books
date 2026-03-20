import { ADMIN_EMAIL } from '../utils/constants.js';

export function renderAdminToolbar({ isAdmin }) {
  return `
    <div class="admin-toolbar">
      <button
        class="btn btn-primary ${isAdmin ? 'is-unlocked' : ''}"
        id="admin-toggle-btn"
        type="button"
      >
        ${isAdmin ? 'Lock Editing' : 'Unlock Editing'}
      </button>
      <span id="admin-status-text">
        ${isAdmin
          ? `Signed in as ${ADMIN_EMAIL}. Editing is enabled.`
          : 'Viewing is public. Unlock to sign in and edit.'}
      </span>
    </div>
  `;
}
