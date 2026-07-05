-- Migration 2026-07-03: capture existing SECURITY DEFINER functions in the repo.
--
-- These three functions already exist in prod but were never committed to the
-- repo (they were created ad-hoc in the SQL Editor). Version-controlling them so
-- a fresh environment (staging/self-host) can be provisioned reproducibly and so
-- code review can see them. Definitions are byte-for-byte what prod runs today
-- (dumped via pg_get_functiondef); this migration is CREATE OR REPLACE + idempotent.
--
-- Security note: all three are SECURITY DEFINER (run as owner, bypass RLS) with a
-- pinned search_path, and are the ONLY pre-auth (anon) data path — the kid-login
-- profile picker and invite-code lookup. They intentionally expose minimal fields
-- (family name; child display_name/avatar) to a caller who already holds the
-- family invite code.

-- Look up a family by its invite code (case-insensitive). Anon-callable.
CREATE OR REPLACE FUNCTION public.lookup_family_by_invite_code(p_code text)
  RETURNS TABLE(id uuid, name text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
    SELECT id, name FROM public.families
    WHERE invite_code = upper(trim(p_code));
$function$;

-- List a family's UNLINKED child profiles (claimable during onboarding join).
-- Note: intentionally does NOT include child_id and filters user_id IS NULL —
-- this is the onboarding *claim* picker. The kid-login picker uses the separate
-- get_family_pin_profiles() (see 2026-07-03-child-pin-login.sql).
CREATE OR REPLACE FUNCTION public.get_family_children(p_family_id uuid)
  RETURNS TABLE(id uuid, display_name text, avatar_url text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
    SELECT id, display_name, avatar_url
    FROM public.family_members
    WHERE family_id = p_family_id
      AND role = 'child'
      AND user_id IS NULL;
$function$;

-- Claim a pre-registered (unlinked) child profile for the calling auth user.
CREATE OR REPLACE FUNCTION public.claim_child_profile(p_member_id uuid, p_family_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  DECLARE
    v_uid UUID := auth.uid();
  BEGIN
    UPDATE family_members
    SET user_id = v_uid
    WHERE id = p_member_id
      AND family_id = p_family_id
      AND user_id IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ребенок не найден';
    END IF;

    UPDATE user_profiles
    SET onboarding_step = 6, updated_at = NOW()
    WHERE id = v_uid;
  END;
$function$;
