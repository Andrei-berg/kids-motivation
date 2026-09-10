-- Fix: the dedup index on family_events was PARTIAL (WHERE ref_id IS NOT NULL),
-- and PostgREST's upsert `on_conflict=` cannot target a partial index — every
-- emitFeedEvent() upsert failed with "no unique or exclusion constraint
-- matching the ON CONFLICT specification", so no system feed events were
-- written. Replace it with a full unique index. NULL ref_ids (free-text notes)
-- stay non-colliding because NULLs are DISTINCT by default, and emitFeedEvent
-- plain-inserts those rows anyway.

DROP INDEX IF EXISTS family_events_dedup;

CREATE UNIQUE INDEX IF NOT EXISTS family_events_dedup
  ON family_events (family_id, kind, ref_type, ref_id);
