-- ============================================
-- ifiChat — Schéma Supabase complet
-- Rétention: Messages 3 mois | Fichiers 1 mois
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ═══════════════════════════════════════════
-- TABLE: clients
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  domain TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  telegram_chat_id BIGINT,
  telegram_linked BOOLEAN DEFAULT FALSE,
  telegram_link_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_google_id ON clients(google_id);
CREATE INDEX idx_clients_telegram_chat_id ON clients(telegram_chat_id);
CREATE INDEX idx_clients_telegram_link_code ON clients(telegram_link_code);

-- ═══════════════════════════════════════════
-- TABLE: subscriptions
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('trial', 'monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  amount INTEGER DEFAULT 0,
  fedapay_transaction_id TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_client_id ON subscriptions(client_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);

-- ═══════════════════════════════════════════
-- TABLE: visitors
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  whatsapp TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visitors_client_id ON visitors(client_id);
CREATE INDEX idx_visitors_whatsapp ON visitors(client_id, whatsapp);

-- ═══════════════════════════════════════════
-- TABLE: conversations
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  unread_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_client_id ON conversations(client_id);
CREATE INDEX idx_conversations_visitor_id ON conversations(visitor_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at);

-- ═══════════════════════════════════════════
-- TABLE: messages
-- Rétention: 3 mois (90 jours)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'client', 'system')),
  content TEXT,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'file')),
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_mime_type TEXT,
  telegram_message_id BIGINT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_telegram_msg_id ON messages(telegram_message_id);
CREATE INDEX idx_messages_file_url ON messages(file_url) WHERE file_url IS NOT NULL;

-- ═══════════════════════════════════════════
-- TABLE: widget_configs
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS widget_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID UNIQUE NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  primary_color TEXT DEFAULT '#0D9488',
  welcome_message TEXT DEFAULT 'Bonjour ! Comment pouvons-nous vous aider ?',
  placeholder_text TEXT DEFAULT 'Tapez votre message...',
  position TEXT DEFAULT 'bottom-right' CHECK (position IN ('bottom-right', 'bottom-left')),
  business_name TEXT,
  business_hours TEXT DEFAULT '08:00-18:00',
  away_message TEXT DEFAULT 'Nous sommes absents. Laissez un message, nous vous répondrons dès que possible.',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- TABLE: notifications_log
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  telegram_message_id BIGINT,
  telegram_sent BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_log_telegram_msg ON notifications_log(telegram_message_id);

-- ═══════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════

-- Auto-update last_message_at on conversations
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NOW(),
      unread_count = CASE
        WHEN NEW.sender_type = 'visitor' THEN unread_count + 1
        ELSE unread_count
      END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_conversation_last_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Auto-create widget_config when client is created
CREATE OR REPLACE FUNCTION create_default_widget_config()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO widget_configs (client_id, business_name)
  VALUES (NEW.id, NEW.name)
  ON CONFLICT (client_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_widget_config
AFTER INSERT ON clients
FOR EACH ROW EXECUTE FUNCTION create_default_widget_config();

-- Auto-create trial subscription when client is created
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_admin = FALSE THEN
    INSERT INTO subscriptions (client_id, plan, status, starts_at, expires_at)
    VALUES (
      NEW.id,
      'trial',
      'active',
      NOW(),
      NOW() + INTERVAL '7 days'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_trial
AFTER INSERT ON clients
FOR EACH ROW EXECUTE FUNCTION create_trial_subscription();

-- Generate unique Telegram link code
CREATE OR REPLACE FUNCTION generate_telegram_link_code(client_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'IFICHAT-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6));
  UPDATE clients SET telegram_link_code = code WHERE id = client_uuid;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate link code on client creation
CREATE OR REPLACE FUNCTION auto_generate_link_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_admin = FALSE AND NEW.telegram_link_code IS NULL THEN
    NEW.telegram_link_code := 'IFICHAT-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_link_code
BEFORE INSERT ON clients
FOR EACH ROW EXECUTE FUNCTION auto_generate_link_code();

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_widget_configs_updated_at BEFORE UPDATE ON widget_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_log ENABLE ROW LEVEL SECURITY;

-- Clients: can see/edit their own record; admin sees all
CREATE POLICY "clients_own" ON clients FOR ALL USING (
  google_id = auth.uid()::TEXT OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

-- Subscriptions: own or admin
CREATE POLICY "subscriptions_own" ON subscriptions FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

-- Visitors: own clients' visitors or admin
CREATE POLICY "visitors_own" ON visitors FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

-- Conversations: own or admin
CREATE POLICY "conversations_own" ON conversations FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

-- Messages: via conversation ownership or admin
CREATE POLICY "messages_own" ON messages FOR ALL USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE client_id IN (
      SELECT id FROM clients WHERE google_id = auth.uid()::TEXT
    )
  ) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

-- Widget configs: own or admin
CREATE POLICY "widget_configs_own" ON widget_configs FOR ALL USING (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

-- Notifications: admin only
CREATE POLICY "notifications_admin" ON notifications_log FOR ALL USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

-- ═══════════════════════════════════════════
-- REALTIME
-- ═══════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- ═══════════════════════════════════════════
-- STORAGE BUCKET
-- ═══════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "chat_files_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-files');
CREATE POLICY "chat_files_read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-files');
CREATE POLICY "chat_files_delete" ON storage.objects FOR DELETE USING (bucket_id = 'chat-files');

-- ═══════════════════════════════════════════
-- CRON JOBS
-- Fichiers: suppression après 30 jours (1 mois)
-- Messages: suppression après 90 jours (3 mois)
-- ═══════════════════════════════════════════

-- Cron: appel de l'edge function de nettoyage tous les jours à 3h UTC
-- (Décommenter après avoir déployé les fonctions et configuré CRON_SECRET)
/*
SELECT cron.schedule(
  'ifichat-daily-cleanup',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-cleanup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
*/
