import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SUPABASE_FUNCTIONS_URL } from '../lib/constants';

export default function PaymentProcessing() {
  const { client } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const paymentStatus = searchParams.get('payment'); // success, cancelled
  const plan = searchParams.get('plan'); // monthly, yearly

  const [step, setStep] = useState('processing'); // processing, success, error, cancelled
  const [subscription, setSubscription] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 20; // 20 × 3s = 60s max

  useEffect(() => {
    if (paymentStatus === 'cancelled') {
      setStep('cancelled');
      return;
    }
    if (paymentStatus === 'success' && client?.id) {
      checkSubscription();
    }
  }, [paymentStatus, client?.id]);

  useEffect(() => {
    if (step === 'processing' && attempts > 0 && attempts < maxAttempts) {
      const timer = setTimeout(checkSubscription, 3000);
      return () => clearTimeout(timer);
    }
    if (attempts >= maxAttempts && step === 'processing') {
      setStep('error');
    }
  }, [attempts, step]);

  async function checkSubscription() {
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/payments/status/${client.id}`);
      const data = await res.json();

      if (data.active && data.plan === plan) {
        setSubscription(data);
        setStep('success');
      } else {
        setAttempts(prev => prev + 1);
      }
    } catch (e) {
      setAttempts(prev => prev + 1);
    }
  }

  const planLabel = plan === 'yearly' ? 'Annuel' : 'Mensuel';

  return (
    <div style={{
      fontFamily: '"DM Sans", system-ui, sans-serif',
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8fffe 0%, #f0fdfa 50%, #f5f3ff 100%)',
      padding: 20,
    }}>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes checkmark {
          0% { stroke-dashoffset: 50; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes scaleIn {
          0% { transform: scale(0); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>

      <div style={{
        background: '#fff', borderRadius: 28, padding: '48px 36px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.08)',
        maxWidth: 460, width: '100%', textAlign: 'center',
        animation: 'fadeIn 0.5s ease',
      }}>

        {/* ─── PROCESSING ─── */}
        {step === 'processing' && (
          <div>
            <div style={{
              width: 80, height: 80, margin: '0 auto 28px',
              borderRadius: '50%', border: '4px solid #e2e8f0',
              borderTopColor: '#0D9488',
              animation: 'spin 1s linear infinite',
            }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: '#0F172A' }}>
              Traitement en cours...
            </h2>
            <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>
              Nous vérifions votre paiement auprès de FedaPay.<br />
              Cela peut prendre quelques secondes.
            </p>
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16,
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: '#0D9488',
                  animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite`,
                }} />
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8' }}>
              Vérification {attempts}/{maxAttempts}
            </p>
          </div>
        )}

        {/* ─── SUCCESS ─── */}
        {step === 'success' && subscription && (
          <div style={{ animation: 'fadeIn 0.6s ease' }}>
            {/* Animated checkmark */}
            <div style={{
              width: 88, height: 88, margin: '0 auto 24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #059669, #0D9488)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'scaleIn 0.5s ease',
              boxShadow: '0 8px 30px rgba(5,150,105,0.3)',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" style={{ strokeDasharray: 50, animation: 'checkmark 0.6s ease 0.3s forwards', strokeDashoffset: 50 }} />
              </svg>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, color: '#059669' }}>
              Paiement confirmé !
            </h2>
            <p style={{ color: '#64748b', fontSize: 15, marginBottom: 28 }}>
              Votre abonnement est maintenant actif
            </p>

            {/* Subscription card */}
            <div style={{
              background: 'linear-gradient(135deg, #065F46, #059669)',
              borderRadius: 20, padding: '28px 24px', color: '#fff',
              marginBottom: 24, textAlign: 'left',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 13, opacity: 0.7 }}>Plan actif</span>
                <span style={{
                  background: 'rgba(255,255,255,0.2)', padding: '4px 12px',
                  borderRadius: 50, fontSize: 11, fontWeight: 600,
                }}>✓ ACTIVÉ</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
                {planLabel}
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
              }}>
                <div style={{
                  background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>DÉBUT</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {subscription.startsAt
                      ? new Date(subscription.startsAt).toLocaleDateString('fr-FR')
                      : new Date().toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>EXPIRATION</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {new Date(subscription.expiresAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              </div>
              {subscription.daysRemaining && (
                <div style={{
                  marginTop: 12, textAlign: 'center',
                  fontSize: 13, opacity: 0.8,
                }}>
                  ⏰ {subscription.daysRemaining} jours restants
                </div>
              )}
            </div>

            <button onClick={() => navigate('/dashboard')} style={{
              width: '100%', padding: '16px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #0D9488, #0F766E)', color: '#fff',
              fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 25px rgba(13,148,136,0.3)',
            }}>
              Accéder à mon dashboard →
            </button>
          </div>
        )}

        {/* ─── ERROR (timeout) ─── */}
        {step === 'error' && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{
              width: 80, height: 80, margin: '0 auto 24px',
              borderRadius: '50%', background: '#FEF3C7',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
            }}>⏳</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: '#B45309' }}>
              Traitement en attente
            </h2>
            <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              La vérification prend plus de temps que prévu.
              Votre paiement a bien été reçu — l'abonnement sera activé sous peu.
            </p>
            <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
              <button onClick={() => { setStep('processing'); setAttempts(0); }} style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #0D9488, #0F766E)', color: '#fff',
                fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>🔄 Revérifier</button>
              <button onClick={() => navigate('/dashboard')} style={{
                width: '100%', padding: '14px', borderRadius: 12,
                border: '2px solid #e2e8f0', background: '#fff', color: '#334155',
                fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Aller au dashboard</button>
            </div>
          </div>
        )}

        {/* ─── CANCELLED ─── */}
        {step === 'cancelled' && (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{
              width: 80, height: 80, margin: '0 auto 24px',
              borderRadius: '50%', background: '#FEE2E2',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36,
            }}>❌</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, color: '#DC2626' }}>
              Paiement annulé
            </h2>
            <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              Le paiement n'a pas abouti. Vous pouvez réessayer à tout moment.
            </p>
            <button onClick={() => navigate('/dashboard')} style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #0D9488, #0F766E)', color: '#fff',
              fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>Retour au dashboard</button>
          </div>
        )}

        {/* Footer */}
        <p style={{ marginTop: 24, fontSize: 11, color: '#cbd5e1' }}>
          Paiement sécurisé via FedaPay • ifiChat par ifiAAS
        </p>
      </div>
    </div>
  );
}
