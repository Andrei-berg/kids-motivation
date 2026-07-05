-- Migration 2026-07-05 (fix): pin functions must see pgcrypto (crypt/gen_salt).
--
-- On Supabase, pgcrypto lives in the `extensions` schema, not `public`. The
-- previous definitions pinned search_path to 'public' only, so crypt()/gen_salt()
-- resolved to nothing → "function gen_salt(unknown) does not exist". Re-create both
-- with search_path = public, extensions (covers pgcrypto in either schema) while
-- keeping the pinned path (a SECURITY DEFINER best practice). Logic is unchanged.
--
-- Idempotent.

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
    delete from public.pin_login_attempts where child_id = p_child_id;
    return query select 'ok'::text, null::timestamptz;
    return;
  end if;

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

revoke execute on function public.set_child_pin_hash(text, text) from public, anon, authenticated;
revoke execute on function public.verify_child_pin(text, text)   from public, anon, authenticated;
grant  execute on function public.set_child_pin_hash(text, text) to service_role;
grant  execute on function public.verify_child_pin(text, text)   to service_role;
