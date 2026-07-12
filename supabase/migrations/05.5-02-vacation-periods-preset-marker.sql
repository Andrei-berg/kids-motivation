-- Phase 5.5 Plan 01: vacation_periods.preset_id marker column (D-02).
-- Nullable — NULL means the row was manually created; a non-NULL value
-- identifies which bundled regional preset/variant materialized the row, so
-- a later re-apply (D-04: "replace preset periods" vs "add missing only")
-- can distinguish preset-sourced rows from hand-made ones without touching
-- manual entries. No RLS change — vacation_periods is already client-writable
-- family-isolation (unchanged by this migration). Idempotent: safe to re-run.

ALTER TABLE vacation_periods
  ADD COLUMN IF NOT EXISTS preset_id TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
