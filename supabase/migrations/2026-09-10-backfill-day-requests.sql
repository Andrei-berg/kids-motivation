-- Migration 2026-09-10: back-filling past days.
--
-- Adds a per-child policy for whether/how a child may fill PAST days, and a
-- request/approval table so the "kid asks → parent approves → kid fills →
-- parent reviews → coins" flow has durable state.
--
-- children.backfill_mode:
--   'off'     — only a parent can fill a past day (Parent Center). Default.
--   'request' — the child may request a past day; a parent approves it, the
--               child fills it, a parent reviews the filled day, THEN coins are
--               credited (via the normal /api/wallet/award path, gated on a
--               'done' day_fill_requests row).
--   'open'    — the child may fill any past day within backfill_days with no
--               per-day approval; coins auto-credit (trust mode).
-- children.backfill_days: how many days back the child may reach (0–60).
--
-- day_fill_requests state machine:
--   requested → approved → submitted → done      (rejected from requested|submitted)
-- Coins are only ever credited once a row reaches 'done' (or in 'open' mode,
-- where no row is required). Mirrors behavior_marks' propose/approve model
-- (05.9-03-behavior-tags.sql) — including the INSERT WITH CHECK that lets a
-- non-service-role client create ONLY a 'requested' row, and the absence of any
-- client UPDATE/DELETE policy so every status transition must go through a
-- service-role server action.
--
-- Additive, idempotent.

-- ============================================================================
-- children.backfill_mode / backfill_days
-- ============================================================================

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS backfill_mode TEXT NOT NULL DEFAULT 'off',
  ADD COLUMN IF NOT EXISTS backfill_days INT  NOT NULL DEFAULT 7;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'children_backfill_mode_check'
  ) THEN
    ALTER TABLE public.children
      ADD CONSTRAINT children_backfill_mode_check
      CHECK (backfill_mode IN ('off', 'request', 'open'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'children_backfill_days_check'
  ) THEN
    ALTER TABLE public.children
      ADD CONSTRAINT children_backfill_days_check
      CHECK (backfill_days BETWEEN 0 AND 60);
  END IF;
END $$;

-- ============================================================================
-- TABLE: day_fill_requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.day_fill_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    UUID        NOT NULL REFERENCES public.families(id)  ON DELETE CASCADE,
  child_id     TEXT        NOT NULL REFERENCES public.children(id)  ON DELETE CASCADE,
  date         DATE        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'requested'
               CHECK (status IN ('requested', 'approved', 'submitted', 'done', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by   UUID,
  decided_at   TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  reviewed_by  UUID,
  reviewed_at  TIMESTAMPTZ,
  note         TEXT
);

-- One live request per child+date — re-requesting a rejected day upserts.
CREATE UNIQUE INDEX IF NOT EXISTS day_fill_requests_child_date_idx
  ON public.day_fill_requests (child_id, date);

CREATE INDEX IF NOT EXISTS day_fill_requests_family_status_idx
  ON public.day_fill_requests (family_id, status);

-- ============================================================================
-- ROW LEVEL SECURITY  (mirrors behavior_marks, 05.9-03)
-- ============================================================================

ALTER TABLE public.day_fill_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "day_fill_requests_select_own_family" ON public.day_fill_requests;
CREATE POLICY "day_fill_requests_select_own_family"
  ON public.day_fill_requests
  FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
  );

-- A non-service-role insert (any authenticated client, incl. a child) can ONLY
-- create a 'requested' row — it can never self-approve. The service-role client
-- used by the approval/review actions bypasses RLS entirely.
DROP POLICY IF EXISTS "day_fill_requests_insert_requested_only" ON public.day_fill_requests;
CREATE POLICY "day_fill_requests_insert_requested_only"
  ON public.day_fill_requests
  FOR INSERT
  WITH CHECK (
    status = 'requested'
    AND family_id IN (
      SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
    )
    AND child_id IN (
      SELECT id FROM public.children WHERE family_id IN (
        SELECT family_id FROM public.family_members WHERE user_id = auth.uid()
      )
    )
  );

-- Intentionally NO client UPDATE/DELETE policy: every status transition
-- (approve / reject / submit / review) is a service-role server action.
