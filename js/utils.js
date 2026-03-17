export function fmt(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
}

function parseDateOnly(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function stars(n) {
  if (!n) return '—';
  return '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
}

export function esc(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const now = new Date();
  const dt = parseDateOnly(dateStr);
  if (!dt) return false;
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
}

export function showLoading(visible) {
  document.getElementById('loading').classList.toggle('show', visible);
}

export function detectType(subjects) {
  if (!subjects) return null;
  const s = subjects.toLowerCase();
  if (/poetry|poems|verse|sonnets|ballad/.test(s)) return 'Poetry';
  if (/play|drama|theater|theatre|screenplay/.test(s)) return 'Play';
  if (/short stor|short fiction|anthology|stories/.test(s)) return 'Short Story';
  if (/novel|fiction|literature/.test(s)) return 'Novel';
  return null;
}
