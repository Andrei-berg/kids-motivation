// lib/services/streaks.service.ts
// Streak calculation business logic.
// Sourced from lib/streaks.ts — this is the authoritative implementation.
//
// updateStreaks runs ONLY server-side with the service-role (admin) client —
// see app/api/wallet/award/route.ts and app/actions/repair-achievements.ts.
// This module never imports lib/supabase/admin at module scope so it stays
// importable from client bundles (the caller creates the admin client and
// passes it in); only the `Admin` type alias is imported.

import { supabase } from '../supabase'
import { normalizeDate, addDays } from '@/utils/helpers'
import { getSportActiveDays } from './badges.service'
import { getDayType, type DayType } from '@/lib/day-type'
import type { VacationPeriod } from '@/lib/vacation-api'
import type { FamilyCalendar } from '@/lib/models/calendar.types'

type Admin = ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>

/** Resolves the DayType for a given date string. Built once per updateStreaks call. */
type DayTypeResolver = (dateStr: string) => DayType

export interface StreakEvent {
  type: 'room' | 'study' | 'sport' | 'strong_week'
  event: 'broken' | 'record'
  previousCount: number
  newCount: number
}

export interface StreakEvents {
  broken: StreakEvent[]
  records: StreakEvent[]
}

export async function updateStreaks(admin: Admin, childId: string, date: string): Promise<StreakEvents> {
  const today = normalizeDate(date)
  const startDate = addDays(today, -30)

  const { data: child } = await admin
    .from('children')
    .select('family_id')
    .eq('id', childId)
    .maybeSingle()
  const familyId = child?.family_id ?? null

  const { data: days } = await admin
    .from('days')
    .select('*')
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', today)
    .order('date')

  if (!days) return { broken: [], records: [] }

  const { data: grades } = await admin
    .from('subject_grades')
    .select('date')
    .eq('child_id', childId)
    .gte('date', startDate)
    .lte('date', today)

  // Sport-active days come from the current data model (home exercises + training
  // attendance), not the legacy home_sports table which is no longer written to.
  const sportDays = await getSportActiveDays(childId, startDate, today, admin)

  // Day-type context for transparency (D-09/D-10): a weekend/vacation/sick day
  // must not increment or reset a streak. Load via admin so this works
  // server-side regardless of RLS.
  let familyCalendar: FamilyCalendar | null = null
  let vacationPeriods: VacationPeriod[] = []
  if (familyId) {
    const [{ data: calendarRow }, { data: vacationRows }] = await Promise.all([
      admin.from('family_calendar').select('*').eq('family_id', familyId).maybeSingle(),
      admin.from('vacation_periods').select('*').eq('family_id', familyId),
    ])
    familyCalendar = (calendarRow as FamilyCalendar | null) ?? null
    vacationPeriods = (vacationRows as VacationPeriod[] | null) ?? []
  }
  // Determine each walked day's is_sick from the loaded `days` rows.
  const sickByDate = new Map<string, boolean>()
  for (const d of days) sickByDate.set(d.date, !!d.is_sick)
  const dayTypeOf: DayTypeResolver = (dateStr: string) =>
    getDayType(dateStr, sickByDate.get(dateStr) ?? false, vacationPeriods, childId, undefined, familyCalendar).type

  const roomStreak = calculateRoomStreak(days, today, dayTypeOf)
  const studyStreak = calculateStudyStreak(grades || [], today, dayTypeOf)
  const sportStreak = calculateSportStreak(sportDays, today, dayTypeOf)
  const behaviorStreak = calculateBehaviorStreak(days, today, dayTypeOf)

  // CR-02: when the day being processed is itself transparent for a streak
  // type, never emit a 'broken' event for that type — a transparent day must
  // not reset a streak (D-09/D-10), and it must not fire a "streak broken"
  // push either. Sick is transparent for room/sport/behavior; weekend/
  // vacation/sick are transparent for study.
  const todayType = dayTypeOf(today)
  const sickTransparentToday = todayType === 'sick'
  const studyTransparentToday =
    todayType === 'weekend' || todayType === 'vacation' || todayType === 'sick'

  const [roomEvent, studyEvent, sportEvent, behaviorEvent] = await Promise.all([
    updateStreak(admin, childId, 'room', roomStreak.current, roomStreak.best, familyId, sickTransparentToday),
    updateStreak(admin, childId, 'study', studyStreak.current, studyStreak.best, familyId, studyTransparentToday),
    updateStreak(admin, childId, 'sport', sportStreak.current, sportStreak.best, familyId, sickTransparentToday),
    updateStreak(admin, childId, 'strong_week', behaviorStreak.current, behaviorStreak.best, familyId, sickTransparentToday),
  ])

  const events: StreakEvents = {
    broken: [roomEvent, studyEvent, sportEvent, behaviorEvent].filter((e): e is StreakEvent => e?.event === 'broken'),
    records: [roomEvent, studyEvent, sportEvent, behaviorEvent].filter((e): e is StreakEvent => e?.event === 'record'),
  }
  return events
}

