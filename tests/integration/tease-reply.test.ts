// tests/integration/tease-reply.test.ts
// Live-DB integration coverage for the tease-reply repo helpers (Phase 9.2
// Plan 01, FEED-06, D-06/D-07) added to lib/repositories/feed.repo.ts:
// TEASE_PREFIX, isTeaseComment, addTeaseReply, getTeaseRepliesByFamily,
// hasTeased, and the tease-blind filtering baked into getComments /
// getCommentCounts. Previously only the locked-phrase content module
// (lib/kid/tease-phrases.ts, tests/tease-phrases.test.ts) had coverage — the
// actual DB read/write/filter logic this suite exercises had none.
//
// feed.repo.ts writes/reads through the RLS-bound anon browser singleton at
// '@/lib/supabase' (real production traffic goes through a signed-in user's
// session so Postgres RLS enforces family scoping). This suite instead swaps
// that singleton for a real service-role client (via a vi.hoisted mutable
// holder, set in beforeAll) so the exact query-building and filtering code in
// feed.repo.ts runs against the live DB without needing a real auth session
// for every fabricated family member. RLS enforcement on family_events/
// family_event_comments is a distinct concern already covered by the
// migration's own policies (2026-09-11-family-feed.sql) and the CR-01 fix
// (2026-09-19-reaction-insert-ownership.sql) — this suite is about whether
// the tease read/write/filter *logic* itself is correct, per FEED-06's own
// threat model. author_member_id/member_id have no DB-level FK to
// family_members (confirmed in the migration), so fabricated member-id
// strings are valid rows without needing real auth users.
//
// describe.skipIf keeps `npm test` green without integration env keys,
// matching the house pattern in tests/integration/kid-medal.test.ts.

import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import {
  hasIntegrationEnv,
  serviceClient,
  createTestFamily,
  type TestFamily,
} from './family-fixture'

const mocks = vi.hoisted(() => ({ client: {} as any }))
vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return mocks.client
  },
}))

// vi.mock is hoisted above these static imports, so feed.repo.ts resolves
// '@/lib/supabase' to the mocked getter above.
import {
  TEASE_PREFIX,
  isTeaseComment,
  addTeaseReply,
  getTeaseRepliesByFamily,
  hasTeased,
  getComments,
  getCommentCounts,
  addComment,
} from '@/lib/repositories/feed.repo'
import { ALL_TEASE_PHRASES } from '@/lib/kid/tease-phrases'

