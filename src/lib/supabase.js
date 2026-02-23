import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    flowType: 'implicit',
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Helper: Get current session
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Helper: Get current user client record
export async function getCurrentClient() {
  const session = await getSession();
  if (!session) return null;

  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('google_id', session.user.id)
    .single();

  return data;
}

// Helper: Sign in with Google
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${import.meta.env.VITE_APP_URL}/dashboard`,
    },
  });
  return { data, error };
}

// Helper: Sign out
export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // Clear manually if signOut fails
    console.error('SignOut error:', e);
  }
  // Clear any stuck auth tokens
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('sb-')) localStorage.removeItem(key);
  });
  window.location.href = '/';
}
