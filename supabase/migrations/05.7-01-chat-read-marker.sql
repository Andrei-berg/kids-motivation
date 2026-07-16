-- Phase 5.7 Plan 03 (D-04): per-member chat "last read" marker.
-- Adds chat_last_read_at to family_members and an own-row UPDATE RLS policy
-- so a member can mark only their own read state, never another member's
-- (threat T-057-06). Idempotent: safe to re-run.

ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS chat_last_read_at TIMESTAMPTZ;

-- The existing "family_members_update_delete" policy (rls.sql) restricts
-- UPDATE/DELETE to parents of the family. This additional permissive policy
-- lets a member (parent, child, or extended) update their OWN row only —
-- Postgres OR's multiple permissive policies for the same command, so this
-- adds self-service access without loosening the parent-wide policy.
DROP POLICY IF EXISTS "family_members_self_update" ON family_members;

CREATE POLICY "family_members_self_update" ON family_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
