-- Phase 5.7 code-review fix (CR-01): the own-row UPDATE policy from
-- 05.7-01-chat-read-marker.sql was row-scoped but not column-scoped. Because
-- PostgREST lets a client PATCH any column the policy allows, an
-- authenticated child could update privileged columns (role, child_id,
-- family_id) on their own family_members row and self-promote to parent,
-- unlocking every parent-guarded money mutation. Replace the policy with a
-- SECURITY DEFINER RPC that can update ONLY chat_last_read_at on the
-- caller's own row(s). Idempotent: safe to re-run.

DROP POLICY IF EXISTS "family_members_self_update" ON family_members;

CREATE OR REPLACE FUNCTION mark_chat_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE family_members
     SET chat_last_read_at = now()
   WHERE user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION mark_chat_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_chat_read() TO authenticated;
