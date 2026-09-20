// scripts/verify-boost-style-column.mjs
// Asserts children.boost_style + children_boost_style_check exist in the LIVE
// database — not just in the migration file on disk. Guards against the
// "ROADMAP says Complete but the migration never ran" class of bug (see
// scripts/verify-migrations-applied.mjs header comment / Phase 1.3 incident).
//
// Run:  node --env-file=.env.local scripts/verify-boost-style-column.mjs
//   (needs SUPABASE_DB_URL — the Session pooler Postgres connection string.
//    npm i pg --no-save  if 'pg' is not installed.)
//
// Exit 0 = column + default + CHECK constraint + zero-NULL-rows all verified.
// Exit 1 = a genuine gap.

import pg from 'pg'

if (!process.env.SUPABASE_DB_URL) {
  console.error('❌ Missing SUPABASE_DB_URL in env')
  process.exit(1)
}

const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL })
await c.connect()

let failures = 0

// 1. Column exists, NOT NULL, default mentions 'segmented-bar'
const colRes = await c.query(
  `select is_nullable, column_default
   from information_schema.columns
   where table_schema = 'public' and table_name = 'children' and column_name = 'boost_style'`
)
if (colRes.rows.length === 0) {
  console.log("❌ column public.children.boost_style does not exist")
  failures++
} else {
  const { is_nullable, column_default } = colRes.rows[0]
  const nullableOk = is_nullable === 'NO'
  const defaultOk = typeof column_default === 'string' && column_default.includes('segmented-bar')
  console.log(`${nullableOk ? '✅' : '❌'} is_nullable = ${is_nullable} (expected NO)`)
  console.log(`${defaultOk ? '✅' : '❌'} column_default = ${column_default} (expected to contain segmented-bar)`)
  if (!nullableOk) failures++
  if (!defaultOk) failures++
}

// 2. CHECK constraint exists and mentions all three style literals
const conRes = await c.query(
  `select pg_get_constraintdef(oid) as def
   from pg_constraint
   where conname = 'children_boost_style_check'`
)
if (conRes.rows.length === 0) {
  console.log('❌ constraint children_boost_style_check does not exist')
  failures++
} else {
  const def = conRes.rows[0].def
  const hasAll = ['segmented-bar', 'quest-checklist', 'ring-badges'].every((v) => def.includes(v))
  console.log(`${hasAll ? '✅' : '❌'} children_boost_style_check: ${def}`)
  if (!hasAll) failures++
}

// 3. No NULL rows
const nullRes = await c.query(`select count(*)::int as n from children where boost_style is null`)
const nullCount = nullRes.rows[0].n
console.log(`${nullCount === 0 ? '✅' : '❌'} NULL boost_style rows: ${nullCount} (expected 0)`)
if (nullCount !== 0) failures++

await c.end()

console.log(failures === 0 ? '\n✅ children.boost_style verified in prod' : `\n❌ ${failures} check(s) failed`)
process.exit(failures === 0 ? 0 : 1)
