-- Migration 2026-07-05: stronger invite codes (crypto RNG + larger alphabet).
--
-- BEFORE: invite_code default = upper(substr(md5(random()::text),1,6)) — 6 hex
-- chars = 16.7M space, and Postgres random() is NOT cryptographically secure, so
-- observing some codes could help predict others.
--
-- AFTER: 6 chars from a 31-symbol unambiguous alphabet (no 0/O/1/I/L — easier for
-- kids to read and type) drawn from gen_random_bytes (pgcrypto, CSPRNG). ~887M
-- space, crypto-strong. Length stays 6, so the fixed 6-box onboarding join input
-- and all existing 6-char codes keep working unchanged — this only affects the
-- default for NEWLY created families.
--
-- Idempotent. Requires pgcrypto (enabled in 2026-07-05-pin-credentials-lockout.sql).

create extension if not exists pgcrypto;

create or replace function public.gen_invite_code(p_len int default 6)
  returns text
  language plpgsql
  as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; -- 31 chars, no 0 O 1 I L
  result text := '';
  b bytea := gen_random_bytes(p_len);
  i int;
begin
  for i in 0..p_len - 1 loop
    -- modulo bias over 31 from a 256-value byte is negligible for this use
    result := result || substr(alphabet, (get_byte(b, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

alter table public.families
  alter column invite_code set default public.gen_invite_code(6);
