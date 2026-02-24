import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase, signOut } from '../lib/supabase';
import { SUPABASE_FUNCTIONS_URL, PLANS } from '../lib/constants';

// ─── Icons ──────────────────────────────────────────────────
const Icon = {
  msg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  code: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  palette: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.04 0-.84.68-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.5-4.5-9.95-10-9.95z"/></svg>,
  telegram: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>,
  dollar: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  copy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  refresh: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
};

// ─── Tabs ───────────────────────────────────────────────────
const TABS = [
  { id: 'conversations', label: 'Conversations', icon: Icon.msg },
  { id: 'widget', label: 'Widget', icon: Icon.palette },
  { id: 'telegram', label: 'Telegram', icon: Icon.telegram },
  { id: 'embed', label: 'Code', icon: Icon.code },
  { id: 'plan', label: 'Abonnement', icon: Icon.dollar },
];

export default function Dashboard() {
  const { user, client, setClient } = useAuth();
  const [tab, setTab] = useState('conversations');
  const [subscription, setSubscription] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [widgetConfig, setWidgetConfig] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dynPlans, setDynPlans] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  // Close notification dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    }
    if (showNotifs) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifs]);

  useEffect(() => {
    loadDynPlans();
  }, []);

  useEffect(() => {
    if (client?.id) {
      loadSubscription();
      loadConversations();
      loadWidgetConfig();
      loadNotifications();
    }
  }, [client]);

  async function loadSubscription() {
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/payments/status/${client.id}`);
      const data = await res.json();
      setSubscription(data);
    } catch (e) { console.error(e); }
  }

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('*, visitors(full_name, whatsapp)')
      .eq('client_id', client.id)
      .order('last_message_at', { ascending: false })
      .limit(50);
    setConversations(data || []);
  }

  const widgetDefaults = {
    business_name: client?.name || 'Mon Entreprise',
    primary_color: '#0D9488',
    welcome_message: 'Bonjour ! 👋 Comment pouvons-nous vous aider ?',
    placeholder_text: 'Écrivez votre message...',
    away_message: 'Nous sommes absents pour le moment. Laissez-nous un message et nous vous répondrons dès que possible.',
    position: 'bottom-right',
    bottom_offset: 20,
    side_offset: 20,
  };

  async function loadWidgetConfig() {
    const { data } = await supabase
      .from('widget_configs')
      .select('*')
      .eq('client_id', client.id)
      .single();
    setWidgetConfig({ ...widgetDefaults, ...(data || {}) });
  }

  async function loadDynPlans() {
    try {
      const { data } = await supabase.from('settings').select('value').eq('key', 'plans').single();
      if (data?.value) setDynPlans(data.value);
    } catch (e) { console.log('Using default plans'); }
  }

  async function loadNotifications() {
    const { data } = await supabase
      .from('client_notifications')
      .select('*')
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
  }

  async function markAllRead() {
    await supabase
      .from('client_notifications')
      .update({ is_read: true })
      .eq('client_id', client.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  async function saveWidgetConfig() {
    if (!widgetConfig) return;
    setSaving(true);
    const { error } = await supabase
      .from('widget_configs')
      .update({
        primary_color: widgetConfig.primary_color,
        welcome_message: widgetConfig.welcome_message,
        placeholder_text: widgetConfig.placeholder_text,
        position: widgetConfig.position,
        business_name: widgetConfig.business_name,
        business_hours: widgetConfig.business_hours,
        away_message: widgetConfig.away_message,
        bottom_offset: widgetConfig.bottom_offset || 20,
        side_offset: widgetConfig.side_offset || 20,
      })
      .eq('client_id', client.id);

    setSaving(false);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  async function handlePay(plan) {
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/payments/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, plan }),
      });
      const data = await res.json();
      console.log('Payment response:', data);
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert('Erreur de paiement: ' + (data.error || 'Réponse invalide'));
      }
    } catch (e) {
      console.error('Payment error:', e);
      alert('Erreur de connexion au service de paiement');
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const embedCode = `<script src="${import.meta.env.VITE_APP_URL || 'https://chat.ifiaas.com'}/w/${client?.id}.js" async></script>`;

  // ─── Render Tabs ────────────────────────────────────────
  function renderConversations() {
    if (conversations.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#555' }}>Aucune conversation</h3>
          <p style={{ fontSize: 14 }}>Les conversations de vos visiteurs apparaîtront ici.</p>
          <p style={{ fontSize: 12, color: '#bbb', marginTop: 8 }}>Les messages sont conservés 3 mois • Les fichiers 1 mois</p>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {conversations.map(c => (
          <div key={c.id} style={{
            background: '#fff', borderRadius: 14, padding: '16px 18px',
            border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 14,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#d1d5db'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#f0f0f0'}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: `linear-gradient(135deg, hsl(${(c.visitor_id?.charCodeAt?.(0) || 0) * 7}, 50%, 55%), hsl(${(c.visitor_id?.charCodeAt?.(0) || 0) * 7 + 30}, 40%, 45%))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
            }}>{c.visitors?.full_name?.charAt(0) || '?'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.visitors?.full_name || 'Visiteur'}</div>
              <div style={{ fontSize: 12, color: '#999' }}>{c.visitors?.whatsapp || ''}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#bbb' }}>
                {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString('fr-FR') : '-'}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                background: c.status === 'active' ? '#ecfdf5' : '#fef2f2',
                color: c.status === 'active' ? '#059669' : '#dc2626',
              }}>{c.status === 'active' ? 'Actif' : c.status === 'closed' ? 'Fermé' : 'Archivé'}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderWidget() {
    if (!widgetConfig) return <div style={{ color: '#999' }}>Chargement...</div>;
    return (
      <div style={{ maxWidth: 500 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Personnaliser le widget</h3>
        {[
          { key: 'business_name', label: 'Nom affiché', type: 'text', placeholder: 'Ex: Boutique Adama, Clinique Santé+...' },
          { key: 'primary_color', label: 'Couleur principale', type: 'color', placeholder: '' },
          { key: 'welcome_message', label: 'Message d\'accueil', type: 'textarea', placeholder: 'Ex: Bonjour ! 👋 Comment pouvons-nous vous aider aujourd\'hui ?' },
          { key: 'placeholder_text', label: 'Texte dans le champ de saisie', type: 'text', placeholder: 'Ex: Écrivez votre message ici...' },
          { key: 'away_message', label: 'Message quand vous êtes absent', type: 'textarea', placeholder: 'Ex: Nous sommes hors ligne. Laissez votre message, on vous répond vite !' },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>{field.label}</label>
            {field.type === 'color' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={widgetConfig[field.key] || '#0D9488'}
                  onChange={e => setWidgetConfig({ ...widgetConfig, [field.key]: e.target.value })}
                  style={{ width: 50, height: 40, border: 'none', cursor: 'pointer', borderRadius: 8 }} />
                <input type="text" value={widgetConfig[field.key] || '#0D9488'}
                  onChange={e => setWidgetConfig({ ...widgetConfig, [field.key]: e.target.value })}
                  placeholder="#0D9488"
                  style={{ padding: '10px 14px', borderRadius: 10, border: '2px solid #ebebeb', fontSize: 14, fontFamily: '"Space Mono", monospace', width: 130 }} />
              </div>
            ) : field.type === 'textarea' ? (
              <textarea value={widgetConfig[field.key] || ''} rows={3}
                onChange={e => setWidgetConfig({ ...widgetConfig, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #ebebeb', fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
            ) : (
              <input type="text" value={widgetConfig[field.key] || ''}
                onChange={e => setWidgetConfig({ ...widgetConfig, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '2px solid #ebebeb', fontSize: 14, fontFamily: 'inherit' }} />
            )}
          </div>
        ))}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Position</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['bottom-right', 'bottom-left'].map(pos => (
              <button key={pos} onClick={() => setWidgetConfig({ ...widgetConfig, position: pos })} style={{
                padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                background: widgetConfig.position === pos ? '#0D9488' : '#fff',
                color: widgetConfig.position === pos ? '#fff' : '#666',
                border: `2px solid ${widgetConfig.position === pos ? '#0D9488' : '#ebebeb'}`,
              }}>{pos === 'bottom-right' ? 'Bas droite' : 'Bas gauche'}</button>
            ))}
          </div>
        </div>

        {/* Bottom & Side offset */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Distance du bas (px)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="range" min="10" max="200" step="5"
                value={widgetConfig.bottom_offset || 20}
                onChange={e => setWidgetConfig({ ...widgetConfig, bottom_offset: parseInt(e.target.value) })}
                style={{ flex: 1, accentColor: '#0D9488' }} />
              <span style={{
                background: '#f1f5f9', padding: '6px 10px', borderRadius: 8,
                fontSize: 13, fontWeight: 600, color: '#334155', minWidth: 48, textAlign: 'center',
              }}>{widgetConfig.bottom_offset || 20}</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Distance du côté (px)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="range" min="10" max="200" step="5"
                value={widgetConfig.side_offset || 20}
                onChange={e => setWidgetConfig({ ...widgetConfig, side_offset: parseInt(e.target.value) })}
                style={{ flex: 1, accentColor: '#0D9488' }} />
              <span style={{
                background: '#f1f5f9', padding: '6px 10px', borderRadius: 8,
                fontSize: 13, fontWeight: 600, color: '#334155', minWidth: 48, textAlign: 'center',
              }}>{widgetConfig.side_offset || 20}</span>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div style={{
          marginBottom: 20, border: '2px solid #f0f0f0', borderRadius: 14,
          height: 160, position: 'relative', overflow: 'hidden', background: '#fafafa',
        }}>
          <div style={{ position: 'absolute', top: 8, left: 12, fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
            APERÇU POSITION
          </div>
          <div style={{
            position: 'absolute',
            bottom: widgetConfig.bottom_offset || 20,
            ...(widgetConfig.position === 'bottom-left'
              ? { left: widgetConfig.side_offset || 20 }
              : { right: widgetConfig.side_offset || 20 }),
            width: 52, height: 52, borderRadius: '50%',
            background: widgetConfig.primary_color || '#0D9488',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
        </div>

        <button onClick={saveWidgetConfig} disabled={saving} style={{
          padding: '12px 28px', borderRadius: 12, border: 'none',
          background: saved ? '#059669' : 'linear-gradient(135deg, #0D9488, #0F766E)',
          color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {saving ? Icon.refresh : saved ? Icon.check : null}
          {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </div>
    );
  }

  function renderTelegram() {
    const code = client?.telegram_link_code;
    const linked = client?.telegram_linked;
    return (
      <div style={{ maxWidth: 500 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Liaison Telegram</h3>
        <p style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>
          Recevez vos messages de chat directement dans Telegram et répondez en faisant Reply.
        </p>
        {linked ? (
          <div style={{
            background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 14, padding: '20px 24px',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.check}</div>
            <div>
              <div style={{ fontWeight: 600, color: '#065f46' }}>Telegram connecté</div>
              <div style={{ fontSize: 13, color: '#10b981' }}>Vous recevez les messages en temps réel</div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: 14,
              padding: '28px 24px', textAlign: 'center', marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Votre code de liaison</div>
              <div style={{
                fontSize: 28, fontWeight: 800, letterSpacing: '3px', color: '#0F172A',
                fontFamily: '"Space Mono", monospace',
              }}>{code || 'Chargement...'}</div>
            </div>
            <div style={{ fontSize: 14, color: '#666', lineHeight: 1.8 }}>
              <strong>Instructions :</strong><br />
              1. Ouvrez Telegram<br />
              2. Cherchez <strong>@ifiChat_Bot</strong><br />
              3. Envoyez <strong>/start</strong><br />
              4. Collez le code ci-dessus
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderEmbed() {
    return (
      <div style={{ maxWidth: 600 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Code d'intégration</h3>
        <p style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>
          Ajoutez cette ligne juste avant <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>&lt;/body&gt;</code> dans votre site.
        </p>
        <div style={{
          background: '#0F172A', borderRadius: 14, padding: '16px 16px 12px', overflow: 'hidden',
        }}>
          <div style={{
            overflowX: 'auto', paddingBottom: 8,
            WebkitOverflowScrolling: 'touch',
          }}>
            <code style={{
              color: '#e2e8f0', fontSize: 13, fontFamily: '"Space Mono", monospace',
              lineHeight: 1.7, whiteSpace: 'nowrap', display: 'block',
            }}>
              <span style={{ color: '#94a3b8' }}>&lt;</span>
              <span style={{ color: '#F472B6' }}>script</span>
              <span style={{ color: '#94a3b8' }}> src=</span>
              <span style={{ color: '#86EFAC' }}>"{import.meta.env.VITE_APP_URL || 'https://chat.ifiaas.com'}/w/{client?.id}.js"</span>
              <span style={{ color: '#94a3b8' }}> async&gt;&lt;/</span>
              <span style={{ color: '#F472B6' }}>script</span>
              <span style={{ color: '#94a3b8' }}>&gt;</span>
            </code>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => copyToClipboard(embedCode)} style={{
              background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
              border: 'none', color: copied ? '#34D399' : '#fff',
              padding: '8px 16px', borderRadius: 8,
              fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}>
              {copied ? Icon.check : Icon.copy} {copied ? 'Copié !' : 'Copier le code'}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 24, padding: 20, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 12, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
          <strong>Rappel :</strong> les messages sont conservés <strong>3 mois</strong>, les fichiers et images <strong>1 mois</strong>. Au-delà, ils sont automatiquement supprimés.
        </div>
      </div>
    );
  }

  function renderPlan() {
    const mp = dynPlans?.monthly || PLANS.monthly;
    const yp = dynPlans?.yearly || PLANS.yearly;
    const monthlyPrice = mp.price || 600;
    const yearlyPrice = yp.price || 6000;
    const savings = (monthlyPrice * 12) - yearlyPrice;

    const planCards = [
      {
        plan: 'monthly',
        name: mp.name || 'Mensuel',
        price: `${monthlyPrice.toLocaleString()} ${mp.currency || 'F'}/${mp.duration || 'mois'}`,
      },
      {
        plan: 'yearly',
        name: yp.name || 'Annuel',
        price: `${yearlyPrice.toLocaleString()} ${yp.currency || 'F'}/${yp.duration || 'an'}`,
        badge: savings > 0 ? `${savings.toLocaleString()} F d'économie` : null,
      },
    ];

    return (
      <div style={{ maxWidth: 600 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Votre abonnement</h3>
        {subscription?.active ? (
          <div style={{
            background: 'linear-gradient(135deg, #065F46, #059669)',
            borderRadius: 18, padding: '28px 24px', color: '#fff', marginBottom: 24,
          }}>
            <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Plan actif</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
              {subscription.plan === 'yearly' ? (yp.name || 'Annuel') : subscription.plan === 'monthly' ? (mp.name || 'Mensuel') : 'Essai'}
            </div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              Expire le {new Date(subscription.expiresAt).toLocaleDateString('fr-FR')}
              {subscription.daysRemaining && ` (${subscription.daysRemaining} jours restants)`}
            </div>
          </div>
        ) : (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14,
            padding: '20px', marginBottom: 24,
          }}>
            <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 4 }}>
              {subscription?.expired ? 'Abonnement expiré' : 'Aucun abonnement actif'}
            </div>
            <div style={{ fontSize: 13, color: '#991b1b' }}>Votre widget de chat est désactivé</div>
          </div>
        )}

        <div className="dash-plan-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {planCards.map(p => (
            <div key={p.plan} style={{
              background: '#fff', border: '2px solid #f0f0f0', borderRadius: 16, padding: '24px 20px',
              position: 'relative',
            }}>
              {p.badge && (
                <span style={{
                  position: 'absolute', top: -10, right: 12,
                  background: '#FBBF24', color: '#78350F', padding: '3px 10px',
                  borderRadius: 50, fontSize: 10, fontWeight: 700,
                }}>{p.badge}</span>
              )}
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0D9488', marginBottom: 16 }}>{p.price}</div>
              <button onClick={() => handlePay(p.plan)} style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Payer maintenant</button>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#999', marginTop: 16, textAlign: 'center' }}>
          Paiement sécurisé via FedaPay — Mobile Money, carte bancaire
        </p>
      </div>
    );
  }

  const tabContent = {
    conversations: renderConversations,
    widget: renderWidget,
    telegram: renderTelegram,
    embed: renderEmbed,
    plan: renderPlan,
  };

  return (
    <div style={{
      fontFamily: '"DM Sans", system-ui, sans-serif',
      background: '#F8F9FB', minHeight: '100vh',
    }}>
      <style>{`
        @media (max-width: 640px) {
          .dash-header { padding: 0 12px !important; }
          .dash-content { padding: 12px !important; }
          .dash-tabs button { padding: 8px 12px !important; font-size: 12px !important; }
          .dash-tabs button svg { display: none; }
          .dash-plan-grid { grid-template-columns: 1fr !important; }
          .dash-widget-grid { grid-template-columns: 1fr !important; }
          .dash-embed-code { font-size: 11px !important; word-break: break-all; }
        }
      `}</style>

      {/* Top bar */}
      <header className="dash-header" style={{
        height: 56, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        display: 'flex', alignItems: 'center', padding: '0 20px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #0D9488, #0F766E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 9,
          }}>ifi</div>
          <span style={{ fontSize: 14, fontWeight: 700 }}>ifi<span style={{ color: '#0D9488' }}>Chat</span></span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Notification Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markAllRead(); }} style={{
              background: 'none', border: 'none', color: '#666',
              cursor: 'pointer', display: 'flex', padding: 6, position: 'relative',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 16, height: 16, borderRadius: '50%', background: '#EF4444',
                  color: '#fff', fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifs && (
              <div style={{
                position: 'absolute', top: 40, right: -10,
                width: 'min(320px, 90vw)', maxHeight: 400, overflowY: 'auto',
                background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0',
                boxShadow: '0 12px 40px rgba(0,0,0,0.12)', zIndex: 200,
              }}>
                <div style={{
                  padding: '14px 16px', borderBottom: '1px solid #f0f0f0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Notifications</span>
                  {notifications.length > 0 && (
                    <button onClick={markAllRead} style={{
                      background: 'none', border: 'none', color: '#0D9488',
                      fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
                    }}>Tout marquer lu</button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: 28, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    Aucune notification
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{
                      padding: '12px 16px', borderBottom: '1px solid #fafafa',
                      background: n.is_read ? '#fff' : '#f0fdfa',
                      cursor: 'pointer', transition: 'background 0.2s',
                    }} onClick={() => { setShowNotifs(false); if (n.link) setTab(n.link.replace('/dashboard', '') || 'conversations'); }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 13, fontWeight: n.is_read ? 500 : 700, color: '#0F172A', marginBottom: 2 }}>
                          {n.title}
                        </div>
                        {!n.is_read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#0D9488', flexShrink: 0, marginTop: 5 }} />}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                        {new Date(n.created_at).toLocaleDateString('fr-FR')} à {new Date(n.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <span style={{ fontSize: 12, color: '#666', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client?.name || client?.email}</span>
          <button onClick={signOut} style={{
            background: 'none', border: 'none', color: '#999',
            cursor: 'pointer', display: 'flex', padding: 4,
          }}>{Icon.logout}</button>
        </div>
      </header>

      <div className="dash-content" style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
        {/* Tabs */}
        <div className="dash-tabs" style={{
          display: 'flex', gap: 3, marginBottom: 20, overflowX: 'auto',
          background: '#fff', borderRadius: 12, padding: 3, border: '1px solid #f0f0f0',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none', scrollbarWidth: 'none',
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 18px', borderRadius: 10, border: 'none',
              background: tab === t.id ? '#0D9488' : 'transparent',
              color: tab === t.id ? '#fff' : '#666',
              fontSize: 13, fontWeight: tab === t.id ? 600 : 500,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: 8,
              whiteSpace: 'nowrap', transition: 'all 0.2s',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          background: '#fff', borderRadius: 18, padding: '28px 24px',
          border: '1px solid #f0f0f0', minHeight: 400,
        }}>
          {tabContent[tab]?.()}
        </div>
      </div>
    </div>
  );
}
