/* ==========================================================================
   Shared utilities
   ========================================================================== */

const DEFAULT_DATE_LOCALE = 'uk-UA';

/**
 * Format a Date object for UI labels using the project locale.
 */
function formatDisplayDate(date) {
  return date.toLocaleDateString(DEFAULT_DATE_LOCALE);
}

/**
 * Format a Date object to 'yyyy-MM-dd' string (ISO date key).
 */
function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Get number of days in a given month (0-indexed month).
 */
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Parse "YYYY-M" month key into { year, month }.
 */
function parseMonthKey(key) {
  const [year, month] = key.split('-').map(Number);
  return { year, month };
}

/**
 * Parse a date string robustly — handles ISO, dd.mm.yyyy (uk-UA locale).
 * Returns a Date object.
 */
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return new Date(0);

  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return d;

  const parts = dateStr.split('.').map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }

  return new Date(0);
}

/**
 * Parse a JSON string into an object without letting bad storage break the app.
 */
function parseJsonObject(raw, fallback = {}) {
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch (e) {
    console.warn('Failed to parse stored JSON, using fallback value', e);
    return fallback;
  }
}

/**
 * Read an object from localStorage safely.
 */
function loadJsonObject(storageKey, fallback = {}) {
  return parseJsonObject(localStorage.getItem(storageKey), fallback);
}

/**
 * Write an object to localStorage safely.
 */
function saveJsonObject(storageKey, value) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to persist ${storageKey} to localStorage`, e);
  }
}

/**
 * Check whether Supabase is configured and available.
 */
function isSupabaseConfigured() {
  return (
    typeof SUPABASE_URL === 'string'
    && typeof SUPABASE_ANON_KEY === 'string'
    && !SUPABASE_URL.includes('YOUR_PROJECT_ID')
    && !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')
    && typeof supabaseClient !== 'undefined'
    && Boolean(supabaseClient)
  );
}
