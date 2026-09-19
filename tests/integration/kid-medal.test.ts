// tests/integration/kid-medal.test.ts
// Live-DB integration coverage for sendKidMedal (Phase 9.2 Plan 04, FEED-07,
// D-08..D-12) — the kid-to-sibling "medal" recognition action added in Plan
// 09.2-02 (app/actions/send-kid-medal.ts).
//
// Auth is mocked ONLY at the requireFamilyMember() boundary (this suite calls
// the server action directly, in-process) — everything below that
// (createAdminClient, assertChildInFamily, the medals insert, emitFeedEvent)
// runs for real against a dedicated __test__ family created/torn down by
// tests/integration/family-fixture.ts, plus a hand-rolled second sibling, a
// real auth-backed sender child, and a second __test__ family used as the
// cross-family target (Task 2). Push notifications are mocked to a no-op so
// the suite never dispatches a real device push. describe.skipIf keeps
// `npm test` green without integration env keys, matching the house pattern
// in tests/integration/behavior-approval.test.ts.

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import {
  hasIntegrationEnv,
  serviceClient,
  createTestFamily,
  type TestFamily,
} from './family-fixture'

// requireFamilyMember is the only thing this suite mocks — set per-test via
// asSender()/asSender({ role, childId }). Everything else in
// '@/lib/supabase/admin' is the real implementation.
const mockRequireFamilyMember = vi.fn()

vi.mock('@/lib/supabase/admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supabase/admin')>()
  return {
    ...actual,
    requireFamilyMember: () => mockRequireFamilyMember(),
  }
})

// Push is a real side-effect channel (real device pushes) — mocked to a
// no-op so this suite never sends one.
vi.mock('@/app/actions/push-notifications', () => ({
  notifyChild: vi.fn().mockResolvedValue(undefined),
}))

// sendKidMedal transitively imports lib/services/streaks.service (via the
// admin module chain), which imports the anon browser singleton in
// lib/supabase.ts — a module that THROWS at import time when
// NEXT_PUBLIC_SUPABASE_URL is absent. Mock it so this suite still loads (and
// skipIf-skips) without integration env, mirroring behavior-approval.test.ts.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

// vi.mock calls are hoisted above imports by vitest, so these static imports
// resolve against the mocked '@/lib/supabase/admin' / push modules.
import { sendKidMedal } from '@/app/actions/send-kid-medal'
import { MEDAL_PHRASES } from '@/lib/kid/medal-phrases'
import { localDateString } from '@/utils/helpers'

