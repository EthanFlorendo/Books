export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function toTabKey(value = '') {
  return String(value).toLowerCase();
}

export function parseInteger(value) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

export function renderSelectOptions(values, selectedValue, includeEmptyOption = false) {
  const options = values.map(value => `<option${value === selectedValue ? ' selected' : ''}>${value}</option>`).join('');
  return includeEmptyOption ? `<option value="">-</option>${options}` : options;
}

export function compareStrings(a = '', b = '') {
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
}

export function compareNumbers(a, b) {
  return (Number(a) || 0) - (Number(b) || 0);
}

export function formatStarsMarkup(rating) {
  if (!rating) return '&mdash;';

  const roundedRating = Math.round(rating);
  return `${'&#9733;'.repeat(roundedRating)}${'&#9734;'.repeat(5 - roundedRating)}`;
}

export function detectBookType(subjects = '') {
  const normalizedSubjects = String(subjects).toLowerCase();

  if (/poetry|poems|verse|sonnets|ballad/.test(normalizedSubjects)) return 'Poetry';
  if (/play|drama|theater|theatre|screenplay/.test(normalizedSubjects)) return 'Play';
  if (/short stor|short fiction|anthology|stories/.test(normalizedSubjects)) return 'Short Story';
  if (/novel|fiction|literature/.test(normalizedSubjects)) return 'Novel';

  return null;
}
