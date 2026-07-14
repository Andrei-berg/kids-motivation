// app/api/wallet/award/route.ts
// Server-side, idempotent coin awards for a child's day.
//
// The client (kid day form / parent daily modal) POSTs { childId, date } AFTER
// saving the day's rows. This route re-reads the SAVED data from the database
// and computes every coin award server-side — the client never sends amounts,
// so it cannot grant arbitrary coins. Re-posting the same day never double-
// awards (see creditAwards).
//
// Feature-flag branch (Phase 5.6, D-07/D-09): families.day_blocks_enabled is
// read server-side via loadFeatureFlag. Flag-OFF families run the ORIGINAL
// 5-intent block below completely unchanged (byte-parity). Flag-ON families
// run a parallel block-config-aware path: built-in blocks gain price-override
// + day-type-multiplier resolution (resolveBlockPrice/resolveMultiplier), and
// custom blocks (incl. the 3 seeded "previously-free" defaults) become a real
// paid source under a new 'custom_block' source_type. The streak bonus (block
// 6) always runs after the branch, identically in both paths.

import { NextRequest, NextResponse } from 'next/server'
import {
  createAdminClient,
  requireFamilyMember,
  assertChildInFamily,
} from '@/lib/supabase/admin'
import { errorResponse, loadSettings, loadFeatureFlag, creditAwards, type AwardIntent } from '../_lib'
import { updateStreaks } from '@/lib/services/streaks.service'
import { localDateString, addDays } from '@/utils/helpers'
import { getDayType } from '@/lib/day-type'
import { assembleDayBlocks, resolveBlockPrice, resolveMultiplier } from '@/lib/day-blocks'
import type { DayBlock } from '@/lib/models/day-block.types'
import type { VacationPeriod } from '@/lib/vacation-api'
import type { FamilyCalendar } from '@/lib/models/calendar.types'

function gradeCoins(s: Record<string, number>, grade: number): number {
  switch (grade) {
    case 5: return s.coins_per_grade_5
    case 4: return s.coins_per_grade_4
    case 3: return s.coins_per_grade_3
    case 2: return s.coins_per_grade_2
    case 1: return s.coins_per_grade_1
    default: return 0
  }
}

function coachCoins(s: Record<string, number>, rating: number): number {
  switch (rating) {
    case 5: return s.coins_per_coach_5
    case 4: return s.coins_per_coach_4
    case 3: return s.coins_per_coach_3
    case 2: return s.coins_per_coach_2
    case 1: return s.coins_per_coach_1
    default: return 0
  }
}

// Clamp a block-driven coin amount (price × multiplier) to a sane bound so a
// malformed/crafted price or multiplier on a parent-writable day_blocks row
// can never mint an unbounded award (T-056-07). Prices/multipliers are
// parent-only-writable (RLS), but this is the authoritative server-side
// backstop regardless.
function clampBlockCoins(value: number): number {
  return Math.max(-100000, Math.min(100000, Math.round(value)))
}

// Deduplicates day_blocks rows for a specific child: when both a family-
// default row (child_id null) and a per-child override row share a
// legacy_key, prefer the child-specific one (mirrors
// lib/repositories/day-blocks.repo.ts getDayBlocks — reimplemented here since
// that repo uses the browser supabase singleton, not the admin client this
// route requires for privileged reads). Custom blocks (legacy_key null) are
// all kept.
function dedupeBlocksForChild(rows: DayBlock[]): DayBlock[] {
  const byLegacyKey = new Map<string, DayBlock>()
  const customBlocks: DayBlock[] = []
  for (const row of rows) {
    if (!row.legacy_key) {
      customBlocks.push(row)
      continue
    }
    const existing = byLegacyKey.get(row.legacy_key)
    if (!existing || (row.child_id !== null && existing.child_id === null)) {
      byLegacyKey.set(row.legacy_key, row)
    }
  }
  return [...Array.from(byLegacyKey.values()), ...customBlocks]
}

