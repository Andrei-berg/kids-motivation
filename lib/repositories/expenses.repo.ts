// lib/repositories/expenses.repo.ts
// Supabase queries for expenses, expense categories, sections, section visits.
// Sourced from lib/expenses-api.ts — this is the authoritative implementation.

import { supabase } from '../supabase'
import { localDateString } from '@/utils/helpers'
import type {
  ExpenseCategory,
  Expense,
  Section,
  SectionVisit,
  ExpenseStats,
  ExtraActivity,
  ActivityLog,
} from '../models/expense.types'

// Resolve the current user's family_id (RLS WITH CHECK on inserts requires it).
async function getCurrentFamilyId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('family_members')
    .select('family_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  return data?.family_id ?? null
}

// ============================================================================
// EXPENSE CATEGORIES
// ============================================================================

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data || []
}

export async function getAllExpenseCategories(): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

export async function addExpenseCategory(name: string, icon: string): Promise<ExpenseCategory> {
  const familyId = await getCurrentFamilyId()
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ name, icon, is_default: false, is_active: true, family_id: familyId })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function toggleCategoryActive(categoryId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('expense_categories')
    .update({ is_active: isActive })
    .eq('id', categoryId)

  if (error) throw error
}

export async function deleteExpenseCategory(categoryId: string): Promise<void> {
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id')
    .eq('category_id', categoryId)
    .limit(1)

  if (expenses && expenses.length > 0) {
    throw new Error('Нельзя удалить категорию с существующими расходами. Отключите её вместо удаления.')
  }

  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('id', categoryId)

  if (error) throw error
}

// ============================================================================
// EXPENSES
// ============================================================================

export async function getExpenses(filters?: {
  childId?: string
  categoryId?: string
  startDate?: string
  endDate?: string
}): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select(`*, category:expense_categories(*)`)
    .order('date', { ascending: false })

  if (filters?.childId) query = query.eq('child_id', filters.childId)
  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters?.startDate) query = query.gte('date', filters.startDate)
  if (filters?.endDate) query = query.lte('date', filters.endDate)

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function addExpense(expense: {
  childId: string
  title: string
  amount: number
  categoryId: string
  date: string
  isRecurring?: boolean
  recurringPeriod?: string
  note?: string
  createdBy: string
}): Promise<Expense> {
  // family_id is required by the RLS WITH CHECK policy; derive it from the child.
  const { data: childRow } = await supabase
    .from('children')
    .select('family_id')
    .eq('id', expense.childId)
    .maybeSingle()
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      child_id: expense.childId,
      title: expense.title,
      amount: expense.amount,
      category_id: expense.categoryId,
      date: expense.date,
      is_recurring: expense.isRecurring || false,
      recurring_period: expense.recurringPeriod || null,
      note: expense.note || null,
      created_by: expense.createdBy,
      family_id: childRow?.family_id ?? null,
    })
    .select(`*, category:expense_categories(*)`)
    .single()

  if (error) throw error
  return data
}

export async function updateExpense(
  expenseId: string,
  updates: Partial<{
    title: string
    amount: number
    categoryId: string
    date: string
    isRecurring: boolean
    recurringPeriod: string
    note: string
  }>
): Promise<void> {
  const updateData: any = {}

  if (updates.title) updateData.title = updates.title
  if (updates.amount) updateData.amount = updates.amount
  if (updates.categoryId) updateData.category_id = updates.categoryId
  if (updates.date) updateData.date = updates.date
  if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring
  if (updates.recurringPeriod !== undefined) updateData.recurring_period = updates.recurringPeriod
  if (updates.note !== undefined) updateData.note = updates.note

  const { error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', expenseId)

  if (error) throw error
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)

  if (error) throw error
}

// ============================================================================
// EXPENSE STATS
// ============================================================================

export async function getExpenseStats(filters?: {
  childId?: string
  startDate?: string
  endDate?: string
}): Promise<ExpenseStats> {
  const expenses = await getExpenses(filters)

  const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

  const categoryMap: { [key: string]: { name: string; icon: string; amount: number } } = {}
  expenses.forEach(exp => {
    if (!exp.category) return
    const catId = exp.category.id
    if (!categoryMap[catId]) {
      categoryMap[catId] = { name: exp.category.name, icon: exp.category.icon, amount: 0 }
    }
    categoryMap[catId].amount += Number(exp.amount)
  })

  const byCategory = Object.entries(categoryMap).map(([catId, data]) => ({
    categoryId: catId,
    categoryName: data.name,
    icon: data.icon,
    amount: data.amount,
    percentage: total > 0 ? (data.amount / total) * 100 : 0
  })).sort((a, b) => b.amount - a.amount)

  const childMap: { [key: string]: number } = {}
  expenses.forEach(exp => {
    if (!childMap[exp.child_id]) childMap[exp.child_id] = 0
    childMap[exp.child_id] += Number(exp.amount)
  })

  const byChild = Object.entries(childMap).map(([childId, amount]) => ({
    childId,
    amount,
    percentage: total > 0 ? (amount / total) * 100 : 0
  })).sort((a, b) => b.amount - a.amount)

  return { total, byCategory, byChild }
}

