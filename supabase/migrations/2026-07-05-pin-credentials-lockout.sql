-- Migration 2026-07-05: password-less child PIN auth + authoritative lockout.
--
-- WHY. Child PIN login previously set the synthetic auth account's password = PIN,
-- so the PUBLIC Supabase token endpoint (anon key + derivable synthetic email)
-- could be brute-forced directly, bypassing any app-level rate limit. A 4-digit
-- PIN = 10k guesses.
--
-- NEW MODEL. The synthetic account gets a long RANDOM password (never the PIN), so
-- there is nothing to brute-force at the public endpoint. We verify the PIN
-- ourselves against a bcrypt hash (pgcrypto) inside verify_child_pin(), which also
-- enforces a per-child lockout. Because we are now the ONLY PIN verifier, the
-- lockout is authoritative. The route then mints a session via
-- generateLink+verifyOtp (service-only) — see app/api/kid/login.
--
-- Idempotent.

create extension if not exists pgcrypto;

-- Salted bcrypt hash of each PIN child's PIN. RLS-locked with NO policies, so
-- anon/authenticated cannot read it; only the service role (which bypasses RLS)
-- touches it, via the SECURITY DEFINER functions below.
create table if not exists public.child_pin_credentials (
  child_id   text primary key references public.children(id) on delete cascade,
  pin_hash   text not null,
  updated_at timestamptz not null default now()
);
alter table public.child_pin_credentials enable row level security;

-- Per-child failed-attempt tracking for the lockout.
create table if not exists public.pin_login_attempts (
  child_id          text primary key references public.children(id) on delete cascade,
  fail_count        int not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until      timestamptz
);
alter table public.pin_login_attempts enable row level security;

-- Store/replace a child's PIN hash (bcrypt). Clears any active lockout on change.
create or replace function public.set_child_pin_hash(p_child_id text, p_pin text)
  returns void
  language plpgsql
  security definer
  set search_path to 'public', 'extensions'
as $$
begin
  insert into public.child_pin_credentials(child_id, pin_hash, updated_at)
    values (p_child_id, crypt(p_pin, gen_salt('bf')), now())
  on conflict (child_id) do update
    set pin_hash = excluded.pin_hash, updated_at = now();
  delete from public.pin_login_attempts where child_id = p_child_id;
end;
$$;

-- Verify a PIN with an atomic lockout. Returns:
--   status = 'ok'      → PIN correct, attempts reset
--            'bad_pin' → PIN wrong (attempt recorded)
--            'locked'  → too many recent failures; locked_until is when to retry
--            'no_pin'  → no PIN set for this child
-- Policy: 5 failures within a 15-minute window → lock for 15 minutes.
create or replace function public.verify_child_pin(p_child_id text, p_pin text)
  returns table(status text, locked_until timestamptz)
  language plpgsql
  security definer
  set search_path to 'public', 'extensions'
as $$
declare
  v_hash text;
  v_row  public.pin_login_attempts%rowtype;
  v_max_fails constant int := 5;
  v_window    constant interval := interval '15 minutes';
  v_lock      constant interval := interval '15 minutes';
begin
  select * into v_row from public.pin_login_attempts where child_id = p_child_id;

  -- Currently locked?
  if v_row.locked_until is not null and v_row.locked_until > now() then
    return query select 'locked'::text, v_row.locked_until;
    return;
  end if;

  select pin_hash into v_hash from public.child_pin_credentials where child_id = p_child_id;
  if v_hash is null then
    return query select 'no_pin'::text, null::timestamptz;
    return;
  end if;

  if crypt(p_pin, v_hash) = v_hash then
    delete from public.pin_login_attempts where child_id = p_child_id;  -- success: reset
    return query select 'ok'::text, null::timestamptz;
    return;
  end if;

  -- Wrong PIN: record within the sliding window.
  if v_row.child_id is null then
    insert into public.pin_login_attempts(child_id, fail_count, window_started_at)
      values (p_child_id, 1, now());
  elsif v_row.window_started_at < now() - v_window then
    update public.pin_login_attempts
      set fail_count = 1, window_started_at = now(), locked_until = null
      where child_id = p_child_id;
  else
    update public.pin_login_attempts
      set fail_count = fail_count + 1
      where child_id = p_child_id
      returning * into v_row;
    if v_row.fail_count >= v_max_fails then
      update public.pin_login_attempts
        set locked_until = now() + v_lock
        where child_id = p_child_id
        returning pin_login_attempts.locked_until into v_row.locked_until;
      return query select 'locked'::text, v_row.locked_until;
      return;
    end if;
  end if;

  return query select 'bad_pin'::text, null::timestamptz;
end;
$$;

-- These functions must be callable only by the server (service role), never by
-- anon/authenticated clients. Lock them down.
revoke execute on function public.set_child_pin_hash(text, text) from public, anon, authenticated;
revoke execute on function public.verify_child_pin(text, text)   from public, anon, authenticated;
grant  execute on function public.set_child_pin_hash(text, text) to service_role;
grant  execute on function public.verify_child_pin(text, text)   to service_role;
