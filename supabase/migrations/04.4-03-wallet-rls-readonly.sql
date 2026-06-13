-- Migration 04.4-03: lock money tables to SELECT-only for clients.
-- Run in Supabase SQL Editor AFTER deploying the server-side wallet routes
-- (branch security-fixes). Until then, clients still write these tables directly.
--
-- Effect: authenticated family members may READ their family's money rows, but
-- INSERT/UPDATE/DELETE are no longer granted to them (no write policy = deny).
-- All writes must go through the service-role server routes/actions, which
-- bypass RLS entirely. This closes the "child edits wallet via DevTools" hole.
--
-- Idempotent: safe to re-run. Drops the old FOR ALL family_isolation policies
-- and any legacy public policies, then installs a single SELECT policy.

-- Helper note: the membership subquery is wrapped in (SELECT auth.uid()) so it
-- is evaluated once per statement, not once per row.

DO $$
DECLARE
  t text;
  money_tables text[] := ARRAY[
    'wallet','wallet_transactions','wallet_settings','rewards',
    'reward_purchases','coin_exchanges','cash_withdrawals','p2p_transfers'
  ];
BEGIN
  FOREACH t IN ARRAY money_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Drop every existing policy on the table so no stale write policy remains.
    EXECUTE (
      SELECT string_agg(format('DROP POLICY IF EXISTS %I ON public.%I;', polname, t), ' ')
      FROM pg_policies WHERE schemaname = 'public' AND tablename = t
    );

    -- Re-create a read-only, family-scoped SELECT policy.
    EXECUTE format($f$
      CREATE POLICY %1$I ON public.%2$I
        FOR SELECT TO authenticated
        USING (family_id IN (
          SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid())
        ))
    $f$, t || '_select', t);
  END LOOP;
END $$;

-- p2p_debts has no family_id — scope reads via the family's children instead.
ALTER TABLE public.p2p_debts ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE p text;
BEGIN
  FOR p IN SELECT polname FROM pg_policies WHERE schemaname='public' AND tablename='p2p_debts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.p2p_debts;', p);
  END LOOP;
END $$;
CREATE POLICY p2p_debts_select ON public.p2p_debts
  FOR SELECT TO authenticated
  USING (
    debtor_child_id IN (
      SELECT id FROM children WHERE family_id IN (
        SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid())
      )
    )
    OR creditor_child_id IN (
      SELECT id FROM children WHERE family_id IN (
        SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid())
      )
    )
  );
