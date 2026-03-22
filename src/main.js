import { bindAdminLoginEvents, ensureAdminAccess, subscribeToAuthChanges, syncAdminState, toggleAdminAccess } from './services/authService.js';
import { fetchBooks, groupBooksByReader, seedBooksIfEmpty } from './services/booksService.js';
import { backfillMissingCoverIds } from './services/coverBackfillService.js';
import { loadCachedReadingData, saveCachedReadingData } from './services/dataCacheService.js';
import { fetchPlannerEntries, groupPlannerEntriesByReader } from './services/plannerService.js';
import { initializeSupabaseClient } from './services/supabaseClient.js';
import { initializeTheme } from './services/themeService.js';
import { getAppState, setActiveTab, setBooksByReader, setPlannerByReader, setReaderSort, toggleReaderFormOpen } from './state/appState.js';
import { DEFAULT_TAB, READERS } from './utils/constants.js';
import { toTabKey } from './utils/helpers.js';
import { bindAdminShellEvents, closeEditModal, handleSearchInput, hideSearchResults, openEditModal, openPlannerEditModal, renderAdminPage, saveNewBookForReader, saveNewPlannerEntryForReader, setAdminPageHandlers } from './pages/admin/AdminPage.js';
import { bindShellModalDismissals, bindHomeNavigation, mountHomePage, setLoadingVisible, showActiveTab } from './pages/home/index.js';
import { closeBookDetailModal, renderLeaderboardPage, renderReaderPage, setLeaderboardPageHandlers } from './pages/leaderboard/LeaderboardPage.js';
import { renderReviewsPage } from './pages/reviews/ReviewsPage.js';

const VALID_TABS = new Set([DEFAULT_TAB, 'reviews', ...READERS.map(reader => toTabKey(reader))]);

function getReaderFromTab(tab) {
  return READERS.find(reader => toTabKey(reader) === tab) || null;
}

function normalizeTab(tab) {
  const normalizedTab = String(tab || '').trim().toLowerCase();
  return VALID_TABS.has(normalizedTab) ? normalizedTab : DEFAULT_TAB;
}

function getTabFromLocation() {
  return normalizeTab(window.location.hash.replace(/^#/, ''));
}

function updateLocationForTab(tab, { replace = false } = {}) {
  const url = new URL(window.location.href);
  const nextTab = normalizeTab(tab);

  url.hash = nextTab === DEFAULT_TAB ? '' : nextTab;

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) {
    return;
  }

  const historyMethod = replace ? 'replaceState' : 'pushState';
  window.history[historyMethod](window.history.state, '', nextUrl);
}

function syncTabFromLocation() {
  const nextTab = getTabFromLocation();
  if (nextTab === getAppState().activeTab) {
    return;
  }

  setActiveTab(nextTab);
  renderApp();
}

function renderApp() {
  const { activeTab } = getAppState();

  showActiveTab(activeTab);
  renderAdminPage();
  renderLeaderboardPage();
  renderReviewsPage();

  const activeReader = getReaderFromTab(activeTab);
  if (activeReader) {
    renderReaderPage(activeReader);
  }
}

function applyReadingData({ books, plannerEntries }) {
  setBooksByReader(groupBooksByReader(books));
  setPlannerByReader(groupPlannerEntriesByReader(plannerEntries));
}

function hydrateReadingDataFromCache() {
  const cachedSnapshot = loadCachedReadingData();
  if (!cachedSnapshot) {
    return false;
  }

  applyReadingData(cachedSnapshot);
  renderApp();
  setLoadingVisible(false);
  return true;
}

async function refreshBooksAndRender({ showLoading = true, notifyOnError = true } = {}) {
  try {
    if (showLoading) {
      setLoadingVisible(true);
    }

    const [books, plannerEntries] = await Promise.all([
      fetchBooks(),
      fetchPlannerEntries(),
    ]);
    applyReadingData({ books, plannerEntries });
    saveCachedReadingData({ books, plannerEntries });
    renderApp();

    if (getAppState().isAdmin) {
      void backfillMissingCoverIds()
        .then(updatedAnyEntries => {
          if (updatedAnyEntries) {
            void refreshBooksAndRender({ showLoading: false, notifyOnError: false });
          }
        })
        .catch(() => {});
    }
  } catch (error) {
    if (notifyOnError) {
      window.alert(`Could not load reading data: ${error.message}`);
    } else {
      console.error('Could not refresh reading data.', error);
    }
  } finally {
    if (showLoading) {
      setLoadingVisible(false);
    }
  }
}

function handleTabChange(tab) {
  const nextTab = normalizeTab(tab);
  if (nextTab === getAppState().activeTab) {
    return;
  }

  setActiveTab(nextTab);
  updateLocationForTab(nextTab);
  renderApp();
}

async function handleReaderFormToggle(reader) {
  const { isAdmin } = getAppState();

  if (!isAdmin) {
    const isUnlocked = await ensureAdminAccess('unlock editing');
    if (isUnlocked) {
      renderApp();
    }
    return;
  }

  toggleReaderFormOpen(reader);
  renderReaderPage(reader);
}

function handleSortChange(reader, sort) {
  setReaderSort(reader, sort);
  renderReaderPage(reader);
}

async function handleAdminToggle() {
  await toggleAdminAccess();
  renderApp();
}

async function bootstrap() {
  try {
    initializeTheme();
    const initialTab = getTabFromLocation();

    setActiveTab(initialTab);
    updateLocationForTab(initialTab, { replace: true });
    mountHomePage(document.getElementById('app'), initialTab);
    bindAdminLoginEvents();

    bindHomeNavigation(handleTabChange);
    bindShellModalDismissals({
      onCloseEditModal: closeEditModal,
      onCloseBookModal: closeBookDetailModal,
    });
    bindAdminShellEvents();
    window.addEventListener('popstate', syncTabFromLocation);
    window.addEventListener('hashchange', syncTabFromLocation);

    setAdminPageHandlers({
      onToggleAdmin: handleAdminToggle,
      onRefreshData: refreshBooksAndRender,
      onRenderApp: renderApp,
    });

    setLeaderboardPageHandlers({
      onToggleAdminForm: handleReaderFormToggle,
      onAddBook: saveNewBookForReader,
      onAddPlannerEntry: saveNewPlannerEntryForReader,
      onSearchInput: handleSearchInput,
      onHideSearch: hideSearchResults,
      onSortChange: handleSortChange,
      onEditBook: openEditModal,
      onEditPlanner: openPlannerEditModal,
    });

    initializeSupabaseClient();
    const hasCachedReadingData = hydrateReadingDataFromCache();

    const isAdmin = await syncAdminState();

    if (isAdmin) {
      await seedBooksIfEmpty();
    }

    await refreshBooksAndRender({
      showLoading: !hasCachedReadingData,
      notifyOnError: !hasCachedReadingData,
    });

    let hasSkippedInitialAuthEvent = false;
    subscribeToAuthChanges(async (_event, nextIsAdmin) => {
      if (!hasSkippedInitialAuthEvent) {
        hasSkippedInitialAuthEvent = true;
        return;
      }

      if (!nextIsAdmin) {
        closeEditModal();
      }

      try {
        if (nextIsAdmin) {
          await seedBooksIfEmpty();
        }

        await refreshBooksAndRender();
      } catch (error) {
        window.alert(`Authentication sync failed: ${error.message}`);
      }
    });
  } catch (error) {
    setLoadingVisible(false);
    window.alert(`Database connection failed: ${error.message || 'Unknown error'}`);
  }
}

bootstrap();
