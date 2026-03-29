// lib/repositories/expenses.repo.ts
// Supabase queries for expenses, expense categories, sections, section visits.
// Sourced from lib/expenses-api.ts — this is the authoritative implementation.

import { supabase } from '../supabase'
import type {
  ExpenseCategory,
  Expense,
  Section,
  SectionVisit,
  ExpenseStats,
  ExtraActivity,
  ActivityLog,
} from '../models/expense.types'

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
  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ name, icon, is_default: false, is_active: true })
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
      created_by: expense.createdBy
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

export async function addSection(section: {
  childId: string
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
  const { error } = await supabase
    .from('sections')
    .delete()
    .eq('id', sectionId)

  if (error) throw error
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
  trainerFeedback?: string
): Promise<SectionVisit> {
  const { data, error } = await supabase
    .from('section_visits')
    .upsert({
      section_id: sectionId,
      date,
      attended,
      progress_note: progressNote || null,
      trainer_feedback: trainerFeedback || null
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

export async function getExtraActivities(childId: string, dayType?: string): Promise<ExtraActivity[]> {
  let query = supabase
    .from('extra_activities')
    .select('*')
    .eq('child_id', childId)
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at')

  const { data, error } = await query
  if (error) throw error

  const activities = data || []

  // Filter by day_type if provided
  if (dayType) {
    return activities.filter(a => a.day_types.includes(dayType))
  }
  return activities
}

export async function addExtraActivity(activity: {
  childId: string
  familyId?: string
  name: string
  emoji: string
  dayTypes: string[]
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
      coins: activity.coins,
      sort_order: activity.sortOrder ?? 0,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateExtraActivity(
  activityId: string,
  updates: Partial<{
    name: string
    emoji: string
    dayTypes: string[]
    coins: number
    sortOrder: number
    isActive: boolean
  }>
): Promise<void> {
  const updateData: any = {}
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.emoji !== undefined) updateData.emoji = updates.emoji
  if (updates.dayTypes !== undefined) updateData.day_types = updates.dayTypes
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
  logs: { activityId: string; done: boolean; note?: string }[]
): Promise<void> {
  if (logs.length === 0) return

  const rows = logs.map(l => ({
    child_id: childId,
    date,
    activity_id: l.activityId,
    done: l.done,
    note: l.note || null,
  }))

  const { error } = await supabase
    .from('activity_logs')
    .upsert(rows, { onConflict: 'child_id,date,activity_id' })

  if (error) throw error
}
