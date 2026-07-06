// scripts/verify-structural-login.mjs
// Verifies the password-less child login security model at the DB/mint level
// (fast, no dev server) — this is exactly what /api/kid/login relies on. Proves:
//   1. the synthetic account cannot be signed into with the PIN (password-less);
//   2. verify_child_pin() returns ok for the right PIN, bad_pin for wrong;
//   3. lockout engages after 5 failures within the window;
//   4. a session can be minted without the password (generateLink + verifyOtp).
// Cleans up after itself.
//
// Run:  node --env-file=.env.local scripts/verify-structural-login.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

function fail(m) { console.error('❌ ' + m); throw new Error(m) }
function ok(m) { console.log('✅ ' + m) }
const status = (r) => (Array.isArray(r.data) ? r.data[0] : r.data)?.status

const sfx = Date.now().toString(36)
const CHILD = `slogin_${sfx}`
const PIN = '531642'
const email = `child_${CHILD}@internal.familycoins.app`
let familyId = '', memberId = '', uid = ''

async function main() {
  // setup: throwaway family + child + PIN account (reproduces the set-child-pin effect)
  familyId = (await svc.from('families').insert({ name: `__slogin_${sfx}` }).select('id').single()).data.id
  await svc.from('children').insert({ id: CHILD, family_id: familyId, name: 'SLogin' })
  memberId = (await svc.from('family_members').insert({ family_id: familyId, role: 'child', child_id: CHILD, display_name: 'SLogin', pin_set: false }).select('id').single()).data.id
  const rndPw = 'x' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 'A9!'
  uid = (await svc.auth.admin.createUser({ email, password: rndPw, email_confirm: true })).data.user.id
  await svc.rpc('set_child_pin_hash', { p_child_id: CHILD, p_pin: PIN })
  await svc.from('family_members').update({ user_id: uid, pin_set: true }).eq('id', memberId)
  ok(`setup: child ${CHILD}, PIN account with random password`)

  // 1. Direct sign-in with the PIN must FAIL (password is random, not the PIN).
  const direct = await anon.auth.signInWithPassword({ email, password: PIN })
  if (!direct.error) fail('SECURITY: direct signInWithPassword(PIN) SUCCEEDED — account is brute-forceable')
  ok('direct signInWithPassword(PIN) rejected — account is password-less')

  // 2. verify_child_pin: correct → ok.
  if (status(await svc.rpc('verify_child_pin', { p_child_id: CHILD, p_pin: PIN })) !== 'ok') fail('correct PIN not accepted by verify_child_pin')
  ok('verify_child_pin(correct) → ok')

  // 3. Wrong PIN → bad_pin, then lockout after 5 failures within the window.
  let sawLocked = false
  for (let i = 1; i <= 6; i++) {
    const s = status(await svc.rpc('verify_child_pin', { p_child_id: CHILD, p_pin: '000000' }))
    if (s === 'locked') { sawLocked = true; ok(`lockout engaged after ${i} wrong attempts (status=locked)`); break }
    if (s !== 'bad_pin') fail(`attempt ${i}: expected bad_pin/locked, got ${s}`)
  }
  if (!sawLocked) fail('no lockout after 6 wrong attempts')

  // 3b. While locked, even the CORRECT PIN is refused.
  if (status(await svc.rpc('verify_child_pin', { p_child_id: CHILD, p_pin: PIN })) !== 'locked') fail('correct PIN accepted while locked — lockout not enforced')
  ok('correct PIN refused while locked')

  // 4. Session mint without the password (what the route does on ok).
  const link = await svc.auth.admin.generateLink({ type: 'magiclink', email })
  if (link.error || !link.data?.properties?.email_otp) fail('generateLink did not return an email_otp')
  const otp = await anon.auth.verifyOtp({ email, token: link.data.properties.email_otp, type: 'email' })
  if (otp.error || otp.data.user?.id !== uid) fail('verifyOtp did not mint a session for the child')
  ok('session minted via generateLink + verifyOtp (no password)')

  console.log('\nAll structural-login checks passed.')
}

async function cleanup() {
  try { if (uid) await svc.auth.admin.deleteUser(uid) } catch {}
  try { await svc.from('child_pin_credentials').delete().eq('child_id', CHILD) } catch {}
  try { await svc.from('pin_login_attempts').delete().eq('child_id', CHILD) } catch {}
  try { if (memberId) await svc.from('family_members').delete().eq('id', memberId) } catch {}
  try { await svc.from('children').delete().eq('id', CHILD) } catch {}
  try { if (familyId) await svc.from('families').delete().eq('id', familyId) } catch {}
  console.log('cleaned up')
}

main().then(cleanup).catch(async (e) => { await cleanup(); console.error(e.message); process.exit(1) })
