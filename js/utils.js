/* ==========================================================================
   Shared utilities
   ========================================================================== */

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
  const d = new Date(dateStr);
  if (!isNaN(d)) return d;
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    return new Date(parts[2], parts[1] - 1, parts[0]);
  }
  return new Date(0);
}

/**
 * Check whether Supabase is configured (not using placeholder credentials).
 */
function isSupabaseConfigured() {
  return !SUPABASE_URL.includes('YOUR_PROJECT_ID');
}
