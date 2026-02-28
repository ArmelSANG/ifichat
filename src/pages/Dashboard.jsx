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
  const [selectedConv, setSelectedConv] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const chatFileRef = useRef(null);

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

  // ─── Chat: load messages when conversation selected ────────
  useEffect(() => {
    if (!selectedConv) { setChatMessages([]); return; }
    setChatLoading(true);
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', selectedConv.id)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => { setChatMessages(data || []); setChatLoading(false); });

    // Real-time subscription
    const channel = supabase
      .channel('chat-' + selectedConv.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        setChatMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .subscribe();

    // Mark as read
    supabase.from('conversations').update({ unread_count: 0 }).eq('id', selectedConv.id);

    return () => { supabase.removeChannel(channel); };
  }, [selectedConv]);

  // Auto-scroll
  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  async function sendChatMessage(e) {
    e?.preventDefault();
    const txt = chatInput.trim();
    if (!txt || !selectedConv) return;
    setChatInput('');
    await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_type: 'client',
      content: txt,
      content_type: 'text',
      is_read: true,
    });
    // Update last_message_at
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', selectedConv.id);
  }

  async function uploadChatFile(e) {
    const file = e.target.files[0];
    if (!file || !selectedConv) return;
    e.target.value = '';

    const isImg = file.type.startsWith('image/');
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${client.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(path, file, { contentType: file.type });

    if (error) { showToast('Erreur upload: ' + error.message, 'error'); return; }

    const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(path);
    const fileUrl = urlData?.publicUrl;

    await supabase.from('messages').insert({
      conversation_id: selectedConv.id,
      sender_type: 'client',
      content: isImg ? '' : file.name,
      content_type: isImg ? 'image' : 'file',
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size,
      file_mime_type: file.type,
      is_read: true,
    });
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', selectedConv.id);
  }

  async function closeConversation(convId) {
    await supabase.from('conversations').update({ status: 'closed' }).eq('id', convId);
    setSelectedConv(null);
    loadConversations();
    showToast('Conversation fermée', 'success');
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
    try {
      // Use widget-save endpoint with GET-like approach, or direct read
      const { data } = await supabase
        .from('widget_configs')
        .select('*')
        .eq('client_id', client.id)
        .single();
      
      if (data) {
        setWidgetConfig({ ...widgetDefaults, ...data });
        return;
      }
    } catch (e) {}

    // Fallback: try API (bypasses RLS)
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/widget-api/config/${client.id}`);
      if (res.ok) {
        const result = await res.json();
        if (result?.config) {
          setWidgetConfig({ ...widgetDefaults, ...result.config });
          return;
        }
      }
    } catch (e) {}

    // Default values
    setWidgetConfig({ ...widgetDefaults });
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

  const [toast, setToast] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function saveWidgetConfig() {
    if (!widgetConfig) return;
    setSaving(true);
    
    const payload = {
      primary_color: widgetConfig.primary_color,
      welcome_message: widgetConfig.welcome_message,
      placeholder_text: widgetConfig.placeholder_text,
      position: widgetConfig.position,
      business_name: widgetConfig.business_name,
      business_hours: widgetConfig.business_hours,
      bottom_offset: widgetConfig.bottom_offset || 20,
      side_offset: widgetConfig.side_offset || 20,
    };

    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/widget-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, config: payload }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast('Widget sauvegardé avec succès !', 'success');
      } else {
        console.error('Save error:', result);
        showToast('Erreur : ' + (result.error || result.details || 'Réessayez'), 'error');
      }
    } catch (e) {
      console.error('Network error:', e);
      showToast('Erreur réseau. Vérifiez votre connexion.', 'error');
    }
    setSaving(false);
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
    // ─── Chat View ───────────────────────────────
    if (selectedConv) {
      const vis = selectedConv.visitors || {};
      const name = vis.full_name || 'Visiteur';
      const phone = vis.whatsapp || '';

      function formatDate(d) {
        const dt = new Date(d);
        const today = new Date();
        if (dt.toDateString() === today.toDateString()) return "Aujourd'hui";
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        if (dt.toDateString() === yesterday.toDateString()) return 'Hier';
        return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
      }

      let lastDate = '';

      return (
        <div style={{ margin: '-28px -24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: 400 }}>
          {/* Chat header */}
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid #e9ecef',
            display: 'flex', alignItems: 'center', gap: 14, background: '#fafbfc', flexShrink: 0,
          }}>
            <button onClick={() => setSelectedConv(null)} style={{
              background: '#f0f2f5', border: 'none', borderRadius: 10, width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: `linear-gradient(135deg, hsl(${(name.charCodeAt(0) || 0) * 7}, 50%, 55%), hsl(${(name.charCodeAt(0) || 0) * 7 + 30}, 40%, 45%))`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
            }}>{name.charAt(0)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{name}</div>
              <div style={{ fontSize: 12, color: '#667781' }}>{phone}</div>
            </div>
            <button onClick={() => closeConversation(selectedConv.id)} style={{
              background: 'none', border: '1px solid #fca5a5', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit',
            }}>Fermer</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 20px',
            background: 'linear-gradient(180deg, #efeae2 0%, #d1c4b2 100%)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8bfb0' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {chatLoading && <div style={{ textAlign: 'center', color: '#8696a0', padding: 20 }}>Chargement...</div>}
            {chatMessages.map((m, i) => {
              const isClient = m.sender_type === 'client';
              const isVisitor = m.sender_type === 'visitor';
              const msgDate = formatDate(m.created_at);
              let showDate = false;
              if (msgDate !== lastDate) { lastDate = msgDate; showDate = true; }
              const time = new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={m.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
                      <span style={{ background: '#fff', padding: '4px 14px', borderRadius: 8, fontSize: 11, color: '#8696a0', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>{msgDate}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex', justifyContent: isVisitor ? 'flex-start' : 'flex-end',
                    marginBottom: 2,
                  }}>
                    <div style={{
                      maxWidth: '72%', padding: '8px 12px', borderRadius: 10,
                      background: isClient ? '#d9fdd3' : '#fff',
                      borderBottomRightRadius: isClient ? 4 : 10,
                      borderBottomLeftRadius: isVisitor ? 4 : 10,
                      boxShadow: '0 1px 2px rgba(0,0,0,.06)',
                    }}>
                      {/* Image */}
                      {m.content_type === 'image' && m.file_url && (
                        <img src={m.file_url} alt="Photo" style={{
                          maxWidth: '100%', borderRadius: 6, marginBottom: 4, cursor: 'pointer',
                          maxHeight: 260, objectFit: 'cover',
                        }} onClick={() => window.open(m.file_url, '_blank')} />
                      )}
                      {/* File */}
                      {m.content_type === 'file' && m.file_url && (
                        <a href={m.file_url} target="_blank" rel="noreferrer" style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
                          textDecoration: 'none', color: '#111',
                        }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📎</div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{m.file_name || 'Fichier'}</div>
                        </a>
                      )}
                      {/* Text */}
                      {m.content && <div style={{ fontSize: 14, lineHeight: 1.45, color: '#111', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.content}</div>}
                      <div style={{ fontSize: 10, color: '#667781', textAlign: 'right', marginTop: 2 }}>{time}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div style={{
            padding: '10px 14px', borderTop: '1px solid #e9ecef', background: '#f0f2f5',
            display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
          }}>
            <button onClick={() => chatFileRef.current?.click()} style={{
              width: 40, height: 40, borderRadius: 12, border: 'none', background: '#fff',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667781', flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input type="file" ref={chatFileRef} style={{ display: 'none' }} onChange={uploadChatFile} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" />
            <form onSubmit={sendChatMessage} style={{ flex: 1, display: 'flex', gap: 8 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Écrivez un message..."
                style={{
                  flex: 1, padding: '10px 18px', borderRadius: 24, border: '1px solid #e2e8f0',
                  fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#fff',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#0D9488'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
              <button type="submit" style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none',
                background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </form>
          </div>
        </div>
      );
    }

    // ─── Conversation List ───────────────────────
    if (conversations.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#555' }}>Aucune conversation</h3>
          <p style={{ fontSize: 14 }}>Les conversations de vos visiteurs apparaîtront ici.</p>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{conversations.length} conversation(s)</h3>
        </div>
        {conversations.map(c => {
          const name = c.visitors?.full_name || 'Visiteur';
          const unread = c.unread_count > 0;
          // Last message preview
          return (
            <div key={c.id} onClick={() => setSelectedConv(c)} style={{
              background: '#fff', borderRadius: 14, padding: '14px 16px',
              border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#d1d5db'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#f0f0f0'; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `linear-gradient(135deg, hsl(${(name.charCodeAt(0)) * 7}, 50%, 55%), hsl(${(name.charCodeAt(0)) * 7 + 30}, 40%, 45%))`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0,
              }}>{name.charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: unread ? 700 : 600, fontSize: 14, color: '#111' }}>{name}</div>
                <div style={{ fontSize: 12, color: '#667781', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.visitors?.whatsapp || ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11, color: unread ? '#0D9488' : '#bbb', fontWeight: unread ? 600 : 400, marginBottom: 4 }}>
                  {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
                {unread && (
                  <span style={{
                    display: 'inline-block', minWidth: 20, height: 20, lineHeight: '20px',
                    borderRadius: 10, background: '#0D9488', color: '#fff',
                    fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '0 5px',
                  }}>{c.unread_count}</span>
                )}
                {!unread && (
                  <span style={{
                    fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 6,
                    background: c.status === 'active' ? '#ecfdf5' : '#fef2f2',
                    color: c.status === 'active' ? '#059669' : '#dc2626',
                  }}>{c.status === 'active' ? 'Actif' : 'Fermé'}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function renderWidget() {
    if (!widgetConfig) return <div style={{ color: '#999' }}>Chargement...</div>;
    return (
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Personnaliser le widget</h3>
        {[
          { key: 'business_name', label: 'Nom affiché', type: 'text', placeholder: 'Ex: Boutique Adama, Clinique Santé+...' },
          { key: 'primary_color', label: 'Couleur principale', type: 'color', placeholder: '' },
          { key: 'welcome_message', label: 'Message d\'accueil', type: 'textarea', placeholder: 'Ex: Bonjour ! 👋 Comment pouvons-nous vous aider aujourd\'hui ?' },
          { key: 'placeholder_text', label: 'Texte champ de saisie', type: 'text', placeholder: 'Ex: Écrivez votre message ici...' },
        ].map(field => (
          <div key={field.key} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>{field.label}</label>
            {field.type === 'color' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="color" value={widgetConfig[field.key] || '#0D9488'}
                  onChange={e => setWidgetConfig({ ...widgetConfig, [field.key]: e.target.value })}
                  style={{ width: 44, height: 38, border: 'none', cursor: 'pointer', borderRadius: 8, padding: 0 }} />
                <input type="text" value={widgetConfig[field.key] || '#0D9488'}
                  onChange={e => setWidgetConfig({ ...widgetConfig, [field.key]: e.target.value })}
                  placeholder="#0D9488"
                  style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: '"Space Mono", monospace', width: 120, boxSizing: 'border-box' }} />
              </div>
            ) : field.type === 'textarea' ? (
              <textarea value={widgetConfig[field.key] || ''} rows={2}
                onChange={e => setWidgetConfig({ ...widgetConfig, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : (
              <input type="text" value={widgetConfig[field.key] || ''}
                onChange={e => setWidgetConfig({ ...widgetConfig, [field.key]: e.target.value })}
                placeholder={field.placeholder}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            )}
          </div>
        ))}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 5 }}>Position</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['bottom-right', 'bottom-left'].map(pos => (
              <button key={pos} onClick={() => setWidgetConfig({ ...widgetConfig, position: pos })} style={{
                padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                background: widgetConfig.position === pos ? '#0D9488' : '#fff',
                color: widgetConfig.position === pos ? '#fff' : '#666',
                border: `1.5px solid ${widgetConfig.position === pos ? '#0D9488' : '#e2e8f0'}`,
              }}>{pos === 'bottom-right' ? 'Bas droite' : 'Bas gauche'}</button>
            ))}
          </div>
        </div>

        {/* Offsets - stacks on mobile */}
        <div className="dash-widget-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>Distance bas (px)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="range" min="10" max="200" step="5"
                value={widgetConfig.bottom_offset || 20}
                onChange={e => setWidgetConfig({ ...widgetConfig, bottom_offset: parseInt(e.target.value) })}
                style={{ flex: 1, accentColor: '#0D9488' }} />
              <span style={{
                background: '#f1f5f9', padding: '4px 8px', borderRadius: 6,
                fontSize: 12, fontWeight: 600, color: '#334155', minWidth: 36, textAlign: 'center',
              }}>{widgetConfig.bottom_offset || 20}</span>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 5 }}>Distance côté (px)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="range" min="10" max="200" step="5"
                value={widgetConfig.side_offset || 20}
                onChange={e => setWidgetConfig({ ...widgetConfig, side_offset: parseInt(e.target.value) })}
                style={{ flex: 1, accentColor: '#0D9488' }} />
              <span style={{
                background: '#f1f5f9', padding: '4px 8px', borderRadius: 6,
                fontSize: 12, fontWeight: 600, color: '#334155', minWidth: 36, textAlign: 'center',
              }}>{widgetConfig.side_offset || 20}</span>
            </div>
          </div>
        </div>

        {/* Preview - compact */}
        <div style={{
          marginBottom: 16, border: '1.5px solid #f0f0f0', borderRadius: 12,
          height: 120, position: 'relative', overflow: 'hidden', background: '#fafafa',
        }}>
          <div style={{ position: 'absolute', top: 6, left: 10, fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Aperçu
          </div>
          <div style={{
            position: 'absolute',
            bottom: Math.min(widgetConfig.bottom_offset || 20, 50),
            ...(widgetConfig.position === 'bottom-left'
              ? { left: Math.min(widgetConfig.side_offset || 20, 50) }
              : { right: Math.min(widgetConfig.side_offset || 20, 50) }),
            width: 44, height: 44, borderRadius: '50%',
            background: widgetConfig.primary_color || '#0D9488',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 12px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
        </div>

        <button onClick={saveWidgetConfig} disabled={saving} style={{
          padding: '11px 24px', borderRadius: 12, border: 'none',
          background: 'linear-gradient(135deg, #0D9488, #0F766E)',
          color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1,
        }}>
          {saving ? Icon.refresh : null}
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    );
  }

  function renderTelegram() {
    const code = client?.telegram_link_code;
    const linked = client?.telegram_linked;
    const isForum = client?.telegram_is_forum;

    async function unlinkTelegram() {
      if (!confirm('Êtes-vous sûr de vouloir délier Telegram ?')) return;
      const { error } = await supabase
        .from('clients')
        .update({ telegram_linked: false, telegram_chat_id: null, telegram_link_code: generateNewCode(), telegram_is_forum: false })
        .eq('id', client.id);
      if (!error) {
        setClient({ ...client, telegram_linked: false, telegram_chat_id: null, telegram_is_forum: false });
        window.location.reload();
      }
    }

    function generateNewCode() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = 'IFICHAT-';
      for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      return code;
    }

    return (
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Liaison Telegram</h3>
        <p style={{ color: '#999', fontSize: 14, marginBottom: 20 }}>
          Recevez vos messages directement dans Telegram. Chaque visiteur a son propre fil de discussion.
        </p>
        {linked ? (
          <div>
            <div style={{
              background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 14, padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: '#059669', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.check}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#065f46' }}>Telegram connecté</div>
                <div style={{ fontSize: 13, color: '#10b981' }}>
                  Mode : <strong>{isForum ? 'Forum (groupe avec topics)' : 'Privé (chat direct)'}</strong>
                </div>
              </div>
            </div>
            {isForum && (
              <div style={{
                background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12,
                padding: '14px 18px', marginBottom: 14, fontSize: 13, color: '#1e40af', lineHeight: 1.6,
              }}>
                <strong>Mode Forum actif</strong> — Chaque visiteur a son propre topic dans votre groupe Telegram. Répondez directement dans le topic, sans commande !
              </div>
            )}
            <button onClick={unlinkTelegram} style={{
              background: 'none', border: '1.5px solid #fca5a5', borderRadius: 10,
              padding: '10px 20px', fontSize: 13, color: '#DC2626', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 500,
            }}>Délier Telegram</button>
          </div>
        ) : (
          <div>
            <div style={{
              background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: 14,
              padding: '24px 20px', textAlign: 'center', marginBottom: 18,
            }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>Votre code de liaison</div>
              <div style={{
                fontSize: 24, fontWeight: 800, letterSpacing: '3px', color: '#0F172A',
                fontFamily: '"Space Mono", monospace',
              }}>{code || 'Chargement...'}</div>
            </div>

            {/* Mode Forum (recommended) */}
            <div style={{
              background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14,
              padding: '18px 20px', marginBottom: 16,
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1e40af', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                ⭐ Mode Forum (recommandé)
              </div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.7 }}>
                Chaque visiteur a <strong>son propre topic</strong>. Répondez directement dedans.<br />
                <br />
                1. Créez un <strong>groupe Telegram</strong><br />
                2. Activez les <strong>Topics</strong> (Paramètres du groupe → Topics)<br />
                3. Ajoutez <strong>@ifichat_bot</strong> comme <strong>admin</strong><br />
                4. Envoyez le code <strong>{code}</strong> dans le groupe
              </div>
            </div>

            {/* Mode Privé */}
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14,
              padding: '18px 20px',
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#64748b', marginBottom: 8 }}>
                Mode Privé (simple)
              </div>
              <div style={{ fontSize: 13, color: '#666', lineHeight: 1.7 }}>
                Tous les messages dans un seul chat. Répondez avec Reply ou /r1.<br />
                <br />
                1. Ouvrez <strong>@ifichat_bot</strong> en privé<br />
                2. Envoyez <strong>/start</strong><br />
                3. Collez le code <strong>{code}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const [copiedMk, setCopiedMk] = useState(false);

  const mikrotikCmd = `/ip hotspot walled-garden
add dst-host=chat.ifiaas.com comment="ifiChat Widget"
add dst-host=twtbdwxixrlspbzqmpva.supabase.co comment="ifiChat API"
add dst-host=fonts.googleapis.com comment="ifiChat Fonts"
add dst-host=fonts.gstatic.com comment="ifiChat Fonts"`;

  function copyMikrotik() {
    navigator.clipboard.writeText(mikrotikCmd);
    setCopiedMk(true);
    setTimeout(() => setCopiedMk(false), 2000);
  }

  function renderEmbed() {
    return (
      <div>
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

        {/* MikroTik Section */}
        <div style={{
          marginTop: 28, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 16, overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#1E3A5F',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#fff',
            }}>MT</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Intégration MikroTik Hotspot</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>Pour les pages de login captive portal</div>
            </div>
          </div>

          <div style={{ padding: '18px 20px' }}>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 14px' }}>
              Pour que le widget fonctionne sur une page de login MikroTik, il faut autoriser les domaines ifiChat 
              dans le <strong>Walled Garden</strong>. Collez ces commandes dans le <strong>Terminal</strong> de votre routeur :
            </p>

            <div style={{
              background: '#0F172A', borderRadius: 12, padding: '14px 16px 10px', overflow: 'hidden',
            }}>
              <div style={{
                overflowX: 'auto', paddingBottom: 8,
                WebkitOverflowScrolling: 'touch',
              }}>
                <pre style={{
                  color: '#e2e8f0', fontSize: 12, fontFamily: '"Space Mono", monospace',
                  lineHeight: 1.8, margin: 0, whiteSpace: 'pre',
                }}>
                  <span style={{ color: '#94a3b8' }}># Ouvrir dans Terminal MikroTik :</span>{'\n'}
                  <span style={{ color: '#F472B6' }}>/ip hotspot walled-garden</span>{'\n'}
                  <span style={{ color: '#86EFAC' }}>add</span> dst-host=<span style={{ color: '#FBBF24' }}>chat.ifiaas.com</span> comment=<span style={{ color: '#86EFAC' }}>"ifiChat Widget"</span>{'\n'}
                  <span style={{ color: '#86EFAC' }}>add</span> dst-host=<span style={{ color: '#FBBF24' }}>twtbdwxixrlspbzqmpva.supabase.co</span> comment=<span style={{ color: '#86EFAC' }}>"ifiChat API"</span>{'\n'}
                  <span style={{ color: '#86EFAC' }}>add</span> dst-host=<span style={{ color: '#FBBF24' }}>fonts.googleapis.com</span> comment=<span style={{ color: '#86EFAC' }}>"ifiChat Fonts"</span>{'\n'}
                  <span style={{ color: '#86EFAC' }}>add</span> dst-host=<span style={{ color: '#FBBF24' }}>fonts.gstatic.com</span> comment=<span style={{ color: '#86EFAC' }}>"ifiChat Fonts"</span>
                </pre>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={copyMikrotik} style={{
                  background: copiedMk ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
                  border: 'none', color: copiedMk ? '#34D399' : '#fff',
                  padding: '8px 16px', borderRadius: 8,
                  fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                  transition: 'all 0.2s',
                }}>
                  {copiedMk ? Icon.check : Icon.copy} {copiedMk ? 'Copié !' : 'Copier les commandes'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
              <strong style={{ color: '#64748b' }}>Étapes :</strong><br />
              1. Ouvrez <strong>Winbox</strong> ou <strong>WebFig</strong> → Terminal<br />
              2. Collez les commandes ci-dessus<br />
              3. Ajoutez le code d'intégration dans votre <strong>login.html</strong><br />
              4. Uploadez le fichier dans <strong>Files</strong> du routeur
            </div>
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
      <div>
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
        * { box-sizing: border-box; }
        @media (max-width: 640px) {
          .dash-header { padding: 0 12px !important; }
          .dash-content { padding: 10px !important; }
          .dash-card { padding: 18px 14px !important; }
          .dash-tabs button { padding: 8px 12px !important; font-size: 12px !important; }
          .dash-tabs button svg { display: none; }
          .dash-plan-grid { grid-template-columns: 1fr !important; }
          .dash-widget-grid { grid-template-columns: 1fr !important; }
          .dash-embed-code { font-size: 11px !important; word-break: break-all; }
        }
        @keyframes toastIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, animation: 'toastIn 0.3s ease',
          background: toast.type === 'success' ? '#059669' : '#DC2626',
          color: '#fff', padding: '12px 24px', borderRadius: 12,
          fontSize: 14, fontWeight: 600, boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', gap: 8,
          maxWidth: 'calc(100vw - 32px)',
        }}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

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
        <div className="dash-card" style={{
          background: '#fff', borderRadius: 18, padding: '28px 24px',
          border: '1px solid #f0f0f0', minHeight: 300,
        }}>
          {tabContent[tab]?.()}
        </div>
      </div>
    </div>
  );
}
