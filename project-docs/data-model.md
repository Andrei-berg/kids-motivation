# Data Model

## Architecture: Multi-Tenant with Family Isolation

All data is scoped to `family_id`. RLS policies ensure cross-family isolation.

## Core Identity Tables

### `auth.users` (Supabase managed)
- `id UUID PRIMARY KEY`
- `email TEXT`

### `user_profiles`
- `id UUID PRIMARY KEY` (references auth.users)
- `display_name TEXT`
- `avatar_url TEXT`
- `timezone TEXT DEFAULT 'UTC'`
- `onboarding_step INT DEFAULT 0`
- `created_at TIMESTAMPTZ`

### `families`
- `id UUID PRIMARY KEY`
- `name TEXT NOT NULL`
- `invite_code TEXT UNIQUE` (6-char, auto-generated)
- `created_by UUID` (references auth.users)
- `avatar_url TEXT`
- `created_at TIMESTAMPTZ`

### `family_members`
- `id UUID PRIMARY KEY`
- `family_id UUID` (references families)
- `user_id UUID NULLABLE` (references auth.users; null = pre-registered child profile)
- `role TEXT` — `'parent'` | `'child'` | `'extended'`
- `display_name TEXT`
- `avatar_url TEXT`
- `birth_year INT`
- `joined_at TIMESTAMPTZ`
- UNIQUE(family_id, user_id)

## Categories & Tasks

### `categories`
- `id UUID PRIMARY KEY`
- `family_id UUID`
- `name TEXT`
- `icon TEXT` (emoji)
- `color TEXT`
- `type TEXT` — `'study'` | `'home'` | `'sport'` | `'routine'` | `'custom'`
- `is_active BOOLEAN DEFAULT true`
- `is_default BOOLEAN`
- `sort_order INT`

### `tasks`
- `id UUID PRIMARY KEY`
- `family_id UUID`
- `category_id UUID`
- `child_member_id UUID NULLABLE` (null = all children)
- `title TEXT`
- `coins_reward INT DEFAULT 0`
- `coins_penalty INT DEFAULT 0`
- `is_required BOOLEAN`
- `is_active BOOLEAN`
- `reminder_time TIME`

### `schedule_items` (new, multi-tenant)
- `id UUID PRIMARY KEY`
- `family_id UUID`
- `child_member_id UUID`
- `type TEXT` — `'lesson'` | `'section'` | `'routine'`
- `title TEXT`
- `day_of_week INT[]` — 1=Mon…7=Sun
- `start_time TEXT`
- `end_time TEXT`
- `reminder_offset INT` (minutes)
- `has_reminder BOOLEAN`
- `is_active BOOLEAN`

## Daily Activity Tables

### `days` (legacy, child_id TEXT)
- `id UUID PRIMARY KEY`
- `child_id TEXT` (references children.id)
- `date DATE`
- `room_bed/floor/desk/closet/trash BOOLEAN`
- `room_score INT`
- `room_ok BOOLEAN`
- `good_behavior BOOLEAN`
- `diary_not_done BOOLEAN`
- `note_parent TEXT`

### `subject_grades`
- `id UUID PRIMARY KEY`
- `child_id TEXT`
- `date DATE`
- `subject TEXT`
- `subject_id UUID NULLABLE`
- `grade INT` (1–5)
- `note TEXT`

### `home_sports`
- `id UUID PRIMARY KEY`
- `child_id TEXT`
- `date DATE`
- `running/exercises/outdoor_games/stretching BOOLEAN`
- `total_minutes INT`

## Wallet & Finance

### `wallet`
- `child_id TEXT PRIMARY KEY`
- `coins INT DEFAULT 0`
- `money NUMERIC`
- `total_earned_coins INT`
- `total_spent_coins INT`
- `total_exchanged_coins INT`
- `updated_at TIMESTAMPTZ`

### `wallet_transactions`
- `id UUID PRIMARY KEY`
- `child_id TEXT`
- `family_id UUID`
- `transaction_type TEXT`
- `coins_change INT`
- `money_change NUMERIC`
- `description TEXT`
- `icon TEXT`
- `related_id TEXT`, `related_type TEXT` — link to a reward/exchange/withdrawal/p2p record
- `source_type TEXT`, `source_id TEXT` — idempotency key for coin awards (migration `04.4-02`); partial UNIQUE index on `(child_id, source_type, source_id)` prevents double-awarding a grade/room/sport/etc.
- `balance_after_coins INT`
- `balance_after_money NUMERIC`
- `created_at TIMESTAMPTZ`

