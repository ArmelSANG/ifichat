import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// FIX: Bypass Navigator.locks which causes infinite timeout on some browsers
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
    // This bypasses the LockManager entirely - fixes the timeout bug
    lock: (name, acquireTimeout, fn) => fn(),
  },
});

export async function signInWithGoogle() {
  const redirectTo = (import.meta.env.VITE_APP_URL || window.location.origin) + '/dashboard';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  return { data, error };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = '/';
}
