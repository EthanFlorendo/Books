import { DEFAULT_SORT, DEFAULT_TAB, READERS } from '../utils/constants.js';

export function createEmptyBooksByReader() {
  return Object.fromEntries(READERS.map(reader => [reader, []]));
}

function createDefaultReaderMap(defaultValueFactory) {
  return Object.fromEntries(READERS.map(reader => [reader, defaultValueFactory(reader)]));
}

const appState = {
  supabaseClient: null,
  booksByReader: createEmptyBooksByReader(),
  isAdmin: false,
  activeTab: DEFAULT_TAB,
  readerSorts: createDefaultReaderMap(() => DEFAULT_SORT),
  readerFormOpen: createDefaultReaderMap(() => false),
  searchTimers: {},
  editSession: null,
};

export function getAppState() {
  return appState;
}

export function setSupabaseClient(client) {
  appState.supabaseClient = client;
  return client;
}

export function getSupabaseClient() {
  return appState.supabaseClient;
}

export function setBooksByReader(booksByReader) {
  appState.booksByReader = booksByReader;
}

export function setAdminStatus(isAdmin) {
  appState.isAdmin = Boolean(isAdmin);
}

export function setActiveTab(tab) {
  appState.activeTab = tab;
}

export function setReaderSort(reader, sort) {
  appState.readerSorts[reader] = sort;
}

export function setReaderFormOpen(reader, isOpen) {
  appState.readerFormOpen[reader] = Boolean(isOpen);
}

export function toggleReaderFormOpen(reader) {
  appState.readerFormOpen[reader] = !appState.readerFormOpen[reader];
}

export function setSearchTimer(reader, timerId) {
  appState.searchTimers[reader] = timerId;
}

export function getSearchTimer(reader) {
  return appState.searchTimers[reader];
}

export function startEditSession(reader, bookId) {
  appState.editSession = { reader, bookId };
}

export function clearEditSession() {
  appState.editSession = null;
}
