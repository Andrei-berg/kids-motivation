// scripts/verify-migrations-applied.mjs
// Guards against the "ROADMAP says Complete but the migration never ran" class
// of bug (Phase 1.3's categories/schedule/push migration silently never reached
// prod — found only during Phase 5.10 verification). Parses every DDL object
// declared across supabase/migrations/*.sql and checks each one exists in the
// live database.
//
// Run:  node --env-file=.env.local scripts/verify-migrations-applied.mjs
//   (needs SUPABASE_DB_URL — the Session pooler Postgres connection string.
//    npm i pg --no-save  if 'pg' is not installed.)
//
// Exit 0 = every declared table / column / function / index is present and
// every declared policy is either present or a known, intentional supersession
// (see SUPERSEDED_POLICIES below). Exit 1 = a genuine gap — investigate before
// trusting any phase that depends on the missing object.

import fs from 'fs'
import path from 'path'
import pg from 'pg'

const DIR = 'supabase/migrations'

// Policies that a LATER migration deliberately drops and does not recreate.
// Their absence from prod is correct, not a gap.
//   - migration-day-types.sql "public *" grants  -> purged by 04.4-04 / 04.4-05
//     (the anon-key read/write hole close: every `USING (true)` / `*_anon_all`
//     policy removed from 30 tables).
//   - rls.sql "*_family_isolation" on money tables -> replaced by the
//     SELECT-only lockdown in 04.4-03 / 05.5-03.
//   - family_members_self_update (05.7-01) -> replaced by the mark_chat_read()
//     SECURITY DEFINER RPC in 05.7-02 (column-scoping fix).
const SUPERSEDED_POLICIES = new Set([
  'vacation_periods::public vacation periods',
  'reading_log::public reading log',
  'extra_lessons::public extra lessons',
  'extra_activities::public extra activities',
  'activity_logs::public activity logs',
  'streaks::streaks_family_isolation',
  'wallet::wallet_family_isolation',
  'wallet_transactions::wallet_transactions_family_isolation',
  'wallet_settings::wallet_settings_family_isolation',
  'rewards::rewards_family_isolation',
  'reward_purchases::reward_purchases_family_isolation',
  'coin_exchanges::coin_exchanges_family_isolation',
  'cash_withdrawals::cash_withdrawals_family_isolation',
  'p2p_transfers::p2p_transfers_family_isolation',
  'family_members::family_members_self_update',
])

// drop quotes and any leading schema qualifier (public. / storage.) so names
// match pg_catalog's bare table names
const strip = (s) => s.replace(/"/g, '').replace(/^[a-z_]+\./i, '').toLowerCase()

const wantTables = new Map()
const wantColumns = new Map()
const wantFunctions = new Map()
const wantPolicies = new Map()
const wantIndexes = new Map()

for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith('.sql')).sort()) {
  const clean = fs
    .readFileSync(path.join(DIR, f), 'utf8')
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')

  for (const m of clean.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."]+)/gi))
    if (!wantTables.has(strip(m[1]))) wantTables.set(strip(m[1]), f)
  for (const m of clean.matchAll(
    /alter\s+table\s+(?:if\s+exists\s+)?([a-z0-9_."]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z0-9_"]+)/gi
  ))
    wantColumns.set(`${strip(m[1])}.${strip(m[2])}`, f)
  for (const m of clean.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([a-z0-9_."]+)\s*\(/gi))
    if (!wantFunctions.has(strip(m[1]))) wantFunctions.set(strip(m[1]), f)
  for (const m of clean.matchAll(/create\s+policy\s+"?([a-z0-9_ .-]+?)"?\s+on\s+([a-z0-9_."]+)/gi))
    wantPolicies.set(`${strip(m[2])}::${m[1].trim().toLowerCase()}`, f)
  for (const m of clean.matchAll(
    /create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?([a-z0-9_"]+)\s+on\s+/gi
  ))
    wantIndexes.set(strip(m[1]), f)
}

if (!process.env.SUPABASE_DB_URL) {
  console.error('Missing SUPABASE_DB_URL in env')
  process.exit(1)
}
const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL })
await c.connect()

const set = async (sql, col) => new Set((await c.query(sql)).rows.map((r) => r[col]))
const haveTables = await set(`select tablename from pg_tables where schemaname='public'`, 'tablename')
const haveColumns = await set(
  `select table_name||'.'||column_name c from information_schema.columns where table_schema='public'`,
  'c'
)
const haveFunctions = await set(
  `select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','extensions')`,
  'proname'
)
const havePolicies = await set(
  `select lower(tablename)||'::'||lower(policyname) p from pg_policies where schemaname in ('public','storage')`,
  'p'
)
const haveIndexes = await set(`select indexname from pg_indexes where schemaname='public'`, 'indexname')
await c.end()

let gaps = 0
const check = (label, want, have, allow = new Set()) => {
  const missing = [...want].filter(([k]) => !have.has(k) && !allow.has(k))
  const superseded = [...want].filter(([k]) => !have.has(k) && allow.has(k)).length
  console.log(
    `${label.padEnd(10)} ${String(want.size).padStart(3)} declared  ${String(missing.length).padStart(
      2
    )} missing  ${superseded ? `(${superseded} superseded, ok)` : ''}`
  )
  for (const [k, f] of missing) console.log(`   ✗ ${k}   (${f})`)
  gaps += missing.length
}

check('TABLES', wantTables, haveTables)
check('COLUMNS', wantColumns, haveColumns)
check('FUNCTIONS', wantFunctions, haveFunctions)
check('POLICIES', wantPolicies, havePolicies, SUPERSEDED_POLICIES)
check('INDEXES', wantIndexes, haveIndexes)

console.log(gaps === 0 ? '\n✅ all declared migration objects present in prod' : `\n❌ ${gaps} genuine gap(s)`)
process.exit(gaps === 0 ? 0 : 1)
