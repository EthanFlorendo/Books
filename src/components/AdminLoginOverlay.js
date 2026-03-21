export function renderAdminLoginShell() {
  return `
    <section class="admin-login-overlay" id="admin-login-overlay" aria-hidden="true">
      <div class="admin-login-shell" role="dialog" aria-modal="true" aria-labelledby="admin-login-title">
        <button class="admin-login-close" id="admin-login-close" type="button" aria-label="Close admin login">
          &times;
        </button>

        <div class="admin-login-card">
          <p class="admin-login-form-kicker">Shared Admin Login</p>
          <h3 class="admin-login-form-title" id="admin-login-title">Sign in to continue</h3>
          <p class="admin-login-form-copy" id="admin-login-copy">
            Enter the shared admin password to unlock editing.
          </p>

          <form class="admin-login-form" id="admin-login-form">
            <label class="admin-login-field" for="admin-login-password">
              <span>Password</span>
              <div class="admin-login-input-row admin-login-input-row-password">
                <input
                  id="admin-login-password"
                  type="password"
                  placeholder="Enter shared password"
                  autocomplete="current-password"
                >
                <button
                  class="admin-login-visibility"
                  id="admin-login-visibility"
                  type="button"
                  aria-label="Show password"
                  title="Show password"
                  aria-pressed="false"
                >
                  <span class="admin-login-visibility-icon admin-login-visibility-icon-hidden" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M3 3L21 21" />
                      <path d="M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42" />
                      <path d="M9.88 5.09C10.56 4.86 11.27 4.75 12 4.75C16.5 4.75 20.08 9 21 12C20.63 13.2 19.76 14.74 18.45 16.02" />
                      <path d="M14.12 18.91C13.44 19.14 12.73 19.25 12 19.25C7.5 19.25 3.92 15 3 12C3.37 10.8 4.24 9.26 5.55 7.98" />
                    </svg>
                  </span>
                  <span class="admin-login-visibility-icon admin-login-visibility-icon-visible" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none">
                      <path d="M2.75 12C3.7 8.94 7.4 4.75 12 4.75C16.6 4.75 20.3 8.94 21.25 12C20.3 15.06 16.6 19.25 12 19.25C7.4 19.25 3.7 15.06 2.75 12Z" />
                      <circle cx="12" cy="12" r="3.25" />
                    </svg>
                  </span>
                </button>
              </div>
            </label>

            <p class="admin-login-error" id="admin-login-error" role="alert" hidden></p>

            <div class="admin-login-actions">
              <button class="btn btn-danger" id="admin-login-cancel" type="button">Cancel</button>
              <button class="btn btn-primary" id="admin-login-submit" type="submit">Unlock Editing</button>
            </div>
          </form>

          <p class="admin-login-footnote">
            Viewer access stays open for everyone. Admin access only unlocks editing tools.
          </p>
        </div>
      </div>
    </section>
  `;
}
