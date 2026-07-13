-- Phase 5.5 review fix WR-03 (backfill): vacation_periods.child_filter was
-- populated by PeriodsManager with family_members.id, but every consumer
-- (getDayType via updateStreaks, DailyModal, kid day page) matches it against
-- children.id — per-child periods silently matched no one. The component now
-- stores family_members.child_id; this one-off backfill rewrites existing
-- rows that hold a family_members.id.
--
-- Safe/idempotent: only rows whose child_filter equals a family_members.id
-- (uuid) in the SAME family and whose member has a linked child_id are
-- touched; rows already holding 'all' or a children.id are left alone.

UPDATE public.vacation_periods vp
SET child_filter = fm.child_id
FROM public.family_members fm
WHERE vp.child_filter <> 'all'
  AND fm.id::text = vp.child_filter
  AND fm.family_id::text = vp.family_id::text
  AND fm.child_id IS NOT NULL;
