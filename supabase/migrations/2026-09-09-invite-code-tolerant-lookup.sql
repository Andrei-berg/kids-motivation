-- Migration 2026-09-09: tolerant invite-code lookup.
--
-- lookup_family_by_invite_code() previously matched with
--   WHERE invite_code = upper(trim(p_code))
-- i.e. an exact string match. Legacy families carry 6-char md5-hex codes (e.g.
-- "0B83B3") that start with a digit and mix letters + digits, so a parent
-- hand-typing one easily enters "O" for "0" or "I"/"l" for "1" and the lookup
-- returns nothing ("Код не найден").
--
-- Fix: canonicalize both sides — uppercase, strip non-alphanumerics, and fold the
-- ambiguous glyphs O→0 and I/L→1. New codes (2026-07-05-invite-code-entropy.sql)
-- are drawn from an alphabet that already excludes 0 O 1 I L, so the fold is
-- lossless for them; stored hex codes never contain O/I/L, so folding the stored
-- side is a no-op and introduces no collisions.
--
-- Idempotent.

CREATE OR REPLACE FUNCTION public.canonical_invite_code(p_code text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path TO 'public'
AS $function$
  SELECT translate(
           regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g'),
           'OIL',
           '011'
         );
$function$;

CREATE OR REPLACE FUNCTION public.lookup_family_by_invite_code(p_code text)
  RETURNS TABLE(id uuid, name text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
    SELECT id, name FROM public.families
    WHERE public.canonical_invite_code(invite_code) = public.canonical_invite_code(p_code)
      AND public.canonical_invite_code(p_code) <> '';
$function$;
