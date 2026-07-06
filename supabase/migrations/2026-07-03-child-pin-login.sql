-- Migration 2026-07-03: repair the child code+PIN login path.
--
-- CONTEXT. Kid PIN login was broken end-to-end: the login profile picker used
-- get_family_children(), which returns ONLY unlinked kids and does NOT return
-- child_id, and the login page then tried to resolve child_id with an anon
-- read of family_members (blocked by RLS since anon policies were dropped in
-- 04.4-04). Result: no child could ever log in with a PIN.
--
-- FIX (this migration + app changes):
--   * pin_set flags which child profiles have a synthetic PIN account.
--   * get_family_pin_profiles() is a dedicated pre-auth picker for /kid/login:
--     it returns child_id (so the login page builds the synthetic email without
--     any table read) and includes ALREADY-LINKED kids (so re-login works),
--     scoped to PIN-enabled profiles only. get_family_children() is left as-is
--     for the onboarding *claim* flow.
--
-- Idempotent.

-- Marks child profiles that have a synthetic PIN auth account
-- (child_<childId>@internal.familycoins.app). Set true by /api/set-child-pin.
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS pin_set boolean NOT NULL DEFAULT false;

-- Pre-auth login picker for /kid/login. Returns the info the login page needs to
-- sign in with the synthetic email, for every PIN-enabled child of the family
-- (linked or not). SECURITY DEFINER so it works for the anon role; exposes only
-- to a caller who already holds the family invite code (same trust boundary as
-- get_family_children / lookup_family_by_invite_code).
CREATE OR REPLACE FUNCTION public.get_family_pin_profiles(p_family_id uuid)
  RETURNS TABLE(member_id uuid, child_id text, display_name text, avatar_url text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
    SELECT id, child_id, display_name, avatar_url
    FROM public.family_members
    WHERE family_id = p_family_id
      AND role = 'child'
      AND pin_set = true;
$function$;

-- The anon role must be able to call the picker before the child authenticates.
GRANT EXECUTE ON FUNCTION public.get_family_pin_profiles(uuid) TO anon, authenticated;

comment on function public.get_family_pin_profiles is
  'Pre-auth kid-login picker: PIN-enabled child profiles for a family, incl. '
  'child_id so /kid/login can sign in without an (RLS-blocked) family_members read.';
