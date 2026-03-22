import { BOOK_TYPES, READERS } from '../utils/constants.js';
import { isThisMonth } from '../utils/dateUtils.js';
import { createEmptyBooksByReader } from '../state/appState.js';
import { requireSupabaseClient } from './supabaseClient.js';

const OPTIONAL_BOOK_METADATA_COLUMNS = ['cover_id', 'open_library_work_key', 'open_library_edition_key'];
const bookOptionalColumnSupport = Object.fromEntries(OPTIONAL_BOOK_METADATA_COLUMNS.map(column => [column, true]));

const SEED_BOOKS = [
  { reader: 'Ewan', title: 'The Hunting of The Snark', author: 'Lewis Carroll', pages: 25, total_pages: 25, type: 'Poetry', status: 'Completed', date_started: '2026-03-13', date_finished: '2026-03-13' },
  { reader: 'Ewan', title: 'Shogun', author: 'James Clavell', pages: 40, total_pages: 1299, type: 'Novel', status: 'Current', date_started: '2026-03-13', date_finished: null },
  { reader: 'Ewan', title: 'Jane Eyre', author: 'Charlotte Bronte', pages: 164, total_pages: 596, type: 'Novel', status: 'Current', date_started: '2026-03-14', date_finished: null },
  { reader: 'Ewan', title: 'Three Sunsets', author: 'Lewis Carroll', pages: 4, total_pages: 4, type: 'Poetry', status: 'Completed', date_started: '2026-03-13', date_finished: '2026-03-13' },
  { reader: 'Ewan', title: 'Treasure Island', author: 'Robert Louis Stevenson', pages: 48, total_pages: 135, type: 'Novel', status: 'Paused', date_started: '2026-02-25', date_finished: null },
  { reader: 'Isaac', title: 'Wool', author: 'Hugh Howey', pages: 320, total_pages: 584, type: 'Novel', status: 'Current', date_started: '2026-03-01', date_finished: null },
];

function hasOptionalBookMetadataFields(payload) {
  return OPTIONAL_BOOK_METADATA_COLUMNS.some(column => Boolean(payload) && Object.prototype.hasOwnProperty.call(payload, column));
}

function omitUnsupportedBookMetadata(payload) {
  if (!payload) return {};

  const sanitizedPayload = { ...payload };
  OPTIONAL_BOOK_METADATA_COLUMNS.forEach(column => {
    if (!bookOptionalColumnSupport[column]) {
      delete sanitizedPayload[column];
    }
  });

  return sanitizedPayload;
}

function getMissingBookMetadataColumn(error) {
  const message = String(error?.message || error?.details || error?.hint || '').toLowerCase();
  if (!(message.includes('column') || message.includes('schema cache') || message.includes('could not find'))) {
    return '';
  }

  return OPTIONAL_BOOK_METADATA_COLUMNS.find(column => message.includes(column)) || '';
}

async function insertBookPayload(supabaseClient, bookPayload) {
  return supabaseClient.from('books').insert(bookPayload);
}

async function updateBookPayload(supabaseClient, bookId, bookPayload) {
  return supabaseClient.from('books').update(bookPayload).eq('id', bookId);
}

export function hasBookCoverIdSupport() {
  return bookOptionalColumnSupport.cover_id;
}

export async function verifyBooksTable() {
  const supabaseClient = requireSupabaseClient();
  const { error } = await supabaseClient.from('books').select('id').limit(1);

  if (error) throw error;
}

export async function seedBooksIfEmpty() {
  const supabaseClient = requireSupabaseClient();
  const { data, error } = await supabaseClient.from('books').select('id').eq('reader', READERS[0]).limit(1);

  if (error) throw error;
  if (data?.length) return false;

  const { error: insertError } = await supabaseClient.from('books').insert(SEED_BOOKS);
  if (insertError) throw insertError;

  return true;
}