// The four calculators below walk BACKWARDS from `today` and track the
// today-anchored run with an `anchored` flag (CR-02/CR-03): `current` is the
// full length of the run that (transparently) extends back from today —
// transparent days neither close nor extend the run, so a transparent
// "today" carries the streak through instead of zeroing it, and current can
// legitimately reach the 7/14/30 thresholds used by computeStreakBonus,
// milestones, and the streak_30 badge.

export function calculateRoomStreak(days: any[], today: string, dayType?: DayTypeResolver) {
  let current = 0
  let best = 0
  let streak = 0
  let anchored = true // still inside the run that extends back from today

  let checkDate = today
  for (let i = 0; i < 30; i++) {
    // Sick days are transparent for room/sport/behavior streaks (D-09): skip —
    // neither increment nor reset (does not close the anchored run).
    if (dayType && dayType(checkDate) === 'sick') {
      checkDate = addDays(checkDate, -1)
      continue
    }

    const day = days.find(d => d.date === checkDate)

    if (day && day.room_ok) {
      streak++
      if (anchored) current = streak
    } else {
      if (streak > best) best = streak
      anchored = false
      streak = 0
    }

    checkDate = addDays(checkDate, -1)
  }

  if (streak > best) best = streak

  return { current, best }
}

export function calculateStudyStreak(grades: any[], today: string, dayType?: DayTypeResolver) {
  const daysWithGrades = new Set(grades.map(g => g.date))

  let current = 0
  let best = 0
  let streak = 0
  let anchored = true // still inside the run that extends back from today

  let checkDate = today
  for (let i = 0; i < 30; i++) {
    // Weekends, vacations, and sick days are transparent for the study streak
    // (D-09/D-10): skip — neither increment nor reset (does not close the
    // anchored run).
    if (dayType) {
      const type = dayType(checkDate)
      if (type === 'weekend' || type === 'vacation' || type === 'sick') {
        checkDate = addDays(checkDate, -1)
        continue
      }
    }

    if (daysWithGrades.has(checkDate)) {
      streak++
      if (anchored) current = streak
    } else {
      if (streak > best) best = streak
      anchored = false
      streak = 0
    }

    checkDate = addDays(checkDate, -1)
  }

  if (streak > best) best = streak

  return { current, best }
}

export function calculateSportStreak(sportDays: Set<string>, today: string, dayType?: DayTypeResolver) {
  let current = 0
  let best = 0
  let streak = 0
  let anchored = true // still inside the run that extends back from today

  let checkDate = today
  for (let i = 0; i < 30; i++) {
    // Sick days are transparent for room/sport/behavior streaks (D-09): skip —
    // neither increment nor reset (does not close the anchored run).
    if (dayType && dayType(checkDate) === 'sick') {
      checkDate = addDays(checkDate, -1)
      continue
    }

    const hasSport = sportDays.has(checkDate)

    if (hasSport) {
      streak++
      if (anchored) current = streak
    } else {
      if (streak > best) best = streak
      anchored = false
      streak = 0
    }

    checkDate = addDays(checkDate, -1)
  }

  if (streak > best) best = streak

  return { current, best }
}

