-- ============================================
-- Table notifications pour le dashboard
-- Exécuter dans le SQL Editor de Supabase
-- ============================================

CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'welcome', 'payment', 'expiry_warning', 'expired', 'telegram_linked', 'new_message'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT, -- optional redirect link
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_client ON client_notifications(client_id, is_read, created_at DESC);

-- RLS
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select" ON client_notifications FOR SELECT USING (true);
CREATE POLICY "notif_insert" ON client_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON client_notifications FOR UPDATE USING (true);
CREATE POLICY "notif_delete" ON client_notifications FOR DELETE USING (true);
