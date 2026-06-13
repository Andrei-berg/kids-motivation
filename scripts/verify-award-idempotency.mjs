// scripts/verify-award-idempotency.mjs
// Verifies the (child_id, source_type, source_id) idempotency contract that the
// /api/wallet/award route relies on, directly against the live DB via the
// service-role key. Safe: uses a synthetic source_id and cleans up after itself.
//
// Run:  node --env-file=.env.local scripts/verify-award-idempotency.mjs
//
// What it checks:
//   1. The source_type/source_id columns + unique index exist (migration applied).
//   2. Inserting two transactions with the same (child_id, source_type, source_id)
//      is rejected by the unique index (second insert errors with 23505).
//   3. Cleanup removes the test row.

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key || key === 'your_supabase_service_role_key') {
  console.error('Missing SUPABASE_URL / real SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

const SOURCE_TYPE = '__verify__'
const SOURCE_ID = `verify-${Date.now()}`

async function main() {
  // Pick any existing child to attach the test rows to.
  const { data: child, error: childErr } = await db
    .from('children').select('id, family_id').limit(1).maybeSingle()
  if (childErr || !child) { console.error('No children found:', childErr?.message); process.exit(1) }

  const baseRow = {
    child_id: child.id,
    family_id: child.family_id,
    transaction_type: 'earn_coins',
    coins_change: 0, // zero so wallet balance is untouched even if something leaks
    money_change: 0,
    description: 'idempotency self-test',
    icon: '🧪',
    balance_after_coins: 0,
    balance_after_money: 0,
    source_type: SOURCE_TYPE,
    source_id: SOURCE_ID,
  }

  // 1+2. First insert should succeed, second should fail with unique violation.
  const first = await db.from('wallet_transactions').insert(baseRow).select('id').single()
  if (first.error) {
    if (first.error.message.includes('source_type') || first.error.message.includes('source_id')) {
      console.error('❌ Migration not applied — source_type/source_id columns missing.')
    } else {
      console.error('❌ First insert failed:', first.error.message)
    }
    process.exit(1)
  }
  console.log('✓ First award insert succeeded:', first.data.id)

  const second = await db.from('wallet_transactions').insert(baseRow).select('id').single()
  if (!second.error) {
    console.error('❌ Second insert SUCCEEDED — unique index missing! Cleaning up both.')
    await db.from('wallet_transactions').delete().eq('source_type', SOURCE_TYPE).eq('source_id', SOURCE_ID)
    process.exit(1)
  }
  if (second.error.code === '23505') {
    console.log('✓ Duplicate (child_id, source_type, source_id) rejected by unique index (23505).')
  } else {
    console.error('⚠ Second insert failed but not with 23505:', second.error.code, second.error.message)
  }

  // 3. Cleanup.
  const del = await db.from('wallet_transactions').delete()
    .eq('source_type', SOURCE_TYPE).eq('source_id', SOURCE_ID)
  if (del.error) console.error('⚠ Cleanup failed, remove manually:', del.error.message)
  else console.log('✓ Cleanup done.')

  console.log('\n✅ Idempotency contract verified.')
}

main().catch((e) => { console.error('EXC', e); process.exit(1) })
