-- Run in Supabase SQL Editor after supabase-schema-chat.sql

CREATE TABLE IF NOT EXISTS chat_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL,   -- family_members.id
  emoji       TEXT NOT NULL CHECK (emoji IN ('❤️','👍','🔥','🏆')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (message_id, member_id, emoji)
);

CREATE INDEX IF NOT EXISTS chat_reactions_message_idx ON chat_reactions (message_id);

ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read reactions" ON chat_reactions
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Family members can insert reactions" ON chat_reactions
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete own reactions" ON chat_reactions
  FOR DELETE USING (
    member_id IN (SELECT id::text FROM family_members WHERE user_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
