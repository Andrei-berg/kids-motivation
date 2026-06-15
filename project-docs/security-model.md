# Security Model

> **2026-06-15 hardening pass.** Closed the pre-launch security blockers and a
> critical anonymous-access hole. Highlights (details inline below):
> - All wallet/money mutations moved server-side (service-role); money tables are
>   RLS **SELECT-only** for clients (migration `04.4-03`).
> - Removed `*_anon_all` and `public USING true` RLS policies on **30 tables**
>   (migrations `04.4-04`, `04.4-05`) — the public anon key could previously
>   read/write every family's data without logging in.
> - `set-child-pin` now requires an authenticated parent; the unused unsalted
>   SHA-256 `child_pin_hash` was removed (PIN auth is Supabase Auth bcrypt).
> - `/parent/*` is no longer public in middleware; `?preview=true` no longer
>   bypasses auth on `/kid/*`.
> - `CRON_SECRET` is verified unconditionally (fail-closed) with a timing-safe
>   compare.

## Row Level Security (RLS)

Every table has RLS enabled. The core pattern uses a helper function to avoid recursive policies.

**Roles:** policies target the `authenticated` role only. The `anon` role has **no
table access** — unauthenticated pre-login lookups (kid login profile picker) go
through `SECURITY DEFINER` RPCs (`lookup_family_by_invite_code`,
`get_family_children`) that bypass RLS and return a minimal projection.

### Helper Functions (SECURITY DEFINER)

```sql
-- Returns all family_ids the current user belongs to
CREATE FUNCTION get_my_family_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT family_id FROM family_members WHERE user_id = auth.uid()
$$;

-- Check if user is parent in family (for admin operations)
CREATE FUNCTION is_family_parent(p_family_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_members
    WHERE family_id = p_family_id
      AND user_id = auth.uid()
      AND role = 'parent'
  )
$$;
```

### Standard Policy Pattern

```sql
-- Applied to all multi-tenant tables (categories, tasks, schedule_items, etc.)
CREATE POLICY "family_members_only" ON table_name
  FOR ALL USING (family_id IN (SELECT get_my_family_ids()));

-- For user_profiles: each user owns their row
CREATE POLICY "own_profile" ON user_profiles
  FOR ALL USING (id = auth.uid());

-- For family_members: can read own family, insert when joining
CREATE POLICY "read_family" ON family_members
  FOR SELECT USING (family_id IN (SELECT get_my_family_ids()));
```

### Auth Trigger (Registration Safety)

```sql
-- Runs on new user creation — always wraps in EXCEPTION block
-- so registration is NEVER blocked by profile creation failures
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Authentication

- **Method**: Supabase Auth (email/password + Google OAuth)
- **Client**: `@supabase/ssr` with `createBrowserClient` / `createServerClient`
- **JWT Validation**: `getUser()` (not `getSession()`) — validates JWT server-side
- **Middleware**: `middleware.ts` + `updateSession()` — keeps cookies in sync

## Route Protection

`middleware.ts` (uses `getUser()` to re-validate the JWT):
1. `updateSession()` refreshes the auth token / cookies.
2. No user + non-public path → redirect to `/`.
3. User but no family membership → redirect to `/onboarding`.
4. Role-based landing redirect at `/` (parent → `/parent-center` or
   `/parent/dashboard`; child → `/kid/day`).
5. **Route guards:** `/parent/*` is parent-only; `/kid/*` is child-only — except
   a parent may inspect `/kid/*` with `?preview=true`. Preview is **not** a bypass
   for unauthenticated visitors (the no-user check above still redirects them).

Public paths: `/` (login/register), `/auth/**`, `/onboarding/**`.
(`/parent` was previously mis-classified as public — fixed 2026-06-15.)

## Money / wallet mutations (server-side)

Coins and money are the integrity-critical surface. **Clients cannot write the
money tables** (`wallet`, `wallet_transactions`, `wallet_settings`, `rewards`,
`reward_purchases`, `coin_exchanges`, `cash_withdrawals`, `p2p_transfers`,
`p2p_debts`) — RLS grants `authenticated` SELECT only. All mutations run
server-side with the **service-role** client (bypasses RLS) behind an auth guard:

- **API routes** `app/api/wallet/*` (`award`, `purchase`, `exchange`, `withdraw`,
  `p2p`, `rewards`, `settings`). `lib/supabase/admin.ts` provides the service-role
  client + `requireParent` / `requireFamilyMember` / `assertChildInFamily` guards.
- **Server actions**: `app/parent/shop/actions.ts` (approve/reject + refund),
  `app/kid/shop/actions.ts` (purchase), `app/actions/send-medal.ts`.
- Coin awards are recomputed from saved DB rows in `/api/wallet/award` and are
  idempotent per `(child_id, source_type, source_id)` — the client never sends
  amounts. Behaviour coins are credited only when a parent triggers the award.

## Sensitive Operations

| Operation | Protection |
|---|---|
| Family creation | Authenticated user only |
| Adding child to family | Must be parent in that family |
| Viewing family data | RLS (family_id check, `authenticated` only) |
| Wallet / coin mutations | Server-side service-role + auth guard; client RLS = SELECT only |
| Set child PIN (`/api/set-child-pin`) | Authenticated parent + child must be in their family |
| Cron / push (`/api/cron/*`, `/api/push/send`) | `CRON_SECRET` bearer, fail-closed + timing-safe |
| Account deletion (`/api/delete-account`) | Authenticated parent; cascade via service-role |
| Push subscriptions | member_id must be authenticated user |

## Authentication of children (PIN)

Children log in with a family code + 4-digit PIN. The PIN is the password of a
synthetic Supabase Auth user (`child_<id>@internal.familycoins.app`), stored by
Supabase Auth as a **salted bcrypt hash**. We do **not** store a PIN hash in our
tables (the old unsalted SHA-256 `child_pin_hash` was removed 2026-06-15).

## Known Gaps (to fix in future phases)

1. **Parent PIN** (REQ-SEC-002) — implemented in settings UI, not enforced server-side.
2. **Login rate-limiting** — a 4-digit kid PIN has 10⁴ space; brute-force throttling/lockout not yet added.
3. **COPPA** (REQ-SEC-003) — parental consent gate added in Phase 4.4.
4. **GDPR data deletion** (REQ-SEC-004) — `/api/delete-account` cascades; verify coverage of newer tables.

### Resolved 2026-06-15
- Legacy tables (`days`, `subject_grades`, `wallet`, expenses, etc.) now have
  family-scoped RLS for `authenticated`; the anonymous full-access policies were removed.
- Wallet mutations moved server-side; money tables RLS-locked to SELECT.
- `set-child-pin` / `/parent/*` / `CRON_SECRET` / PIN-hash issues fixed.

## VAPID Keys (Push Notifications)

- Public key stored in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Private key in `VAPID_PRIVATE_KEY` (server-side only)
- Push sending only via Server Actions (not client-side)
