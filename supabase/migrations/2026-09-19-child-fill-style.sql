-- Migration 2026-09-19: per-child day-fill interaction style.
--
-- children.fill_style: which day-fill interaction style a child sees on
-- /kid/day — 'tile-sheet' | 'story-stepper' | 'sticky-summary'. Default
-- 'sticky-summary' (DAYFORM-06). Unlike backfill_mode (a parent trust/policy
-- decision), fill_style is self-serve and kid-controlled via ProfileSheet —
-- see app/kid/actions/fill-style.ts (service-role write, requireFamilyMember +
-- authorizeChildAction, same guard chain as app/kid/actions/avatar.ts). Not a
-- parent policy field, no new client UPDATE policy is added here: children
-- already has family-isolation RLS from rls.sql, and this column is written
-- only through the service-role action, same as avatar_kind/avatar_config.
--
-- All three style literals are included in the CHECK now even though only
-- 'sticky-summary' is selectable in Phase 9.3 (D-01) — Phase 9.4 (dayform-
-- styles) needs no second migration to enable 'tile-sheet'/'story-stepper'.
--
-- Additive, idempotent.

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS fill_style TEXT NOT NULL DEFAULT 'sticky-summary';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'children_fill_style_check'
  ) THEN
    ALTER TABLE public.children
      ADD CONSTRAINT children_fill_style_check
      CHECK (fill_style IN ('tile-sheet', 'story-stepper', 'sticky-summary'));
  END IF;
END $$;
