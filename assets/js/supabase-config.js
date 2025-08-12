// Supabase configuration (provided by user)
// SDK is loaded via CDN on each page before this file
window.SUPABASE_URL = 'https://vofxzbwqmtpqfooohsqx.supabase.co';
window.SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZnh6YndxbXRwcWZvb29oc3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTM0NDgsImV4cCI6MjA3MDU2OTQ0OH0.VwhX8arMuJltRQG28YL6XqRJakkGnwmOKGE6e0fZ-oI';

if (window.supabase && window.SUPABASE_URL && window.SUPABASE_ANON) {
  window.supa = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
}