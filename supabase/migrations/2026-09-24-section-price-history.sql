-- Section price history: "Борьба 6500 → 7000 с сентября".
--
-- Sections carry a monthly `cost`; expenses hold one row per (section, month).
-- When a price changes we keep the old months as-is, rewrite the months from
-- `effective_period` on, and log the change here so the kid/parent can see WHY
-- the monthly total moved. Written only by /api/expenses/section-price
-- (service role); clients get SELECT for their own family.
--
-- Idempotent.

CREATE TABLE IF NOT EXISTS section_price_changes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        UUID NOT NULL,
  section_id       UUID NOT NULL,
  child_id         TEXT NOT NULL,
  effective_period TEXT NOT NULL,            -- 'YYYY-MM' the new price starts in
  old_cost         DECIMAL(10, 2),
  new_cost         DECIMAL(10, 2) NOT NULL,
  changed_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_section_price_changes_section
  ON section_price_changes (section_id, effective_period);

ALTER TABLE section_price_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "section_price_changes_select" ON section_price_changes;
CREATE POLICY "section_price_changes_select" ON section_price_changes
  FOR SELECT TO authenticated
  USING (
    family_id IN (
      SELECT family_id FROM family_members
      WHERE user_id = (SELECT auth.uid())
    )
  );
-- No INSERT/UPDATE/DELETE policies: writes are service-role only.
