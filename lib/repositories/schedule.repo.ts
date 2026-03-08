// lib/repositories/schedule.repo.ts
// Subjects, school schedule, exercise types, home exercises (from flexible-api.ts)
// AND new schedule_items (from schedule-api.ts).

import { supabase } from '../supabase'
import { createClient } from '@/lib/supabase/client'
import type { Subject, ScheduleLesson, ExerciseType, HomeExercise } from '../models/flexible.types'
import type { ScheduleItem } from '../models/schedule.types'

// ============================================================================
// SUBJECTS (old — flexible-api.ts)
// ============================================================================

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

export async function createSubject(childId: string, name: string) {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ child_id: childId, name })
    .select()
    .single()

  if (error) throw error
  return data as Subject
}

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

export async function toggleSubjectActive(id: string, active: boolean) {
  return updateSubject(id, { active })
}

export async function archiveSubject(id: string) {
  return updateSubject(id, {
    archived: true,
    active: false,
    archived_at: new Date().toISOString()
  })
}

export async function deleteSubject(id: string) {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// SCHOOL SCHEDULE (old — flexible-api.ts)
// ============================================================================

export async function getSchedule(childId: string) {
  const { data, error } = await supabase
    .from('schedule')
    .select(`*, subject:subjects(*)`)
    .eq('child_id', childId)
    .order('day_of_week')
    .order('lesson_number')

  if (error) throw error
  return data as ScheduleLesson[]
}

export async function getScheduleForDay(childId: string, dayOfWeek: number) {
  const { data, error } = await supabase
    .from('schedule')
    .select(`*, subject:subjects(*)`)
    .eq('child_id', childId)
    .eq('day_of_week', dayOfWeek)
    .order('lesson_number')

  if (error) throw error
  return data as ScheduleLesson[]
}

export async function addScheduleLesson(
  childId: string,
  dayOfWeek: number,
  lessonNumber: number,
  subjectId: string
) {
  const { data, error } = await supabase
    .from('schedule')
    .insert({ child_id: childId, day_of_week: dayOfWeek, lesson_number: lessonNumber, subject_id: subjectId })
    .select()
    .single()

  if (error) throw error
  return data as ScheduleLesson
}

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

export async function deleteScheduleLesson(id: string) {
  const { error } = await supabase
    .from('schedule')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function clearSchedule(childId: string) {
  const { error } = await supabase
    .from('schedule')
    .delete()
    .eq('child_id', childId)

  if (error) throw error
}

// ============================================================================
// EXERCISE TYPES (old — flexible-api.ts)
// ============================================================================

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

export async function createExerciseType(
  name: string,
  trackQuantity: boolean,
  unit: string
) {
  const { data, error } = await supabase
    .from('exercise_types')
    .insert({ name, track_quantity: trackQuantity, unit })
    .select()
    .single()

  if (error) throw error
  return data as ExerciseType
}

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

export async function deleteExerciseType(id: string) {
  const { error } = await supabase
    .from('exercise_types')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// HOME EXERCISES (old — flexible-api.ts)
// ============================================================================

export async function getHomeExercises(childId: string, date: string) {
  const { data, error } = await supabase
    .from('home_exercises')
    .select(`*, exercise_type:exercise_types(*)`)
    .eq('child_id', childId)
    .eq('date', date)

  if (error) throw error
  return data as HomeExercise[]
}

export async function saveHomeExercise(
  childId: string,
  date: string,
  exerciseTypeId: string,
  quantity: number | null,
  note?: string
) {
  const { data, error } = await supabase
    .from('home_exercises')
    .upsert({ child_id: childId, date, exercise_type_id: exerciseTypeId, quantity, note })
    .select()
    .single()

  if (error) throw error
  return data as HomeExercise
}

export async function deleteHomeExercise(id: string) {
  const { error } = await supabase
    .from('home_exercises')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// SCHEDULE ITEMS (new — schedule-api.ts, uses createClient())
// ============================================================================

export async function getScheduleItems(
  familyId: string,
  childMemberId: string
): Promise<ScheduleItem[]> {
  const db = createClient()
  const { data, error } = await db
    .from('schedule_items')
    .select('*')
    .eq('family_id', familyId)
    .eq('child_member_id', childMemberId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`getScheduleItems: ${error.message}`)
  return data ?? []
}

export async function createScheduleItem(
  familyId: string,
  childMemberId: string,
  fields: Pick<ScheduleItem, 'type' | 'title' | 'day_of_week'> &
    Partial<Omit<ScheduleItem, 'id' | 'family_id' | 'child_member_id' | 'type' | 'title' | 'day_of_week' | 'created_at'>>
): Promise<ScheduleItem> {
  const db = createClient()
  const { data, error } = await db
    .from('schedule_items')
    .insert({
      family_id: familyId,
      child_member_id: childMemberId,
      reminder_offset: 15,
      has_reminder: false,
      is_active: true,
      ...fields,
    })
    .select()
    .single()
  if (error) throw new Error(`createScheduleItem: ${error.message}`)
  return data
}

export async function updateScheduleItem(
  itemId: string,
  fields: Partial<Omit<ScheduleItem, 'id' | 'family_id' | 'child_member_id' | 'created_at'>>
): Promise<void> {
  const db = createClient()
  const { error } = await db
    .from('schedule_items')
    .update(fields)
    .eq('id', itemId)
  if (error) throw new Error(`updateScheduleItem: ${error.message}`)
}

export async function deleteScheduleItem(itemId: string): Promise<void> {
  const db = createClient()
  const { error } = await db
    .from('schedule_items')
    .delete()
    .eq('id', itemId)
  if (error) throw new Error(`deleteScheduleItem: ${error.message}`)
}
