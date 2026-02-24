import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PLANS } from '../lib/constants';

export default function Landing() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(null);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'plans')
        .single();
      if (data?.value) setPlans(data.value);
    } catch (e) {
      console.log('Using default plans');
    }
  }

  // Use DB plans or fallback to constants
  const p = plans || PLANS;
  const trial = p.trial || PLANS.trial;
  const monthly = p.monthly || PLANS.monthly;
  const yearly = p.yearly || PLANS.yearly;

  const pricingCards = [
    {
      ...trial,
      name: trial.name || 'Essai',
      priceDisplay: '0',
      unit: trial.duration || '7 jours',
      features: trial.features || ['1 widget', 'Chat en temps réel', 'Réponse Telegram', 'Fichiers & images'],
      cta: 'Commencer gratuitement', popular: false,
      bg: '#fff', border: '#e2e8f0',
    },
    {
      ...monthly,
      name: monthly.name || 'Mensuel',
      priceDisplay: (monthly.price || 600).toLocaleString(),
      unit: `${monthly.currency || 'FCFA'} / ${monthly.duration || 'mois'}`,
      features: monthly.features || ['Tout de l\'essai', 'Conversations illimitées', 'Widget personnalisable', 'Support prioritaire'],
      cta: 'Choisir le mensuel', popular: false,
      bg: '#fff', border: '#e2e8f0',
    },
    {
      ...yearly,
      name: yearly.name || 'Annuel',
      priceDisplay: (yearly.price || 6000).toLocaleString(),
      unit: `${yearly.currency || 'FCFA'} / ${yearly.duration || 'an'}`,
      features: yearly.features || ['Tout du mensuel', '2 mois offerts', 'Badge vérifié', 'Support VIP Telegram'],
      cta: 'Économisez ' + ((monthly.price || 600) * 12 - (yearly.price || 6000)).toLocaleString() + ' F',
      popular: true,
      bg: 'linear-gradient(135deg, #0D9488, #0F766E)', border: '#0D9488',
    },
  ];

  return (
    <div style={{ fontFamily: '"DM Sans", system-ui, sans-serif', background: '#fff' }}>
      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        backdropFilter: 'blur(20px)', background: 'rgba(255,255,255,0.85)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 24px',
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #0D9488, #0F766E)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 11, fontFamily: '"Space Mono", monospace',
            }}>ifi</div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px' }}>
              ifi<span style={{ color: '#0D9488' }}>Chat</span>
            </span>
          </div>
          <button onClick={() => navigate('/login')} style={{
            padding: '8px 18px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #0D9488, #0F766E)', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
          }}>Commencer</button>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px 60px', textAlign: 'center',
        background: 'linear-gradient(180deg, #f8fffe 0%, #fff 100%)',
      }}>
        <div style={{ maxWidth: 720 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 50,
            padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#065f46',
            marginBottom: 28,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
            Conçu pour l'Afrique de l'Ouest
          </div>
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800,
            letterSpacing: '-2px', lineHeight: 1.05, margin: '0 0 20px', color: '#0F172A',
          }}>
            Chat live sur votre site,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #0D9488, #06B6D4)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>réponses depuis Telegram</span>
          </h1>
          <p style={{
            fontSize: 'clamp(16px, 2vw, 20px)', color: '#64748b',
            lineHeight: 1.6, maxWidth: 540, margin: '0 auto 36px',
          }}>
            Ajoutez un chat en direct à votre site web. Vos visiteurs écrivent, vous répondez depuis Telegram. Simple, rapide, abordable.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/login')} style={{
              padding: '16px 36px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #0D9488, #0F766E)', color: '#fff',
              fontSize: 17, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 8px 30px rgba(13,148,136,0.35)', transition: 'transform 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Essai gratuit {trial.duration || '7 jours'} →
            </button>
            <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              style={{
                padding: '16px 28px', borderRadius: 14,
                border: '2px solid #e2e8f0', background: '#fff', color: '#334155',
                fontSize: 17, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              Voir les prix
            </button>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, color: '#94a3b8' }}>
            Sans carte bancaire • Paiement Mobile Money
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 24px', background: '#fafafa' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>
            Comment ça marche ?
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 17, marginBottom: 60 }}>3 étapes, 5 minutes</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {[
              { step: '01', title: 'Inscrivez-vous', desc: 'Connexion Google en un clic. Configurez votre widget (couleurs, textes, logo).', emoji: '🔐' },
              { step: '02', title: 'Liez Telegram', desc: 'Copiez votre code de liaison et envoyez-le à notre bot @ifiChat_Bot.', emoji: '🔗' },
              { step: '03', title: 'Ajoutez le widget', desc: 'Collez une ligne de code sur votre site. Vos visiteurs peuvent chatter en direct !', emoji: '💬' },
            ].map((item, i) => (
              <div key={i} style={{
                background: '#fff', borderRadius: 20, padding: '36px 28px',
                border: '1px solid #f0f0f0', textAlign: 'left',
              }}>
                <span style={{ fontSize: 36, display: 'block', marginBottom: 16 }}>{item.emoji}</span>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0D9488', marginBottom: 8, fontFamily: '"Space Mono", monospace' }}>
                  ÉTAPE {item.step}
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 60 }}>
            Tout ce dont vous avez besoin
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
            {[
              { icon: '💬', title: 'Chat en temps réel', desc: 'Messages instantanés via Supabase Realtime' },
              { icon: '📱', title: 'Réponse Telegram', desc: 'Répondez depuis votre téléphone, partout' },
              { icon: '📎', title: 'Fichiers & images', desc: 'Envoi de photos, PDF, documents' },
              { icon: '🎨', title: 'Widget personnalisable', desc: 'Couleurs, logo, textes — à votre image' },
              { icon: '💳', title: 'FedaPay intégré', desc: 'Paiement Mobile Money & cartes' },
              { icon: '🔒', title: 'Données sécurisées', desc: 'Hébergement Supabase, chiffrement SSL' },
            ].map((f, i) => (
              <div key={i} style={{
                padding: '28px 20px', borderRadius: 16, border: '1px solid #f0f0f0', textAlign: 'left',
              }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 12 }}>{f.icon}</span>
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.title}</h4>
                <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '80px 24px', background: '#fafafa' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 12 }}>
            Tarifs simples
          </h2>
          <p style={{ color: '#94a3b8', fontSize: 17, marginBottom: 48 }}>
            Commencez gratuitement, payez quand vous êtes prêt
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {pricingCards.map((plan, i) => (
              <div key={i} style={{
                background: plan.bg, border: `2px solid ${plan.border}`,
                borderRadius: 24, padding: '36px 28px', position: 'relative',
                color: plan.popular ? '#fff' : '#0F172A',
              }}>
                {plan.popular && (
                  <span style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: '#FBBF24', color: '#78350F', padding: '4px 16px', borderRadius: 50,
                    fontSize: 12, fontWeight: 700,
                  }}>POPULAIRE</span>
                )}
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{plan.name}</h3>
                <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-2px', margin: '12px 0 4px' }}>
                  {plan.priceDisplay}<span style={{ fontSize: 16, fontWeight: 500, opacity: 0.7 }}> {plan.unit}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 28px', textAlign: 'left' }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{
                      padding: '6px 0', fontSize: 14,
                      display: 'flex', alignItems: 'center', gap: 8,
                      color: plan.popular ? 'rgba(255,255,255,0.9)' : '#64748b',
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: 6,
                        background: plan.popular ? 'rgba(255,255,255,0.2)' : '#ecfdf5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: plan.popular ? '#fff' : '#059669', flexShrink: 0,
                      }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/login')} style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: plan.popular ? '#fff' : 'linear-gradient(135deg, #0D9488, #0F766E)',
                  color: plan.popular ? '#0F766E' : '#fff',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>{plan.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '40px 24px', borderTop: '1px solid #f0f0f0', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>
          © 2026 ifiChat par <a href="https://ifiaas.com" target="_blank" rel="noopener" style={{ color: '#0D9488', textDecoration: 'none', fontWeight: 600 }}>ifiAAS</a> — Fait au Bénin 🇧🇯
        </div>
      </footer>
    </div>
  );
}
