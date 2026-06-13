-- Migration: idempotency keys for wallet_transactions
-- Run in Supabase SQL Editor.
--
-- Purpose: coin awards (grades, room, behavior, sport, activities, book, streak)
-- must be awarded at most once per source record. Server-side award routes
-- insert a transaction tagged with (source_type, source_id); a partial unique
-- index prevents a second award for the same source.
--
-- Additive only — existing rows have NULL source_type/source_id and are
-- unaffected (the unique index ignores NULLs).

ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS source_id   TEXT;

-- One award per (child, source_type, source_id). Partial: only enforced when
-- both tags are present, so legacy/manual transactions (NULL tags) are exempt.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wallet_tx_source
  ON wallet_transactions (child_id, source_type, source_id)
  WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