describe.skipIf(!hasIntegrationEnv)('sendKidMedal (live DB)', () => {
  let family: TestFamily // recipient A is family.childId
  let outsiderFamily: TestFamily // cross-family target, Task 2 case 4
  let recipientB: string
  let senderChildId: string
  let senderUserId: string
  let senderMemberId: string

  const db = hasIntegrationEnv ? serviceClient() : null!
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const today = localDateString()

  /** Sets requireFamilyMember to resolve as the sender child by default. */
  function asSender(overrides: { role?: 'parent' | 'child' | 'extended'; childId?: string | null } = {}) {
    mockRequireFamilyMember.mockResolvedValue({
      userId: senderUserId,
      familyId: family.familyId,
      role: overrides.role ?? 'child',
      childId: overrides.childId === undefined ? senderChildId : overrides.childId,
    })
  }

  beforeAll(async () => {
    family = await createTestFamily()
    outsiderFamily = await createTestFamily()

    recipientB = `test-sibling-b-${suffix}`
    const { error: bErr } = await db.from('children').insert({
      id: recipientB,
      name: '__test__ sibling B',
      family_id: family.familyId,
      active: true,
    })
    expect(bErr).toBeNull()

    senderChildId = `test-sender-${suffix}`
    const { error: senderChildErr } = await db.from('children').insert({
      id: senderChildId,
      name: '__test__ sender',
      family_id: family.familyId,
      active: true,
    })
    expect(senderChildErr).toBeNull()

    // family_members.user_id is FK'd to auth.users, so a random UUID will
    // not insert — a real synthetic auth user is required.
    const email = `kid-medal-${suffix}@internal.familycoins.app`
    const password = `test-pw-${suffix}-${Math.random().toString(36).slice(2, 10)}`
    const { data: authUser, error: authErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    expect(authErr).toBeNull()
    senderUserId = authUser!.user!.id

    const { data: memberRow, error: memberErr } = await db
      .from('family_members')
      .insert({
        family_id: family.familyId,
        user_id: senderUserId,
        role: 'child',
        child_id: senderChildId,
        display_name: '__test__ Адам',
      })
      .select('id')
      .single()
    expect(memberErr).toBeNull()
    senderMemberId = memberRow!.id as string
  })

  // Both caps are per-day, so without this every test after the first would
  // trip the sender cap. Scoped by family_id only — never unscoped.
  afterEach(async () => {
    await db.from('medals').delete().eq('family_id', family.familyId)
    await db.from('family_events').delete().eq('family_id', family.familyId)
  })

  afterAll(async () => {
    // children rows must go before the families delete cascades.
    await db.from('family_members').delete().eq('id', senderMemberId)
    await db.from('children').delete().eq('id', recipientB)
    await db.from('children').delete().eq('id', senderChildId)
    await db.auth.admin.deleteUser(senderUserId)
    await family.cleanup()
    await outsiderFamily.cleanup()
  })

  it('writes a coins-0 medal and its own feed event', async () => {
    asSender()

    const result = await sendKidMedal({ targetChildId: family.childId, phrase: MEDAL_PHRASES[0] })
    expect(result).toEqual({ success: true })

    const { data: medalRows, error: medalErr } = await db
      .from('medals')
      .select('*')
      .eq('child_id', family.childId)
      .eq('date', today)
    expect(medalErr).toBeNull()
    expect(medalRows?.length).toBe(1)
    const medal = medalRows![0]
    expect(medal.coins).toBe(0)
    expect(medal.sender_role).toBe('child')
    expect(medal.sender_member_id).toBe(senderMemberId)
    expect(medal.message).toBe(MEDAL_PHRASES[0])
    expect(medal.sent_by).toBe('__test__ Адам')

    const refId = `${family.childId}:${today}:kid`
    const { data: eventRows, error: eventErr } = await db
      .from('family_events')
      .select('*')
      .eq('kind', 'medal')
      .eq('ref_type', 'medal')
      .eq('ref_id', refId)
    expect(eventErr).toBeNull()
    expect(eventRows?.length).toBe(1)
    const event = eventRows![0]
    expect(event.amount).toBeNull()
    expect(String(event.title).startsWith('Медаль от ')).toBe(true)
    expect(event.title).toContain('__test__ Адам')
    expect(event.body).toBe(MEDAL_PHRASES[0])
    expect(event.actor_member_id).toBe(senderMemberId)
    expect(event.metadata?.senderRole).toBe('child')
  })

  it('moves no coins and writes no wallet transaction', async () => {
    asSender()

    const { data: before } = await db
      .from('wallet')
      .select('coins, total_earned_coins')
      .eq('child_id', family.childId)
      .single()

    const result = await sendKidMedal({ targetChildId: family.childId, phrase: MEDAL_PHRASES[1] })
    expect(result.success).toBe(true)

    const { data: after } = await db
      .from('wallet')
      .select('coins, total_earned_coins')
      .eq('child_id', family.childId)
      .single()
    expect(after?.coins).toBe(before?.coins)
    expect(after?.total_earned_coins).toBe(before?.total_earned_coins)

    const { data: txs, error: txErr } = await db
      .from('wallet_transactions')
      .select('id')
      .eq('child_id', family.childId)
    expect(txErr).toBeNull()
    expect(txs?.length ?? 0).toBe(0)
  })

  describe('guards and caps', () => {
    it('rejects an off-list phrase (D-11) and writes nothing', async () => {
      asSender()

      const result = await sendKidMedal({ targetChildId: family.childId, phrase: 'Держи 1000 монет' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Недопустимое сообщение')

      const { data: medalRows } = await db.from('medals').select('id').eq('family_id', family.familyId)
      expect(medalRows?.length ?? 0).toBe(0)
    })

    it('rejects a self-send and writes nothing', async () => {
      asSender()

      const result = await sendKidMedal({ targetChildId: senderChildId, phrase: MEDAL_PHRASES[0] })
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()

      const { data: medalRows } = await db.from('medals').select('id').eq('family_id', family.familyId)
      expect(medalRows?.length ?? 0).toBe(0)
    })

    it('rejects a non-child caller (parent role) and writes nothing', async () => {
      asSender({ role: 'parent', childId: null })

      const result = await sendKidMedal({ targetChildId: family.childId, phrase: MEDAL_PHRASES[0] })
      expect(result.success).toBe(false)

      const { data: medalRows } = await db.from('medals').select('id').eq('family_id', family.familyId)
      expect(medalRows?.length ?? 0).toBe(0)
    })

    it('rejects a cross-family target and writes no medal for the outsider child', async () => {
      asSender()

      const result = await sendKidMedal({ targetChildId: outsiderFamily.childId, phrase: MEDAL_PHRASES[0] })
      expect(result.success).toBe(false)

      const { data: medalRows } = await db
        .from('medals')
        .select('id')
        .eq('child_id', outsiderFamily.childId)
      expect(medalRows?.length ?? 0).toBe(0)
    })

    it('caps the sender per-day-total, not per-recipient (D-10)', async () => {
      asSender()

      const first = await sendKidMedal({ targetChildId: family.childId, phrase: MEDAL_PHRASES[0] })
      expect(first.success).toBe(true)

      const second = await sendKidMedal({ targetChildId: recipientB, phrase: MEDAL_PHRASES[1] })
      expect(second.success).toBe(false)
      expect(second.error).toBe('Ты уже отправил медаль сегодня')

      const { data: bRows } = await db.from('medals').select('id').eq('child_id', recipientB)
      expect(bRows?.length ?? 0).toBe(0)
    })

    it('caps the recipient per-sender-role — a parent medal the same day does not block a kid medal (D-09)', async () => {
      const { error: parentMedalErr } = await db.from('medals').insert({
        family_id: family.familyId,
        child_id: family.childId,
        date: today,
        message: 'Медаль дня',
        coins: 0,
        sender_role: 'parent',
      })
      expect(parentMedalErr).toBeNull()

      asSender()
      const result = await sendKidMedal({ targetChildId: family.childId, phrase: MEDAL_PHRASES[0] })
      expect(result.success).toBe(true)

      const { data: medalRows, error: medalErr } = await db
        .from('medals')
        .select('id, sender_role')
        .eq('child_id', family.childId)
        .eq('date', today)
      expect(medalErr).toBeNull()
      expect(medalRows?.length).toBe(2)
      const roles = (medalRows ?? []).map((r: { sender_role: string }) => r.sender_role).sort()
      expect(roles).toEqual(['child', 'parent'])
    })

    it('backstops the caps at the DB level against a raced duplicate insert (23505)', async () => {
      asSender()
      const first = await sendKidMedal({ targetChildId: family.childId, phrase: MEDAL_PHRASES[0] })
      expect(first.success).toBe(true)

      const { error: raceErr } = await db.from('medals').insert({
        family_id: family.familyId,
        child_id: family.childId,
        date: today,
        sender_role: 'child',
        sender_member_id: senderMemberId,
        message: MEDAL_PHRASES[1],
        coins: 0,
      })
      expect(raceErr).not.toBeNull()
      expect(raceErr?.code).toBe('23505')
    })
  })
})
