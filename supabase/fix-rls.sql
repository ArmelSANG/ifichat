-- ============================================
-- FIX RLS: Permettre la création de clients
-- Exécuter dans le SQL Editor de Supabase
-- ============================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "clients_own" ON clients;
DROP POLICY IF EXISTS "subscriptions_own" ON subscriptions;
DROP POLICY IF EXISTS "visitors_own" ON visitors;
DROP POLICY IF EXISTS "conversations_own" ON conversations;
DROP POLICY IF EXISTS "messages_own" ON messages;
DROP POLICY IF EXISTS "widget_configs_own" ON widget_configs;
DROP POLICY IF EXISTS "notifications_admin" ON notifications_log;

-- ═══ CLIENTS ═══
-- SELECT: voir son propre profil ou admin voit tout
CREATE POLICY "clients_select" ON clients FOR SELECT USING (
  google_id = auth.uid()::TEXT OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

-- INSERT: un utilisateur peut créer son propre profil
CREATE POLICY "clients_insert" ON clients FOR INSERT WITH CHECK (
  google_id = auth.uid()::TEXT
);

-- UPDATE: modifier son propre profil ou admin
CREATE POLICY "clients_update" ON clients FOR UPDATE USING (
  google_id = auth.uid()::TEXT OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

-- ═══ SUBSCRIPTIONS ═══
CREATE POLICY "subscriptions_select" ON subscriptions FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

CREATE POLICY "subscriptions_insert" ON subscriptions FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT)
);

-- ═══ VISITORS ═══
CREATE POLICY "visitors_select" ON visitors FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

CREATE POLICY "visitors_insert" ON visitors FOR INSERT WITH CHECK (true);

-- ═══ CONVERSATIONS ═══
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

-- ═══ MESSAGES ═══
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM conversations WHERE client_id IN (
      SELECT id FROM clients WHERE google_id = auth.uid()::TEXT
    )
  ) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (true);

-- ═══ WIDGET CONFIGS ═══
CREATE POLICY "widget_configs_select" ON widget_configs FOR SELECT USING (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT) OR
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

CREATE POLICY "widget_configs_update" ON widget_configs FOR UPDATE USING (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT)
);

CREATE POLICY "widget_configs_insert" ON widget_configs FOR INSERT WITH CHECK (
  client_id IN (SELECT id FROM clients WHERE google_id = auth.uid()::TEXT)
);

-- ═══ NOTIFICATIONS ═══
CREATE POLICY "notifications_select" ON notifications_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);

CREATE POLICY "notifications_insert" ON notifications_log FOR INSERT WITH CHECK (true);
