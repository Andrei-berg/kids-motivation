// lib/repositories/children.repo.ts
// Supabase queries for children, settings, days, sport, sections, goals, weeks, streaks.
// Sourced from lib/api.ts — this is the authoritative implementation.

import { supabase } from '../supabase'
import { normalizeDate, getWeekRange } from '@/utils/helpers'
import type {
  Child,
  DayData,
  HomeSport,
  SportsSection,
  SectionAttendance,
  Goal,
  Week,
} from '../models/child.types'

// ============================================================================
// CHILDREN
// ============================================================================

export async function getChildren() {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('active', true)
    .order('name')

  if (error) throw error
  return data as Child[]
}

export async function getChild(childId: string) {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .single()

  if (error) throw error
  return data as Child
}

// ============================================================================
// SETTINGS
// ============================================================================

export async function getSettings() {
  const { data, error } = await supabase
    .from('settings')
    .select('*')

  if (error) throw error

  const settings: Record<string, any> = {}
  data.forEach(row => {
    const value = row.value
    if (value === 'true') settings[row.key] = true
    else if (value === 'false') settings[row.key] = false
    else if (!isNaN(Number(value))) settings[row.key] = Number(value)
    else settings[row.key] = value
  })

  return settings
}

// ============================================================================
// DAYS
// ============================================================================

export async function saveDay(params: {
  childId: string
  date: string
  roomBed?: boolean
  roomFloor?: boolean
  roomDesk?: boolean
  roomCloset?: boolean
  roomTrash?: boolean
  roomData?: {
    bed: boolean
    floor: boolean
    desk: boolean
    closet: boolean
    trash: boolean
  }
  goodBehavior?: boolean
  diaryNotDone?: boolean
  noteParent?: string
  noteChild?: string
  isSick?: boolean
  homeHelp?: boolean
  homeHelpNote?: string
  homeworkDone?: boolean
  filledBy?: 'child' | 'parent'
  mood?: string
  roomProofUrl?: string
}) {
  const { childId, date, roomData, goodBehavior, diaryNotDone, noteParent, noteChild, isSick, homeHelp, homeHelpNote, homeworkDone, filledBy, mood, roomProofUrl } = params

  const bed = params.roomBed ?? roomData?.bed ?? false
  const floor = params.roomFloor ?? roomData?.floor ?? false
  const desk = params.roomDesk ?? roomData?.desk ?? false
  const closet = params.roomCloset ?? roomData?.closet ?? false
  const trash = params.roomTrash ?? roomData?.trash ?? false

  // Fetch family_id from children table (required by RLS policy on days)
  const { data: childRow } = await supabase
    .from('children')
    .select('family_id')
    .eq('id', childId)
    .single()

  const dayData = {
    child_id: childId,
    date: normalizeDate(date),
    family_id: childRow?.family_id ?? null,
    room_bed: bed,
    room_floor: floor,
    room_desk: desk,
    room_closet: closet,
    room_trash: trash,
    good_behavior: goodBehavior ?? true,
    diary_not_done: diaryNotDone ?? false,
    note_parent: noteParent || null,
    note_child: noteChild || null,
    is_sick: isSick ?? false,
    home_help: homeHelp ?? false,
    home_help_note: homeHelpNote || null,
    homework_done: homeworkDone ?? false,
    filled_by: filledBy ?? null,
    mood: mood ?? null,
    room_proof_url: roomProofUrl ?? null,
  }

  const { data, error } = await supabase
    .from('days')
    .upsert(dayData, { onConflict: 'child_id,date' })
    .select()
    .single()

  if (error) {
    // If error is about missing columns (migration not yet applied), retry with base columns only
    if (error.message?.includes('does not exist')) {
      const { child_id, date: d, family_id, room_bed, room_floor, room_desk, room_closet, room_trash, good_behavior, diary_not_done, note_parent } = dayData
      const { data: data2, error: error2 } = await supabase
        .from('days')
        .upsert({ child_id, date: d, family_id, room_bed, room_floor, room_desk, room_closet, room_trash, good_behavior, diary_not_done, note_parent }, { onConflict: 'child_id,date' })
        .select()
        .single()
      if (error2) throw error2
      return data2
    }
    throw error
  }
  return data
}

export async function getDay(childId: string, date: string) {
  const { data, error } = await supabase
    .from('days')
    .select('*')
    .eq('child_id', childId)
    .eq('date', normalizeDate(date))
    .maybeSingle()

  if (error) throw error
  return data as DayData | null
}

// ============================================================================
// SPORT
// ============================================================================

