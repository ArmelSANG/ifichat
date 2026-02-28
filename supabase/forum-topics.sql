-- ============================================
-- ifiChat — Forum Topics + Widget Extras Migration
-- ============================================

-- Forum topics
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS telegram_topic_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_conversations_topic_id ON conversations(telegram_topic_id) WHERE telegram_topic_id IS NOT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_is_forum BOOLEAN DEFAULT FALSE;

-- Widget extras
ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '💬';
ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS bottom_offset INTEGER DEFAULT 20;
ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS side_offset INTEGER DEFAULT 20;
