// scripts/verify-day-blocks-award.mjs
// Verifies the day-blocks award integration (Phase 5.6, Plan 03) against the
// live DB via the service-role key. Safe: uses a synthetic source_id and
// coins_change 0, cleans up after itself.
//
// Run: node --env-file=.env.local scripts/verify-day-blocks-award.mjs
//
// What it checks:
//   1. day_blocks / day_block_entries tables exist and families.day_blocks_enabled
//      column is present (Plan 01 migration applied).
//   2. A wallet_transactions row with source_type 'custom_block' + a synthetic
//      source_id inserts once, and a duplicate (child_id, 'custom_block',
//      source_id) insert is rejected by the unique index (23505) — proving the
//      new source_type participates in the (child_id, source_type, source_id)
//      idempotency contract the award route relies on.
//   3. Cleanup removes the synthetic row (a re-run stays green).

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key || key === 'your_supabase_service_role_key') {
  console.error('Missing SUPABASE_URL / real SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

const SOURCE_TYPE = 'custom_block'
const SOURCE_ID = `verify-day-blocks-${Date.now()}`

async function main() {
  // 1. Schema present: day_blocks / day_block_entries tables + the feature flag column.
  const { error: dayBlocksErr } = await db.from('day_blocks').select('id').limit(1)
  if (dayBlocksErr) {
    console.error('❌ day_blocks table missing/unreadable:', dayBlocksErr.message)
    process.exit(1)
  }
  console.log('✓ day_blocks table exists.')

  const { error: entriesErr } = await db.from('day_block_entries').select('id').limit(1)
  if (entriesErr) {
    console.error('❌ day_block_entries table missing/unreadable:', entriesErr.message)
    process.exit(1)
  }
  console.log('✓ day_block_entries table exists.')

  const { data: familyRow, error: familyErr } = await db
    .from('families').select('id, day_blocks_enabled').limit(1).maybeSingle()
  if (familyErr || !familyRow) {
    console.error('❌ Could not read families.day_blocks_enabled:', familyErr?.message ?? 'no families found')
    process.exit(1)
  }
  console.log(`✓ families.day_blocks_enabled column present (sample value: ${familyRow.day_blocks_enabled}).`)

  // 2. Pick any existing child to attach the synthetic wallet_transactions row to.
  const { data: child, error: childErr } = await db
    .from('children').select('id, family_id').limit(1).maybeSingle()
  if (childErr || !child) {
    console.error('❌ No children found:', childErr?.message)
    process.exit(1)
  }

  const baseRow = {
    child_id: child.id,
    family_id: child.family_id,
    transaction_type: 'earn_coins',
    coins_change: 0, // zero so wallet balance is untouched even if something leaks
    money_change: 0,
    description: 'day-blocks award self-test',
    icon: '🧪',
    balance_after_coins: 0,
    balance_after_money: 0,
    source_type: SOURCE_TYPE,
    source_id: SOURCE_ID,
  }

  const first = await db.from('wallet_transactions').insert(baseRow).select('id').single()
  if (first.error) {
    console.error('❌ First custom_block insert failed:', first.error.message)
    process.exit(1)
  }
  console.log('✓ First custom_block award insert succeeded:', first.data.id)

  const second = await db.from('wallet_transactions').insert(baseRow).select('id').single()
  if (!second.error) {
    console.error('❌ Second insert SUCCEEDED — unique index does not cover custom_block! Cleaning up both.')
    await db.from('wallet_transactions').delete().eq('source_type', SOURCE_TYPE).eq('source_id', SOURCE_ID)
    process.exit(1)
  }
  if (second.error.code === '23505') {
    console.log("✓ Duplicate (child_id, 'custom_block', source_id) rejected by unique index (23505).")
  } else {
    console.error('⚠ Second insert failed but not with 23505:', second.error.code, second.error.message)
    await db.from('wallet_transactions').delete().eq('source_type', SOURCE_TYPE).eq('source_id', SOURCE_ID)
    process.exit(1)
  }

  // 3. Cleanup.
  const del = await db.from('wallet_transactions').delete()
    .eq('source_type', SOURCE_TYPE).eq('source_id', SOURCE_ID)
  if (del.error) {
    console.error('⚠ Cleanup failed, remove manually:', del.error.message)
    process.exit(1)
  }
  console.log('✓ Cleanup done.')

  console.log('\n✅ Day-blocks award idempotency contract verified.')
}

main().catch((e) => { console.error('EXC', e); process.exit(1) })
