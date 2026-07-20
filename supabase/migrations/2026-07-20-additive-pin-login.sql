-- Migration 2026-07-20: make PIN login additive instead of exclusive.
--
-- Previously, setting a PIN for a child overwrote family_members.user_id to
-- point at a new synthetic account, silently breaking that child's existing
-- Google/email login (one identity per row, whichever was linked last wins).
-- The parent-facing "switch login method?" confirm was a symptom of this: the
-- two methods were mutually exclusive by construction.
--
-- New model: family_members.user_id always points at whatever identity is
-- CURRENTLY authoritative for that child (real account if they have one,
-- otherwise a synthetic PIN-only account). Setting a PIN only ever creates
-- the synthetic account when no identity is linked yet (bootstrap); it never
-- overwrites an existing link. PIN login (app/api/kid/login) resolves the
-- email to mint a session from THIS column at login time, instead of
-- assuming a hardcoded synthetic email pattern — so PIN-based login keeps
-- working for a child even after they claim a real account, since it just
-- mints a session for whichever identity user_id currently names.
--
-- has_real_account tracks whether that identity is a real (Google/email)
-- account vs. a synthetic PIN-only one, so the onboarding claim picker
-- (get_family_children) can keep offering a profile for a real-account claim
-- even after a PIN has been set for it — the two are no longer exclusive.
--
-- Idempotent.

ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS has_real_account boolean NOT NULL DEFAULT false;

-- Backfill: any child row already linked to a non-synthetic auth user is a
-- real account. Synthetic accounts are always child_<id>@internal.familycoins.app.
UPDATE public.family_members fm
SET has_real_account = true
FROM auth.users u
WHERE fm.user_id = u.id
  AND fm.role = 'child'
  AND u.email NOT LIKE 'child\_%@internal.familycoins.app' ESCAPE '\';

-- get_family_children(): the onboarding *claim* picker. Previously excluded
-- any child with a linked identity (user_id IS NULL). Now excludes only
-- children who already have a REAL account claimed — a PIN-only child can
-- still be claimed by a real Google/email account.
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
      AND NOT has_real_account;
$function$;

-- claim_child_profile(): now allowed even if a synthetic PIN account is
-- already linked (has_real_account = false) — the real account replaces it
-- as the authoritative identity, but PIN credentials and pin_set are left
-- untouched, so the child can keep using the family-code+PIN login too.
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
    SET user_id = v_uid,
        has_real_account = true
    WHERE id = p_member_id
      AND family_id = p_family_id
      AND NOT has_real_account;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ребенок не найден';
    END IF;

    UPDATE user_profiles
    SET onboarding_step = 6, updated_at = NOW()
    WHERE id = v_uid;
  END;
$function$;
