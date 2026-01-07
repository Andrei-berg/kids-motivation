import { supabase } from './supabase'

// ============================================================================
// ТИПЫ
// ============================================================================

export interface ExpenseCategory {
  id: string
  name: string
  icon: string
  is_default: boolean
  is_active: boolean
  created_at: string
}

export interface Expense {
  id: string
  child_id: string
  title: string
  amount: number
  category_id: string
  date: string
  is_recurring: boolean
  recurring_period: string | null
  note: string | null
  created_by: string
  created_at: string
  category?: ExpenseCategory
}

export interface Section {
  id: string
  child_id: string
  name: string
  schedule: any
  cost: number | null
  trainer: string | null
  address: string | null
  is_active: boolean
  created_at: string
}

export interface SectionVisit {
  id: string
  section_id: string
  date: string
  attended: boolean
  progress_note: string | null
  trainer_feedback: string | null
  created_at: string
}

// ============================================================================
// КАТЕГОРИИ РАСХОДОВ
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
  // Проверить что нет расходов с этой категорией
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
// РАСХОДЫ
// ============================================================================

export async function getExpenses(filters?: {
  childId?: string
  categoryId?: string
  startDate?: string
  endDate?: string
}): Promise<Expense[]> {
  let query = supabase
    .from('expenses')
    .select(`
      *,
      category:expense_categories(*)
    `)
    .order('date', { ascending: false })

  if (filters?.childId) {
    query = query.eq('child_id', filters.childId)
  }

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId)
  }

  if (filters?.startDate) {
    query = query.gte('date', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('date', filters.endDate)
  }

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
    .select(`
      *,
      category:expense_categories(*)
    `)
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
// АНАЛИТИКА РАСХОДОВ
// ============================================================================

export interface ExpenseStats {
  total: number
  byCategory: { categoryId: string; categoryName: string; icon: string; amount: number; percentage: number }[]
  byChild: { childId: string; amount: number; percentage: number }[]
}

export async function getExpenseStats(filters?: {
  childId?: string
  startDate?: string
  endDate?: string
}): Promise<ExpenseStats> {
  const expenses = await getExpenses(filters)

  const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0)

  // По категориям
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

  // По детям
  const childMap: { [key: string]: number } = {}
  expenses.forEach(exp => {
    if (!childMap[exp.child_id]) {
      childMap[exp.child_id] = 0
    }
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
// СЕКЦИИ
// ============================================================================

export async function getSections(childId?: string): Promise<Section[]> {
  let query = supabase
    .from('sections')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (childId) {
    query = query.eq('child_id', childId)
  }

  const { data, error } = await query

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
      is_active: true
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
  }>
): Promise<void> {
  const updateData: any = {}

  if (updates.name) updateData.name = updates.name
  if (updates.schedule !== undefined) updateData.schedule = updates.schedule
  if (updates.cost !== undefined) updateData.cost = updates.cost
  if (updates.trainer !== undefined) updateData.trainer = updates.trainer
  if (updates.address !== undefined) updateData.address = updates.address
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive

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
// ПОСЕЩЕНИЯ СЕКЦИЙ
// ============================================================================

export async function getSectionVisits(sectionId: string, startDate?: string, endDate?: string): Promise<SectionVisit[]> {
  let query = supabase
    .from('section_visits')
    .select('*')
    .eq('section_id', sectionId)
    .order('date', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

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
    }, {
      onConflict: 'section_id,date'
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getSectionsForDate(childId: string, date: string): Promise<(Section & { visit?: SectionVisit })[]> {
  // Получить все секции ребенка
  const sections = await getSections(childId)

  // Получить посещения на эту дату
  const { data: visits } = await supabase
    .from('section_visits')
    .select('*')
    .eq('date', date)
    .in('section_id', sections.map(s => s.id))

  const visitsMap: { [key: string]: SectionVisit } = {}
  visits?.forEach(v => {
    visitsMap[v.section_id] = v
  })

  return sections.map(s => ({
    ...s,
    visit: visitsMap[s.id]
  }))
}
