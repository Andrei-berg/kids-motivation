-- Fix: family_members_update_delete was ALL (blocked INSERT via USING clause).
-- The USING expression on an ALL policy acts as WITH CHECK on INSERT too,
-- so new users couldn't add themselves to a brand-new family they just created.
-- Fix: split into UPDATE-only + DELETE-only policies.

DROP POLICY IF EXISTS family_members_update_delete ON public.family_members;

CREATE POLICY family_members_update_delete ON public.family_members
  FOR UPDATE
  USING (family_id IN (SELECT get_my_parent_family_ids()));

CREATE POLICY family_members_delete ON public.family_members
  FOR DELETE
  USING (family_id IN (SELECT get_my_parent_family_ids()));
