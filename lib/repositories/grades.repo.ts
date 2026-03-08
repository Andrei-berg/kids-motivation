// lib/repositories/grades.repo.ts
// Supabase queries for subject grades and subjects autocomplete cache.
// Sourced from lib/api.ts — this is the authoritative implementation.

import { supabase } from '../supabase'
import { normalizeDate } from '@/utils/helpers'
import type { SubjectGrade } from '../models/child.types'

// ============================================================================
// GRADES
// ============================================================================

export async function saveSubjectGrade(params: {
  childId: string
  date: string
  subject: string
  subjectId?: string
  grade: number
  note?: string
}) {
  const { data, error } = await supabase
    .from('subject_grades')
    .insert({
      child_id: params.childId,
      date: normalizeDate(params.date),
      subject: params.subject,
      subject_id: params.subjectId || null,
      grade: params.grade,
      note: params.note || null
    })
    .select()
    .single()

  if (error) throw error

  await updateSubjectCache(params.childId, params.subject, params.date)

  return data
}

// Backward-compat alias
export const addSubjectGrade = saveSubjectGrade

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
// SUBJECTS AUTOCOMPLETE CACHE
// ============================================================================

async function updateSubjectCache(childId: string, subject: string, date: string) {
  const { data } = await supabase
    .from('subjects_cache')
    .select('*')
    .eq('child_id', childId)
    .eq('subject', subject)
    .maybeSingle()

  if (data) {
    await supabase
      .from('subjects_cache')
      .update({ last_seen: date, frequency: data.frequency + 1 })
      .eq('id', data.id)
  } else {
    await supabase
      .from('subjects_cache')
      .insert({ child_id: childId, subject, last_seen: date, frequency: 1 })
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
