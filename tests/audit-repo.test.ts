// tests/audit-repo.test.ts
// insertAuditEvent must write through the client it is GIVEN, not always the
// browser (RLS-bound) singleton. Server callers ('use server' actions, API
// routes, cron) run with no parent session, so a singleton write to the
// auth.uid()-scoped parent_audit_events table is silently denied — they must
// pass the service-role admin client. This is the regression guard for that
// deferred fix (2026-09-05).

import { describe, it, expect, vi, beforeEach } from 'vitest'

// audit.repo imports the '@/lib/supabase' browser singleton, which throws at
// import time without NEXT_PUBLIC_SUPABASE_URL — stub it with a spyable shape.
// vi.hoisted so the spies exist when the hoisted vi.mock factory runs.
const { singletonInsert, singletonFrom } = vi.hoisted(() => {
  const singletonInsert = vi.fn().mockResolvedValue({ error: null })
  const singletonFrom = vi.fn(() => ({ insert: singletonInsert }))
  return { singletonInsert, singletonFrom }
})
vi.mock('@/lib/supabase', () => ({ supabase: { from: singletonFrom } }))

import { insertAuditEvent, type InsertAuditEventParams } from '@/lib/repositories/audit.repo'

const PARAMS: InsertAuditEventParams = {
  family_id: 'fam-1',
  child_id: 'child-1',
  action_type: 'shop_approve',
  description: 'test',
  coins_delta: null,
  actor_user_id: 'user-1',
  metadata: {},
}

function fakeClient(error: unknown = null) {
  const insert = vi.fn().mockResolvedValue({ error })
  const from = vi.fn(() => ({ insert }))
  return { client: { from } as never, from, insert }
}

beforeEach(() => {
  singletonInsert.mockClear()
  singletonFrom.mockClear()
})

describe('insertAuditEvent', () => {
  it('defaults to the browser singleton when no client is passed', async () => {
    await insertAuditEvent(PARAMS)
    expect(singletonFrom).toHaveBeenCalledWith('parent_audit_events')
    expect(singletonInsert).toHaveBeenCalledWith(PARAMS)
  })

  it('writes through the injected client and never touches the singleton', async () => {
    const admin = fakeClient()
    await insertAuditEvent(PARAMS, admin.client)
    expect(admin.from).toHaveBeenCalledWith('parent_audit_events')
    expect(admin.insert).toHaveBeenCalledWith(PARAMS)
    expect(singletonFrom).not.toHaveBeenCalled()
  })

  it('never throws when the write errors (non-blocking contract)', async () => {
    const admin = fakeClient({ message: 'RLS denied' })
    await expect(insertAuditEvent(PARAMS, admin.client)).resolves.toBeUndefined()
  })
})
