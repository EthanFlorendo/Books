export function renderAdminToolbar({ isAdmin }) {
  return `
    <div class="admin-toolbar">
      <button
        class="btn btn-primary ${isAdmin ? 'is-unlocked' : ''}"
        id="admin-toggle-btn"
        type="button"
      >
        ${isAdmin ? 'Log Out' : 'Login'}
      </button>
    </div>
  `;
}
