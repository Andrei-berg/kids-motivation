-- Phase 5.10 Plan 01: per-child trust limit + allowance schema.
--   children.trust_limit_coins: per-child auto-approve ceiling for coin
--     purchases (D-01). DEFAULT 0 = trust-limit disabled — a family that
--     never touches this setting gets zero trust-limit auto-approvals until
--     a parent explicitly opts in with a value > 0 (D-04).
--   children.allowance_amount / allowance_period / allowance_anchor:
--     per-child scheduled allowance (D-05). NULL allowance_period = allowance
--     off. allowance_period is constrained to 'weekly' | 'monthly' (D-06);
--     allowance_anchor is day-of-week (1-7) for weekly or day-of-month
--     (1-31) for monthly, interpreted by the allowance cron route.
-- No backfill needed — all four columns are additive and default to their
-- "feature off" state for every existing row.
--
-- No idempotency index is added here: the existing uniq_wallet_tx_source
-- unique index on wallet_transactions(child_id, source_type, source_id)
-- (04.4-02-wallet-tx-idempotency.sql) already covers source_type='allowance'.

ALTER TABLE children ADD COLUMN IF NOT EXISTS trust_limit_coins INTEGER NOT NULL DEFAULT 0;

ALTER TABLE children ADD COLUMN IF NOT EXISTS allowance_amount INTEGER;

-- CHECK constraint MUST be inlined on this add-column clause below (Postgres
-- has no ADD CONSTRAINT IF NOT EXISTS) so a re-run of this file is a no-op
-- once the column exists, instead of erroring on a duplicate constraint from
-- a separate ALTER TABLE ... ADD CONSTRAINT statement.
ALTER TABLE children ADD COLUMN IF NOT EXISTS allowance_period TEXT CHECK (allowance_period IN ('weekly', 'monthly'));

ALTER TABLE children ADD COLUMN IF NOT EXISTS allowance_anchor INTEGER;
