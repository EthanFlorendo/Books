import { DEFAULT_TAB } from '../../utils/constants.js';
import { toTabKey } from '../../utils/helpers.js';
import { renderHomePage } from './HomePage.js';

export function mountHomePage(rootElement) {
  rootElement.innerHTML = renderHomePage();
  bindAdminDocking();
  showActiveTab(DEFAULT_TAB);
}

export function bindHomeNavigation(onTabChange) {
  document.querySelectorAll('#main-nav button[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      if (typeof onTabChange === 'function') {
        onTabChange(button.dataset.tab);
      }
    });
  });
}

export function bindShellModalDismissals({ onCloseEditModal, onCloseBookModal }) {
  const editModal = document.getElementById('edit-modal');
  const bookDetailModal = document.getElementById('book-detail-modal');

  document.getElementById('close-edit')?.addEventListener('click', onCloseEditModal);
  document.getElementById('close-book-modal')?.addEventListener('click', onCloseBookModal);

  editModal?.addEventListener('click', event => {
    if (event.target === event.currentTarget && typeof onCloseEditModal === 'function') {
      onCloseEditModal();
    }
  });

  bookDetailModal?.addEventListener('click', event => {
    if (event.target === event.currentTarget && typeof onCloseBookModal === 'function') {
      onCloseBookModal();
    }
  });
}

export function showActiveTab(tab) {
  document.querySelectorAll('#main-nav button[data-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });

  document.querySelectorAll('.tab-content').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tab}`);
  });
}

export function setLoadingVisible(isVisible) {
  document.getElementById('loading')?.classList.toggle('show', Boolean(isVisible));
}

export function getReaderPanel(reader) {
  return document.querySelector(`#tab-${toTabKey(reader)} .user-panel`);
}

function bindAdminDocking() {
  const nav = document.getElementById('main-nav');
  const homeDock = document.getElementById('nav-admin-home');
  const navDock = document.getElementById('nav-admin-dock');
  const adminRegion = document.getElementById('nav-admin-region');

  if (!nav || !homeDock || !navDock || !adminRegion) {
    return;
  }

  const getStickyTop = () => {
    const stickyTop = Number.parseFloat(window.getComputedStyle(nav).top);
    return Number.isFinite(stickyTop) ? stickyTop : 0;
  };

  const syncAdminDock = () => {
    const navRect = nav.getBoundingClientRect();
    const isDockedInNav = window.scrollY > 0 && navRect.top <= getStickyTop() + 1;
    const targetDock = isDockedInNav ? navDock : homeDock;

    if (adminRegion.parentElement !== targetDock) {
      targetDock.appendChild(adminRegion);
    }

    nav.classList.toggle('is-admin-docked', isDockedInNav);
    adminRegion.classList.toggle('is-in-nav', isDockedInNav);
  };

  syncAdminDock();
  window.addEventListener('scroll', syncAdminDock, { passive: true });
  window.addEventListener('resize', syncAdminDock);
}
