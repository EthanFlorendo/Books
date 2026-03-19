import { initializeDatabase, loadAll, seedIfEmpty } from './data.js';
import { bindAuthStateListener, syncAdminState, toggleAdminAccess, updateAdminUi } from './auth.js';
import { closeEditModal, deleteEdit, saveEdit } from './books.js';
import { closeBookModal, renderAll, renderUserTab } from './ui.js';

function bindGlobalEvents() {
  document.getElementById('save-edit-btn').addEventListener('click', saveEdit);
  document.getElementById('delete-edit-btn').addEventListener('click', deleteEdit);
  document.getElementById('close-edit').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal').addEventListener('click', event => {
    if (event.target === event.currentTarget) closeEditModal();
  });

  document.getElementById('close-book-modal').addEventListener('click', closeBookModal);
  document.getElementById('book-detail-modal').addEventListener('click', event => {
    if (event.target === event.currentTarget) closeBookModal();
  });

  document.getElementById('admin-toggle-btn').addEventListener('click', async () => {
    await toggleAdminAccess();
    renderAll();
  });

  document.querySelectorAll('#main-nav button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#main-nav button').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

      button.classList.add('active');
      const tab = button.dataset.tab;
      document.getElementById(`tab-${tab}`).classList.add('active');

      if (tab !== 'stats') {
        renderUserTab(tab.charAt(0).toUpperCase() + tab.slice(1));
      }
    });
  });
}

async function bootstrap() {
  try {
    await initializeDatabase();
    bindAuthStateListener(async isAdmin => {
      if (isAdmin) await seedIfEmpty();
      await loadAll();
      renderAll();
    });
    await syncAdminState();
    await seedIfEmpty();
    await loadAll();
    updateAdminUi();
    bindGlobalEvents();
  } catch (error) {
    document.getElementById('loading').classList.remove('show');
    alert(`Database connection failed: ${error.message || 'Unknown error'}`);
  }
}

renderAll();
updateAdminUi();
bootstrap();
