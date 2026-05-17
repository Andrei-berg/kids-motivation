# Security Model

## Row Level Security (RLS)

Every table has RLS enabled. The core pattern uses a helper function to avoid recursive policies.

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

```typescript
// middleware.ts pattern
// 1. updateSession() refreshes auth token
// 2. if no user → redirect to /login
// 3. if user but no family → redirect to /onboarding/welcome
// 4. otherwise → allow through
```

Exempted paths: `/login`, `/register`, `/auth/callback`, `/onboarding/**`

## Sensitive Operations

| Operation | Protection |
|---|---|
| Family creation | Authenticated user only |
| Adding child to family | Must be parent in that family |
| Viewing family data | RLS (family_id check) |
| Wallet operations | Legacy: no RLS (child_id TEXT); Phase 2.1 will add |
| Push subscriptions | member_id must be authenticated user |
| Seed default categories | SECURITY DEFINER + ON CONFLICT DO NOTHING |

## Known Gaps (to fix in future phases)

1. **Legacy tables** (`days`, `subject_grades`, `wallet`, etc.) use `child_id TEXT` — no RLS, rely on app-level access control
2. **Parent PIN** (REQ-SEC-002) — implemented in settings UI, not enforced server-side
3. **COPPA** (REQ-SEC-003) — planned for M4
4. **GDPR data deletion** (REQ-SEC-004) — planned for M4

## VAPID Keys (Push Notifications)

- Public key stored in `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Private key in `VAPID_PRIVATE_KEY` (server-side only)
- Push sending only via Server Actions (not client-side)
