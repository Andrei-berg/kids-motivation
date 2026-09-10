-- Family Feed — a single shared stream of what happened in the family.
-- System writes most events (coins earned/spent, day filled, badges, streaks,
-- reward approvals, medal of the day, reading approvals, weekly boost) via the
-- service-role client; parents/extended members can post free-text notes.
-- Everyone in the family reads it; anyone in the family can react and comment.
--
-- Apply via the Supabase SQL Editor or `pg` (see CLAUDE.md → "Applying DB
-- migrations").

-- ─────────────────────────────────────────────────────────────────────────────
-- family_events
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id         TEXT REFERENCES children(id) ON DELETE CASCADE,   -- subject of the event, if any
  actor_member_id  TEXT,                                             -- family_members.id who authored (notes); null for system
  kind             TEXT NOT NULL CHECK (kind IN (
                     'coins_earned','coins_spent','day_filled','badge','streak',
                     'purchase','reward_approved','medal','reading_approved',
                     'level_up','boost','note')),
  title            TEXT NOT NULL,
  body             TEXT,
  amount           INTEGER,                                          -- coin delta, when the event is about money
  icon             TEXT,
  ref_type         TEXT NOT NULL DEFAULT 'misc',                     -- source table/domain
  ref_id           TEXT,                                             -- source key, for idempotency
  metadata         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS family_events_family_created
  ON family_events (family_id, created_at DESC);

-- One row per logical source event. emitFeedEvent() upserts on this key:
-- 'once' events ignore the conflict, 'bump' events refresh amount/title/created_at.
-- Must be a FULL (non-partial) unique index — PostgREST upsert on_conflict=
-- cannot target a partial one. NULL ref_ids (free-text notes) never collide
-- because NULLs are DISTINCT, and emitFeedEvent plain-inserts those anyway.
CREATE UNIQUE INDEX IF NOT EXISTS family_events_dedup
  ON family_events (family_id, kind, ref_type, ref_id);

ALTER TABLE family_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members read events" ON family_events;
CREATE POLICY "Family members read events" ON family_events
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

-- Clients may only ever insert their own free-text notes. Every other kind is
-- written by the service-role client, which bypasses RLS.
DROP POLICY IF EXISTS "Adults post notes" ON family_events;
CREATE POLICY "Adults post notes" ON family_events
  FOR INSERT WITH CHECK (
    kind = 'note'
    AND family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = auth.uid() AND role IN ('parent', 'extended')
    )
  );

-- A note's author can delete it; nothing else is client-deletable.
DROP POLICY IF EXISTS "Authors delete own notes" ON family_events;
CREATE POLICY "Authors delete own notes" ON family_events
  FOR DELETE USING (
    kind = 'note'
    AND actor_member_id IN (SELECT id::text FROM family_members WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- family_event_reactions  (mirrors chat_reactions)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_event_reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES family_events(id) ON DELETE CASCADE,
  family_id   UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id   TEXT NOT NULL,   -- family_members.id
  emoji       TEXT NOT NULL CHECK (emoji IN ('❤️','👍','🔥','🏆','😂','🎉')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, member_id, emoji)
);

CREATE INDEX IF NOT EXISTS family_event_reactions_event_idx
  ON family_event_reactions (event_id);

ALTER TABLE family_event_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members read event reactions" ON family_event_reactions;
CREATE POLICY "Family members read event reactions" ON family_event_reactions
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Family members add event reactions" ON family_event_reactions;
CREATE POLICY "Family members add event reactions" ON family_event_reactions
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Members delete own event reactions" ON family_event_reactions;
CREATE POLICY "Members delete own event reactions" ON family_event_reactions
  FOR DELETE USING (
    member_id IN (SELECT id::text FROM family_members WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- family_event_comments
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_event_comments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES family_events(id) ON DELETE CASCADE,
  family_id         UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  author_member_id  TEXT NOT NULL,   -- family_members.id
  author_name       TEXT NOT NULL,
  body              TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS family_event_comments_event_idx
  ON family_event_comments (event_id, created_at);

ALTER TABLE family_event_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members read event comments" ON family_event_comments;
CREATE POLICY "Family members read event comments" ON family_event_comments
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Family members add event comments" ON family_event_comments;
CREATE POLICY "Family members add event comments" ON family_event_comments
  FOR INSERT WITH CHECK (
    family_id IN (SELECT family_id FROM family_members WHERE user_id = auth.uid())
    AND author_member_id IN (SELECT id::text FROM family_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authors delete own event comments" ON family_event_comments;
CREATE POLICY "Authors delete own event comments" ON family_event_comments
  FOR DELETE USING (
    author_member_id IN (SELECT id::text FROM family_members WHERE user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'family_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE family_events;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'family_event_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE family_event_reactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'family_event_comments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE family_event_comments;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Feed availability toggles (per-family) — read via getWalletSettings.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE wallet_settings
  ADD COLUMN IF NOT EXISTS feed_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS feed_visible_to_kids BOOLEAN NOT NULL DEFAULT true;