### `rewards` (shop items)
- `id UUID PRIMARY KEY`
- `title TEXT`
- `description TEXT`
- `icon TEXT`
- `reward_type TEXT` — `'coins'` | `'money'`
- `price_coins INT`
- `price_money NUMERIC`
- `is_active BOOLEAN`
- `for_child TEXT NULLABLE` (null = all children)
- `category TEXT`

### `reward_purchases`
- `id UUID PRIMARY KEY`
- `reward_id UUID`
- `child_id TEXT`
- `reward_title TEXT`
- `coins_spent INT`
- `fulfilled BOOLEAN`
- `purchased_at TIMESTAMPTZ`

### `coin_exchanges`
- `id UUID PRIMARY KEY`
- `child_id TEXT`
- `coins_amount INT`
- `money_amount NUMERIC`
- `exchange_rate NUMERIC`
- `exchanged_at TIMESTAMPTZ`

## Achievements

### `streaks`
- `id UUID PRIMARY KEY`
- `child_id TEXT`
- `streak_type TEXT` — `'room'` | `'study'` | `'sport'`
- `current_count INT`
- `best_count INT`
- `last_updated DATE`
- `active BOOLEAN`

### `badges`
- `id UUID PRIMARY KEY`
- `child_id TEXT`
- `badge_key TEXT`
- `title TEXT`
- `icon TEXT`
- `xp_reward INT`
- `earned_at TIMESTAMPTZ`
- UNIQUE(child_id, badge_key)

## Push Notifications

### `push_subscriptions`
- `id UUID PRIMARY KEY`
- `family_id UUID`
- `member_id UUID`
- `subscription JSONB` (full PushSubscription JSON)
- `user_agent TEXT`
- UNIQUE(member_id, subscription->>'endpoint')

## Legacy Tables (pre-Phase 1.1)

| Table | Status | Notes |
|---|---|---|
| `children` | Legacy | child_id TEXT ('adam'/'alim'), still used in wallet/grades |
| `schedule` | Legacy | Old school schedule (child_id TEXT) |
| `subjects` | Legacy | Subject list per child |
| `sections` | Legacy | Sports sections per child |
| `expenses` | Legacy | Expense tracking |
| `goals` | Legacy | Savings goals |
| `weeks` | Legacy | Weekly summaries |
| `settings` | Legacy | Global key-value settings |

## RLS Pattern

Policies target the **`authenticated`** role only; the `anon` role has no table
access (pre-login lookups use SECURITY DEFINER RPCs). See migrations
`04.4-04`/`04.4-05` (2026-06-15) which removed the old `*_anon_all` /
`public USING true` policies from 30 tables.

```sql
-- Standard family isolation (tables with family_id)
CREATE POLICY "<t>_family_isolation" ON <t>
  FOR ALL TO authenticated
  USING (family_id IN (SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (family_id IN (SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid())));

-- Tables without family_id (child_id TEXT) — scope via children
CREATE POLICY "<t>_family_isolation" ON <t>
  FOR ALL TO authenticated
  USING (child_id IN (SELECT id FROM children WHERE family_id IN (
    SELECT family_id FROM family_members WHERE user_id = (SELECT auth.uid()))));
-- NOTE: some legacy tables store family_id as TEXT while family_members.family_id
-- is UUID — compare as ::text in those policies.
```

### Money tables — SELECT-only for clients (migration `04.4-03`)
`wallet`, `wallet_transactions`, `wallet_settings`, `rewards`,
`reward_purchases`, `coin_exchanges`, `cash_withdrawals`, `p2p_transfers`,
`p2p_debts` grant **SELECT only** to `authenticated`. Writes are denied to
clients and performed by the service-role server layer (see api-spec.md /
security-model.md). `addExpense` / `addExpenseCategory` set `family_id` so their
inserts satisfy the family-isolation WITH CHECK.
