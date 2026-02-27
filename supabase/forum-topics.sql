-- ============================================
-- ifiChat — Forum Topics Migration
-- Adds support for Telegram Forum Topics
-- ============================================

-- Add telegram_topic_id to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS telegram_topic_id BIGINT;

-- Index for fast lookup by topic_id
CREATE INDEX IF NOT EXISTS idx_conversations_topic_id ON conversations(telegram_topic_id) WHERE telegram_topic_id IS NOT NULL;

-- Add is_forum flag to clients (true = group with topics, false = private chat)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_is_forum BOOLEAN DEFAULT FALSE;