export async function fetchBooks() {
  const supabaseClient = requireSupabaseClient();
  const { data, error } = await supabaseClient.from('books').select('*').order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export function groupBooksByReader(books) {
  const booksByReader = createEmptyBooksByReader();

  for (const book of books) {
    if (booksByReader[book.reader]) {
      booksByReader[book.reader].push(book);
    }
  }

  return booksByReader;
}

export async function addBook(bookPayload) {
  const supabaseClient = requireSupabaseClient();
  let didPersistOptionalMetadata = hasOptionalBookMetadataFields(bookPayload);
  let nextPayload = { ...bookPayload };
  let { error } = await insertBookPayload(supabaseClient, nextPayload);

  while (error && hasOptionalBookMetadataFields(nextPayload)) {
    const missingColumn = getMissingBookMetadataColumn(error);
    if (!missingColumn) break;

    bookOptionalColumnSupport[missingColumn] = false;
    didPersistOptionalMetadata = false;
    nextPayload = omitUnsupportedBookMetadata(nextPayload);

    if (!Object.keys(nextPayload).length) {
      error = null;
      break;
    }

    ({ error } = await insertBookPayload(supabaseClient, nextPayload));
  }

  if (error) throw error;
  if (didPersistOptionalMetadata) {
    OPTIONAL_BOOK_METADATA_COLUMNS.forEach(column => {
      if (Object.prototype.hasOwnProperty.call(bookPayload, column)) {
        bookOptionalColumnSupport[column] = true;
      }
    });
  }

  return didPersistOptionalMetadata;
}

export async function updateBook(bookId, bookPayload) {
  const supabaseClient = requireSupabaseClient();
  let didPersistOptionalMetadata = hasOptionalBookMetadataFields(bookPayload);
  let nextPayload = { ...bookPayload };
  let { error } = await updateBookPayload(supabaseClient, bookId, nextPayload);

  while (error && hasOptionalBookMetadataFields(nextPayload)) {
    const missingColumn = getMissingBookMetadataColumn(error);
    if (!missingColumn) break;

    bookOptionalColumnSupport[missingColumn] = false;
    didPersistOptionalMetadata = false;
    nextPayload = omitUnsupportedBookMetadata(nextPayload);

    if (!Object.keys(nextPayload).length) {
      error = null;
      break;
    }

    ({ error } = await updateBookPayload(supabaseClient, bookId, nextPayload));
  }

  if (error) throw error;
  if (didPersistOptionalMetadata) {
    OPTIONAL_BOOK_METADATA_COLUMNS.forEach(column => {
      if (Object.prototype.hasOwnProperty.call(bookPayload, column)) {
        bookOptionalColumnSupport[column] = true;
      }
    });
  }

  return didPersistOptionalMetadata;
}

export async function deleteBook(bookId) {
  const supabaseClient = requireSupabaseClient();
  const { error } = await supabaseClient.from('books').delete().eq('id', bookId);

  if (error) throw error;
}

export function getBookById(booksByReader, reader, bookId) {
  return (booksByReader[reader] || []).find(book => String(book.id) === String(bookId)) || null;
}

export function getReaderStats(booksByReader, reader) {
  const books = booksByReader[reader] || [];
  const finished = books.filter(book => book.status === 'Completed');
  const current = books.filter(book => book.status === 'Current');
  const monthlyCompleted = books.filter(book => book.status === 'Completed' && isThisMonth(book.date_finished));
  const currentStartedThisMonth = books.filter(book => book.status === 'Current' && isThisMonth(book.date_started));
  const completedPages = monthlyCompleted.reduce((sum, book) => sum + (book.pages || 0), 0);
  const monthlyPages = completedPages + currentStartedThisMonth.reduce((sum, book) => sum + (book.pages || 0), 0);
  const allPages = books.reduce((sum, book) => sum + (book.pages || 0), 0);

  const byType = Object.fromEntries(
    BOOK_TYPES.map(type => [type, books.filter(book => book.type === type).length])
  );

  return {
    books,
    finished,
    current,
    monthlyCompleted,
    monthlyPages,
    allPages,
    byType,
  };
}

export function getLeaderboardStandings(booksByReader) {
  return READERS
    .map(reader => {
      const stats = getReaderStats(booksByReader, reader);

      return {
        reader,
        monthlyPages: stats.monthlyPages,
        monthlyBooks: stats.monthlyCompleted.length,
      };
    })
    .sort((a, b) => b.monthlyPages - a.monthlyPages || b.monthlyBooks - a.monthlyBooks);
}
