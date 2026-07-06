// scripts/verify-room-tasks.mjs
// Verifies migration 05.2-01-room-tasks.sql directly against the live DB via
// SUPABASE_DB_URL (pg, per CLAUDE.md "Applying DB migrations"):
//   (a) room_tasks + room_checks tables present
//   (b) RLS enabled on both
//   (room_checks UNIQUE (child_id, date, task_id) constraint present)
//   (c) every EXISTING family has exactly 5 room_tasks with 5 distinct legacy_keys
//   (d) the legacy-delete guard blocks hard-delete of a legacy-mapped task
//   (e) a custom (non-legacy) task inserts and deletes freely
//
// (d) and (e) run against a throwaway family created + cleaned up by this
// script — real family data is never mutated.
//
// Run:  node --env-file=.env.local scripts/verify-room-tasks.mjs

import pg from 'pg'

const { Client } = pg

const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  console.error('SUPABASE_DB_URL not set — cannot apply/verify migration (see CLAUDE.md)')
  process.exit(1)
}

const client = new Client({ connectionString })
const results = []
let allOk = true

function record(label, ok, detail) {
  results.push([label, ok, detail])
  if (!ok) allOk = false
}

async function main() {
  await client.connect()

  // (a) both tables present
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('room_tasks', 'room_checks')`
  )
  const tableNames = tables.rows.map((r) => r.table_name)
  record('room_tasks table exists', tableNames.includes('room_tasks'))
  record('room_checks table exists', tableNames.includes('room_checks'))

  // (b) RLS enabled on both
  const rls = await client.query(
    `SELECT tablename, rowsecurity FROM pg_tables
     WHERE schemaname = 'public' AND tablename IN ('room_tasks', 'room_checks')`
  )
  for (const name of ['room_tasks', 'room_checks']) {
    const row = rls.rows.find((r) => r.tablename === name)
    record(`RLS enabled on ${name}`, !!row?.rowsecurity)
  }

  // room_checks UNIQUE (child_id, date, task_id)
  const uq = await client.query(
    `SELECT tc.constraint_name, array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS cols
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     WHERE tc.table_schema = 'public' AND tc.table_name = 'room_checks' AND tc.constraint_type = 'UNIQUE'
     GROUP BY tc.constraint_name`
  )
  const wantCols = ['child_id', 'date', 'task_id'].slice().sort()
  const parsePgArray = (v) =>
    Array.isArray(v) ? v : String(v).replace(/^\{|\}$/g, '').split(',').filter(Boolean)
  const hasUnique = uq.rows.some(
    (r) => JSON.stringify(parsePgArray(r.cols).slice().sort()) === JSON.stringify(wantCols)
  )
  record('room_checks UNIQUE (child_id, date, task_id) present', hasUnique)

  // (c) every existing family has exactly 5 room_tasks with 5 distinct legacy_keys
  const perFamily = await client.query(
    `SELECT f.id AS family_id,
            COUNT(rt.id) AS task_count,
            COUNT(DISTINCT rt.legacy_key) AS distinct_legacy
     FROM public.families f
     LEFT JOIN public.room_tasks rt ON rt.family_id = f.id AND rt.legacy_key IS NOT NULL
     GROUP BY f.id`
  )
  const badFamilies = perFamily.rows.filter(
    (r) => Number(r.task_count) !== 5 || Number(r.distinct_legacy) !== 5
  )
  record(
    `all ${perFamily.rows.length} existing families have exactly 5 legacy room_tasks`,
    badFamilies.length === 0,
    badFamilies.length ? `bad family_ids: ${badFamilies.map((r) => r.family_id).join(', ')}` : undefined
  )

  // (d) + (e): throwaway family, cleaned up in finally — never touches real data
  const fam = await client.query(
    `INSERT INTO public.families (name) VALUES ('__verify_room_tasks__') RETURNING id`
  )
  const familyId = fam.rows[0].id

  try {
    await client.query('SELECT public.seed_default_room_tasks($1)', [familyId])
    const seeded = await client.query(
      `SELECT id, legacy_key FROM public.room_tasks WHERE family_id = $1 ORDER BY sort_order`,
      [familyId]
    )
    record('throwaway family seeded with 5 default tasks', seeded.rows.length === 5)

    // (d) delete guard: attempt to delete a legacy task inside a transaction, assert it raises, rollback
    const legacyTask = seeded.rows.find((r) => r.legacy_key === 'bed')
    let guardBlocked = false
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM public.room_tasks WHERE id = $1', [legacyTask.id])
      await client.query('ROLLBACK')
    } catch (e) {
      guardBlocked = /cannot be deleted/.test(e.message)
      await client.query('ROLLBACK').catch(() => {})
    }
    record('delete guard blocks legacy task hard-delete', guardBlocked)

    // Confirm the rollback actually left the row intact.
    const stillThere = await client.query('SELECT 1 FROM public.room_tasks WHERE id = $1', [legacyTask.id])
    record('legacy task still present after blocked delete + rollback', stillThere.rows.length === 1)

    // (e) custom (non-legacy) task inserts and deletes freely
    let customOk = false
    try {
      const ins = await client.query(
        `INSERT INTO public.room_tasks (family_id, name, icon, legacy_key, sort_order)
         VALUES ($1, 'Custom Task', '⭐', NULL, 5) RETURNING id`,
        [familyId]
      )
      const customId = ins.rows[0].id
      const del = await client.query('DELETE FROM public.room_tasks WHERE id = $1 RETURNING id', [customId])
      customOk = del.rows.length === 1
    } catch (e) {
      customOk = false
    }
    record('custom (non-legacy) task inserts and deletes freely', customOk)
  } finally {
    await client.query('DELETE FROM public.families WHERE id = $1', [familyId])
  }

  console.log()
  for (const [label, ok, detail] of results) {
    console.log(`${ok ? '✓' : '❌'} ${label}${detail ? ' — ' + detail : ''}`)
  }
  console.log(
    allOk
      ? '\n✅ room_tasks/room_checks migration verified.'
      : '\n❌ Verification FAILED — review migration.'
  )
  if (!allOk) process.exitCode = 1
}

main()
  .catch((e) => {
    console.error('EXC', e.message)
    process.exitCode = 1
  })
  .finally(async () => {
    await client.end()
  })
