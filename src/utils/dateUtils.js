function parseDateOnly(dateString) {
  if (!dateString) return null;

  const [year, month, day] = String(dateString).split('-').map(Number);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

export function formatDate(dateString) {
  if (!dateString) return '-';

  const [year, month, day] = String(dateString).split('-');
  return `${month}/${day}/${year}`;
}

export function isThisMonth(dateString) {
  const parsedDate = parseDateOnly(dateString);
  if (!parsedDate) return false;

  const now = new Date();
  return parsedDate.getFullYear() === now.getFullYear() && parsedDate.getMonth() === now.getMonth();
}

export function toTimeValue(dateString) {
  if (!dateString) return 0;

  const timeValue = new Date(dateString).getTime();
  return Number.isNaN(timeValue) ? 0 : timeValue;
}
