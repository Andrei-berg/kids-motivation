-- Parent-set goals (challenges): a parent creates a goal with a DEADLINE and a
-- REWARD; when the child accomplishes it the parent marks it done and the reward
-- is granted. Reuses the goals table alongside the kid's own savings goals.
--   kind: 'savings' (kid's own, coins-progress) | 'parent' (parent challenge).
--   reward_type: 'coins' (bonus coins) | 'prize' (named real-world reward).
ALTER TABLE goals ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'savings';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS reward_type TEXT;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS reward_coins INTEGER;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS reward_text TEXT;
