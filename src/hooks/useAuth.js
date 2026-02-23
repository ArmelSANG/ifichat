import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SUPABASE_FUNCTIONS_URL, ADMIN_EMAIL } from '../lib/constants';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadOrCreateClient(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await loadOrCreateClient(session.user);
        } else {
          setUser(null);
          setClient(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function loadOrCreateClient(authUser) {
    try {
      // 1. Try to find existing client
      const { data: existing } = await supabase
        .from('clients')
        .select('*')
        .eq('google_id', authUser.id)
        .maybeSingle();

      if (existing) {
        setClient(existing);
        setLoading(false);
        return;
      }

      // 2. Create via edge function (uses service_role, no RLS issues)
      const meta = authUser.user_metadata || {};
      const email = authUser.email || '';
      const name = meta.full_name || meta.name || email.split('@')[0] || 'Utilisateur';
      const avatar = meta.avatar_url || meta.picture || '';

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/auth-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId: authUser.id,
          email,
          name,
          avatarUrl: avatar,
        }),
      });

      if (!res.ok) {
        console.error('auth-callback failed:', res.status, await res.text());
      }

      // 3. Fetch the newly created client
      const { data: newClient } = await supabase
        .from('clients')
        .select('*')
        .eq('google_id', authUser.id)
        .maybeSingle();

      if (newClient) {
        setClient(newClient);
      }
    } catch (err) {
      console.error('loadOrCreateClient error:', err);
    } finally {
      setLoading(false);
    }
  }

  return { user, client, loading, setClient };
}
