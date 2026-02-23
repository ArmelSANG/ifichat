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
      async (event, session) => {
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
      // 1. Check if client exists
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

      // 2. Create client directly
      const meta = authUser.user_metadata || {};
      const email = authUser.email || meta.email || '';
      const name = meta.full_name || meta.name || email.split('@')[0] || 'Utilisateur';
      const avatar = meta.avatar_url || meta.picture || '';
      const isAdmin = email === ADMIN_EMAIL;

      const { data: newClient, error: insertErr } = await supabase
        .from('clients')
        .insert({
          google_id: authUser.id,
          email: email,
          name: name,
          avatar_url: avatar,
          is_admin: isAdmin,
        })
        .select('*')
        .single();

      if (newClient) {
        setClient(newClient);
        setLoading(false);
        return;
      }

      console.log('Direct insert failed:', insertErr);

      // 3. Fallback: auth-callback edge function
      try {
        const session = await supabase.auth.getSession();
        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/auth-callback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify({
            userId: authUser.id,
            email: email,
            name: name,
            avatarUrl: avatar,
          }),
        });
        console.log('Auth-callback status:', res.status);
      } catch (e) {
        console.error('Auth-callback error:', e);
      }

      // 4. Final fetch
      const { data: finalClient } = await supabase
        .from('clients')
        .select('*')
        .eq('google_id', authUser.id)
        .maybeSingle();

      if (finalClient) {
        setClient(finalClient);
      }
    } catch (err) {
      console.error('Error loading client:', err);
    } finally {
      setLoading(false);
    }
  }

  return { user, client, loading, setClient };
}
