import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, signOut } from '../lib/supabase';
import { SUPABASE_FUNCTIONS_URL } from '../lib/constants';

// ─── Icons (reusable set) ───────────────────────────────────
const I = {
  home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  dollar: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  activity: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  ban: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>,
  globe: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

const NAV = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: I.home },
  { id: 'clients', label: 'Clients', icon: I.users },
  { id: 'revenue', label: 'Revenus', icon: I.dollar },
  { id: 'pricing', label: 'Tarifs', icon: I.settings },
  { id: 'activity', label: 'Activité', icon: I.activity },
];

export default function Admin() {
  const { client } = useAuth();
  const [page, setPage] = useState('overview');
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({ totalClients: 0, activeClients: 0, totalMessages: 0, totalRevenue: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState(null);
  const [savingPlans, setSavingPlans] = useState(false);
  const [plansSaved, setPlansSaved] = useState(false);

  useEffect(() => {
    loadData();
    loadPlans();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load all clients
      const { data: allClients } = await supabase
        .from('clients')
        .select('*, subscriptions(plan, status, expires_at)')
        .eq('is_admin', false)
        .order('created_at', { ascending: false });

      setClients(allClients || []);

      // Stats
      const active = (allClients || []).filter(c =>
        c.subscriptions?.some(s => s.status === 'active')
      ).length;

      const { count: msgCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true });

      setStats({
        totalClients: allClients?.length || 0,
        activeClients: active,
        totalMessages: msgCount || 0,
        totalRevenue: active * 600, // simplified
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.domain?.toLowerCase().includes(search.toLowerCase())
  );

  async function loadPlans() {
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'plans')
        .single();
      if (data?.value) setPlans(data.value);
    } catch (e) {
      // Table might not exist yet, use defaults
      setPlans({
        trial: { name: 'Essai gratuit', price: 0, duration: '7 jours', features: ['1 widget', 'Chat en temps réel', 'Réponse Telegram', 'Fichiers & images'] },
        monthly: { name: 'Mensuel', price: 600, duration: 'mois', currency: 'FCFA', features: ['Tout de l\'essai', 'Conversations illimitées', 'Widget personnalisable', 'Support prioritaire'] },
        yearly: { name: 'Annuel', price: 6000, duration: 'an', currency: 'FCFA', features: ['Tout du mensuel', '2 mois offerts', 'Badge vérifié', 'Support VIP Telegram'] },
      });
    }
  }

  async function savePlans() {
    setSavingPlans(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'plans', value: plans, updated_at: new Date().toISOString() });
      if (error) {
        console.error('Save plans error:', error);
        alert('Erreur: ' + error.message);
      } else {
        setPlansSaved(true);
        setTimeout(() => setPlansSaved(false), 2000);
      }
    } catch (e) {
      alert('Erreur de sauvegarde');
    }
    setSavingPlans(false);
  }

  function updatePlan(planKey, field, value) {
    setPlans(prev => ({
      ...prev,
      [planKey]: { ...prev[planKey], [field]: value },
    }));
  }

  function updatePlanFeature(planKey, index, value) {
    setPlans(prev => {
      const features = [...(prev[planKey].features || [])];
      features[index] = value;
      return { ...prev, [planKey]: { ...prev[planKey], features } };
    });
  }

  function addPlanFeature(planKey) {
    setPlans(prev => ({
      ...prev,
      [planKey]: { ...prev[planKey], features: [...(prev[planKey].features || []), ''] },
    }));
  }

  function removePlanFeature(planKey, index) {
    setPlans(prev => {
      const features = [...(prev[planKey].features || [])];
      features.splice(index, 1);
      return { ...prev, [planKey]: { ...prev[planKey], features } };
    });
  }

  function renderOverview() {
    const cards = [
      { label: 'Total clients', value: stats.totalClients, color: '#6366F1', bg: '#EEF2FF' },
      { label: 'Clients actifs', value: stats.activeClients, color: '#059669', bg: '#ECFDF5' },
      { label: 'Messages total', value: stats.totalMessages.toLocaleString(), color: '#0D9488', bg: '#F0FDFA' },
      { label: 'Revenus/mois', value: `${stats.totalRevenue.toLocaleString()} F`, color: '#F59E0B', bg: '#FFFBEB' },
    ];

    return (
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20, letterSpacing: '-0.5px' }}>Tableau de bord</h2>
        <div className="admin-grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 28 }}>
          {cards.map((c, i) => (
            <div key={i} style={{
              background: c.bg, borderRadius: 16, padding: '22px 18px',
              border: `1px solid ${c.color}22`,
            }}>
              <div style={{ fontSize: 12, color: c.color, fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: c.color, letterSpacing: '-1px' }}>{c.value}</div>
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Derniers clients</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {clients.slice(0, 5).map(c => (
            <div key={c.id} style={{
              background: '#fff', borderRadius: 12, padding: '14px 16px',
              border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: `linear-gradient(135deg, hsl(${(c.id?.charCodeAt?.(0) || 0) * 7}, 50%, 55%), hsl(${(c.id?.charCodeAt?.(0) || 0) * 7 + 40}, 40%, 45%))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 14,
              }}>{c.name?.charAt(0) || '?'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{c.email}</div>
              </div>
              <div style={{ fontSize: 12, color: '#bbb' }}>
                {new Date(c.created_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderClients() {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Clients ({clients.length})
          </h2>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#f5f5f5', borderRadius: 10, padding: '8px 14px', minWidth: 220,
          }}>
            {I.search}
            <input type="text" placeholder="Rechercher..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, flex: 1, fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredClients.map(c => {
            const activeSub = c.subscriptions?.find(s => s.status === 'active');
            return (
              <div key={c.id} style={{
                background: '#fff', borderRadius: 14, padding: '16px 18px',
                border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: `linear-gradient(135deg, hsl(${(c.id?.charCodeAt?.(0) || 0) * 7}, 50%, 55%), hsl(${(c.id?.charCodeAt?.(0) || 0) * 7 + 40}, 40%, 45%))`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 16,
                }}>{c.name?.charAt(0) || '?'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#999', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.email}
                    {c.domain && <><span style={{ color: '#ddd' }}>•</span> <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>{I.globe} {c.domain}</span></>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                    background: c.telegram_linked ? '#ECFDF5' : '#FEF2F2',
                    color: c.telegram_linked ? '#059669' : '#DC2626',
                  }}>{c.telegram_linked ? 'TG lié' : 'TG non lié'}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
                    background: activeSub?.plan === 'yearly' ? '#EEF2FF' : activeSub?.plan === 'monthly' ? '#F0FDF4' : '#FFFBEB',
                    color: activeSub?.plan === 'yearly' ? '#4F46E5' : activeSub?.plan === 'monthly' ? '#059669' : '#B45309',
                  }}>{activeSub?.plan === 'yearly' ? 'Annuel' : activeSub?.plan === 'monthly' ? 'Mensuel' : 'Essai'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderRevenue() {
    return (
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Revenus</h2>
        <p style={{ color: '#999', fontSize: 14 }}>Données en temps réel depuis FedaPay (mode live).</p>
        <div style={{
          marginTop: 24, padding: 24, background: 'linear-gradient(135deg, #065F46, #059669)',
          borderRadius: 18, color: '#fff',
        }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Revenus estimés/mois</div>
          <div style={{ fontSize: 36, fontWeight: 800 }}>{stats.totalRevenue.toLocaleString()} FCFA</div>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 8 }}>Basé sur {stats.activeClients} clients actifs</div>
        </div>
      </div>
    );
  }

  function renderActivity() {
    return (
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Activité</h2>
        <p style={{ color: '#999', fontSize: 14 }}>Les événements récents de la plateforme seront listés ici en temps réel via Supabase Realtime.</p>
      </div>
    );
  }

  function renderPricing() {
    if (!plans) return <p>Chargement...</p>;

    const planKeys = [
      { key: 'trial', label: '🎁 Essai gratuit', color: '#F59E0B' },
      { key: 'monthly', label: '📅 Mensuel', color: '#0D9488' },
      { key: 'yearly', label: '🏆 Annuel', color: '#6366F1' },
    ];

    const inputStyle = {
      width: '100%', padding: '10px 12px', borderRadius: 10,
      border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit',
      outline: 'none', transition: 'border 0.2s',
    };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>Gestion des tarifs</h2>
          <button onClick={savePlans} disabled={savingPlans} style={{
            padding: '10px 24px', borderRadius: 12, border: 'none',
            background: plansSaved ? '#059669' : 'linear-gradient(135deg, #0D9488, #0F766E)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            opacity: savingPlans ? 0.7 : 1,
          }}>
            {savingPlans ? 'Sauvegarde...' : plansSaved ? '✅ Sauvegardé !' : '💾 Sauvegarder les tarifs'}
          </button>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 28 }}>
          Les modifications seront visibles sur la page d'accueil et le dashboard client en temps réel.
        </p>

        <div style={{ display: 'grid', gap: 20 }}>
          {planKeys.map(({ key, label, color }) => (
            <div key={key} style={{
              background: '#fff', borderRadius: 18, padding: 24,
              border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, color }}>
                {label}
              </h3>

              <div className="admin-grid-1col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Nom du plan</label>
                  <input
                    style={inputStyle}
                    value={plans[key]?.name || ''}
                    onChange={e => updatePlan(key, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Prix</label>
                  <input
                    style={inputStyle}
                    type="number"
                    value={plans[key]?.price ?? 0}
                    onChange={e => updatePlan(key, 'price', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Durée</label>
                  <input
                    style={inputStyle}
                    value={plans[key]?.duration || ''}
                    onChange={e => updatePlan(key, 'duration', e.target.value)}
                    placeholder="ex: mois, an, 7 jours"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Devise</label>
                  <input
                    style={inputStyle}
                    value={plans[key]?.currency || ''}
                    onChange={e => updatePlan(key, 'currency', e.target.value)}
                    placeholder="FCFA"
                  />
                </div>
              </div>

              {/* Features */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
                  Fonctionnalités affichées
                </label>
                {(plans[key]?.features || []).map((feat, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      value={feat}
                      onChange={e => updatePlanFeature(key, i, e.target.value)}
                      placeholder={`Fonctionnalité ${i + 1}`}
                    />
                    <button onClick={() => removePlanFeature(key, i)} style={{
                      background: '#FEE2E2', border: 'none', borderRadius: 8,
                      width: 36, height: 40, cursor: 'pointer', color: '#DC2626',
                      fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                  </div>
                ))}
                <button onClick={() => addPlanFeature(key)} style={{
                  background: 'none', border: '1.5px dashed #d1d5db', borderRadius: 8,
                  padding: '8px 16px', fontSize: 13, color: '#94a3b8', cursor: 'pointer',
                  width: '100%', marginTop: 4, fontFamily: 'inherit',
                }}>+ Ajouter une fonctionnalité</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const pages = { overview: renderOverview, clients: renderClients, revenue: renderRevenue, pricing: renderPricing, activity: renderActivity };

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{
      fontFamily: '"DM Sans", system-ui, sans-serif',
      background: '#F8F9FB', minHeight: '100vh',
    }}>
      <style>{`
        @media (min-width: 769px) {
          .admin-layout { display: flex; }
          .admin-sidebar {
            width: 240px; display: flex !important; flex-direction: column; flex-shrink: 0;
            height: 100vh; position: sticky; top: 0;
          }
          .admin-mobile-header { display: none !important; }
          .admin-mobile-nav { display: none !important; }
          .admin-main { flex: 1; padding: 28px; }
        }
        @media (max-width: 768px) {
          .admin-layout { display: flex; flex-direction: column; }
          .admin-sidebar { display: none !important; }
          .admin-mobile-header { display: flex !important; }
          .admin-mobile-nav { display: flex !important; }
          .admin-main { flex: 1; padding: 16px; padding-bottom: 80px; }
          .admin-grid-stats { grid-template-columns: 1fr 1fr !important; }
          .admin-grid-1col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="admin-layout">
        {/* Desktop Sidebar */}
        <aside className="admin-sidebar" style={{
          background: 'linear-gradient(180deg, #0F172A, #1E293B)', color: '#fff',
        }}>
          <div style={{ padding: '20px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #0D9488, #14B8A6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 11,
            }}>ifi</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>ifi<span style={{ color: '#14B8A6' }}>Chat</span></div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5 }}>ADMIN</div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(n => (
              <button key={n.id} onClick={() => setPage(n.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, border: 'none',
                background: page === n.id ? 'rgba(13,148,136,0.15)' : 'transparent',
                color: page === n.id ? '#14B8A6' : 'rgba(255,255,255,0.45)',
                fontSize: 13, fontWeight: page === n.id ? 600 : 500,
                cursor: 'pointer', width: '100%', textAlign: 'left', fontFamily: 'inherit',
              }}>{n.icon} {n.label}</button>
            ))}
          </nav>
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#EF4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, color: '#fff',
            }}>A</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Admin</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{client?.email}</div>
            </div>
            <button onClick={signOut} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex',
            }}>{I.logout}</button>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="admin-mobile-header" style={{
          display: 'none', height: 56, background: '#0F172A', color: '#fff',
          alignItems: 'center', padding: '0 16px', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'linear-gradient(135deg, #0D9488, #14B8A6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 10,
            }}>ifi</div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>ifi<span style={{ color: '#14B8A6' }}>Chat</span> <span style={{ fontSize: 9, opacity: 0.4, letterSpacing: 1 }}>ADMIN</span></span>
          </div>
          <button onClick={signOut} style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex',
          }}>{I.logout}</button>
        </header>

        {/* Main Content */}
        <main className="admin-main">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>Chargement...</div>
          ) : (
            pages[page]?.()
          )}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="admin-mobile-nav" style={{
          display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.06)',
          justifyContent: 'space-around', padding: '8px 0 12px', zIndex: 100,
        }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: page === n.id ? '#14B8A6' : 'rgba(255,255,255,0.35)',
              fontSize: 9, fontWeight: page === n.id ? 600 : 400, fontFamily: 'inherit',
              padding: '4px 8px',
            }}>
              {n.icon}
              {n.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
