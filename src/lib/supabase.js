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
  },
});

// ─── Keep session alive: refresh token every 10 minutes ─────
let refreshInterval = null;

function startSessionKeepAlive() {
  if (refreshInterval) return;
  refreshInterval = setInterval(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Force token refresh if it expires within 15 min
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt && (expiresAt - now) < 900) {
          console.log('[ifiChat] Refreshing session token...');
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            console.warn('[ifiChat] Token refresh failed:', error.message);
          }
        }
      }
    } catch (e) {
      console.warn('[ifiChat] Session keepalive error:', e);
    }
  }, 10 * 60 * 1000); // every 10 min
}

// Start keepalive when user is present
supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    startSessionKeepAlive();
  } else {
    if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
  }
});

// Also refresh on tab focus (user was away)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const expiresAt = session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          if (expiresAt && (expiresAt - now) < 900) {
            console.log('[ifiChat] Tab focused - refreshing token...');
            await supabase.auth.refreshSession();
          }
        }
      } catch (e) { /* ignore */ }
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
  if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
  await supabase.auth.signOut();
  window.location.href = '/';
}
