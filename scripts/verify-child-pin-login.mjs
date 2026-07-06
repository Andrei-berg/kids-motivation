// scripts/verify-child-pin-login.mjs
// End-to-end verification of the child code+PIN login path against the live DB.
// Creates a throwaway family + child, reproduces what /api/set-child-pin does
// (synthetic auth user + link user_id + pin_set), then exercises the exact
// pre-auth login chain and confirms the session resolves to the child profile.
// Cleans up everything (auth user, rows) in a finally block.
//
// Run:  node --env-file=.env.local scripts/verify-child-pin-login.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

function fail(m) { console.error('❌ ' + m); throw new Error(m) }
function ok(m) { console.log('✅ ' + m) }

const suffix = Date.now().toString(36)
const CHILD_ID = `pinverify_${suffix}`
const PIN = '4271'
const syntheticEmail = `child_${CHILD_ID}@internal.familycoins.app`

let familyId = null, memberId = null, synthUserId = null

async function main() {
  // --- setup: throwaway family + children row + child member ---
  const fam = await svc.from('families').insert({ name: `__pinverify_${suffix}` }).select('id, invite_code').single()
  if (fam.error) fail('create family: ' + fam.error.message)
  familyId = fam.data.id
  const inviteCode = fam.data.invite_code

  const kid = await svc.from('children').insert({ id: CHILD_ID, family_id: familyId, name: 'PinVerify' }).select('id').single()
  if (kid.error) fail('create children row: ' + kid.error.message)

  const mem = await svc.from('family_members')
    .insert({ family_id: familyId, role: 'child', child_id: CHILD_ID, display_name: 'PinVerify', user_id: null, pin_set: false })
    .select('id').single()
  if (mem.error) fail('create family_member: ' + mem.error.message)
  memberId = mem.data.id
  ok(`setup: family ${inviteCode}, child ${CHILD_ID}`)

  // --- reproduce /api/set-child-pin: synthetic user + link + pin_set ---
  const created = await svc.auth.admin.createUser({ email: syntheticEmail, password: PIN, email_confirm: true })
  if (created.error) fail('create synthetic user: ' + created.error.message)
  synthUserId = created.data.user.id
  const link = await svc.from('family_members').update({ user_id: synthUserId, pin_set: true }).eq('id', memberId)
  if (link.error) fail('link + pin_set: ' + link.error.message)
  ok('set-child-pin effect applied (synthetic user + user_id + pin_set)')

  // --- 1. picker (anon) returns the child WITH child_id ---
  const picker = await anon.rpc('get_family_pin_profiles', { p_family_id: familyId })
  if (picker.error) fail('picker rpc: ' + picker.error.message)
  const row = (picker.data || []).find(r => r.child_id === CHILD_ID)
  if (!row) fail('picker did not return the PIN child')
  if (row.member_id !== memberId) fail('picker member_id mismatch')
  ok(`picker returns child_id (${row.child_id}) + member_id — no anon table read needed`)

  // --- 2. sign in with the synthetic email + PIN (what /kid/login does) ---
  const signin = await anon.auth.signInWithPassword({ email: syntheticEmail, password: PIN })
  if (signin.error) fail('PIN sign-in failed: ' + signin.error.message)
  if (signin.data.user?.id !== synthUserId) fail('signed-in uid != synthetic id')
  ok('PIN sign-in succeeds')

  // --- 3. the authenticated session resolves membership by user_id (middleware/RLS path) ---
  const authed = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${signin.data.session.access_token}` } },
  })
  const membership = await authed.from('family_members').select('role, child_id').eq('user_id', synthUserId).maybeSingle()
  if (membership.error) fail('membership resolve: ' + membership.error.message)
  if (!membership.data) fail('signed-in child cannot see own membership (RLS/link broken)')
  if (membership.data.role !== 'child' || membership.data.child_id !== CHILD_ID) fail('membership mismatch: ' + JSON.stringify(membership.data))
  ok(`session resolves to role=child, child_id=${membership.data.child_id}`)

  // --- 4. wrong PIN is rejected ---
  const bad = await anon.auth.signInWithPassword({ email: syntheticEmail, password: '0000' })
  if (!bad.error) fail('wrong PIN was accepted!')
  ok('wrong PIN rejected')

  console.log('\nAll child PIN-login checks passed.')
}

async function cleanup() {
  try { if (synthUserId) await svc.auth.admin.deleteUser(synthUserId) } catch {}
  try { if (memberId) await svc.from('family_members').delete().eq('id', memberId) } catch {}
  try { await svc.from('children').delete().eq('id', CHILD_ID) } catch {}
  try { if (familyId) await svc.from('families').delete().eq('id', familyId) } catch {}
  console.log('cleaned up')
}

main().then(cleanup).catch(async (e) => { await cleanup(); console.error(e.message); process.exit(1) })
