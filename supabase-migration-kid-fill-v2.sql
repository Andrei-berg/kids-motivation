-- Phase 2.4.1: kid self-fill columns

-- 1. days.filled_by: who filled in this day record
ALTER TABLE days
  ADD COLUMN IF NOT EXISTS filled_by TEXT CHECK (filled_by IN ('child', 'parent')) DEFAULT NULL;

-- 2. children.kid_fill_mode: what the child is allowed to fill
--    1 = mood + extra activities only
--    2 = room + mood + extra activities
--    3 = room + mood + sport + extra activities (everything except grades)
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS kid_fill_mode INTEGER DEFAULT 1
    CHECK (kid_fill_mode IN (1, 2, 3));

-- 3. days.mood: child's emoji mood selection
ALTER TABLE days
  ADD COLUMN IF NOT EXISTS mood TEXT DEFAULT NULL;

COMMENT ON COLUMN days.filled_by IS 'Who submitted this day record: child or parent. NULL means parent-only legacy record.';
COMMENT ON COLUMN children.kid_fill_mode IS 'Mode 1: mood+extras only. Mode 2: room+mood+extras. Mode 3: room+mood+sport+extras.';
COMMENT ON COLUMN days.mood IS 'Child mood emoji key: happy, neutral, sad, angry, tired';