export function calculateBehaviorStreak(days: any[], today: string, dayType?: DayTypeResolver) {
  let current = 0
  let best = 0
  let streak = 0
  let anchored = true // still inside the run that extends back from today

  let checkDate = today
  for (let i = 0; i < 30; i++) {
    // Sick days are transparent for room/sport/behavior streaks (D-09): skip —
    // neither increment nor reset (does not close the anchored run).
    if (dayType && dayType(checkDate) === 'sick') {
      checkDate = addDays(checkDate, -1)
      continue
    }

    const day = days.find(d => d.date === checkDate)

    // Known gap (Phase 5.9): day.good_behavior tracks ONLY the seeded default
    // behavior tag (kept in sync by Plan 07's dual-write) — a family using
    // custom (non-default) behavior tags will see this streak diverge from
    // the tag-level behavior_marks truth. Documented known gap, not fixed
    // here (see 05.9-06-SUMMARY.md Known Gaps).
    if (day && day.good_behavior) {
      streak++
      if (anchored) current = streak
    } else {
      if (streak > best) best = streak
      anchored = false
      streak = 0
    }

    checkDate = addDays(checkDate, -1)
  }

  if (streak > best) best = streak

  return { current, best }
}

async function updateStreak(
  admin: Admin,
  childId: string,
  type: 'room' | 'study' | 'sport' | 'strong_week',
  current: number,
  best: number,
  familyId?: string | null,
  todayTransparent = false
): Promise<StreakEvent | null> {
  const { data: existing } = await admin
    .from('streaks')
    .select('*')
    .eq('child_id', childId)
    .eq('streak_type', type)
    .maybeSingle()

  let event: StreakEvent | null = null

  if (existing) {
    // CR-02: never emit 'broken' when today itself is transparent for this
    // streak type — a transparent day must not reset a streak (D-09/D-10),
    // so it must not announce a break either.
    if (existing.current_count > 0 && current === 0 && !todayTransparent) {
      event = { type, event: 'broken', previousCount: existing.current_count, newCount: 0 }
    } else if (current > existing.best_count) {
      event = { type, event: 'record', previousCount: existing.best_count, newCount: current }
    }

    await admin
      .from('streaks')
      .update({
        current_count: current,
        best_count: Math.max(best, existing.best_count),
        last_updated: normalizeDate(new Date()),
        active: current > 0
      })
      .eq('id', existing.id)
  } else {
    if (current > 0) {
      event = { type, event: 'record', previousCount: 0, newCount: current }
    }

    // Use upsert so that stale rows with family_id=null get overwritten with correct family_id.
    // The DB trigger (supabase-migration-family-id-fix.sql) covers INSERT; upsert handles UPDATE path.
    await admin
      .from('streaks')
      .upsert({
        child_id: childId,
        streak_type: type,
        current_count: current,
        best_count: best,
        last_updated: normalizeDate(new Date()),
        active: current > 0,
        ...(familyId ? { family_id: familyId } : {}),
      }, { onConflict: 'child_id,streak_type', ignoreDuplicates: false })
  }

  if (event?.event === 'record' && familyId && [7, 14, 30].includes(current)) {
    try {
      const typeLabel = type === 'room' ? 'Комната' : type === 'study' ? 'Учёба' : type === 'sport' ? 'Спорт' : 'Поведение'
      const { data: childRow } = await admin
        .from('children')
        .select('name')
        .eq('id', childId)
        .maybeSingle()
      const childName = childRow?.name ?? childId
      const { postSystemMessage } = await import('@/lib/repositories/chat.repo')
      await postSystemMessage({
        familyId,
        content: `🔥 ${childName} держит серию ${current} дней (${typeLabel})!`,
      })
    } catch (e) {
      console.warn('[updateStreak] chat post failed:', e)
    }
  }

  return event
}

// ---------------------------------------------------------------------------
// Forward-looking "streak at risk" helper (05.10-02, SC3 "streak about to
// expire"). The four calculators above walk BACKWARD from today to compute
// current/best run lengths; this section answers a different, forward-
// looking question: "has today's contribution for streak type X landed yet?"
// Read-only — never writes to the `streaks` table (D-12: streaks is RLS
// SELECT-only for clients; updateStreaks() remains the only writer).
// ---------------------------------------------------------------------------

/**
 * Pure predicate: has today's contribution for a given streak type already
 * landed, based on the same source signals the backward calculators use
 * (days.room_ok, a subject_grades row existing, a sport-active day, and
 * days.good_behavior)?
 */
