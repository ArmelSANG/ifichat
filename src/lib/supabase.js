import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'ifichat-auth',
    // CRITICAL: bypass Navigator.locks (hangs on some browsers)
    lock: (name, acquireTimeout, fn) => fn(),
  },
});

// ─── Keep session alive ─────────────────────────────────────
let refreshTimer = null;

function startKeepAlive() {
  if (refreshTimer) return;
  refreshTimer = setInterval(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt && (expiresAt - now) < 900) {
          await supabase.auth.refreshSession();
        }
      }
    } catch (_) {}
  }, 4 * 60 * 1000); // every 4 min
}

supabase.auth.onAuthStateChange((event, session) => {
  if (session) startKeepAlive();
  else if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
});

// Refresh on tab focus
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try { await supabase.auth.refreshSession(); } catch (_) {}
    }
  });
}

export async function signInWithGoogle() {
  const redirectTo = (import.meta.env.VITE_APP_URL || window.location.origin) + '/dashboard';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  return { data, error };
}

export async function signOut() {
  if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  await supabase.auth.signOut();
  window.location.href = '/';
}