export async function POST(req: NextRequest) {
  try {
    const { childId, date } = await req.json()
    if (!childId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'childId and date (YYYY-MM-DD) required' }, { status: 400 })
    }

    const member = await requireFamilyMember()
    // A child may only trigger awards for their own day; parents for any child
    // in the family.
    if (member.role === 'child') {
      if (member.childId !== childId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const admin = createAdminClient()
    await assertChildInFamily(admin, childId, member.familyId)
    const settings = await loadSettings(admin, member.familyId)

    // Streak counts are recomputed server-side (admin client) inside this
    // guarded route — the client no longer triggers this separately (D-12.2).
    // The bonus below reflects these freshly computed counts.
    const streakEvents = await updateStreaks(admin, childId, date)

    // D-07/D-09/T-056-10: the flag is read server-side from families — the
    // request body cannot influence which branch runs.
    const flagOn = await loadFeatureFlag(admin, member.familyId)

    const intents: AwardIntent[] = []

    // Day row (id, room_ok, good_behavior, is_sick) — used by the room/
    // behavior intents in BOTH branches, and by is_sick for the flag-on
    // day-type resolution below. Adding is_sick to the select is additive
    // and does not change flag-off behavior (room_ok/good_behavior unchanged).
    const { data: day } = await admin
      .from('days')
      .select('id, room_ok, good_behavior, is_sick')
      .eq('child_id', childId)
      .eq('date', date)
      .maybeSingle()

    if (!flagOn) {
      // ======================================================================
      // FLAG-OFF PATH — byte-identical to pre-5.6 behavior (D-09).
      // Do NOT refactor, reorder, or alter any coin value in this branch.
      // ======================================================================

      // 1. Day-level: room + behavior (keyed by the day's PK, distinct source_type).
      if (day) {
        // Room completeness: prefer the flexible per-family room_checks
        // checklist over the legacy day.room_ok boolean. Threshold =
        // max(1, ceil(0.6 * activeTaskCount)) — for the default 5 active tasks
        // this is exactly 3, matching the pre-existing room_ok (>=3-of-5,
        // DB-trigger-derived) rule byte-for-byte. Falls back to day.room_ok
        // when the child has zero room_checks rows for this date (family/day
        // not yet dual-writing, or a legacy day) so existing behavior is
        // unchanged until a family actually uses the checklist.
        const { data: activeRoomTasks } = await admin
          .from('room_tasks')
          .select('id')
          .eq('family_id', member.familyId)
          .eq('is_active', true)
        const { data: roomChecks } = await admin
          .from('room_checks')
          .select('task_id, done')
          .eq('child_id', childId)
          .eq('date', date)

        let roomComplete: boolean
        if (!roomChecks || roomChecks.length === 0) {
          roomComplete = day.room_ok
        } else {
          const activeTaskIds = new Set((activeRoomTasks ?? []).map((t) => t.id))
          const activeCount = activeTaskIds.size
          const doneCount = roomChecks.filter((c) => c.done && activeTaskIds.has(c.task_id)).length
          const threshold = Math.max(1, Math.ceil(0.6 * activeCount))
          roomComplete = activeCount > 0 && doneCount >= threshold
        }

        if (roomComplete && settings.coins_per_room_task !== 0) {
          intents.push({
            coins: settings.coins_per_room_task,
            description: 'Убрана комната',
            icon: '🏠',
            sourceType: 'room',
            sourceId: day.id,
          })
        }
        // Behavior coins are a PARENT assessment — only credited when a parent (or
        // extended member) triggers the award, never on a child's own day-fill.
        // This preserves the pre-refactor behaviour (KidDayFillForm never awarded
        // behaviour; only the parent DailyModal did).
        if (
          member.role !== 'child' &&
          day.good_behavior &&
          settings.coins_per_good_behavior !== 0
        ) {
          intents.push({
            coins: settings.coins_per_good_behavior,
            description: 'Хорошее поведение',
            icon: '😊',
            sourceType: 'behavior',
            sourceId: day.id,
          })
        }
      }

      // 2. Grades (keyed per subject_grades row).
      const { data: grades } = await admin
        .from('subject_grades')
        .select('id, subject, grade, note')
        .eq('child_id', childId)
        .eq('date', date)
      for (const g of grades ?? []) {
        const coins = gradeCoins(settings, g.grade)
        if (coins === 0) continue
        const isDigital = (g.note ?? '').includes('цифров')
        const label = isDigital
          ? `Цифр. ${g.grade} — ${g.subject}`
          : `Оценка ${g.grade} — ${g.subject}`
        intents.push({ coins, description: label, icon: '📚', sourceType: 'grade', sourceId: g.id })
      }

      // 3. Sport coach ratings. Visits live in section_visits keyed by section_id
      //    (no child_id), so scope via the child's own sections. Keyed per
      //    section_visits row.
      const { data: childSections } = await admin
        .from('sections')
        .select('id, name')
        .eq('child_id', childId)
      const sectionIds = (childSections ?? []).map((s) => s.id)
      if (sectionIds.length > 0) {
        const sectionName = new Map((childSections ?? []).map((s) => [s.id, s.name]))
        const { data: visits } = await admin
          .from('section_visits')
          .select('id, section_id, attended, coach_rating')
          .in('section_id', sectionIds)
          .eq('date', date)
        for (const v of visits ?? []) {
          if (!v.attended || !v.coach_rating || v.coach_rating < 1 || v.coach_rating > 5) continue
          const coins = coachCoins(settings, v.coach_rating)
          if (coins === 0) continue
          intents.push({
            coins,
            description: `${sectionName.get(v.section_id) ?? 'Тренировка'}: оценка тренера ${v.coach_rating}`,
            icon: v.coach_rating === 5 ? '🔥' : v.coach_rating <= 2 ? '⚠️' : '💪',
            sourceType: 'sport',
            sourceId: v.id,
          })
        }
      }

      // 4. Extra activities (keyed per activity_logs row; coin value from the
      //    activity definition).
      const { data: logs } = await admin
        .from('activity_logs')
        .select('id, activity_id, done')
        .eq('child_id', childId)
        .eq('date', date)
      const doneLogs = (logs ?? []).filter((l) => l.done)
      if (doneLogs.length > 0) {
        const actIds = Array.from(new Set(doneLogs.map((l) => l.activity_id)))
        const { data: acts } = await admin
          .from('extra_activities')
          .select('id, name, emoji, coins')
          .in('id', actIds)
        const actMap = new Map((acts ?? []).map((a) => [a.id, a]))
        for (const l of doneLogs) {
          const a = actMap.get(l.activity_id)
          if (a && a.coins > 0) {
            intents.push({
              coins: a.coins,
              description: a.name,
              icon: a.emoji ?? '⭐',
              sourceType: 'activity',
              sourceId: l.id,
            })
          }
        }
      }

      // 5. Book finished (keyed per reading_log row). The book bonus is a self-
      //    reported claim. When require_reading_check is on for the child, it is
      //    credited only after a parent confirms it (verified=true) — or when a
      //    parent triggers the award directly (parents are the verifiers). A child's
      //    own day-fill leaves it pending.
      const { data: childRow } = await admin
        .from('children')
        .select('require_reading_check')
        .eq('id', childId)
        .maybeSingle()
      const requireReadingCheck = childRow?.require_reading_check ?? true
      const { data: reading } = await admin
        .from('reading_log')
        .select('id, book_title, book_finished, verified')
        .eq('child_id', childId)
        .eq('date', date)
        .maybeSingle()
      const readingApproved =
        !requireReadingCheck || reading?.verified === true || member.role !== 'child'
      if (reading?.book_finished && readingApproved && settings.coins_per_book > 0) {
        intents.push({
          coins: settings.coins_per_book,
          description: `Книга: ${reading.book_title}`,
          icon: '📚',
          sourceType: 'book',
          sourceId: reading.id,
        })
      }
    } else {
      // ======================================================================
      // FLAG-ON PATH — block-config-aware pricing/multipliers + custom blocks.
      // ======================================================================

      // Resolve the server-side day type (mirrors the reads
      // lib/services/streaks.service.ts already does for the same purpose).
      let familyCalendar: FamilyCalendar | null = null
      let vacationPeriods: VacationPeriod[] = []
      const [{ data: calendarRow }, { data: vacationRows }] = await Promise.all([
        admin.from('family_calendar').select('*').eq('family_id', member.familyId).maybeSingle(),
        admin.from('vacation_periods').select('*').eq('family_id', member.familyId),
      ])
      familyCalendar = (calendarRow as FamilyCalendar | null) ?? null
      vacationPeriods = (vacationRows as VacationPeriod[] | null) ?? []
      const isSick = day?.is_sick ?? false
      const dayType = getDayType(date, isSick, vacationPeriods, childId, undefined, familyCalendar).type

      // Load the family's blocks visible to this child, dedupe per-child
      // overrides vs family defaults, then assemble (is_active + day_types +
      // days_of_week filter, sort_order) to get the exact set earnable today.
      const { data: blockRows } = await admin
        .from('day_blocks')
        .select('*')
        .eq('family_id', member.familyId)
        .or(`child_id.is.null,child_id.eq.${childId}`)
      const dedupedBlocks = dedupeBlocksForChild((blockRows ?? []) as DayBlock[])
      const visibleBlocks = assembleDayBlocks(dedupedBlocks, dayType, date)
      const blockByLegacyKey = new Map(
        visibleBlocks.filter((b) => b.legacy_key).map((b) => [b.legacy_key as string, b])
      )
      const customBlocks = visibleBlocks.filter((b) => !b.legacy_key)

      // Room — same completeness computation as flag-off, but only credited
      // if the 'room' block is visible today (D-08), priced via
      // resolveBlockPrice and scaled by the day-type multiplier.
      const roomBlock = blockByLegacyKey.get('room')
      if (day && roomBlock) {
        const { data: activeRoomTasks } = await admin
          .from('room_tasks')
          .select('id')
          .eq('family_id', member.familyId)
          .eq('is_active', true)
        const { data: roomChecks } = await admin
          .from('room_checks')
          .select('task_id, done')
          .eq('child_id', childId)
          .eq('date', date)

        let roomComplete: boolean
        if (!roomChecks || roomChecks.length === 0) {
          roomComplete = day.room_ok
        } else {
          const activeTaskIds = new Set((activeRoomTasks ?? []).map((t) => t.id))
          const activeCount = activeTaskIds.size
          const doneCount = roomChecks.filter((c) => c.done && activeTaskIds.has(c.task_id)).length
          const threshold = Math.max(1, Math.ceil(0.6 * activeCount))
          roomComplete = activeCount > 0 && doneCount >= threshold
        }

        const base = resolveBlockPrice(roomBlock, settings) ?? settings.coins_per_room_task
        const final = clampBlockCoins(base * resolveMultiplier(roomBlock, dayType))
        if (roomComplete && final !== 0) {
          intents.push({
            coins: final,
            description: 'Убрана комната',
            icon: '🏠',
            sourceType: 'room',
            sourceId: day.id,
          })
        }
      }

      // Behavior — same parent-only guard as flag-off, priced via
      // resolveBlockPrice, only credited if the 'behavior' block is visible.
      const behaviorBlock = blockByLegacyKey.get('behavior')
      if (day && behaviorBlock && member.role !== 'child' && day.good_behavior) {
        const base = resolveBlockPrice(behaviorBlock, settings) ?? settings.coins_per_good_behavior
        const final = clampBlockCoins(base * resolveMultiplier(behaviorBlock, dayType))
        if (final !== 0) {
          intents.push({
            coins: final,
            description: 'Хорошее поведение',
            icon: '😊',
            sourceType: 'behavior',
            sourceId: day.id,
          })
        }
      }

      // Grades — per-row scale unchanged (resolveBlockPrice returns null for
      // 'grade' — no flat price exists for this source type), only the
      // day-type multiplier is applied. Skipped entirely if the 'grade'
      // block is hidden today (D-08).
      const gradeBlock = blockByLegacyKey.get('grade')
      if (gradeBlock) {
        const { data: grades } = await admin
          .from('subject_grades')
          .select('id, subject, grade, note')
          .eq('child_id', childId)
          .eq('date', date)
        const mult = resolveMultiplier(gradeBlock, dayType)
        for (const g of grades ?? []) {
          const coins = clampBlockCoins(gradeCoins(settings, g.grade) * mult)
          if (coins === 0) continue
          const isDigital = (g.note ?? '').includes('цифров')
          const label = isDigital
            ? `Цифр. ${g.grade} — ${g.subject}`
            : `Оценка ${g.grade} — ${g.subject}`
          intents.push({ coins, description: label, icon: '📚', sourceType: 'grade', sourceId: g.id })
        }
      }

      // Sport coach ratings — per-row scale unchanged (resolveBlockPrice
      // returns null for 'sport'), only the multiplier applied. Skipped
      // entirely if the 'sport' block is hidden today.
      const sportBlock = blockByLegacyKey.get('sport')
      if (sportBlock) {
        const { data: childSections } = await admin
          .from('sections')
          .select('id, name')
          .eq('child_id', childId)
        const sectionIds = (childSections ?? []).map((s) => s.id)
        if (sectionIds.length > 0) {
          const sectionName = new Map((childSections ?? []).map((s) => [s.id, s.name]))
          const { data: visits } = await admin
            .from('section_visits')
            .select('id, section_id, attended, coach_rating')
            .in('section_id', sectionIds)
            .eq('date', date)
          const mult = resolveMultiplier(sportBlock, dayType)
          for (const v of visits ?? []) {
            if (!v.attended || !v.coach_rating || v.coach_rating < 1 || v.coach_rating > 5) continue
            const coins = clampBlockCoins(coachCoins(settings, v.coach_rating) * mult)
            if (coins === 0) continue
            intents.push({
              coins,
              description: `${sectionName.get(v.section_id) ?? 'Тренировка'}: оценка тренера ${v.coach_rating}`,
              icon: v.coach_rating === 5 ? '🔥' : v.coach_rating <= 2 ? '⚠️' : '💪',
              sourceType: 'sport',
              sourceId: v.id,
            })
          }
        }
      }

      // Extra activities — per-row scale unchanged (resolveBlockPrice
      // returns null for 'activity'), only the multiplier applied. Skipped
      // entirely if the 'activity' block is hidden today.
      const activityBlock = blockByLegacyKey.get('activity')
      if (activityBlock) {
        const { data: logs } = await admin
          .from('activity_logs')
          .select('id, activity_id, done')
          .eq('child_id', childId)
          .eq('date', date)
        const doneLogs = (logs ?? []).filter((l) => l.done)
        if (doneLogs.length > 0) {
          const actIds = Array.from(new Set(doneLogs.map((l) => l.activity_id)))
          const { data: acts } = await admin
            .from('extra_activities')
            .select('id, name, emoji, coins')
            .in('id', actIds)
          const actMap = new Map((acts ?? []).map((a) => [a.id, a]))
          const mult = resolveMultiplier(activityBlock, dayType)
          for (const l of doneLogs) {
            const a = actMap.get(l.activity_id)
            if (a && a.coins > 0) {
              const coins = clampBlockCoins(a.coins * mult)
              if (coins === 0) continue
              intents.push({
                coins,
                description: a.name,
                icon: a.emoji ?? '⭐',
                sourceType: 'activity',
                sourceId: l.id,
              })
            }
          }
        }
      }

      // Book finished — same require_reading_check / verified gating as
      // flag-off, priced via resolveBlockPrice, only credited if the 'book'
      // block is visible.
      const bookBlock = blockByLegacyKey.get('book')
      if (bookBlock) {
        const { data: childRow } = await admin
          .from('children')
          .select('require_reading_check')
          .eq('id', childId)
          .maybeSingle()
        const requireReadingCheck = childRow?.require_reading_check ?? true
        const { data: reading } = await admin
          .from('reading_log')
          .select('id, book_title, book_finished, verified')
          .eq('child_id', childId)
          .eq('date', date)
          .maybeSingle()
        const readingApproved =
          !requireReadingCheck || reading?.verified === true || member.role !== 'child'
        const base = resolveBlockPrice(bookBlock, settings) ?? settings.coins_per_book
        const final = clampBlockCoins(base * resolveMultiplier(bookBlock, dayType))
        if (reading?.book_finished && readingApproved && final !== 0) {
          intents.push({
            coins: final,
            description: `Книга: ${reading.book_title}`,
            icon: '📚',
            sourceType: 'book',
            sourceId: reading.id,
          })
        }
      }

      // Exercise — NEW paid source under flag-on only (D-03). Each home
      // exercise row logged today earns the block's flat price (explicit
      // block.price, else wallet_settings.coins_per_exercise) scaled by the
      // day-type multiplier, keyed per row id. Only fires if the 'exercise'
      // block is visible today.
      const exerciseBlock = blockByLegacyKey.get('exercise')
      if (exerciseBlock) {
        const { data: homeExercises } = await admin
          .from('home_exercises')
          .select('id, exercise_type:exercise_types(name)')
          .eq('child_id', childId)
          .eq('date', date)
        const base = resolveBlockPrice(exerciseBlock, settings) ?? settings.coins_per_exercise
        const mult = resolveMultiplier(exerciseBlock, dayType)
        const final = clampBlockCoins(base * mult)
        if (final !== 0) {
          for (const row of homeExercises ?? []) {
            const exerciseType = Array.isArray(row.exercise_type) ? row.exercise_type[0] : row.exercise_type
            intents.push({
              coins: final,
              description: exerciseType?.name ? `Зарядка: ${exerciseType.name}` : 'Зарядка',
              icon: '💪',
              sourceType: 'exercise',
              sourceId: row.id,
            })
          }
        }
      }

      // Custom blocks (legacy_key null) — including the 3 seeded
      // "previously-free" defaults (home_help, weekend_homework,
      // reading_extra) — are ordinary paid blocks credited generically here,
      // no bespoke branch (D-03/WR-05). who_fills='parent' blocks cannot be
      // self-awarded by a child (T-056-09) — the server, not entries RLS, is
      // the who_fills boundary.
      if (customBlocks.length > 0) {
        const customBlockIds = new Set(customBlocks.map((b) => b.id))
        const customBlockById = new Map(customBlocks.map((b) => [b.id, b]))
        const { data: entries } = await admin
          .from('day_block_entries')
          .select('id, block_id, done')
          .eq('child_id', childId)
          .eq('date', date)
        for (const entry of entries ?? []) {
          if (!entry.done || !customBlockIds.has(entry.block_id)) continue
          const block = customBlockById.get(entry.block_id)
          if (!block) continue
          if (block.who_fills === 'parent' && member.role === 'child') continue
          const base = block.price ?? 0
          if (base <= 0) continue
          const final = clampBlockCoins(base * resolveMultiplier(block, dayType))
          if (final === 0) continue
          intents.push({
            coins: final,
            description: block.name,
            icon: block.icon ?? '⭐',
            sourceType: 'custom_block',
            sourceId: entry.id,
          })
        }
      }
    }

    // 6. Streak bonus (keyed by date — at most once per day). Gated to the
    // server's "today" ±1 day (D-12.1, WR-06): localDateString() here yields
    // the SERVER's local date (UTC on Vercel), while clients compute "today"
    // in their own timezone — for a UTC+3 family a save between 00:00 and
    // 03:00 local sends a date one day ahead of the server's. The ±1-day
    // tolerance keeps the gate tight (a child still cannot loop arbitrary
    // past dates to mint bonuses — the (child_id,'streak',date) idempotency
    // key caps each date in the window to a single credit) while covering
    // every real-world timezone offset. Runs identically in both branches —
    // a streak is a bonus, not a day_block.
    const serverToday = localDateString()
    if (date === serverToday || date === addDays(serverToday, 1) || date === addDays(serverToday, -1)) {
      const streakBonus = await computeStreakBonus(admin, childId, settings)
      if (streakBonus > 0) {
        intents.push({
          coins: streakBonus,
          description: 'Бонус за серию',
          icon: '🔥',
          sourceType: 'streak',
          sourceId: date,
        })
      }
    }

    const { creditedCoins, applied } = await creditAwards(admin, childId, intents)

    return NextResponse.json({ ok: true, creditedCoins, awards: applied.length, streakEvents })
  } catch (err) {
    return errorResponse(err)
  }
}