export function streakContributionPresent(
  type: 'room' | 'study' | 'sport' | 'strong_week',
  ctx: {
    day?: { room_ok?: boolean; good_behavior?: boolean } | null
    hasGrade?: boolean
    hasSport?: boolean
  }
): boolean {
  switch (type) {
    case 'room':
      return !!ctx.day?.room_ok
    case 'strong_week':
      return !!ctx.day?.good_behavior
    case 'study':
      return !!ctx.hasGrade
    case 'sport':
      return !!ctx.hasSport
  }
}

/**
 * Active streaks (current_count > 0) with no contribution logged yet today,
 * for a day that is NOT transparent for that streak type (a transparent
 * today — e.g. study on a weekend, or sick for room/sport/strong_week — does
 * not put the streak at risk; the backward calculators carry it through
 * unchanged). Read-only: loads `streaks`, `days`, `subject_grades`, sport
 * activity, and calendar/vacation context via the admin client — never
 * writes.
 */
export async function getStreaksAtRisk(
  admin: Admin,
  childId: string,
  today: string
): Promise<{ type: 'room' | 'study' | 'sport' | 'strong_week'; current_count: number }[]> {
  const { data: streaks } = await admin
    .from('streaks')
    .select('streak_type, current_count, active')
    .eq('child_id', childId)
    .eq('active', true)
    .gt('current_count', 0)

  if (!streaks || streaks.length === 0) return []

  const { data: child } = await admin
    .from('children')
    .select('family_id')
    .eq('id', childId)
    .maybeSingle()
  const familyId = child?.family_id ?? null

  const { data: dayRow } = await admin
    .from('days')
    .select('room_ok, good_behavior, is_sick')
    .eq('child_id', childId)
    .eq('date', today)
    .maybeSingle()

  const { data: gradeRows } = await admin
    .from('subject_grades')
    .select('id')
    .eq('child_id', childId)
    .eq('date', today)
    .limit(1)
  const hasGrade = (gradeRows?.length ?? 0) > 0

  const sportDays = await getSportActiveDays(childId, today, today, admin)
  const hasSport = sportDays.has(today)

  let familyCalendar: FamilyCalendar | null = null
  let vacationPeriods: VacationPeriod[] = []
  if (familyId) {
    const [{ data: calendarRow }, { data: vacationRows }] = await Promise.all([
      admin.from('family_calendar').select('*').eq('family_id', familyId).maybeSingle(),
      admin.from('vacation_periods').select('*').eq('family_id', familyId),
    ])
    familyCalendar = (calendarRow as FamilyCalendar | null) ?? null
    vacationPeriods = (vacationRows as VacationPeriod[] | null) ?? []
  }

  const todayType = getDayType(today, !!dayRow?.is_sick, vacationPeriods, childId, undefined, familyCalendar).type
  const sickTransparentToday = todayType === 'sick'
  const studyTransparentToday = todayType === 'weekend' || todayType === 'vacation' || todayType === 'sick'

  const atRisk: { type: 'room' | 'study' | 'sport' | 'strong_week'; current_count: number }[] = []

  for (const s of streaks) {
    const type = s.streak_type as 'room' | 'study' | 'sport' | 'strong_week'
    const transparentToday = type === 'study' ? studyTransparentToday : sickTransparentToday
    if (transparentToday) continue

    const present = streakContributionPresent(type, {
      day: dayRow ? { room_ok: !!dayRow.room_ok, good_behavior: !!dayRow.good_behavior } : null,
      hasGrade,
      hasSport,
    })
    if (!present) atRisk.push({ type, current_count: s.current_count })
  }

  return atRisk
}

export async function getStreakBonuses(childId: string) {
  const { data: streaks } = await supabase
    .from('streaks')
    .select('*')
    .eq('child_id', childId)

  if (!streaks) return 0

  const { data: settings } = await supabase
    .from('settings')
    .select('*')

  const settingsMap: any = {}
  settings?.forEach(s => {
    const val = s.value
    settingsMap[s.key] = !isNaN(Number(val)) ? Number(val) : val
  })

  let bonus = 0

  streaks.forEach(s => {
    if (s.streak_type === 'room' && s.current_count >= 7) {
      bonus += settingsMap.roomStreak7 || 100
    }
    if (s.streak_type === 'study' && s.current_count >= 14) {
      bonus += settingsMap.studyStreak14 || 100
    }
    if (s.streak_type === 'sport' && s.current_count >= 7) {
      bonus += settingsMap.sportStreak7 || 100
    }
  })

  return bonus
}
