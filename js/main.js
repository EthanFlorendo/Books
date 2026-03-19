import { initializeDatabase, loadAll, seedIfEmpty } from './data.js';
import { closeEditModal, deleteEdit, saveEdit } from './books.js';
import { closeBookModal, renderAll, renderUserTab } from './ui.js';
import { restoreSession, signIn, signOut, subscribeToAuthChanges } from './auth.js';
import { state } from './state.js';

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

  document.getElementById('auth-login-btn').addEventListener('click', handleSignIn);
  document.getElementById('auth-logout-btn').addEventListener('click', handleSignOut);
}

async function handleSignIn() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) {
    alert('Enter your email and password to sign in.');
    return;
  }

  const button = document.getElementById('auth-login-btn');
  button.disabled = true;
  button.textContent = 'Signing In...';

  try {
    await signIn(email, password);
    await loadAll();
  } catch (error) {
    alert(`Sign-in failed: ${error.message || 'Unknown error'}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Sign In';
  }
}

async function handleSignOut() {
  try {
    await signOut();
    closeEditModal();
    await loadAll();
  } catch (error) {
    alert(`Sign-out failed: ${error.message || 'Unknown error'}`);
  }
}

async function bootstrap() {
  try {
    await initializeDatabase();
    await restoreSession();
    if (state.access?.role === 'admin') {
      await seedIfEmpty();
    }
    await loadAll();
    bindGlobalEvents();
    state.authCleanup = subscribeToAuthChanges(async () => {
      closeEditModal();
      await loadAll();
    });
  } catch (error) {
    document.getElementById('loading').classList.remove('show');
    alert(`Database connection failed: ${error.message || 'Unknown error'}`);
  }
}

renderAll();
bootstrap();
