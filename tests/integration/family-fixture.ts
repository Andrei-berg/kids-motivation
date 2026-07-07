// tests/integration/family-fixture.ts
// Shared fixture for money-API integration tests. Creates and tears down an
// isolated `__test__`-prefixed family + child + wallet against the LIVE
// Supabase DB (service-role key), so integration tests never touch a real
// family's rows. Mirrors the env-reading pattern and cleanup discipline of
// scripts/verify-award-idempotency.mjs.
//
// Skip guard: `hasIntegrationEnv` is false (and the calling suite should
// describe.skipIf on it) whenever SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY are
// absent or still hold the placeholder value — so `npm test` stays green for
// contributors without a configured .env.local.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

export const hasIntegrationEnv: boolean = Boolean(
  SUPABASE_URL && SERVICE_ROLE_KEY && SERVICE_ROLE_KEY !== 'your_supabase_service_role_key',
)

/** Service-role Supabase client — bypasses RLS. Test-fixture use only. */
export function serviceClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      'serviceClient(): SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured — guard callers with hasIntegrationEnv',
    )
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

export type TestFamily = {
  familyId: string
  childId: string
  cleanup: () => Promise<void>
}

/**
 * Creates a fully isolated test family: a `families` row (name prefixed
 * `__test__`), a `children` row with a unique TEXT id, and a zeroed `wallet`
 * row. Returns the ids plus a `cleanup()` that tears everything down via
 * destroyTestFamily.
 */
export async function createTestFamily(): Promise<TestFamily> {
  const db = serviceClient()
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const { data: family, error: familyErr } = await db
    .from('families')
    .insert({ name: `__test__-${suffix}` })
    .select('id')
    .single()
  if (familyErr || !family) {
    throw new Error(`createTestFamily: families insert failed: ${familyErr?.message ?? 'no data'}`)
  }
  const familyId = family.id as string

  const childId = `test-child-${suffix}`
  const { error: childErr } = await db.from('children').insert({
    id: childId,
    name: `__test__ child ${suffix}`,
    family_id: familyId,
    active: true,
    xp: 0,
    level: 1,
    kid_fill_mode: 1,
  })
  if (childErr) {
    // Best-effort rollback of the family row we just created.
    await db.from('families').delete().eq('id', familyId)
    throw new Error(`createTestFamily: children insert failed: ${childErr.message}`)
  }

  const { error: walletErr } = await db.from('wallet').insert({
    child_id: childId,
    family_id: familyId,
    coins: 0,
    money: 0,
    total_earned_coins: 0,
    total_spent_coins: 0,
    total_exchanged_coins: 0,
    total_earned_money: 0,
    total_spent_money: 0,
  })
  if (walletErr) {
    await db.from('children').delete().eq('id', childId)
    await db.from('families').delete().eq('id', familyId)
    throw new Error(`createTestFamily: wallet insert failed: ${walletErr.message}`)
  }

  return {
    familyId,
    childId,
    cleanup: () => destroyTestFamily(familyId, childId),
  }
}

/**
 * FK-safe teardown for a test family created by createTestFamily(). Every
 * delete filters on the test familyId or childId ONLY — never an unscoped
 * delete — so a bug here can never touch a real family's rows.
 * Safe to call more than once (idempotent — deleting an already-removed row
 * is a no-op, not an error).
 */
export async function destroyTestFamily(familyId: string, childId: string): Promise<void> {
  const db = serviceClient()

  // section_visits has no child_id column — resolve via the child's own
  // sections first, matching the scoping pattern used by /api/wallet/award.
  const { data: sections } = await db.from('sections').select('id').eq('child_id', childId)
  const sectionIds = (sections ?? []).map((s: { id: string }) => s.id)
  if (sectionIds.length > 0) {
    await db.from('section_visits').delete().in('section_id', sectionIds)
  }

  await db.from('wallet_transactions').delete().eq('child_id', childId)
  await db.from('coin_exchanges').delete().eq('child_id', childId)
  await db.from('cash_withdrawals').delete().eq('child_id', childId)
  await db.from('reward_purchases').delete().eq('child_id', childId)
  await db.from('rewards').delete().eq('family_id', familyId)
  // Safety net: wallet_settings has no ON DELETE CASCADE from families, so a
  // failing assertion mid-test (e.g. the settings-driven streak test) can
  // never orphan a wallet_settings row for a torn-down test family.
  await db.from('wallet_settings').delete().eq('family_id', familyId)
  await db.from('days').delete().eq('child_id', childId)
  await db.from('subject_grades').delete().eq('child_id', childId)
  await db.from('sections').delete().eq('child_id', childId)
  await db.from('activity_logs').delete().eq('child_id', childId)
  await db.from('extra_activities').delete().eq('child_id', childId)
  await db.from('reading_log').delete().eq('child_id', childId)
  await db.from('streaks').delete().eq('child_id', childId)
  await db.from('wallet').delete().eq('child_id', childId)
  await db.from('children').delete().eq('id', childId)
  await db.from('families').delete().eq('id', familyId)
}
