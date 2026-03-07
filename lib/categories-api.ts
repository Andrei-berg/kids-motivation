// lib/categories-api.ts
// CRUD operations for categories and tasks (family-scoped, multi-tenant).
// Use createClient() from lib/supabase/client.ts — NOT the legacy lib/supabase.ts.
// All functions accept familyId as explicit parameter (not from legacy store).
// 'use client' is NOT added here — this is a plain module, safe for both client and server imports.

import { createClient } from '@/lib/supabase/client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Category {
  id: string
  family_id: string
  name: string
  icon: string
  color: string | null
  type: 'study' | 'home' | 'sport' | 'routine' | 'custom'
  is_active: boolean
  is_default: boolean
  sort_order: number
  created_at: string
}

export interface Task {
  id: string
  family_id: string
  category_id: string
  child_member_id: string | null  // null = applies to all children
  title: string
  description: string | null
  coins_reward: number
  coins_penalty: number
  is_required: boolean
  is_active: boolean
  reminder_time: string | null    // HH:MM:SS format, e.g. "07:30:00"
  notification_text: string | null  // custom push text; null = use default template
  monthly_cap: number | null      // null = no cap; grade tasks always null
  sort_order: number
  created_at: string
}

// ---------------------------------------------------------------------------
// Categories CRUD
// ---------------------------------------------------------------------------

export async function getCategories(familyId: string): Promise<Category[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('family_id', familyId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`getCategories: ${error.message}`)
  return data ?? []
}

export async function createCategory(
  familyId: string,
  fields: Pick<Category, 'name' | 'icon' | 'type'> & { color?: string }
): Promise<Category> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('categories')
    .insert({ family_id: familyId, ...fields, is_default: false, is_active: true })
    .select()
    .single()
  if (error) throw new Error(`createCategory: ${error.message}`)
  return data
}

export async function updateCategory(
  categoryId: string,
  fields: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'sort_order'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('categories')
    .update(fields)
    .eq('id', categoryId)
  if (error) throw new Error(`updateCategory: ${error.message}`)
}

export async function toggleCategory(categoryId: string, isActive: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('categories')
    .update({ is_active: isActive })
    .eq('id', categoryId)
  if (error) throw new Error(`toggleCategory: ${error.message}`)
}

export async function deleteCategory(categoryId: string): Promise<void> {
  // Cascade: tasks referencing this category are deleted automatically (ON DELETE CASCADE)
  const supabase = createClient()
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
  if (error) throw new Error(`deleteCategory: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Tasks CRUD
// ---------------------------------------------------------------------------

export async function getTasks(familyId: string, categoryId: string): Promise<Task[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('family_id', familyId)
    .eq('category_id', categoryId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(`getTasks: ${error.message}`)
  return data ?? []
}

export async function createTask(
  familyId: string,
  fields: Pick<Task, 'category_id' | 'title'> & Partial<Omit<Task, 'id' | 'family_id' | 'category_id' | 'title' | 'created_at'>>
): Promise<Task> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      family_id: familyId,
      coins_reward: 0,
      coins_penalty: 0,
      is_required: false,
      is_active: true,
      ...fields,
    })
    .select()
    .single()
  if (error) throw new Error(`createTask: ${error.message}`)
  return data
}

export async function updateTask(
  taskId: string,
  fields: Partial<Omit<Task, 'id' | 'family_id' | 'category_id' | 'created_at'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .update(fields)
    .eq('id', taskId)
  if (error) throw new Error(`updateTask: ${error.message}`)
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)
  if (error) throw new Error(`deleteTask: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Default categories seeding (called after createFamily)
// ---------------------------------------------------------------------------

export async function seedDefaultCategories(familyId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('seed_default_categories', {
    p_family_id: familyId,
  })
  if (error) throw new Error(`seedDefaultCategories: ${error.message}`)
}
