// tests/integration/reminders-daily.test.ts
// Integration coverage for GET /api/cron/daily (05.10-02, SC3 reminders) —
// asserts the cron-auth gate (T-0510-05) and the three-check summary shape
// against the LIVE Supabase DB (service-role key). sendPushToSubscription is
// mocked to a no-op so this suite never sends a real push (T-0510-06 guard:
// the route must resolve subscriptions via the admin client + this function,
// never notifyChild/notifyParent).

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import {
  hasIntegrationEnv,
  serviceClient,
  createTestFamily,
  type TestFamily,
} from './family-fixture'

const mockSendPush = vi.fn().mockResolvedValue(undefined)
vi.mock('@/app/actions/push', () => ({
  sendPushToSubscription: (...args: unknown[]) => mockSendPush(...args),
}))

// lib/services/streaks.service.ts (imported transitively via getStreaksAtRisk)
// imports the anon browser singleton at module scope, which throws when
// NEXT_PUBLIC_SUPABASE_URL is absent — mock it inert so this suite loads (and
// skip-ifs cleanly) without integration env, same pattern as award.test.ts.
vi.mock('@/lib/supabase', () => ({ supabase: {} }))

// vi.mock calls are hoisted above imports by vitest, so this static import
// resolves against the mocked modules above.
import { GET } from '@/app/api/cron/daily/route'

function getDaily(bearer?: string) {
  const headers: Record<string, string> = {}
  if (bearer !== undefined) headers['authorization'] = bearer
  const req = new NextRequest('http://localhost/api/cron/daily', { headers })
  return GET(req)
}

// Mirrors the route's own day-of-week mapping (JS Sunday=0 -> ISO 7).
function todayIsoDow(): number {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 7 : jsDay
}

describe('GET /api/cron/daily — auth gate', () => {
  const ORIGINAL_SECRET = process.env.CRON_SECRET

  beforeAll(() => {
    process.env.CRON_SECRET = 'test-cron-secret'
  })

  afterAll(() => {
    process.env.CRON_SECRET = ORIGINAL_SECRET
  })

  it('rejects a missing Bearer with 401', async () => {
    const res = await getDaily(undefined)
    expect(res.status).toBe(401)
  })

  it('rejects a wrong Bearer with 401', async () => {
    const res = await getDaily('Bearer wrong-secret')
    expect(res.status).toBe(401)
  })
})

describe.skipIf(!hasIntegrationEnv)('GET /api/cron/daily — integration', () => {
  let family: TestFamily
  let memberId: string
  const db = hasIntegrationEnv ? serviceClient() : null!
  const ORIGINAL_SECRET = process.env.CRON_SECRET

  beforeAll(async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    family = await createTestFamily()
    const { data: member, error } = await db
      .from('family_members')
      .insert({
        family_id: family.familyId,
        role: 'child',
        child_id: family.childId,
        display_name: '__test__ child',
      })
      .select('id')
      .single()
    if (error || !member) {
      throw new Error(`family_members insert failed: ${error?.message ?? 'no data'}`)
    }
    memberId = member.id as string
  })

  afterAll(async () => {
    process.env.CRON_SECRET = ORIGINAL_SECRET
    if (memberId) await db.from('family_members').delete().eq('id', memberId)
    await family.cleanup()
  })

  it('returns 200 with the sent/failed/sections/unfilled/streaksAtRisk summary shape', async () => {
    mockSendPush.mockClear()
    const res = await getDaily('Bearer test-cron-secret')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('sent')
    expect(body).toHaveProperty('failed')
    expect(body).toHaveProperty('sections')
    expect(body).toHaveProperty('unfilled')
    expect(body).toHaveProperty('streaksAtRisk')
    // sendPushToSubscription is mocked — this suite never sends a real push,
    // regardless of whether any real push_subscriptions rows exist.
    for (const call of mockSendPush.mock.calls) {
      expect(typeof call[0]).toBe('string')
    }
  })

  it('flags the test child as unfilled when no `days` row exists for today', async () => {
    const res = await getDaily('Bearer test-cron-secret')
    expect(res.status).toBe(200)
    const body = await res.json()
    // The test child has no `days` row for today — it must count in `unfilled`
    // (other real children in the DB may also be unfilled, hence >=1 not ===1).
    expect(body.unfilled).toBeGreaterThanOrEqual(1)
  })

  it('counts an upcoming section training scheduled for today', async () => {
    const { data: item, error } = await db
      .from('schedule_items')
      .insert({
        family_id: family.familyId,
        child_member_id: memberId,
        type: 'section',
        title: 'Football',
        day_of_week: [todayIsoDow()],
        start_time: '15:30:00',
        is_active: true,
      })
      .select('id')
      .single()
    expect(error).toBeNull()

    try {
      const res = await getDaily('Bearer test-cron-secret')
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.sections).toBeGreaterThanOrEqual(1)
    } finally {
      if (item?.id) await db.from('schedule_items').delete().eq('id', item.id)
    }
  })

  it('counts an active streak with no contribution logged yet today', async () => {
    const { error } = await db.from('streaks').insert({
      child_id: family.childId,
      family_id: family.familyId,
      streak_type: 'room',
      current_count: 3,
      best_count: 3,
      active: true,
    })
    expect(error).toBeNull()

    try {
      const res = await getDaily('Bearer test-cron-secret')
      expect(res.status).toBe(200)
      const body = await res.json()
      // No `days` row for today -> room_ok is absent -> the streak is at risk.
      expect(body.streaksAtRisk).toBeGreaterThanOrEqual(1)
    } finally {
      await db.from('streaks').delete().eq('child_id', family.childId).eq('streak_type', 'room')
    }
  })
})
