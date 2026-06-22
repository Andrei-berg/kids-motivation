-- Kid savings-goals: add an emoji so a child can personalize the dream they're
-- saving toward (🚲 🎮 🎧 …). Defaults to 🎯 for existing rows.
ALTER TABLE goals ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '🎯';
