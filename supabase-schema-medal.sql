-- Medal of the Day table. Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS medals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id   TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id    TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  message     TEXT NOT NULL,
  coins       INT NOT NULL DEFAULT 0,
  sent_by     TEXT,           -- parent display_name
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS: family members can read medals for their family_id
-- Parents can insert; children can read only (enforced by role check in RLS)
ALTER TABLE medals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can read medals" ON medals
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can insert medals" ON medals
  FOR INSERT WITH CHECK (
    family_id IN (
      SELECT family_id FROM family_members WHERE user_id = auth.uid() AND role = 'parent'
    )
  );
