// lib/categories-api.ts — thin re-export wrapper
// Implementations live in lib/repositories/categories.repo.ts.
// This file preserves all existing import paths for backward compat.

export type { Category, Task } from './models/category.types'

export {
  getCategories,
  createCategory,
  updateCategory,
  toggleCategory,
  deleteCategory,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  seedDefaultCategories,
} from './repositories/categories.repo'
