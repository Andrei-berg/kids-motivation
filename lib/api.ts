import { supabase } from './supabase'
import { normalizeDate, getMonday, addDays, getWeekRange } from '@/utils/helpers'

// ============================================================================
// ТИПЫ
// ============================================================================

export type Child = {
  id: string
  name: string
  emoji: string
  age: number
  active: boolean
  base_weekly: number
  xp: number
  level: number
  created_at: string
}

export type DayData = {
  id: string
  child_id: string
  date: string
  room_bed: boolean
  room_floor: boolean
  room_desk: boolean
  room_closet: boolean
  room_trash: boolean
  room_score: number
  room_ok: boolean
  good_behavior: boolean
  diary_not_done: boolean
  note_parent: string | null
}

export type SubjectGrade = {
  id: string
  child_id: string
  date: string
  subject: string
  grade: number
  note: string | null
}

export type HomeSport = {
  id: string
  child_id: string
  date: string
  running: boolean
  exercises: boolean
  outdoor_games: boolean
  stretching: boolean
  total_minutes: number
  note: string | null
}

export type SportsSection = {
  id: string
  child_id: string
  name: string
  active: boolean
}

export type SectionAttendance = {
  id: string
  section_id: string
  child_id: string
  date: string
  attended: boolean
  coach_rating: number | null
  coach_comment: string | null
}

export type Goal = {
  id: string
  child_id: string
  title: string
  target: number
  current: number
  active: boolean
  archived: boolean
  completed: boolean
  completed_at: string | null
  created_at: string
}

export type Week = {
  id: string
  child_id: string
  week_start: string
  week_end: string
  all5_mode: boolean
  extra_bonus: number
  penalties_manual: number
  note_parent: string | null
  base: number
  study_total: number
  room_bonus: number
  sport_bonus: number
  streak_bonuses: number
  extra_applied: number
  penalties_total: number
  total: number
  finalized: boolean
  finalized_at: string | null
}

// ============================================================================
// ДЕТИ
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
// НАСТРОЙКИ
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
// ЕЖЕДНЕВНЫЙ ВВОД - СОХРАНЕНИЕ ДНЯ
// ============================================================================

export async function saveDay(params: {
  childId: string
  date: string
  roomData: {
    bed: boolean
    floor: boolean
    desk: boolean
    closet: boolean
    trash: boolean
  }
  goodBehavior: boolean
  diaryNotDone: boolean
  noteParent?: string
}) {
  const { childId, date, roomData, goodBehavior, diaryNotDone, noteParent } = params
  
  const dayData = {
    child_id: childId,
    date: normalizeDate(date),
    room_bed: roomData.bed,
    room_floor: roomData.floor,
    room_desk: roomData.desk,
    room_closet: roomData.closet,
    room_trash: roomData.trash,
    good_behavior: goodBehavior,
    diary_not_done: diaryNotDone,
    note_parent: noteParent || null
  }
  
  const { data, error } = await supabase
    .from('days')
    .upsert(dayData, { onConflict: 'child_id,date' })
    .select()
    .single()
  
  if (error) throw error
  return data
}

// ============================================================================
// ОЦЕНКИ ПО ПРЕДМЕТАМ
// ============================================================================

export async function addSubjectGrade(params: {
  childId: string
  date: string
  subject: string
  grade: number
  note?: string
}) {
  const { data, error } = await supabase
    .from('subject_grades')
    .insert({
      child_id: params.childId,
      date: normalizeDate(params.date),
      subject: params.subject,
      grade: params.grade,
      note: params.note || null
    })
    .select()
    .single()
  
  if (error) throw error
  
  // Обновить кеш предметов
  await updateSubjectCache(params.childId, params.subject, params.date)
  
  return data
}

export async function getSubjectGradesForDate(childId: string, date: string) {
  const { data, error } = await supabase
    .from('subject_grades')
    .select('*')
    .eq('child_id', childId)
    .eq('date', normalizeDate(date))
    .order('created_at')
  
  if (error) throw error
  return data as SubjectGrade[]
}

export async function deleteSubjectGrade(gradeId: string) {
  const { error } = await supabase
    .from('subject_grades')
    .delete()
    .eq('id', gradeId)
  
  if (error) throw error
}

// ============================================================================
// АВТОКОМПЛИТ ПРЕДМЕТОВ
// ============================================================================

async function updateSubjectCache(childId: string, subject: string, date: string) {
  const { data, error } = await supabase
    .from('subjects_cache')
    .select('*')
    .eq('child_id', childId)
    .eq('subject', subject)
    .maybeSingle()
  
  if (data) {
    await supabase
      .from('subjects_cache')
      .update({
        last_seen: date,
        frequency: data.frequency + 1
      })
      .eq('id', data.id)
  } else {
    await supabase
      .from('subjects_cache')
      .insert({
        child_id: childId,
        subject: subject,
        last_seen: date,
        frequency: 1
      })
  }
}

