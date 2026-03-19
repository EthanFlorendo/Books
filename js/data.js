import { SHEETS_URL, USERS } from './config.js';
import { state } from './state.js';
import { showLoading, isThisMonth } from './utils.js';
import { renderAll } from './ui.js';

export async function initializeDatabase() {
  state.sb = window.supabase.createClient(
    'https://rbtjqlsgfflavrppufbd.supabase.co',
    'sb_publishable_heqwqMywY-SgbI2zoFGwLQ_DCp7zDrJ',
    { auth: { persistSession: false } }
  );

  const { error } = await state.sb.from('books').select('id').limit(1);
  if (error) throw error;
}

export async function seedIfEmpty() {
  const { data } = await state.sb.from('books').select('id').eq('reader', 'Ewan').limit(1);
  if (data?.length) return;

  await state.sb.from('books').insert([
    { reader:'Ewan', title:'The Hunting of The Snark', author:'Lewis Carroll', pages:25, total_pages:25, type:'Poetry', status:'Completed', date_started:'2026-03-13', date_finished:'2026-03-13' },
    { reader:'Ewan', title:'Shogun', author:'James Clavell', pages:40, total_pages:1299, type:'Novel', status:'Current', date_started:'2026-03-13', date_finished:null },
    { reader:'Ewan', title:'Jane Eyre', author:'Charlotte Bronte', pages:164, total_pages:596, type:'Novel', status:'Current', date_started:'2026-03-14', date_finished:null },
    { reader:'Ewan', title:'Three Sunsets', author:'Lewis Carroll', pages:4, total_pages:4, type:'Poetry', status:'Completed', date_started:'2026-03-13', date_finished:'2026-03-13' },
    { reader:'Ewan', title:'Treasure Island', author:'Robert Louis Stevenson', pages:48, total_pages:135, type:'Novel', status:'Paused', date_started:'2026-02-25', date_finished:null },
    { reader:'Isaac', title:'Wool', author:'Hugh Howey', pages:320, total_pages:584, type:'Novel', status:'Current', date_started:'2026-03-01', date_finished:null },
  ]);
}

export async function loadAll() {
  if (!state.sb) return;

  showLoading(true);
  const { data, error } = await state.sb.from('books').select('*').order('created_at', { ascending: false });
  showLoading(false);

  if (error) {
    console.error(error);
    return;
  }

  state.db = Object.fromEntries(USERS.map(user => [user, []]));
  (data || []).forEach(book => {
    if (state.db[book.reader]) state.db[book.reader].push(book);
  });

  renderAll();
  clearTimeout(state.syncTimer);
  state.syncTimer = setTimeout(syncToSheets, 1500);
}

export function userStats(user) {
  const books = state.db[user] || [];
  const finished = books.filter(book => book.status === 'Completed');
  const current = books.filter(book => book.status === 'Current');
  const monthlyCompleted = books.filter(book => book.status === 'Completed' && isThisMonth(book.date_finished));
  const completedPages = monthlyCompleted.reduce((sum, book) => sum + (book.pages || 0), 0);
  const currentThisMonth = books.filter(book => book.status === 'Current' && isThisMonth(book.date_started));
  const monthlyPages = completedPages + currentThisMonth.reduce((sum, book) => sum + (book.pages || 0), 0);
  const allPages = books.reduce((sum, book) => sum + (book.pages || 0), 0);
  const ratings = books.filter(book => book.rating).map(book => +book.rating);
  const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '—';

  const byType = {};
  ['Novel', 'Short Story', 'Poetry', 'Play'].forEach(type => {
    byType[type] = books.filter(book => book.type === type).length;
  });

  return { books, finished, current, monthlyCompleted, monthlyPages, allPages, avgRating, byType };
}

async function syncToSheets() {
  try {
    const stats = USERS.map(user => {
      const s = userStats(user);
      return {
        reader: user,
        total: s.books.length,
        completed: s.finished.length,
        current: s.current.length,
        pages: s.allPages,
        avgRating: s.avgRating !== '—' ? s.avgRating : '',
        novels: s.byType['Novel'],
        shortStories: s.byType['Short Story'],
        poetry: s.byType['Poetry'],
        plays: s.byType['Play'],
        monthlyCompleted: s.monthlyCompleted.length,
        monthlyPages: s.monthlyPages,
      };
    });

    await fetch(SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync_all', books: state.db, stats }),
    });
  } catch (error) {
    console.warn('Sheets sync error:', error);
  }
}
