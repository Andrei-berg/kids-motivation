// scripts/verify-streaks-rls.mjs
// E2E verification of the streaks RLS lock (migration 05.5-03-streaks-rls-readonly.sql,
// CR-01 D-12.3). Creates a fully isolated throwaway family + child + auth user, signs
// in as that child, and asserts: the child CAN read its own streaks row but CANNOT
// update it or insert a new streaks row. Cleans everything up afterwards.
//
// Run AFTER applying 05.5-03-streaks-rls-readonly.sql:
//   node --env-file=.env.local scripts/verify-streaks-rls.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const admin = createClient(url, svc, { auth: { persistSession: false } })

const rnd = Math.random().toString(36).slice(2, 8)
const email = `rls_verify_streaks_${rnd}@internal.familycoins.app`
const password = 'verify-' + rnd
const childId = `rls-verify-streaks-${rnd}`
let userId, familyId
const cleanup = []

async function main() {
  // --- Seed an isolated family via service-role ---
  const u = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (u.error) throw new Error('createUser: ' + u.error.message)
  userId = u.data.user.id
  cleanup.push(() => admin.auth.admin.deleteUser(userId))

  const fam = await admin.from('families').insert({ name: 'RLS Verify Streaks ' + rnd }).select('id').single()
  if (fam.error) throw new Error('family insert: ' + fam.error.message)
  familyId = fam.data.id
  cleanup.push(() => admin.from('families').delete().eq('id', familyId))

  const ch = await admin.from('children').insert({ id: childId, name: 'RLSStreakKid', family_id: familyId }).select('id').single()
  if (ch.error) throw new Error('child insert: ' + ch.error.message)
  cleanup.push(() => admin.from('children').delete().eq('id', childId))

  const fm = await admin.from('family_members')
    .insert({ family_id: familyId, user_id: userId, role: 'child', child_id: childId })
    .select('id').single()
  if (fm.error) throw new Error('family_member insert: ' + fm.error.message)
  cleanup.push(() => admin.from('family_members').delete().eq('id', fm.data.id))

  const st = await admin.from('streaks')
    .insert({ child_id: childId, family_id: familyId, streak_type: 'room',
      current_count: 3, best_count: 3, last_updated: new Date().toISOString().slice(0, 10), active: true })
    .select('id').single()
  if (st.error) throw new Error('streaks insert: ' + st.error.message)
  cleanup.push(() => admin.from('streaks').delete().eq('child_id', childId))

  // --- Sign in as the child (authenticated, RLS-bound) ---
  const kid = createClient(url, anon, { auth: { persistSession: false } })
  const si = await kid.auth.signInWithPassword({ email, password })
  if (si.error) throw new Error('sign in: ' + si.error.message)

  const results = []

  // 1. SELECT own streaks row — should return it.
  const sel = await kid.from('streaks').select('current_count').eq('child_id', childId)
  const canRead = !sel.error && (sel.data?.length ?? 0) === 1 && sel.data[0].current_count === 3
  results.push(['child can READ own streaks', canRead])

  // 2. UPDATE own streaks row — should be denied (0 rows changed by RLS).
  await kid.from('streaks').update({ current_count: 99999 }).eq('child_id', childId)
  const after = await admin.from('streaks').select('current_count').eq('child_id', childId).single()
  const updateBlocked = after.data?.current_count === 3
  results.push(['child CANNOT update own streaks', updateBlocked])

  // 3. INSERT a new streaks row — should be denied.
  const ins = await kid.from('streaks').insert({
    child_id: childId, family_id: familyId, streak_type: 'study',
    current_count: 999, best_count: 999, last_updated: new Date().toISOString().slice(0, 10), active: true,
  }).select('id')
  const insBlocked = !!ins.error || (ins.data?.length ?? 0) === 0
  results.push(['child CANNOT insert streaks row', insBlocked])

  console.log()
  let allOk = true
  for (const [label, ok] of results) {
    console.log(`${ok ? '✓' : '❌'} ${label}`)
    if (!ok) allOk = false
  }
  console.log(allOk ? '\n✅ Streaks RLS lock verified.' : '\n❌ RLS lock NOT correct — review migration.')
  if (!allOk) process.exitCode = 1
}

main()
  .catch((e) => { console.error('EXC', e.message); process.exitCode = 1 })
  .finally(async () => {
    for (const c of cleanup.reverse()) { try { await c() } catch (e) { console.warn('cleanup:', e.message) } }
    console.log('cleaned up')
  })
