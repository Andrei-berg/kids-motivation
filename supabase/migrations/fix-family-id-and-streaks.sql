-- Migration: fix null family_id in badges/streaks/reward_purchases + add behavior streak
-- Run in Supabase SQL Editor

-- 1. Backfill family_id for existing rows that were inserted without it
UPDATE badges
  SET family_id = (SELECT family_id FROM children WHERE id = badges.child_id)
  WHERE family_id IS NULL;

UPDATE streaks
  SET family_id = (SELECT family_id FROM children WHERE id = streaks.child_id)
  WHERE family_id IS NULL;

UPDATE reward_purchases
  SET family_id = (SELECT family_id FROM children WHERE id = reward_purchases.child_id)
  WHERE family_id IS NULL;

-- 2. Add auto-fill triggers so future inserts never miss family_id

CREATE OR REPLACE FUNCTION auto_family_id_from_child()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.family_id IS NULL AND NEW.child_id IS NOT NULL THEN
    SELECT family_id INTO NEW.family_id FROM children WHERE id = NEW.child_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_badges_family_id ON badges;
DROP TRIGGER IF EXISTS trg_streaks_family_id ON streaks;
DROP TRIGGER IF EXISTS trg_reward_purchases_family_id ON reward_purchases;

CREATE TRIGGER trg_badges_family_id
  BEFORE INSERT ON badges FOR EACH ROW EXECUTE FUNCTION auto_family_id_from_child();

CREATE TRIGGER trg_streaks_family_id
  BEFORE INSERT ON streaks FOR EACH ROW EXECUTE FUNCTION auto_family_id_from_child();

CREATE TRIGGER trg_reward_purchases_family_id
  BEFORE INSERT ON reward_purchases FOR EACH ROW EXECUTE FUNCTION auto_family_id_from_child();

-- 3. Seed strong_week streak rows for children that are missing them
INSERT INTO streaks (child_id, streak_type, current_count, best_count, last_updated, active, family_id)
SELECT
  c.id,
  'strong_week',
  0, 0, NOW()::date, false,
  c.family_id
FROM children c
WHERE c.active = true
  AND NOT EXISTS (
    SELECT 1 FROM streaks s WHERE s.child_id = c.id AND s.streak_type = 'strong_week'
  );

-- 4. Optional: reset XP to sum of badge xp_reward values (fixes phantom XP from failed badge inserts)
-- Uncomment only if XP values look inflated:
-- UPDATE children c
--   SET xp = COALESCE((SELECT SUM(b.xp_reward) FROM badges b WHERE b.child_id = c.id), 0),
--       level = GREATEST(1, FLOOR(COALESCE((SELECT SUM(b.xp_reward) FROM badges b WHERE b.child_id = c.id), 0) / 1000.0) + 1)
--   WHERE c.active = true;
