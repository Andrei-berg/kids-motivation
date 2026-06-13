// scripts/verify-award-reads.mjs
// Verifies that the award route's source READS resolve against the live schema
// (the risky part: correct tables/columns/joins). Seeds a throwaway test date
// for a real child, runs the same queries /api/wallet/award uses, asserts the
// expected award sources are found, then cleans everything up.
//
// Run: node --env-file=.env.local scripts/verify-award-reads.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const db = createClient(url, key, { auth: { persistSession: false } })

const DATE = '1999-01-02' // throwaway test date, far from real data
let childId, familyId, sectionId
const cleanup = []

async function main() {
  const { data: child } = await db.from('children').select('id, family_id').limit(1).maybeSingle()
  if (!child) throw new Error('no children')
  childId = child.id; familyId = child.family_id
  console.log('Using child', childId)

  // Seed: a grade, a day (room_ok + behavior), a section + visit w/ rating.
  const g = await db.from('subject_grades')
    .insert({ child_id: childId, date: DATE, subject: 'ТестМатем', grade: 5, family_id: familyId })
    .select('id').single()
  if (g.error) throw new Error('grade insert: ' + g.error.message)
  cleanup.push(() => db.from('subject_grades').delete().eq('id', g.data.id))

  const d = await db.from('days')
    .insert({ child_id: childId, date: DATE, room_bed: true, room_floor: true, room_desk: true,
      room_closet: true, room_trash: true, room_score: 5, room_ok: true, good_behavior: true,
      family_id: familyId })
    .select('id, room_ok').single()
  if (d.error) throw new Error('day insert: ' + d.error.message)
  cleanup.push(() => db.from('days').delete().eq('id', d.data.id))

  const sec = await db.from('sections')
    .insert({ child_id: childId, name: 'ТестСекция', family_id: familyId })
    .select('id').single()
  if (sec.error) throw new Error('section insert: ' + sec.error.message)
  sectionId = sec.data.id
  cleanup.push(() => db.from('sections').delete().eq('id', sectionId))

  const v = await db.from('section_visits')
    .insert({ section_id: sectionId, date: DATE, attended: true, coach_rating: 5, family_id: familyId })
    .select('id').single()
  if (v.error) throw new Error('visit insert: ' + v.error.message)
  cleanup.push(() => db.from('section_visits').delete().eq('id', v.data.id))

  // Replicate the route's reads.
  const found = []
  const { data: day } = await db.from('days').select('id, room_ok, good_behavior')
    .eq('child_id', childId).eq('date', DATE).maybeSingle()
  if (day?.room_ok) found.push('room')
  if (day?.good_behavior) found.push('behavior')

  const { data: grades } = await db.from('subject_grades').select('id, grade')
    .eq('child_id', childId).eq('date', DATE)
  if ((grades ?? []).some((x) => x.grade === 5)) found.push('grade')

  const { data: childSections } = await db.from('sections').select('id').eq('child_id', childId)
  const sectionIds = (childSections ?? []).map((s) => s.id)
  const { data: visits } = await db.from('section_visits')
    .select('id, attended, coach_rating').in('section_id', sectionIds).eq('date', DATE)
  if ((visits ?? []).some((x) => x.attended && x.coach_rating === 5)) found.push('sport')

  const expected = ['room', 'behavior', 'grade', 'sport']
  const ok = expected.every((e) => found.includes(e))
  console.log('Resolved sources:', found.join(', '))
  console.log(ok ? '\n✅ All award source reads resolve correctly.' : '\n❌ Missing: ' + expected.filter(e => !found.includes(e)).join(', '))
  if (!ok) process.exitCode = 1
}

main()
  .catch((e) => { console.error('EXC', e.message); process.exitCode = 1 })
  .finally(async () => {
    for (const c of cleanup.reverse()) { try { await c() } catch {} }
    console.log('cleaned up')
  })
