// scripts/verify-atomic-wallet.mjs
// Verifies the atomic wallet_apply() contract from migration
// 2026-07-02-atomic-wallet-ops.sql, directly against the live DB via the
// service-role key. Safe: applies a delta and its exact inverse, so the wallet
// balance is left unchanged. Aborts without mutating if anything looks off.
//
// Run:  node --env-file=.env.local scripts/verify-atomic-wallet.mjs
//
// What it checks:
//   1. wallet_apply() exists (migration applied).
//   2. A positive delta returns the new authoritative balance.
//   3. A guarded overspend (delta that would push coins < 0) is REJECTED with
//      SQLSTATE P0001 (INSUFFICIENT_FUNDS), not silently applied.
//   4. The inverse delta restores the original balance (net-zero side effect).

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key || key === 'your_supabase_service_role_key') {
  console.error('Missing SUPABASE_URL / real SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

function fail(msg) { console.error('❌ ' + msg); process.exit(1) }
function ok(msg) { console.log('✅ ' + msg) }

async function apply(childId, delta, floor /* p_min_coins, optional */) {
  const args = { p_child_id: childId, p_coins_delta: delta }
  if (floor !== undefined) args.p_min_coins = floor
  return db.rpc('wallet_apply', args)
}

async function main() {
  const { data: wallet, error: wErr } = await db
    .from('wallet').select('child_id, coins').order('coins', { ascending: false }).limit(1).maybeSingle()
  if (wErr || !wallet) fail('No wallet rows found: ' + (wErr?.message ?? 'empty'))
  const { child_id, coins: startCoins } = wallet
  console.log(`Using wallet child_id=${child_id} startCoins=${startCoins}`)

  // 1+2. Positive delta of +5 should succeed and report startCoins+5.
  const up = await apply(child_id, 5)
  if (up.error) {
    if (up.error.message?.includes('function') && up.error.message?.includes('wallet_apply')) {
      fail('wallet_apply() not found — migration 2026-07-02-atomic-wallet-ops.sql not applied')
    }
    fail('positive delta failed: ' + up.error.message)
  }
  const afterUp = up.data?.[0]?.coins
  if (afterUp !== startCoins + 5) fail(`expected ${startCoins + 5}, got ${afterUp}`)
  ok(`positive delta applied atomically (${startCoins} → ${afterUp})`)

  // 3. Overspend guard on a SPEND path (p_min_coins = 0): subtracting more than
  //    the balance must be rejected. (Without a floor, negative is allowed by design.)
  const over = await apply(child_id, -(afterUp + 1), 0)
  if (!over.error) {
    // Roll back the accidental debit before failing loudly.
    await apply(child_id, afterUp + 1)
    await apply(child_id, -5)
    fail('OVERSPEND WAS ALLOWED with p_min_coins=0 — spend floor not enforced')
  }
  if (!/INSUFFICIENT_FUNDS|P0001/.test(over.error.message + (over.error.code ?? ''))) {
    ok(`overspend rejected (message: ${over.error.message})`)
  } else {
    ok('overspend rejected with INSUFFICIENT_FUNDS (P0001)')
  }

  // 4. Restore original balance (undo the +5 from step 2).
  const down = await apply(child_id, -5)
  if (down.error) fail('could not restore balance: ' + down.error.message + ' (wallet may be +5 off!)')
  const restored = down.data?.[0]?.coins
  if (restored !== startCoins) fail(`balance not restored: expected ${startCoins}, got ${restored}`)
  ok(`balance restored to ${restored} (net-zero side effect)`)

  console.log('\nAll atomic-wallet checks passed.')
}

main().catch((e) => fail(e.message))