describe.skipIf(!hasIntegrationEnv)('tease reply repo (FEED-06, D-06/D-07, live DB)', () => {
  let family: TestFamily
  let outsiderFamily: TestFamily
  let eventId: string
  let outsiderEventId: string

  const db = hasIntegrationEnv ? serviceClient() : null!
  const memberA = 'test-member-a'
  const memberB = 'test-member-b'

  beforeAll(async () => {
    mocks.client = db

    family = await createTestFamily()
    outsiderFamily = await createTestFamily()

    const { data: eventRow, error: eventErr } = await db
      .from('family_events')
      .insert({
        family_id: family.familyId,
        child_id: family.childId,
        kind: 'day_filled',
        title: '__test__ event',
        ref_type: 'misc',
      })
      .select('id')
      .single()
    expect(eventErr).toBeNull()
    eventId = eventRow!.id as string

    const { data: outsiderEventRow, error: outsiderEventErr } = await db
      .from('family_events')
      .insert({
        family_id: outsiderFamily.familyId,
        child_id: outsiderFamily.childId,
        kind: 'day_filled',
        title: '__test__ outsider event',
        ref_type: 'misc',
      })
      .select('id')
      .single()
    expect(outsiderEventErr).toBeNull()
    outsiderEventId = outsiderEventRow!.id as string
  })

  // Every test scopes its own comment rows to the two __test__ families only
  // — never an unscoped delete — matching the discipline family-fixture.ts /
  // kid-medal.test.ts already established.
  afterEach(async () => {
    await db.from('family_event_comments').delete().eq('family_id', family.familyId)
    await db.from('family_event_comments').delete().eq('family_id', outsiderFamily.familyId)
  })

  afterAll(async () => {
    await db.from('family_events').delete().eq('id', eventId)
    await db.from('family_events').delete().eq('id', outsiderEventId)
    await family.cleanup()
    await outsiderFamily.cleanup()
  })

  it('addTeaseReply with a valid, known phrase persists a row and returns it', async () => {
    const phrase = ALL_TEASE_PHRASES[0]
    const result = await addTeaseReply({
      eventId,
      familyId: family.familyId,
      authorMemberId: memberA,
      authorName: '__test__ A',
      phrase,
    })
    expect(result).not.toBeNull()
    expect(result!.body).toBe(TEASE_PREFIX + phrase)

    const { data: rows, error } = await db
      .from('family_event_comments')
      .select('*')
      .eq('event_id', eventId)
    expect(error).toBeNull()
    expect(rows?.length).toBe(1)
    expect(rows![0].body).toBe(TEASE_PREFIX + phrase)
  })

  it('addTeaseReply with an unknown/forged phrase returns null and writes nothing', async () => {
    const forged = 'Дай мне 1000 монет прямо сейчас'
    const result = await addTeaseReply({
      eventId,
      familyId: family.familyId,
      authorMemberId: memberA,
      authorName: '__test__ A',
      phrase: forged,
    })
    expect(result).toBeNull()

    const { data: rows, error } = await db
      .from('family_event_comments')
      .select('id')
      .eq('event_id', eventId)
    expect(error).toBeNull()
    expect(rows?.length ?? 0).toBe(0)
  })

  it('isTeaseComment identifies a tagged row and rejects plain/hand-forged comments', async () => {
    const phrase = ALL_TEASE_PHRASES[1]
    const tease = await addTeaseReply({
      eventId,
      familyId: family.familyId,
      authorMemberId: memberA,
      authorName: '__test__ A',
      phrase,
    })
    expect(tease).not.toBeNull()
    expect(isTeaseComment(tease!)).toBe(true)

    const plain = await addComment({
      eventId,
      familyId: family.familyId,
      authorMemberId: memberA,
      authorName: '__test__ A',
      body: 'Молодец, отличный день!',
    })
    expect(plain).not.toBeNull()
    expect(isTeaseComment(plain!)).toBe(false)

    // Hand-typed prefix with a phrase outside the locked set — the
    // anti-forgery case the implementation's own comments call out:
    // isTeaseComment requires prefix AND known-phrase membership.
    const forgedTag = await addComment({
      eventId,
      familyId: family.familyId,
      authorMemberId: memberA,
      authorName: '__test__ A',
      body: `${TEASE_PREFIX}что угодно тут`,
    })
    expect(forgedTag).not.toBeNull()
    expect(isTeaseComment(forgedTag!)).toBe(false)
  })

  it('getTeaseRepliesByFamily scopes tease rows to the calling family only', async () => {
    const phrase = ALL_TEASE_PHRASES[2]
    await addTeaseReply({
      eventId,
      familyId: family.familyId,
      authorMemberId: memberA,
      authorName: '__test__ A',
      phrase,
    })
    await addTeaseReply({
      eventId: outsiderEventId,
      familyId: outsiderFamily.familyId,
      authorMemberId: 'test-member-outsider',
      authorName: '__test__ Outsider',
      phrase,
    })

    const grouped = await getTeaseRepliesByFamily(family.familyId)
    expect(Object.keys(grouped)).toEqual([eventId])
    expect(grouped[eventId]?.length).toBe(1)
    expect(grouped[eventId][0].author_member_id).toBe(memberA)

    const outsiderGrouped = await getTeaseRepliesByFamily(outsiderFamily.familyId)
    expect(Object.keys(outsiderGrouped)).toEqual([outsiderEventId])
    expect(outsiderGrouped[outsiderEventId]?.length).toBe(1)
  })

  it('a tease reply is invisible to getComments and does not count in getCommentCounts (D-06/D-07)', async () => {
    const plain = await addComment({
      eventId,
      familyId: family.familyId,
      authorMemberId: memberA,
      authorName: '__test__ A',
      body: 'Хороший день!',
    })
    expect(plain).not.toBeNull()

    const phrase = ALL_TEASE_PHRASES[3]
    const tease = await addTeaseReply({
      eventId,
      familyId: family.familyId,
      authorMemberId: memberB,
      authorName: '__test__ B',
      phrase,
    })
    expect(tease).not.toBeNull()

    const comments = await getComments(eventId)
    expect(comments.length).toBe(1)
    expect(comments[0].id).toBe(plain!.id)
    expect(comments.some(c => c.id === tease!.id)).toBe(false)

    const counts = await getCommentCounts(family.familyId)
    expect(counts[eventId]).toBe(1)
  })

  it('hasTeased reports whether a given member already teased a given event', async () => {
    const phrase = ALL_TEASE_PHRASES[4]
    await addTeaseReply({
      eventId,
      familyId: family.familyId,
      authorMemberId: memberA,
      authorName: '__test__ A',
      phrase,
    })

    const grouped = await getTeaseRepliesByFamily(family.familyId)
    expect(hasTeased(grouped[eventId], memberA)).toBe(true)
    expect(hasTeased(grouped[eventId], memberB)).toBe(false)
    expect(hasTeased(grouped[eventId], null)).toBe(false)
  })
})