export async function saveHomeSport(params: {
  childId: string
  date: string
  running: boolean
  exercises: boolean
  outdoorGames: boolean
  stretching: boolean
  totalMinutes: number
  note?: string
}) {
  const { data: childRow2 } = await supabase
    .from('children')
    .select('family_id')
    .eq('id', params.childId)
    .single()

  const { data, error } = await supabase
    .from('home_sports')
    .upsert({
      child_id: params.childId,
      date: normalizeDate(params.date),
      family_id: childRow2?.family_id ?? null,
      running: params.running,
      exercises: params.exercises,
      outdoor_games: params.outdoorGames,
      stretching: params.stretching,
      total_minutes: params.totalMinutes,
      note: params.note || null
    }, { onConflict: 'child_id,date' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getHomeSportForDate(childId: string, date: string) {
  const { data, error } = await supabase
    .from('home_sports')
    .select('*')
    .eq('child_id', childId)
    .eq('date', normalizeDate(date))
    .maybeSingle()

  if (error) throw error
  return data as HomeSport | null
}

// ============================================================================
// SECTIONS
// ============================================================================

export async function getSections(childId: string) {
  const { data, error } = await supabase
    .from('sports_sections')
    .select('*')
    .eq('child_id', childId)
    .eq('active', true)

  if (error) throw error
  return data as SportsSection[]
}

export async function saveSectionAttendance(params: {
  sectionId: string
  childId: string
  date: string
  attended: boolean
  coachRating?: number
  coachComment?: string
}) {
  const { data: childRow3 } = await supabase
    .from('children')
    .select('family_id')
    .eq('id', params.childId)
    .single()

  const { data, error } = await supabase
    .from('section_attendance')
    .upsert({
      section_id: params.sectionId,
      child_id: params.childId,
      date: normalizeDate(params.date),
      family_id: childRow3?.family_id ?? null,
      attended: params.attended,
      coach_rating: params.coachRating || null,
      coach_comment: params.coachComment || null
    }, { onConflict: 'section_id,date' })
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================================
// GOALS
// ============================================================================

export async function getGoals(childId: string) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const active = data.find(g => g.active && !g.archived)
  const archived = data.filter(g => g.archived)
  const all = data.filter(g => !g.archived)

  return { active: active || null, archived, all }
}

export async function createGoal(params: {
  childId: string
  title: string
  target: number
}) {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      child_id: params.childId,
      title: params.title,
      target: params.target,
      current: 0,
      active: false,
      archived: false
    })
    .select()
    .single()

  if (error) throw error

  await logGoalAction(data.id, params.childId, 'created', 0, `Создана цель: ${params.title}`)

  return data
}

export async function setActiveGoal(childId: string, goalId: string) {
  await supabase
    .from('goals')
    .update({ active: false })
    .eq('child_id', childId)

  const { data, error } = await supabase
    .from('goals')
    .update({ active: true })
    .eq('id', goalId)
    .select()
    .single()

  if (error) throw error

  await logGoalAction(goalId, childId, 'set_active', 0, 'Установлена как активная')

  return data
}

export async function archiveGoal(goalId: string, childId: string) {
  const { data, error } = await supabase
    .from('goals')
    .update({ archived: true, active: false })
    .eq('id', goalId)
    .select()
    .single()

  if (error) throw error

  await logGoalAction(goalId, childId, 'archived', 0, 'Архивирована')

  return data
}

async function logGoalAction(goalId: string, childId: string, action: string, amount: number, note: string) {
  await supabase
    .from('goal_log')
    .insert({ goal_id: goalId, child_id: childId, action, amount, note })
}

export async function getGoalProgress(childId: string, goalId: string) {
  const { data: weeks, error } = await supabase
    .from('weeks')
    .select('total')
    .eq('child_id', childId)
    .eq('finalized', true)

  if (error) throw error

  const totalEarned = weeks.reduce((sum, w) => sum + (w.total || 0), 0)

  await supabase
    .from('goals')
    .update({ current: totalEarned })
    .eq('id', goalId)

  return totalEarned
}

// ============================================================================
// WEEKS
// ============================================================================

export async function getWeekData(childId: string, weekStart: string) {
  const week = getWeekRange(weekStart)

  const { data: days, error: daysError } = await supabase
    .from('days')
    .select('*')
    .eq('child_id', childId)
    .gte('date', week.start)
    .lte('date', week.end)
    .order('date')

  if (daysError) throw daysError

  const { data: grades, error: gradesError } = await supabase
    .from('subject_grades')
    .select('*')
    .eq('child_id', childId)
    .gte('date', week.start)
    .lte('date', week.end)

  if (gradesError) throw gradesError

  const { data: sports, error: sportsError } = await supabase
    .from('home_sports')
    .select('*')
    .eq('child_id', childId)
    .gte('date', week.start)
    .lte('date', week.end)

  if (sportsError) throw sportsError

  const { data: weekRecord, error: weekError } = await supabase
    .from('weeks')
    .select('*')
    .eq('child_id', childId)
    .eq('week_start', week.start)
    .maybeSingle()

  if (weekError) throw weekError

  return { week, days: days || [], grades: grades || [], sports: sports || [], weekRecord }
}

export async function finalizeWeek(params: {
  childId: string
  weekStart: string
  all5Mode: boolean
  extraBonus: number
  penaltiesManual: number
  noteParent: string
  breakdown: {
    base: number
    studyTotal: number
    roomBonus: number
    sportBonus: number
    streakBonuses: number
    total: number
  }
}) {
  const week = getWeekRange(params.weekStart)

  const { data, error } = await supabase
    .from('weeks')
    .upsert({
      child_id: params.childId,
      week_start: week.start,
      week_end: week.end,
      all5_mode: params.all5Mode,
      extra_bonus: params.extraBonus,
      penalties_manual: params.penaltiesManual,
      note_parent: params.noteParent,
      base: params.breakdown.base,
      study_total: params.breakdown.studyTotal,
      room_bonus: params.breakdown.roomBonus,
      sport_bonus: params.breakdown.sportBonus,
      streak_bonuses: params.breakdown.streakBonuses,
      extra_applied: params.extraBonus,
      penalties_total: params.penaltiesManual,
      total: params.breakdown.total,
      finalized: true,
      finalized_at: new Date().toISOString()
    }, { onConflict: 'child_id,week_start' })
    .select()
    .single()

  if (error) throw error

  const goals = await getGoals(params.childId)
  if (goals.active) {
    await getGoalProgress(params.childId, goals.active.id)
  }

  return data
}

// ============================================================================
// STREAKS
// ============================================================================

export async function getStreaks(childId: string) {
  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('child_id', childId)

  if (error) throw error
  return data
}
