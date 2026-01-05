import { supabase } from './supabase'

// ============================================================================
// ПРЕДМЕТЫ (Subjects)
// ============================================================================

export interface Subject {
  id: string
  child_id: string
  name: string
  active: boolean
  archived: boolean
  display_order: number
  created_at: string
  archived_at?: string
}

// Получить все предметы ребенка
export async function getSubjects(childId: string, includeArchived = false) {
  let query = supabase
    .from('subjects')
    .select('*')
    .eq('child_id', childId)
    .order('display_order')
  
  if (!includeArchived) {
    query = query.eq('archived', false)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data as Subject[]
}

// Получить активные предметы
export async function getActiveSubjects(childId: string) {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('child_id', childId)
    .eq('active', true)
    .eq('archived', false)
    .order('display_order')
  
  if (error) throw error
  return data as Subject[]
}

// Создать предмет
export async function createSubject(childId: string, name: string) {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ child_id: childId, name })
    .select()
    .single()
  
  if (error) throw error
  return data as Subject
}

// Обновить предмет
export async function updateSubject(id: string, updates: Partial<Subject>) {
  const { data, error } = await supabase
    .from('subjects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Subject
}

// Переключить активность
export async function toggleSubjectActive(id: string, active: boolean) {
  return updateSubject(id, { active })
}

// Архивировать предмет
export async function archiveSubject(id: string) {
  return updateSubject(id, { 
    archived: true, 
    active: false,
    archived_at: new Date().toISOString() 
  })
}

// Удалить предмет
export async function deleteSubject(id: string) {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ============================================================================
// РАСПИСАНИЕ (Schedule)
// ============================================================================

export interface ScheduleLesson {
  id: string
  child_id: string
  day_of_week: number // 1-5
  lesson_number: number
  subject_id: string
  subject?: Subject
  created_at: string
}

// Получить расписание ребенка
export async function getSchedule(childId: string) {
  const { data, error } = await supabase
    .from('schedule')
    .select(`
      *,
      subject:subjects(*)
    `)
    .eq('child_id', childId)
    .order('day_of_week')
    .order('lesson_number')
  
  if (error) throw error
  return data as ScheduleLesson[]
}

// Получить расписание на конкретный день
export async function getScheduleForDay(childId: string, dayOfWeek: number) {
  const { data, error } = await supabase
    .from('schedule')
    .select(`
      *,
      subject:subjects(*)
    `)
    .eq('child_id', childId)
    .eq('day_of_week', dayOfWeek)
    .order('lesson_number')
  
  if (error) throw error
  return data as ScheduleLesson[]
}

// Добавить урок в расписание
export async function addScheduleLesson(
  childId: string,
  dayOfWeek: number,
  lessonNumber: number,
  subjectId: string
) {
  const { data, error } = await supabase
    .from('schedule')
    .insert({
      child_id: childId,
      day_of_week: dayOfWeek,
      lesson_number: lessonNumber,
      subject_id: subjectId
    })
    .select()
    .single()
  
  if (error) throw error
  return data as ScheduleLesson
}

// Обновить урок
export async function updateScheduleLesson(id: string, subjectId: string) {
  const { data, error } = await supabase
    .from('schedule')
    .update({ subject_id: subjectId })
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as ScheduleLesson
}

// Удалить урок
export async function deleteScheduleLesson(id: string) {
  const { error } = await supabase
    .from('schedule')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// Очистить всё расписание ребенка
export async function clearSchedule(childId: string) {
  const { error } = await supabase
    .from('schedule')
    .delete()
    .eq('child_id', childId)
  
  if (error) throw error
}

// ============================================================================
// ТИПЫ УПРАЖНЕНИЙ (Exercise Types)
// ============================================================================

export interface ExerciseType {
  id: string
  name: string
  track_quantity: boolean
  unit: string
  display_order: number
  active: boolean
  created_at: string
}

// Получить все типы упражнений
export async function getExerciseTypes(activeOnly = true) {
  let query = supabase
    .from('exercise_types')
    .select('*')
    .order('display_order')
  
  if (activeOnly) {
    query = query.eq('active', true)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data as ExerciseType[]
}

// Создать тип упражнения
export async function createExerciseType(
  name: string,
  trackQuantity: boolean,
  unit: string
) {
  const { data, error } = await supabase
    .from('exercise_types')
    .insert({
      name,
      track_quantity: trackQuantity,
      unit
    })
    .select()
    .single()
  
  if (error) throw error
  return data as ExerciseType
}

// Обновить тип упражнения
export async function updateExerciseType(id: string, updates: Partial<ExerciseType>) {
  const { data, error } = await supabase
    .from('exercise_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as ExerciseType
}

// Удалить тип упражнения
export async function deleteExerciseType(id: string) {
  const { error } = await supabase
    .from('exercise_types')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ============================================================================
// ДОМАШНИЕ УПРАЖНЕНИЯ (Home Exercises)
// ============================================================================

export interface HomeExercise {
  id: string
  child_id: string
  date: string
  exercise_type_id: string
  exercise_type?: ExerciseType
  quantity: number | null
  note: string | null
  created_at: string
}

// Получить упражнения за день
export async function getHomeExercises(childId: string, date: string) {
  const { data, error } = await supabase
    .from('home_exercises')
    .select(`
      *,
      exercise_type:exercise_types(*)
    `)
    .eq('child_id', childId)
    .eq('date', date)
  
  if (error) throw error
  return data as HomeExercise[]
}

// Сохранить упражнение
export async function saveHomeExercise(
  childId: string,
  date: string,
  exerciseTypeId: string,
  quantity: number | null,
  note?: string
) {
  const { data, error } = await supabase
    .from('home_exercises')
    .upsert({
      child_id: childId,
      date,
      exercise_type_id: exerciseTypeId,
      quantity,
      note
    })
    .select()
    .single()
  
  if (error) throw error
  return data as HomeExercise
}

// Удалить упражнение
export async function deleteHomeExercise(id: string) {
  const { error } = await supabase
    .from('home_exercises')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

// ============================================================================
// ЭКСПОРТ
// ============================================================================

export const flexibleApi = {
  // Subjects
  getSubjects,
  getActiveSubjects,
  createSubject,
  updateSubject,
  toggleSubjectActive,
  archiveSubject,
  deleteSubject,
  
  // Schedule
  getSchedule,
  getScheduleForDay,
  addScheduleLesson,
  updateScheduleLesson,
  deleteScheduleLesson,
  clearSchedule,
  
  // Exercise Types
  getExerciseTypes,
  createExerciseType,
  updateExerciseType,
  deleteExerciseType,
  
  // Home Exercises
  getHomeExercises,
  saveHomeExercise,
  deleteHomeExercise
}
