-- ============================================
-- Ajouter la table settings pour prix dynamiques
-- Exécuter dans le SQL Editor de Supabase
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plan prices
INSERT INTO settings (key, value) VALUES (
  'plans',
  '{
    "trial": { "name": "Essai gratuit", "price": 0, "duration": "7 jours", "features": ["1 widget", "Chat en temps réel", "Réponse Telegram", "Fichiers & images"] },
    "monthly": { "name": "Mensuel", "price": 600, "duration": "mois", "currency": "FCFA", "features": ["Tout de l''essai", "Conversations illimitées", "Widget personnalisable", "Support prioritaire"] },
    "yearly": { "name": "Annuel", "price": 6000, "duration": "an", "currency": "FCFA", "features": ["Tout du mensuel", "2 mois offerts", "Badge vérifié", "Support VIP Telegram"] }
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- RLS: everyone can read, only admin can update
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_read" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_update" ON settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);
CREATE POLICY "settings_insert" ON settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM clients c WHERE c.google_id = auth.uid()::TEXT AND c.is_admin = TRUE)
);
