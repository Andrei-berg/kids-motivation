// lib/expenses-api.ts — thin re-export wrapper
// Implementations live in lib/repositories/expenses.repo.ts.
// This file preserves all existing import paths for backward compat.

export type {
  ExpenseCategory,
  Expense,
  Section,
  SectionVisit,
  ExpenseStats,
} from './models/expense.types'

export {
  getExpenseCategories,
  getAllExpenseCategories,
  addExpenseCategory,
  toggleCategoryActive,
  deleteExpenseCategory,
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenseStats,
  getSections,
  addSection,
  updateSection,
  deleteSection,
  getSectionVisits,
  markSectionVisit,
  getSectionsForDate,
} from './repositories/expenses.repo'
