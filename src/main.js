import { ensureAdminAccess, subscribeToAuthChanges, syncAdminState, toggleAdminAccess } from './services/authService.js';
import { fetchBooks, groupBooksByReader, seedBooksIfEmpty, verifyBooksTable } from './services/booksService.js';
import { initializeSupabaseClient } from './services/supabaseClient.js';
import { getAppState, setActiveTab, setBooksByReader, setReaderSort, toggleReaderFormOpen } from './state/appState.js';
import { DEFAULT_TAB, READERS } from './utils/constants.js';
import { toTabKey } from './utils/helpers.js';
import { bindAdminShellEvents, closeEditModal, handleSearchInput, hideSearchResults, openEditModal, renderAdminPage, saveNewBookForReader, setAdminPageHandlers } from './pages/admin/AdminPage.js';
import { bindShellModalDismissals, bindHomeNavigation, mountHomePage, setLoadingVisible, showActiveTab } from './pages/home/index.js';
import { closeBookDetailModal, renderLeaderboardPage, renderReaderPage, setLeaderboardPageHandlers } from './pages/leaderboard/LeaderboardPage.js';

function getReaderFromTab(tab) {
  return READERS.find(reader => toTabKey(reader) === tab) || null;
}

function renderApp() {
  const { activeTab } = getAppState();

  showActiveTab(activeTab);
  renderAdminPage();
  renderLeaderboardPage();

  const activeReader = getReaderFromTab(activeTab);
  if (activeReader) {
    renderReaderPage(activeReader);
  }
}

async function refreshBooksAndRender() {
  try {
    setLoadingVisible(true);
    const books = await fetchBooks();
    setBooksByReader(groupBooksByReader(books));
    renderApp();
  } catch (error) {
    window.alert(`Could not load books: ${error.message}`);
  } finally {
    setLoadingVisible(false);
  }
}

function handleTabChange(tab) {
  setActiveTab(tab);
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
    mountHomePage(document.getElementById('app'));

    bindHomeNavigation(handleTabChange);
    bindShellModalDismissals({
      onCloseEditModal: closeEditModal,
      onCloseBookModal: closeBookDetailModal,
    });
    bindAdminShellEvents();

    setAdminPageHandlers({
      onToggleAdmin: handleAdminToggle,
      onRefreshData: refreshBooksAndRender,
      onRenderApp: renderApp,
    });

    setLeaderboardPageHandlers({
      onToggleAdminForm: handleReaderFormToggle,
      onAddBook: saveNewBookForReader,
      onSearchInput: handleSearchInput,
      onHideSearch: hideSearchResults,
      onSortChange: handleSortChange,
      onEditBook: openEditModal,
    });

    renderApp();
    initializeSupabaseClient();
    await verifyBooksTable();

    subscribeToAuthChanges(async isAdmin => {
      if (!isAdmin) {
        closeEditModal();
      }

      try {
        if (isAdmin) {
          await seedBooksIfEmpty();
        }

        await refreshBooksAndRender();
      } catch (error) {
        window.alert(`Authentication sync failed: ${error.message}`);
      }
    });

    await syncAdminState();

    if (getAppState().isAdmin) {
      await seedBooksIfEmpty();
    }

    await refreshBooksAndRender();
  } catch (error) {
    setLoadingVisible(false);
    window.alert(`Database connection failed: ${error.message || 'Unknown error'}`);
  }
}

setActiveTab(DEFAULT_TAB);
bootstrap();
