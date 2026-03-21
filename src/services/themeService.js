const THEME_STORAGE_KEY = 'bl-theme';
const LIGHT_THEME = 'light';
const DARK_THEME = 'dark';

function isValidTheme(theme) {
  return theme === LIGHT_THEME || theme === DARK_THEME;
}

function getStoredTheme() {
  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(storedTheme) ? storedTheme : null;
  } catch {
    return null;
  }
}

function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
}

export function getCurrentTheme() {
  return document.body?.dataset.theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
}

export function isDarkTheme() {
  return getCurrentTheme() === DARK_THEME;
}

export function applyTheme(theme) {
  const nextTheme = isValidTheme(theme) ? theme : LIGHT_THEME;

  if (document.body) {
    document.body.dataset.theme = nextTheme;
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  } catch {
    // Ignore storage failures and keep the in-memory theme.
  }

  return nextTheme;
}

export function initializeTheme() {
  return applyTheme(getStoredTheme() || getSystemTheme());
}

export function toggleTheme() {
  return applyTheme(isDarkTheme() ? LIGHT_THEME : DARK_THEME);
}
