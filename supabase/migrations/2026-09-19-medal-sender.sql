-- Makes the medal daily cap sender-aware for Phase 9.2 / FEED-07.
-- Apply via the Supabase SQL Editor or `pg` per CLAUDE.md → "Applying DB
-- migrations".
--
-- This migration deliberately adds NO INSERT policy for children: the
-- kid-initiated medal send (`app/actions/send-kid-medal.ts`) runs
-- service-role behind an app-level guard (see
-- .planning/phases/09.2-feed-social/09.2-CONTEXT.md canonical_refs).
-- Loosening RLS on `medals` for children is explicitly forbidden.

-- sender_role: every medal written before this phase came from the
-- parent-only `sendMedal` path, so the DEFAULT 'parent' correctly backfills
-- every existing row in place.
ALTER TABLE medals ADD COLUMN IF NOT EXISTS sender_role TEXT NOT NULL DEFAULT 'parent';

-- sender_member_id: nullable family_members.id of the sender, same TEXT
-- convention as family_events.actor_member_id. Null for parent-sent rows.
ALTER TABLE medals ADD COLUMN IF NOT EXISTS sender_member_id TEXT;

-- ADD CONSTRAINT has no IF NOT EXISTS, so this guard is what makes the file
-- re-runnable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medals_sender_role_chk'
  ) THEN
    ALTER TABLE medals ADD CONSTRAINT medals_sender_role_chk
      CHECK (sender_role IN ('parent', 'child'));
  END IF;
END $$;

-- D-09: one parent medal AND one kid medal per recipient per day, enforced
-- in Postgres so two concurrent requests cannot both pass an app-level read
-- check.
CREATE UNIQUE INDEX IF NOT EXISTS medals_recipient_day_role
  ON medals (child_id, date, sender_role);

-- D-10: one kid-sent medal per sender per day in total. Partial so parent
-- rows (sender_member_id IS NULL) are excluded. Nothing upserts on this
-- index, so partiality is safe here (unlike family_events_dedup, which had
-- to be made full for PostgREST on_conflict= — see
-- 2026-09-11-family-feed-fix-dedup-index.sql; do not repeat that mistake by
-- making this index a conflict target anywhere).
CREATE UNIQUE INDEX IF NOT EXISTS medals_kid_sender_day
  ON medals (sender_member_id, date) WHERE sender_role = 'child';

-- Determination: family_events_dedup (family_id, kind, ref_type, ref_id)
-- needs NO change. The kid path avoids colliding with a same-day parent
-- medal by using ref_id = '<childId>:<date>:kid' instead of
-- '<childId>:<date>', so the existing family_events_dedup unique index
-- already separates the two rows.
