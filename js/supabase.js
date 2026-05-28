// Supabase configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://loyloyguwypyblviutpg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxveWxveWd1d3lweWJsdml1dHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Nzk2MTcsImV4cCI6MjA5NTQ1NTYxN30.zOiG6DFZvzQla5JzKFblP9ykcH6loVaCgEB78zw4Uwk';

const supabaseClient = (() => {
  const hasCredentials =
    !SUPABASE_URL.includes('YOUR_PROJECT_ID')
    && !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY');

  if (!hasCredentials) return null;

  if (!window.supabase) {
    console.warn('Supabase library is unavailable; falling back to localStorage.');
    return null;
  }

  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