export async function getSubjectSuggestions(childId: string, query: string = '') {
  let queryBuilder = supabase
    .from('subjects_cache')
    .select('subject')
    .eq('child_id', childId)
    .order('frequency', { ascending: false })
    .order('last_seen', { ascending: false })
    .limit(10)
  
  if (query) {
    queryBuilder = queryBuilder.ilike('subject', `%${query}%`)
  }
  
  const { data, error } = await queryBuilder
  
  if (error) throw error
  return data.map(d => d.subject)
}

// ============================================================================
// СПОРТ ДОМАШНИЙ
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
  const { data, error } = await supabase
    .from('home_sports')
    .upsert({
      child_id: params.childId,
      date: normalizeDate(params.date),
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
// СЕКЦИИ
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
  const { data, error } = await supabase
    .from('section_attendance')
    .upsert({
      section_id: params.sectionId,
      child_id: params.childId,
      date: normalizeDate(params.date),
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
// ЦЕЛИ
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
  
  return {
    active: active || null,
    archived,
    all
  }
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
  // Деактивировать все цели
  await supabase
    .from('goals')
    .update({ active: false })
    .eq('child_id', childId)
  
  // Активировать выбранную
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
    .insert({
      goal_id: goalId,
      child_id: childId,
      action,
      amount,
      note
    })
}

export async function getGoalProgress(childId: string, goalId: string) {
  // Получить сумму всех закрытых недель
  const { data: weeks, error } = await supabase
    .from('weeks')
    .select('total')
    .eq('child_id', childId)
    .eq('finalized', true)
  
  if (error) throw error
  
  const totalEarned = weeks.reduce((sum, w) => sum + (w.total || 0), 0)
  
  // Обновить прогресс цели
  await supabase
    .from('goals')
    .update({ current: totalEarned })
    .eq('id', goalId)
  
  return totalEarned
}

// ============================================================================
// НЕДЕЛИ
// ============================================================================

export async function getWeekData(childId: string, weekStart: string) {
  const week = getWeekRange(weekStart)
  
  // Получить дни недели
  const { data: days, error: daysError } = await supabase
    .from('days')
    .select('*')
    .eq('child_id', childId)
    .gte('date', week.start)
    .lte('date', week.end)
    .order('date')
  
  if (daysError) throw daysError
  
  // Получить оценки
  const { data: grades, error: gradesError } = await supabase
    .from('subject_grades')
    .select('*')
    .eq('child_id', childId)
    .gte('date', week.start)
    .lte('date', week.end)
  
  if (gradesError) throw gradesError
  
  // Получить спорт
  const { data: sports, error: sportsError } = await supabase
    .from('home_sports')
    .select('*')
    .eq('child_id', childId)
    .gte('date', week.start)
    .lte('date', week.end)
  
  if (sportsError) throw sportsError
  
  // Получить закрытую неделю (если есть)
  const { data: weekRecord, error: weekError } = await supabase
    .from('weeks')
    .select('*')
    .eq('child_id', childId)
    .eq('week_start', week.start)
    .maybeSingle()
  
  if (weekError) throw weekError
  
  return {
    week,
    days: days || [],
    grades: grades || [],
    sports: sports || [],
    weekRecord
  }
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
  
  // Обновить прогресс активной цели
  const goals = await getGoals(params.childId)
  if (goals.active) {
    await getGoalProgress(params.childId, goals.active.id)
  }
  
  return data
}

// ============================================================================
// СТРИКИ
// ============================================================================

export async function getStreaks(childId: string) {
  const { data, error } = await supabase
    .from('streaks')
    .select('*')
    .eq('child_id', childId)
  
  if (error) throw error
  return data
}

// ============================================================================
// ЭКСПОРТ ВСЕХ ФУНКЦИЙ
// ============================================================================

export const api = {
  // Дети
  getChildren,
  getChild,
  
  // Настройки
  getSettings,
  
  // Дни
  saveDay,
  
  // Оценки
  addSubjectGrade,
  getSubjectGradesForDate,
  deleteSubjectGrade,
  getSubjectSuggestions,
  
  // Спорт
  saveHomeSport,
  getHomeSportForDate,
  getSections,
  saveSectionAttendance,
  
  // Цели
  getGoals,
  createGoal,
  setActiveGoal,
  archiveGoal,
  getGoalProgress,
  
  // Недели
  getWeekData,
  finalizeWeek,
  
  // Стрики
  getStreaks
}
