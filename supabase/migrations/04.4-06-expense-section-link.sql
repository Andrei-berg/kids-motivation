-- Migration 04.4-06: link section monthly costs to expenses (per-month rows).
--
-- Sections (sports clubs) carry a monthly `cost`. To reflect that in the parent
-- Expenses view as accurate per-month history, we materialize one expense row
-- per (section, month). These columns + the partial unique index make that
-- generation idempotent (re-running never duplicates a section's month).
--
-- section_id : the source section (NULL for normal manually-entered expenses)
-- period     : 'YYYY-MM' the row represents (NULL for manual expenses)
--
-- Idempotent. Apply via SUPABASE_DB_URL or the SQL editor.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS period     TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_expense_section_period
  ON expenses (section_id, period)
  WHERE section_id IS NOT NULL AND period IS NOT NULL;
