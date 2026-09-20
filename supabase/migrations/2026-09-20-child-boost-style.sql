-- Migration 2026-09-20: per-child weekly-boost detail-view style.
--
-- children.boost_style: which weekly-boost detail style a child sees when
-- tapping the inline BoostMeter — 'segmented-bar' | 'quest-checklist' |
-- 'ring-badges'. Default 'segmented-bar' (BOOST-01, D-10). Unlike
-- backfill_mode (a parent trust/policy decision), boost_style is self-serve
-- and kid-controlled via ProfileSheet — see app/kid/actions/boost-style.ts
-- (service-role write, requireFamilyMember + authorizeChildAction, same
-- guard chain as app/kid/actions/fill-style.ts). Not a parent policy field,
-- no new client UPDATE policy is added here: children already has
-- family-isolation RLS from rls.sql, and this column is written only
-- through the service-role action.
--
-- All three style literals are included in the CHECK now even though only
-- 'segmented-bar' is selectable in Phase 9.5 (D-10) — Phase 9.6
-- (boost-styles) needs no second migration to enable
-- 'quest-checklist'/'ring-badges'.
--
-- Additive, idempotent.

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS boost_style TEXT NOT NULL DEFAULT 'segmented-bar';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'children_boost_style_check'
  ) THEN
    ALTER TABLE public.children
      ADD CONSTRAINT children_boost_style_check
      CHECK (boost_style IN ('segmented-bar', 'quest-checklist', 'ring-badges'));
  END IF;
END $$;
