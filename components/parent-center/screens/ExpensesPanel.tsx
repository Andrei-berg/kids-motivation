'use client'

import { useState, useEffect, useCallback } from 'react'
import { T } from '../tokens'
import { Card, Btn, Pill, Field, Toggle, Icon, SectionH } from '../ui'
import { createClient } from '@/lib/supabase/client'
import {
  getExpenses, addExpense, updateExpense, deleteExpense,
  getAllExpenseCategories, addExpenseCategory, toggleCategoryActive, deleteExpenseCategory,
} from '@/lib/expenses-api'
import type { Expense, ExpenseCategory } from '@/lib/models/expense.types'
import { localDateString } from '@/utils/helpers'

type Kid = { id: string; name: string }

const fmt = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₽`

export default function ExpensesPanel({ lockedChildId, kids }: { lockedChildId?: string; kids: Kid[] }) {
  const [childFilter, setChildFilter] = useState<string>(lockedChildId ?? 'all')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'categories'>('list')
  const [createdBy, setCreatedBy] = useState('parent')
  const [error, setError] = useState<string | null>(null)

  // Add/edit expense form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const blankForm = { title: '', amount: '', categoryId: '', date: localDateString(), note: '', childId: lockedChildId ?? (kids[0]?.id ?? '') }
  const [form, setForm] = useState(blankForm)
  const [saving, setSaving] = useState(false)

  // Category form
  const [catName, setCatName] = useState('')
  const [catIcon, setCatIcon] = useState('💸')

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => { if (data.user) setCreatedBy(data.user.id) })
  }, [])

  const reload = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const filters = childFilter === 'all' ? {} : { childId: childFilter }
      const [exp, cats] = await Promise.all([getExpenses(filters), getAllExpenseCategories()])
      setExpenses(exp); setCategories(cats)
    } catch (e: any) {
      setError(e?.message ?? 'Ошибка загрузки')
    } finally { setLoading(false) }
  }, [childFilter])

  useEffect(() => { reload() }, [reload])

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const byCategory = (() => {
    const m = new Map<string, { name: string; icon: string; amount: number }>()
    for (const e of expenses) {
      const id = e.category?.id ?? 'none'
      const cur = m.get(id) ?? { name: e.category?.name ?? 'Без категории', icon: e.category?.icon ?? '•', amount: 0 }
      cur.amount += Number(e.amount); m.set(id, cur)
    }
    return Array.from(m.values()).sort((a, b) => b.amount - a.amount)
  })()
  const activeCategories = categories.filter(c => c.is_active)
  const kidName = (id: string) => kids.find(k => k.id === id)?.name ?? id

  function openAdd() {
    setEditingId(null)
    setForm({ ...blankForm, categoryId: activeCategories[0]?.id ?? '', childId: lockedChildId ?? (kids[0]?.id ?? '') })
    setShowForm(true)
  }
  function openEdit(e: Expense) {
    setEditingId(e.id)
    setForm({ title: e.title, amount: String(e.amount), categoryId: e.category_id, date: e.date, note: e.note ?? '', childId: e.child_id })
    setShowForm(true)
  }

  async function saveExpense() {
    if (!form.title.trim() || !form.amount || Number(form.amount) <= 0 || !form.categoryId || !form.childId) {
      setError('Заполните название, сумму, категорию и ребёнка'); return
    }
    setSaving(true); setError(null)
    try {
      if (editingId) {
        await updateExpense(editingId, {
          title: form.title.trim(), amount: Number(form.amount), categoryId: form.categoryId,
          date: form.date, note: form.note.trim(),
        })
      } else {
        await addExpense({
          childId: form.childId, title: form.title.trim(), amount: Number(form.amount),
          categoryId: form.categoryId, date: form.date, note: form.note.trim() || undefined, createdBy,
        })
      }
      setShowForm(false); await reload()
    } catch (e: any) {
      setError(e?.message ?? 'Не удалось сохранить')
    } finally { setSaving(false) }
  }

  async function removeExpense(id: string) {
    try { await deleteExpense(id); await reload() } catch (e: any) { setError(e?.message ?? 'Ошибка удаления') }
  }

  async function addCat() {
    if (!catName.trim()) return
    try { await addExpenseCategory(catName.trim(), catIcon || '💸'); setCatName(''); setCatIcon('💸'); await reload() }
    catch (e: any) { setError(e?.message ?? 'Ошибка') }
  }

  const inputBg: React.CSSProperties = { background: T.bg1, color: T.text, borderRadius: 8, padding: '9px 11px', border: `1px solid ${T.cardBorder}`, outline: 'none', width: '100%', fontSize: 14, fontFamily: T.fBody, boxSizing: 'border-box' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* View switch + child filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn variant={view === 'list' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('list')}>Расходы</Btn>
          <Btn variant={view === 'categories' ? 'primary' : 'ghost'} size="sm" onClick={() => setView('categories')}>Категории</Btn>
        </div>
        {view === 'list' && !lockedChildId && kids.length > 0 && (
          <select value={childFilter} onChange={e => setChildFilter(e.target.value)}
            style={{ ...inputBg, width: 'auto', marginLeft: 'auto' }}>
            <option value="all">Все дети</option>
            {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        )}
      </div>

      {error && <Card pad={10} style={{ color: T.danger, fontSize: 13 }}>{error}</Card>}

      {view === 'list' && (
        <>
          {/* Total + by category */}
          <Card pad={14}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Потрачено{childFilter !== 'all' ? ` на ${kidName(childFilter)}` : ' (вся семья)'}
            </div>
            <div style={{ fontFamily: T.fMono, fontSize: 28, fontWeight: 700, color: T.text, margin: '4px 0 12px' }}>{fmt(total)}</div>
            {byCategory.map(c => (
              <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span style={{ flex: 1, fontSize: 13, color: T.text }}>{c.name}</span>
                <span style={{ fontSize: 11, color: T.muted, fontFamily: T.fMono }}>{total > 0 ? Math.round(c.amount / total * 100) : 0}%</span>
                <span style={{ fontFamily: T.fMono, fontSize: 13, fontWeight: 600, color: T.text, minWidth: 80, textAlign: 'right' }}>{fmt(c.amount)}</span>
              </div>
            ))}
            {byCategory.length === 0 && !loading && <div style={{ color: T.muted, fontSize: 13, padding: '6px 0' }}>Расходов пока нет</div>}
          </Card>

          <Btn variant="primary" size="md" icon="plus" full onClick={openAdd} disabled={activeCategories.length === 0}>
            {activeCategories.length === 0 ? 'Сначала добавьте категорию' : 'Добавить расход'}
          </Btn>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {expenses.map(e => (
              <Card key={e.id} pad={12} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{e.category?.icon ?? '💸'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{e.title}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                    {e.category?.name ?? '—'} · {e.date}{!lockedChildId ? ` · ${kidName(e.child_id)}` : ''}{e.is_recurring ? ' · ♻️' : ''}
                  </div>
                </div>
                <span style={{ fontFamily: T.fMono, fontSize: 14, fontWeight: 700, color: T.text }}>{fmt(Number(e.amount))}</span>
                <button onClick={() => openEdit(e)} style={iconBtn}><Icon name="edit" size={14}/></button>
                <button onClick={() => removeExpense(e.id)} style={iconBtn}><Icon name="trash" size={14}/></button>
              </Card>
            ))}
            {loading && <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: 12 }}>Загрузка…</div>}
          </div>
        </>
      )}

      {view === 'categories' && (
        <>
          <SectionH title="Категории расходов" sub="Нужны, чтобы заводить расходы"/>
          <Card pad={12} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <input value={catIcon} onChange={e => setCatIcon(e.target.value.slice(0, 2))} style={{ ...inputBg, width: 52, textAlign: 'center', fontSize: 18 }} aria-label="emoji"/>
            <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Название категории" style={inputBg}/>
            <Btn variant="primary" size="md" icon="plus" onClick={addCat}>Добавить</Btn>
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.map(c => (
              <Card key={c.id} pad={12} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: c.is_active ? 1 : 0.5 }}>
                <span style={{ fontSize: 20 }}>{c.icon}</span>
                <span style={{ flex: 1, fontSize: 14, color: T.text, fontWeight: 600 }}>{c.name}</span>
                <span style={{ fontSize: 11, color: T.muted }}>{c.is_active ? 'активна' : 'скрыта'}</span>
                <Toggle on={c.is_active} onChange={async (v) => { await toggleCategoryActive(c.id, v); await reload() }}/>
                <button onClick={async () => { try { await deleteExpenseCategory(c.id); await reload() } catch (e: any) { setError(e?.message ?? 'Нельзя удалить: есть расходы') } }} style={iconBtn}><Icon name="trash" size={14}/></button>
              </Card>
            ))}
            {categories.length === 0 && !loading && <Card pad={16} style={{ textAlign: 'center', color: T.muted, fontSize: 13 }}>Категорий пока нет</Card>}
          </div>
        </>
      )}

      {/* Add/edit modal */}
      {showForm && (
        <div onClick={() => !saving && setShowForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.bg1, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{editingId ? 'Изменить расход' : 'Новый расход'}</div>
            <Field label="Название" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="Напр. Секция борьбы"/>
            <Field label="Сумма" value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v.replace(/[^\d.]/g, '') }))} type="text" suffix="₽" mono/>
            {!lockedChildId && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ребёнок</span>
                <select value={form.childId} onChange={e => setForm(f => ({ ...f, childId: e.target.value }))} style={inputBg}>
                  {kids.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
              </label>
            )}
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Категория</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {activeCategories.map(c => (
                  <button key={c.id} onClick={() => setForm(f => ({ ...f, categoryId: c.id }))}
                    style={{ ...inputBg, width: 'auto', cursor: 'pointer', border: `1px solid ${form.categoryId === c.id ? T.indigo : T.cardBorder}`, background: form.categoryId === c.id ? T.indigoSoft : T.bg1 }}>
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Дата" value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} type="date"/>
            <Field label="Заметка" value={form.note} onChange={v => setForm(f => ({ ...f, note: v }))} placeholder="необязательно"/>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Btn variant="ghost" size="md" full onClick={() => setShowForm(false)} disabled={saving}>Отмена</Btn>
              <Btn variant="primary" size="md" full onClick={saveExpense} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить'}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 8, background: T.cardHi, border: `1px solid ${T.cardBorder}`,
  color: T.textDim, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}
