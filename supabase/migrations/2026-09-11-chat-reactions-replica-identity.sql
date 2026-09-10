-- Chat/feed reaction toggles were one-way: adding a 👍 showed up (INSERT
-- realtime carries the full new row), but removing it never reflected for
-- anyone. Postgres realtime DELETE payloads only carry the columns in the
-- table's REPLICA IDENTITY — default is the primary key alone — so the
-- `family_id=eq.<id>` filter on the DELETE subscription could never match and
-- the row stayed on screen. REPLICA IDENTITY FULL puts every column in the
-- DELETE payload so the filter (and realtime RLS) can evaluate it.
--
-- These are low-traffic tables; FULL replica identity costs nothing here.

ALTER TABLE chat_reactions          REPLICA IDENTITY FULL;
ALTER TABLE family_event_reactions  REPLICA IDENTITY FULL;
ALTER TABLE family_events           REPLICA IDENTITY FULL;
