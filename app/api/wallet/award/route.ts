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
      if (day.room_ok && settings.coins_per_room_task !== 0) {
        intents.push({
          coins: settings.coins_per_room_task,
          description: 'Убрана комната',
          icon: '🏠',
          sourceType: 'room',
          sourceId: day.id,
        })
      }
      if (day.good_behavior && settings.coins_per_good_behavior !== 0) {
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

    // 3. Sport coach ratings (keyed per section_attendance row).
    const { data: visits } = await admin
      .from('section_attendance')
      .select('id, attended, coach_rating, section_id')
      .eq('child_id', childId)
      .eq('date', date)
    for (const v of visits ?? []) {
      if (!v.attended || !v.coach_rating || v.coach_rating < 1 || v.coach_rating > 5) continue
      const coins = coachCoins(settings, v.coach_rating)
      if (coins === 0) continue
      intents.push({
        coins,
        description: `Тренировка: оценка тренера ${v.coach_rating}`,
        icon: v.coach_rating === 5 ? '🔥' : v.coach_rating <= 2 ? '⚠️' : '💪',
        sourceType: 'sport',
        sourceId: v.id,
      })
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

    // 5. Book finished (keyed per reading_log row).
    const { data: reading } = await admin
      .from('reading_log')
      .select('id, book_title, book_finished')
      .eq('child_id', childId)
      .eq('date', date)
      .maybeSingle()
    if (reading?.book_finished && settings.coins_per_book > 0) {
      intents.push({
        coins: settings.coins_per_book,
        description: `Книга: ${reading.book_title}`,
        icon: '📚',
        sourceType: 'book',
        sourceId: reading.id,
      })
    }

    // 6. Streak bonus (keyed by date — at most once per day).
    const streakBonus = await computeStreakBonus(admin, childId)
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

// Server port of lib/services/streaks.service.ts getStreakBonuses().
async function computeStreakBonus(
  admin: ReturnType<typeof createAdminClient>,
  childId: string,
): Promise<number> {
  const { data: streaks } = await admin.from('streaks').select('*').eq('child_id', childId)
  if (!streaks || streaks.length === 0) return 0

  const { data: settingsRows } = await admin.from('settings').select('*')
  const map: Record<string, number> = {}
  for (const s of settingsRows ?? []) {
    const n = Number(s.value)
    if (!Number.isNaN(n)) map[s.key] = n
  }

  let bonus = 0
  for (const s of streaks) {
    if (s.streak_type === 'room' && s.current_count >= 7) bonus += map.roomStreak7 || 100
    if (s.streak_type === 'study' && s.current_count >= 14) bonus += map.studyStreak14 || 100
    if (s.streak_type === 'sport' && s.current_count >= 7) bonus += map.sportStreak7 || 100
  }
  return bonus
}
