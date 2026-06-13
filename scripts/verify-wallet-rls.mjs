// scripts/verify-wallet-rls.mjs
// E2E verification of the wallet RLS lock (migration 04.4-03). Creates a fully
// isolated throwaway family + child + auth user, signs in as that child, and
// asserts: the child CAN read its wallet but CANNOT update it or insert a
// wallet_transaction. Cleans everything up afterwards.
//
// Run AFTER applying 04.4-03-wallet-rls-readonly.sql:
//   node --env-file=.env.local scripts/verify-wallet-rls.mjs

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const admin = createClient(url, svc, { auth: { persistSession: false } })

const rnd = Math.random().toString(36).slice(2, 8)
const email = `rls_verify_${rnd}@internal.familycoins.app`
const password = 'verify-' + rnd
const childId = `rls-verify-${rnd}`
let userId, familyId
const cleanup = []

async function main() {
  // --- Seed an isolated family via service-role ---
  const u = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (u.error) throw new Error('createUser: ' + u.error.message)
  userId = u.data.user.id
  cleanup.push(() => admin.auth.admin.deleteUser(userId))

  const fam = await admin.from('families').insert({ name: 'RLS Verify ' + rnd }).select('id').single()
  if (fam.error) throw new Error('family insert: ' + fam.error.message)
  familyId = fam.data.id
  cleanup.push(() => admin.from('families').delete().eq('id', familyId))

  const ch = await admin.from('children').insert({ id: childId, name: 'RLSKid', family_id: familyId }).select('id').single()
  if (ch.error) throw new Error('child insert: ' + ch.error.message)
  cleanup.push(() => admin.from('children').delete().eq('id', childId))

  const fm = await admin.from('family_members')
    .insert({ family_id: familyId, user_id: userId, role: 'child', child_id: childId })
    .select('id').single()
  if (fm.error) throw new Error('family_member insert: ' + fm.error.message)
  cleanup.push(() => admin.from('family_members').delete().eq('id', fm.data.id))

  const w = await admin.from('wallet')
    .insert({ child_id: childId, family_id: familyId, coins: 10, money: 0,
      total_earned_coins: 10, total_spent_coins: 0, total_exchanged_coins: 0,
      total_earned_money: 0, total_spent_money: 0 })
    .select('child_id').single()
  if (w.error) throw new Error('wallet insert: ' + w.error.message)
  cleanup.push(() => admin.from('wallet').delete().eq('child_id', childId))

  // --- Sign in as the child (authenticated, RLS-bound) ---
  const kid = createClient(url, anon, { auth: { persistSession: false } })
  const si = await kid.auth.signInWithPassword({ email, password })
  if (si.error) throw new Error('sign in: ' + si.error.message)

  const results = []

  // 1. SELECT own wallet — should return the row.
  const sel = await kid.from('wallet').select('coins').eq('child_id', childId)
  const canRead = !sel.error && (sel.data?.length ?? 0) === 1 && sel.data[0].coins === 10
  results.push(['child can READ own wallet', canRead])

  // 2. UPDATE own wallet — should be denied (0 rows changed by RLS).
  await kid.from('wallet').update({ coins: 99999 }).eq('child_id', childId)
  const after = await admin.from('wallet').select('coins').eq('child_id', childId).single()
  const writeBlocked = after.data?.coins === 10
  results.push(['child CANNOT update own wallet', writeBlocked])

  // 3. INSERT a wallet_transaction — should be denied.
  const ins = await kid.from('wallet_transactions').insert({
    child_id: childId, family_id: familyId, transaction_type: 'earn_coins',
    coins_change: 5000, money_change: 0, description: 'hack', icon: '😈',
    balance_after_coins: 5010, balance_after_money: 0,
  }).select('id')
  const insBlocked = !!ins.error || (ins.data?.length ?? 0) === 0
  results.push(['child CANNOT insert wallet_transaction', insBlocked])

  console.log()
  let allOk = true
  for (const [label, ok] of results) {
    console.log(`${ok ? '✓' : '❌'} ${label}`)
    if (!ok) allOk = false
  }
  console.log(allOk ? '\n✅ Wallet RLS lock verified.' : '\n❌ RLS lock NOT correct — review migration.')
  if (!allOk) process.exitCode = 1
}

main()
  .catch((e) => { console.error('EXC', e.message); process.exitCode = 1 })
  .finally(async () => {
    for (const c of cleanup.reverse()) { try { await c() } catch (e) { console.warn('cleanup:', e.message) } }
    console.log('cleaned up')
  })
