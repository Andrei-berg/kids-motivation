-- Migration 2026-07-02: atomic wallet balance mutations (concurrency fix)
--
-- PROBLEM. Every money path (award, purchase, exchange, withdraw, p2p) currently
-- reads the wallet row, computes the new balance in JS, then writes the ABSOLUTE
-- value back. Two concurrent requests read the same starting balance and the
-- second write clobbers the first (lost update): a child who spends 80 + 80 coins
-- back-to-back can end up debited only 80. The unique index on
-- wallet_transactions(child_id, source_type, source_id) guards against
-- double-awarding one source, but NOT against this class of race.
--
-- FIX. Move the balance mutation into a single guarded UPDATE so Postgres applies
-- the delta atomically under a row lock. The WHERE clause enforces non-negative
-- balances in the same statement, so an overspend can never be committed even if
-- two requests interleave. Business logic (exchange rate, bonus, reward price,
-- p2p limits) stays in the route; only the act of moving the balance changes.
--
-- This migration is ADDITIVE and safe to apply before the routes are switched
-- over: nothing calls wallet_apply() until the route code is updated. Idempotent.
--
-- Apply via Supabase SQL Editor or:
--   node --env-file=.env.local -e '...' (see CLAUDE.md "Applying DB migrations")
-- Verify with: node --env-file=.env.local scripts/verify-atomic-wallet.mjs

-- IMPORTANT domain note: negative balances are LEGITIMATE in this app. Penalties
-- (grade-2/-3 give negative coins) are applied without clamping, and there is a
-- debt concept (p2p_max_debt). So there is NO blanket non-negative invariant, and
-- the lower bound is OPT-IN: spend paths (purchase/exchange/withdraw) pass
-- p_min_coins = 0 so a child cannot spend into the red; penalty/award and p2p
-- paths pass NULL (no floor) to preserve today's behaviour.
create or replace function public.wallet_apply(
  p_child_id        text,
  p_coins_delta     integer default 0,
  p_money_delta     numeric default 0,
  p_earned_coins    integer default 0,
  p_spent_coins     integer default 0,
  p_exchanged_coins integer default 0,
  p_earned_money    numeric default 0,
  p_spent_money     numeric default 0,
  -- Optional lower bounds. NULL = no floor (negative/debt allowed). Set to 0 on
  -- spend paths to make an overspend impossible even under concurrency.
  p_min_coins       integer default null,
  p_min_money       numeric default null
)
returns table(coins integer, money numeric)
language plpgsql
as $$
declare
  v_coins integer;
  v_money numeric;
begin
  -- Single atomic statement: the row is locked for the duration of the UPDATE and
  -- the floor (when supplied) is evaluated against the CURRENT row value, not a
  -- value read earlier by the caller. Concurrent callers serialize here, which is
  -- what fixes the read-modify-write lost-update race.
  update public.wallet w
     set coins                 = w.coins + p_coins_delta,
         money                 = w.money + p_money_delta,
         total_earned_coins    = w.total_earned_coins + p_earned_coins,
         total_spent_coins     = w.total_spent_coins + p_spent_coins,
         total_exchanged_coins = w.total_exchanged_coins + p_exchanged_coins,
         total_earned_money    = w.total_earned_money + p_earned_money,
         total_spent_money     = w.total_spent_money + p_spent_money
   where w.child_id = p_child_id
     and (p_min_coins is null or w.coins + p_coins_delta >= p_min_coins)
     and (p_min_money is null or w.money + p_money_delta >= p_min_money)
  returning w.coins, w.money into v_coins, v_money;

  -- No row updated → either the wallet does not exist, or a supplied floor was
  -- violated (insufficient funds on a spend path). Callers pre-check existence for
  -- a clean 404, so in practice this signals an overspend. P0001 → 400 in the route.
  if not found then
    raise exception 'INSUFFICIENT_FUNDS'
      using errcode = 'P0001',
            hint = 'wallet missing or balance would breach the supplied floor';
  end if;

  return query select v_coins, v_money;
end;
$$;

comment on function public.wallet_apply is
  'Atomic wallet balance delta (fixes read-modify-write races). Lower bound is '
  'opt-in via p_min_coins/p_min_money (NULL = negative/debt allowed). Raises P0001 '
  '(INSUFFICIENT_FUNDS) if the wallet is missing or a supplied floor would be breached.';
