-- Family Chat: chat_messages table, RLS policies, Realtime publication.
-- Run in Supabase SQL Editor before testing Phase 3.2.

-- Table definition
CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  sender_id    TEXT NOT NULL,        -- family_members.id (TEXT, not UUID — matches existing convention)
  sender_name  TEXT NOT NULL,
  sender_role  TEXT NOT NULL CHECK (sender_role IN ('parent', 'child')),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'sticker', 'system')),
  content      TEXT,
  sticker_id   TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_family_created
  ON chat_messages (family_id, created_at DESC);

-- Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read chat" ON chat_messages
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

-- Realtime: enable INSERT events on chat_messages
-- Note: If chat_messages is already added to the publication this statement is a no-op.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;
