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

const MAX_RATING_PERCENT = 100;
const MAX_TEN_POINT_RATING = 10;
const LEGACY_STAR_RATING_MAX = 5;

function clampRating(value, maxValue) {
  return Math.min(maxValue, Math.max(0, value));
}

export function parseTenPointRatingInput(value) {
  const normalizedValue = String(value ?? '').trim();
  if (!normalizedValue) return null;

  const parsedValue = Number.parseFloat(normalizedValue);
  if (!Number.isFinite(parsedValue)) return null;

  return Math.round(clampRating(parsedValue, MAX_TEN_POINT_RATING) * 10);
}

export function normalizeRatingPercent(rating) {
  if (rating === null || rating === undefined || rating === '') return null;

  const numericRating = Number(rating);
  if (!Number.isFinite(numericRating)) return null;

  // Preserve legacy 1-5 star values by converting them to the equivalent
  // percentage before formatting them on the new 10-point scale.
  if (Number.isInteger(numericRating) && numericRating >= 0 && numericRating <= LEGACY_STAR_RATING_MAX) {
    return clampRating(numericRating * 20, MAX_RATING_PERCENT);
  }

  if (!Number.isInteger(numericRating) && numericRating >= 0 && numericRating <= MAX_TEN_POINT_RATING) {
    return clampRating(Math.round(numericRating * 10), MAX_RATING_PERCENT);
  }

  return clampRating(Math.round(numericRating), MAX_RATING_PERCENT);
}

export function hasRating(rating) {
  return normalizeRatingPercent(rating) !== null;
}

export function getTenPointRatingText(rating) {
  const normalizedRating = normalizeRatingPercent(rating);
  if (normalizedRating === null) return '';

  return `${(normalizedRating / 10).toFixed(1)}/10`;
}

export function formatTenPointRating(rating) {
  return getTenPointRatingText(rating) || '&mdash;';
}

export function getTenPointRatingInputValue(rating) {
  const normalizedRating = normalizeRatingPercent(rating);
  return normalizedRating === null ? '' : (normalizedRating / 10).toFixed(1);
}

export function detectBookType(subjects = '') {
  const normalizedSubjects = String(subjects).toLowerCase();

  if (/poetry|poems|verse|sonnets|ballad/.test(normalizedSubjects)) return 'Poetry';
  if (/play|drama|theater|theatre|screenplay/.test(normalizedSubjects)) return 'Play';
  if (/short stor|short fiction|anthology|stories/.test(normalizedSubjects)) return 'Short Story';
  if (/novel|fiction|literature/.test(normalizedSubjects)) return 'Novel';

  return null;
}
