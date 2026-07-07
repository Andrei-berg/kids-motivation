// app/api/wallet/award/route.ts
// Server-side, idempotent coin awards for a child's day.
//
// The client (kid day form / parent daily modal) POSTs { childId, date } AFTER
// saving the day's rows. This route re-reads the SAVED data from the database
// and computes every coin award server-side — the client never sends amounts,
// so it cannot grant arbitrary coins. Re-posting the same day never double-
// awards (see creditAwards).

import { NextRequest, NextResponse } from 'next/server'
import {
  createAdminClient,
  requireFamilyMember,
  assertChildInFamily,
} from '@/lib/supabase/admin'
import { errorResponse, loadSettings, creditAwards, type AwardIntent } from '../_lib'

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

    const intents: AwardIntent[] = []

    // 1. Day-level: room + behavior (keyed by the day's PK, distinct source_type).
    const { data: day } = await admin
      .from('days')
      .select('id, room_ok, good_behavior')
      .eq('child_id', childId)
      .eq('date', date)
      .maybeSingle()
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

    // 6. Streak bonus (keyed by date — at most once per day).
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

    const { creditedCoins, applied } = await creditAwards(admin, childId, intents)

    return NextResponse.json({ ok: true, creditedCoins, awards: applied.length })
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
