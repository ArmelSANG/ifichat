import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, signInWithGoogle } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { user, client, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && client) {
      navigate(client.is_admin ? '/admin' : '/dashboard');
    }
  }, [user, client, loading, navigate]);

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle();
    if (error) console.error('Login error:', error);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fffe 0%, #f0fdfa 50%, #f5f3ff 100%)',
      padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: '48px 40px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.08)', maxWidth: 420, width: '100%',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, #0D9488, #0F766E)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 16, fontFamily: '"Space Mono", monospace',
          margin: '0 auto 20px',
          boxShadow: '0 8px 25px rgba(13,148,136,0.3)',
        }}>ifi</div>

        <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-1px', margin: '0 0 6px' }}>
          ifi<span style={{ color: '#0D9488' }}>Chat</span>
        </h1>
        <p style={{ color: '#999', fontSize: 15, margin: '0 0 36px', lineHeight: 1.5 }}>
          Connectez-vous pour accéder à votre espace
        </p>

        <button onClick={handleGoogleLogin} style={{
          width: '100%', padding: '14px 24px', borderRadius: 14,
          border: '2px solid #e5e7eb', background: '#fff',
          fontSize: 15, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          fontFamily: 'inherit', transition: 'all 0.2s',
          color: '#333',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0D9488'; e.currentTarget.style.background = '#f0fdf4'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </button>

        <p style={{ marginTop: 24, fontSize: 12, color: '#bbb', lineHeight: 1.5 }}>
          En vous connectant, vous acceptez nos conditions d'utilisation.
          <br />7 jours d'essai gratuit, sans carte bancaire.
        </p>

        <a href="/" style={{
          display: 'inline-block', marginTop: 20, fontSize: 13,
          color: '#0D9488', textDecoration: 'none', fontWeight: 600,
        }}>← Retour à l'accueil</a>
      </div>
    </div>
  );
}
