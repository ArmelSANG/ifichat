-- ============================================
-- ifiChat — Full Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Forum topics columns
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS telegram_topic_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_conversations_topic_id ON conversations(telegram_topic_id) WHERE telegram_topic_id IS NOT NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS telegram_is_forum BOOLEAN DEFAULT FALSE;

-- 2. Widget extras columns
ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS avatar_emoji TEXT DEFAULT '💬';
ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS bottom_offset INTEGER DEFAULT 20;
ALTER TABLE widget_configs ADD COLUMN IF NOT EXISTS side_offset INTEGER DEFAULT 20;

-- 3. Storage bucket for files & images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  10485760,  -- 10MB
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
    'audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav',
    'application/pdf',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip','application/x-rar-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- 4. Storage policies — allow anyone to upload and read (widget visitors have no auth)
DROP POLICY IF EXISTS "chat-files-upload" ON storage.objects;
CREATE POLICY "chat-files-upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "chat-files-select" ON storage.objects;
CREATE POLICY "chat-files-select" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "chat-files-update" ON storage.objects;
CREATE POLICY "chat-files-update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'chat-files');

-- 5. Ensure realtime is enabled
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