// ============================================================================
// SECTIONS (sports clubs)
// ============================================================================

// Returns active sections for a child, optionally filtered by a specific date
// (date filtering: start_date <= date AND (end_date IS NULL OR end_date >= date))
export async function getSections(childId?: string, date?: string): Promise<Section[]> {
  let query = supabase
    .from('sections')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (childId) query = query.eq('child_id', childId)

  // Date range filtering
  if (date) {
    query = query.or(`start_date.is.null,start_date.lte.${date}`)
    query = query.or(`end_date.is.null,end_date.gte.${date}`)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Returns ALL sections for a child (active + archived) for settings view
export async function getAllSections(childId: string): Promise<Section[]> {
  const { data, error } = await supabase
    .from('sections')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Returns active sections for a child with their monthly cost.
 * Used by /kid/day expenses tab to show family spending on the child.
 */
export async function getSectionsForChildExpenses(childId: string): Promise<Array<{
  id: string
  name: string
  cost: number | null
  schedule_days: string[]
}>> {
  const { data, error } = await supabase
    .from('sections')
    .select('id, name, cost, schedule_days')
    .eq('child_id', childId)
    .eq('is_active', true)
    .order('name')

  if (error) throw error
  return data || []
}

export async function addSection(section: {
  childId: string
  familyId?: string
  name: string
  schedule?: any
  cost?: number
  trainer?: string
  address?: string
  startDate?: string
  endDate?: string
  scheduleDays?: string[]
}): Promise<Section> {
  const { data, error } = await supabase
    .from('sections')
    .insert({
      child_id: section.childId,
      family_id: section.familyId || null,
      name: section.name,
      schedule: section.schedule || null,
      cost: section.cost || null,
      trainer: section.trainer || null,
      address: section.address || null,
      is_active: true,
      start_date: section.startDate || null,
      end_date: section.endDate || null,
      schedule_days: section.scheduleDays || [],
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSection(
  sectionId: string,
  updates: Partial<{
    name: string
    schedule: any
    cost: number
    trainer: string
    address: string
    isActive: boolean
    startDate: string | null
    endDate: string | null
    scheduleDays: string[]
  }>
): Promise<void> {
  const updateData: any = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.schedule !== undefined) updateData.schedule = updates.schedule
  if (updates.cost !== undefined) updateData.cost = updates.cost
  if (updates.trainer !== undefined) updateData.trainer = updates.trainer
  if (updates.address !== undefined) updateData.address = updates.address
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate
  if (updates.scheduleDays !== undefined) updateData.schedule_days = updates.scheduleDays

  const { error } = await supabase
    .from('sections')
    .update(updateData)
    .eq('id', sectionId)

  if (error) throw error
}

export async function deleteSection(sectionId: string): Promise<void> {
  // Remove auto-generated monthly expense rows for this section first.
  await supabase.from('expenses').delete().eq('section_id', sectionId)

  const { error } = await supabase
    .from('sections')
    .delete()
    .eq('id', sectionId)

  if (error) throw error
}

// ----------------------------------------------------------------------------
// Section monthly cost → expenses (migration 04.4-06)
// ----------------------------------------------------------------------------

const SECTION_CATEGORY_NAME = 'Секции'

async function ensureSectionCategory(familyId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('expense_categories')
    .select('id')
    .eq('name', SECTION_CATEGORY_NAME)
    .limit(1)
    .maybeSingle()
  if (existing) return existing.id
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ name: SECTION_CATEGORY_NAME, icon: '🏅', is_default: false, is_active: true, family_id: familyId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

// inclusive list of 'YYYY-MM' from startYM to endYM
function monthsBetween(startYM: string, endYM: string): string[] {
  const out: string[] = []
  let [y, m] = startYM.split('-').map(Number)
  const [ey, em] = endYM.split('-').map(Number)
  let guard = 0
  while ((y < ey || (y === ey && m <= em)) && guard++ < 240) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m++; if (m > 12) { m = 1; y++ }
  }
  return out
}

/**
 * Materialize each active section's monthly `cost` as one expense row per month
 * (idempotent via the (section_id, period) unique index, migration 04.4-06).
 * Lazy: call this when the expenses view loads. Backfills up to 12 months,
 * floored at the section's start_date and capped at its end_date / the current
 * month. Returns the number of rows created. Past months keep their historical
 * amount; new months use the section's current cost.
 */
export async function ensureSectionExpenses(): Promise<number> {
  const familyId = await getCurrentFamilyId()
  if (!familyId) return 0

  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, cost, child_id, start_date, end_date')
    .eq('is_active', true)
    .gt('cost', 0)
  if (!sections || sections.length === 0) return 0

  const categoryId = await ensureSectionCategory(familyId)
  const now = new Date()
  const curYM = localDateString(now).slice(0, 7)
  const floor = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const floorYM = `${floor.getFullYear()}-${String(floor.getMonth() + 1).padStart(2, '0')}`
  let created = 0

  for (const s of sections) {
    let startYM = floorYM
    if (s.start_date && s.start_date.slice(0, 7) > startYM) startYM = s.start_date.slice(0, 7)
    let endYM = curYM
    if (s.end_date && s.end_date.slice(0, 7) < endYM) endYM = s.end_date.slice(0, 7)
    if (startYM > endYM) continue

    const periods = monthsBetween(startYM, endYM)
    const { data: existing } = await supabase
      .from('expenses')
      .select('period')
      .eq('section_id', s.id)
    const have = new Set((existing ?? []).map((e) => e.period))

    const rows = periods.filter((p) => !have.has(p)).map((p) => ({
      child_id: s.child_id,
      title: s.name,
      amount: s.cost,
      category_id: categoryId,
      date: `${p}-01`,
      is_recurring: true,
      recurring_period: 'monthly',
      created_by: 'section',
      family_id: familyId,
      section_id: s.id,
      period: p,
    }))
    if (rows.length === 0) continue

    const { error } = await supabase.from('expenses').insert(rows)
    if (error && error.code !== '23505') throw error
    created += rows.length
  }
  return created
}

// ============================================================================
// SECTION VISITS
// ============================================================================

export async function getSectionVisits(sectionId: string, startDate?: string, endDate?: string): Promise<SectionVisit[]> {
  let query = supabase
    .from('section_visits')
    .select('*')
    .eq('section_id', sectionId)
    .order('date', { ascending: false })

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export async function markSectionVisit(
  sectionId: string,
  date: string,
  attended: boolean,
  progressNote?: string,
  trainerFeedback?: string,
  coachRating?: number | null
): Promise<SectionVisit> {
  const { data, error } = await supabase
    .from('section_visits')
    .upsert({
      section_id: sectionId,
      date,
      attended,
      progress_note: progressNote || null,
      trainer_feedback: trainerFeedback || null,
      // Persist the coach rating so coin awards can be reconciled server-side
      // from the saved row (see /api/wallet/award) instead of trusting client.
      coach_rating: coachRating ?? null,
    }, { onConflict: 'section_id,date' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getSectionsForDate(childId: string, date: string): Promise<(Section & { visit?: SectionVisit })[]> {
  // Get sections active on this date (respects start_date / end_date)
  const allSections = await getSections(childId, date)

  // Optionally filter by schedule_days if the section has them configured
  const d = new Date(date)
  const dayOfWeek = d.getDay() // 0=Sun,1=Mon,...,6=Sat
  const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const todayKey = DAY_KEYS[dayOfWeek]

  const sections = allSections.filter(s => {
    // If no schedule_days configured — show every day
    if (!s.schedule_days || s.schedule_days.length === 0) return true
    return s.schedule_days.includes(todayKey)
  })

  if (sections.length === 0) return []

  const { data: visits } = await supabase
    .from('section_visits')
    .select('*')
    .eq('date', date)
    .in('section_id', sections.map(s => s.id))

  const visitsMap: { [key: string]: SectionVisit } = {}
  visits?.forEach(v => { visitsMap[v.section_id] = v })

  return sections.map(s => ({ ...s, visit: visitsMap[s.id] }))
}

// ============================================================================
// EXTRA ACTIVITIES (catalog)
// ============================================================================

export async function getExtraActivities(childId: string, dayType?: string, includeInactive = false): Promise<ExtraActivity[]> {
  let query = supabase
    .from('extra_activities')
    .select('*')
    .eq('child_id', childId)
    .order('sort_order')
    .order('created_at')
  if (!includeInactive) query = query.eq('is_active', true)

  const { data, error } = await query

  if (error) throw error
  const activities = (data || []) as ExtraActivity[]

  if (dayType) return activities.filter(a => a.day_types.includes(dayType) || a.day_types.includes('always'))
  return activities
}

/**
 * Returns activities for a specific date, filtered by:
 * 1. days_of_week (0=Mon…6=Sun) — empty means all days
 * 2. day_types ('school'|'weekend'|'vacation'|'always') — must include currentDayType or 'always'
 */
export async function getActivitiesForDay(childId: string, date: string, currentDayType: string): Promise<ExtraActivity[]> {
  const { data, error } = await supabase
    .from('extra_activities')
    .select('*')
    .eq('child_id', childId)
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at')

  if (error) throw error
  const activities = (data || []) as ExtraActivity[]

  // Convert JS day (0=Sun…6=Sat) → our system (0=Mon…6=Sun)
  const jsDay = new Date(date + 'T12:00:00').getDay()
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1

  return activities.filter(a => {
    // day_types filter
    const dayTypes = a.day_types || []
    if (dayTypes.length > 0 && !dayTypes.includes('always') && !dayTypes.includes(currentDayType)) return false
    // days_of_week filter (empty = all days)
    const dow = a.days_of_week || []
    if (dow.length > 0 && !dow.includes(dayIndex)) return false
    return true
  })
}

export async function addExtraActivity(activity: {
  childId: string
  familyId?: string
  name: string
  emoji: string
  dayTypes: string[]
  category?: string
  trackingType?: string
  daysOfWeek?: number[]
  quantityGoal?: number
  quantityUnit?: string
  coins: number
  sortOrder?: number
}): Promise<ExtraActivity> {
  const { data, error } = await supabase
    .from('extra_activities')
    .insert({
      child_id: activity.childId,
      family_id: activity.familyId || null,
      name: activity.name,
      emoji: activity.emoji,
      day_types: activity.dayTypes,
      category: activity.category || 'other',
      tracking_type: activity.trackingType || 'checkbox',
      days_of_week: activity.daysOfWeek || [],
      quantity_goal: activity.quantityGoal || null,
      quantity_unit: activity.quantityUnit || null,
      coins: activity.coins,
      sort_order: activity.sortOrder ?? 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data as ExtraActivity
}

export async function updateExtraActivity(
  activityId: string,
  updates: Partial<{
    name: string
    emoji: string
    dayTypes: string[]
    category: string
    trackingType: string
    daysOfWeek: number[]
    quantityGoal: number | null
    quantityUnit: string | null
    coins: number
    sortOrder: number
    isActive: boolean
  }>
): Promise<void> {
  const updateData: any = {}
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.emoji !== undefined) updateData.emoji = updates.emoji
  if (updates.dayTypes !== undefined) updateData.day_types = updates.dayTypes
  if (updates.category !== undefined) updateData.category = updates.category
  if (updates.trackingType !== undefined) updateData.tracking_type = updates.trackingType
  if (updates.daysOfWeek !== undefined) updateData.days_of_week = updates.daysOfWeek
  if (updates.quantityGoal !== undefined) updateData.quantity_goal = updates.quantityGoal
  if (updates.quantityUnit !== undefined) updateData.quantity_unit = updates.quantityUnit
  if (updates.coins !== undefined) updateData.coins = updates.coins
  if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive

  const { error } = await supabase
    .from('extra_activities')
    .update(updateData)
    .eq('id', activityId)

  if (error) throw error
}

export async function deleteExtraActivity(activityId: string): Promise<void> {
  const { error } = await supabase
    .from('extra_activities')
    .delete()
    .eq('id', activityId)

  if (error) throw error
}

// ============================================================================
// ACTIVITY LOGS (daily completion)
// ============================================================================

export async function getActivityLogs(childId: string, date: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('child_id', childId)
    .eq('date', date)

  if (error) throw error
  return data || []
}

export async function saveActivityLogs(
  childId: string,
  date: string,
  logs: {
    activityId: string
    done: boolean
    note?: string
    quantityDone?: number
    durationMinutes?: number
    rating?: number
    bookmarkPage?: number
  }[]
): Promise<void> {
  if (logs.length === 0) return

  const rows = logs.map(l => ({
    child_id: childId,
    date,
    activity_id: l.activityId,
    done: l.done,
    note: l.note || null,
    quantity_done: l.quantityDone ?? null,
    duration_minutes: l.durationMinutes ?? null,
    rating: l.rating ?? null,
    bookmark_page: l.bookmarkPage ?? null,
  }))

  const { error } = await supabase
    .from('activity_logs')
    .upsert(rows, { onConflict: 'child_id,date,activity_id' })

  if (error) throw error
}
