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
//   4. The actual CR-02 exploit path (Phase 5.6, Plan 08 gap closure): insert
//      a synthetic day_block + day_block_entries row, award it with the
//      NATURAL key `${date}:${block_id}` (matching app/api/wallet/award's
//      post-Plan-07 sourceId), delete + re-insert the entry row so it gets a
//      NEW UUID (simulating entry rotation), then assert a second
//      natural-key award insert is rejected (23505) — proving entry rotation
//      no longer defeats idempotency, unlike the old literal-duplicate-only
//      check in step 2. Self-cleaning.

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

  // 4. Entry-rotation exploit probe (CR-02, Plan 08 gap closure). Proves that
  // deleting and re-inserting a day_block_entries row (which mints a NEW
  // UUID) does NOT defeat the (child_id, source_type, source_id) idempotency
  // index, because the award route keys custom_block intents on the NATURAL
  // `${date}:${block_id}` string (Plan 07), not the entry row's own id.
  const TEST_DATE = '1999-12-31'
  // WR-06: every failure path inside the try THROWS instead of calling
  // process.exit(1) — process.exit inside a try bypasses the catch, which is
  // the only place the synthetic block/entry/transaction get cleaned up on
  // failure. The catch cleans whatever ids were registered, then exits 1.
  let testBlockId = null
  let testEntryId = null
  let naturalSourceId = null
  try {
    // a. Synthetic custom day_block (legacy_key NULL — no legacy-delete guard).
    // is_active: false (WR-06) — the probe never reads the block back through
    // the assembler, so keeping it inactive means it can never render as an
    // earnable block in a real family's day-fill forms, even mid-run.
    const blockIns = await db.from('day_blocks').insert({
      family_id: child.family_id,
      name: 'verify-day-blocks rotation probe',
      icon: '🧪',
      price: 1,
      is_active: false,
    }).select('id').single()
    if (blockIns.error) {
      throw new Error(`Could not create synthetic day_block for rotation probe: ${blockIns.error.message}`)
    }
    testBlockId = blockIns.data.id
    console.log('✓ Synthetic day_block created for rotation probe:', testBlockId)

    // b. First day_block_entries row (v1 id).
    const entryIns = await db.from('day_block_entries').insert({
      child_id: child.id,
      family_id: child.family_id,
      date: TEST_DATE,
      block_id: testBlockId,
      done: true,
    }).select('id').single()
    if (entryIns.error) {
      throw new Error(`Could not create synthetic day_block_entries row: ${entryIns.error.message}`)
    }
    testEntryId = entryIns.data.id
    console.log('✓ Synthetic day_block_entries row inserted (v1 id):', testEntryId)

    // c. Award the NATURAL key `${date}:${block_id}` — must match the route's
    // sourceId: `${date}:${entry.block_id}` (app/api/wallet/award/route.ts).
    naturalSourceId = `${TEST_DATE}:${testBlockId}`
    const rotationBaseRow = {
      child_id: child.id,
      family_id: child.family_id,
      transaction_type: 'earn_coins',
      coins_change: 0,
      money_change: 0,
      description: 'day-blocks rotation probe',
      icon: '🧪',
      balance_after_coins: 0,
      balance_after_money: 0,
      source_type: SOURCE_TYPE,
      source_id: naturalSourceId,
    }
    const firstAward = await db.from('wallet_transactions').insert(rotationBaseRow).select('id').single()
    if (firstAward.error) {
      throw new Error(`First natural-key award insert failed: ${firstAward.error.message}`)
    }
    console.log('✓ First natural-key award insert succeeded:', firstAward.data.id)

    // d. Simulate rotation: delete + re-insert the entry -> gets a NEW id.
    // (The 05.6-02 migration now denies DELETE to every client role via RLS;
    // this probe runs as the service role, which bypasses RLS, so it can
    // still exercise the raw exploit mechanics and prove the NATURAL key —
    // not RLS alone — is what keeps idempotency intact.)
    const delEntry = await db.from('day_block_entries').delete().eq('id', testEntryId)
    if (delEntry.error) {
      throw new Error(`Could not delete synthetic entry to simulate rotation: ${delEntry.error.message}`)
    }
    const reinsertEntry = await db.from('day_block_entries').insert({
      child_id: child.id,
      family_id: child.family_id,
      date: TEST_DATE,
      block_id: testBlockId,
      done: true,
    }).select('id').single()
    if (reinsertEntry.error) {
      // testEntryId is stale (the delete above succeeded) — clear it so the
      // catch cleanup does not try to delete a row that no longer exists.
      testEntryId = null
      throw new Error(`Could not re-insert entry to simulate rotation: ${reinsertEntry.error.message}`)
    }
    testEntryId = reinsertEntry.data.id
    console.log('✓ Entry rotated to a NEW id (UUID rotates, natural key does not):', testEntryId)

    // e. Second award attempt with the SAME natural key — must be rejected.
    const secondAward = await db.from('wallet_transactions').insert(rotationBaseRow).select('id').single()
    if (!secondAward.error) {
      throw new Error('Second natural-key award insert SUCCEEDED after entry rotation — CR-02 reopened!')
    }
    if (secondAward.error.code === '23505') {
      console.log('✓ Entry-rotation double-credit rejected by unique index (23505) — CR-02 stays closed.')
    } else {
      throw new Error(`Second natural-key award insert failed but not with 23505: ${secondAward.error.code} ${secondAward.error.message}`)
    }

    // f. Cleanup: transaction, entry, synthetic block.
    await db.from('wallet_transactions').delete().eq('source_type', SOURCE_TYPE).eq('source_id', naturalSourceId)
    await db.from('day_block_entries').delete().eq('id', testEntryId)
    await db.from('day_blocks').delete().eq('id', testBlockId)
    console.log('✓ Rotation-probe cleanup done.')
  } catch (e) {
    // WR-06 cleanup: remove everything registered so far — the natural-key
    // transaction (a visible row in a real child's history), the entry, and
    // the synthetic block (an earnable row in a real family's config).
    console.error('❌ EXC during rotation probe, attempting cleanup:', e)
    if (naturalSourceId) await db.from('wallet_transactions').delete().eq('source_type', SOURCE_TYPE).eq('source_id', naturalSourceId)
    if (testEntryId) await db.from('day_block_entries').delete().eq('id', testEntryId)
    if (testBlockId) await db.from('day_blocks').delete().eq('id', testBlockId)
    process.exit(1)
  }

  console.log('\n✅ Day-blocks award idempotency contract verified (literal duplicate + entry-rotation exploit path).')
}

main().catch((e) => { console.error('EXC', e); process.exit(1) })