// Clamp a stored streak threshold ("days") to a sane, always-positive integer
// so a 0/negative/garbage value can never make the bonus fire unconditionally.
function clampStreakDays(value: number): number {
  return Math.max(1, Math.floor(value))
}

// Clamp a stored streak bonus to [0, 100000] (floored) so a negative value
// can never produce a negative award and an absurd value can never produce
// an unbounded one. Mirrors the write-side clamp in settings/route.ts — this
// is the authoritative bound in case a row bypassed that clamp (legacy or
// directly-written row).
function clampStreakBonus(value: number): number {
  return Math.min(100000, Math.max(0, Math.floor(value)))
}

// Server port of lib/services/streaks.service.ts getStreakBonuses(). Reads
// thresholds/bonuses from the already-loaded per-family wallet_settings
// (streak_room_days/bonus, streak_study_days/bonus, streak_sport_days/bonus)
// instead of the legacy `settings` key/value table.
async function computeStreakBonus(
  admin: ReturnType<typeof createAdminClient>,
  childId: string,
  settings: Record<string, number>,
): Promise<number> {
  const { data: streaks } = await admin.from('streaks').select('*').eq('child_id', childId)
  if (!streaks || streaks.length === 0) return 0

  let bonus = 0
  for (const s of streaks) {
    if (s.streak_type === 'room' && s.current_count >= clampStreakDays(settings.streak_room_days)) {
      bonus += clampStreakBonus(settings.streak_room_bonus)
    }
    if (s.streak_type === 'study' && s.current_count >= clampStreakDays(settings.streak_study_days)) {
      bonus += clampStreakBonus(settings.streak_study_bonus)
    }
    if (s.streak_type === 'sport' && s.current_count >= clampStreakDays(settings.streak_sport_days)) {
      bonus += clampStreakBonus(settings.streak_sport_bonus)
    }
  }
  return bonus
}
