'use client'

import { useState, useEffect, useCallback } from 'react'
import { getRewards, addReward, updateReward, deleteReward } from '@/lib/repositories/wallet.repo'
import type { Reward } from '@/lib/models/wallet.types'
import { getChildren } from '@/lib/api'
import type { Child } from '@/lib/api'
import { useT } from '@/lib/i18n'

const STARTER_TEMPLATES = [
  { title: '+1 hour tablet time', icon: '📱', category: 'virtual', price_coins: 150, description: 'Extra hour of screen time' },
  { title: 'Pizza dinner — your choice', icon: '🍕', category: 'material', price_coins: 300, description: 'Order your favourite pizza' },
  { title: 'Movie night · your pick', icon: '🎬', category: 'experience', price_coins: 250, description: 'You choose the film tonight' },
  { title: '+30 minutes stay up', icon: '🌙', category: 'virtual', price_coins: 180, description: 'Go to bed 30 minutes later' },
  { title: 'Friend sleepover', icon: '🏕️', category: 'experience', price_coins: 500, description: 'Invite a friend to stay the night' },
  { title: 'Skip 1 chore', icon: '🎟️', category: 'virtual', price_coins: 220, description: 'Cancel one homework or chore' },
  { title: 'Burger King trip', icon: '🍔', category: 'experience', price_coins: 350, description: 'Trip to fast food' },
  { title: 'Water park with family', icon: '🏊', category: 'experience', price_coins: 1200, description: 'Day out at the water park' },
  { title: 'New Lego set', icon: '🧱', category: 'material', price_coins: 450, description: 'Buy a new Lego figure or set' },
  { title: 'New book of your choice', icon: '📚', category: 'material', price_coins: 400, description: 'Buy any book you want' },
  { title: 'Pocket money', icon: '💵', category: 'money', price_coins: 333, description: 'Spending money' },
  { title: 'Go-kart 15 min', icon: '🏎️', category: 'experience', price_coins: 800, description: 'Go-karting session' },
  { title: 'Cinema with popcorn', icon: '🍿', category: 'experience', price_coins: 600, description: 'Movie + popcorn' },
  { title: 'Bowling weekend', icon: '🎳', category: 'experience', price_coins: 700, description: 'Bowling game' },
  { title: 'Any sticker pack', icon: '✨', category: 'material', price_coins: 120, description: 'Any sticker pack you like' },
  { title: 'Sushi delivery for two', icon: '🍣', category: 'material', price_coins: 550, description: 'Order sushi' },
]

type CategoryKey = 'virtual' | 'material' | 'experience' | 'money'

interface FormData {
  icon: string; title: string; description: string
  category: CategoryKey; price_coins: number; for_child: string | null; is_active: boolean
}
const DEFAULT_FORM: FormData = { icon: '🎁', title: '', description: '', category: 'virtual', price_coins: 50, for_child: null, is_active: true }

export default function ParentShopPage() {
  const t = useT()
  const CATEGORY_LABELS: Record<CategoryKey, string> = {
    virtual: t('parentShop.categoryVirtual'),
    material: t('parentShop.categoryMaterial'),
    experience: t('parentShop.categoryExperience'),
    money: t('parentShop.categoryMoney'),
  }
  const [rewards, setRewards] = useState<Reward[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingReward, setEditingReward] = useState<Reward | null>(null)
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templatesLoaded, setTemplatesLoaded] = useState(false)

  const reloadRewards = useCallback(async () => {
    try {
      const data = await getRewards({ activeOnly: false } as Parameters<typeof getRewards>[0])
      setRewards(data)
    } catch { setError(t('parentShop.loadError')) }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([reloadRewards(), getChildren().then(setChildren)]).finally(() => setLoading(false))
  }, [reloadRewards])

  function openCreateForm() { setEditingReward(null); setFormData(DEFAULT_FORM); setFormError(null); setShowForm(true) }
  function openEditForm(r: Reward) {
    setEditingReward(r)
    setFormData({ icon: r.icon, title: r.title, description: r.description ?? '', category: (r.category as CategoryKey) ?? 'virtual', price_coins: r.price_coins ?? 50, for_child: r.for_child, is_active: r.is_active })
    setFormError(null); setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditingReward(null); setFormError(null) }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title.trim()) { setFormError(t('parentShop.nameRequired')); return }
    setFormSubmitting(true); setFormError(null)
    try {
      const payload = { icon: formData.icon, title: formData.title.trim(), description: formData.description.trim() || null, category: formData.category, reward_type: 'coins' as const, price_coins: formData.price_coins, for_child: formData.for_child, is_active: formData.is_active }
      if (editingReward) await updateReward(editingReward.id, payload)
      else await addReward(payload)
      closeForm(); await reloadRewards()
    } catch (e: any) { setFormError(t('parentShop.formError', { msg: e?.message ?? '' })) }
    finally { setFormSubmitting(false) }
  }

  async function toggleActive(r: Reward) {
    try { await updateReward(r.id, { is_active: !r.is_active }); await reloadRewards() }
    catch { setError(t('parentShop.updateError')) }
  }

  async function handleDelete(id: string) {
    try { await deleteReward(id); setDeletingId(null); await reloadRewards() }
    catch { setError(t('parentShop.deleteError')) }
  }

  async function loadStarterTemplates() {
    if (!window.confirm(t('parentShop.loadTemplatesConfirm', { count: STARTER_TEMPLATES.length }))) return
    setLoadingTemplates(true); setError(null)
    const errors: string[] = []
    for (const t of STARTER_TEMPLATES) {
      try { await addReward({ ...t, reward_type: 'coins', is_active: true, for_child: null }) }
      catch (e: any) { errors.push(t.title + ': ' + (e?.message ?? 'ошибка')) }
    }
    await reloadRewards(); setTemplatesLoaded(true)
    if (errors.length) setError(t('parentShop.notAdded') + errors.slice(0, 2).join('; '))
    setLoadingTemplates(false)
  }

  const s: React.CSSProperties = { fontFamily: 'system-ui, sans-serif' }
  const card: React.CSSProperties = { background: '#1e293b', borderRadius: 16, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }
  const inp: React.CSSProperties = { background: '#0f172a', color: '#f1f5f9', borderRadius: 10, padding: '8px 12px', border: '1px solid #334155', outline: 'none', width: '100%', fontSize: 14 }
  const btn = (bg: string, color = '#fff'): React.CSSProperties => ({ background: bg, color, borderRadius: 10, padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 })

  return (
    <div style={{ ...s, maxWidth: 700, margin: '0 auto', padding: '24px 16px', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t('parentShop.title')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn(templatesLoaded ? '#374151' : '#1e40af')} onClick={loadStarterTemplates} disabled={loadingTemplates || templatesLoaded}>
            {loadingTemplates ? t('parentShop.loadingTemplates') : templatesLoaded ? t('parentShop.templatesLoaded') : t('parentShop.loadTemplates', { count: STARTER_TEMPLATES.length })}
          </button>
          <button style={btn('#4f46e5')} onClick={openCreateForm}>+ {t('parentShop.addRewardBtn')}</button>
        </div>
      </div>

      {error && <div style={{ background: '#450a0a', color: '#fca5a5', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>{error} <button onClick={() => setError(null)} style={{ marginLeft: 8, color: '#fca5a5', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>{t('common.close')}</button></div>}

      {showForm && (
        <div style={{ background: '#1e293b', borderRadius: 18, padding: 20, marginBottom: 20, border: '1px solid #334155' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>{editingReward ? t('parentShop.editReward') : t('parentShop.newReward')}</h2>
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <input style={{ ...inp, width: 60, textAlign: 'center', fontSize: 22 }} value={formData.icon} onChange={e => setFormData(f => ({ ...f, icon: e.target.value }))} maxLength={4}/>
              <input style={{ ...inp, flex: 1 }} placeholder={t('parentShop.namePlaceholder')} value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} required maxLength={60}/>
            </div>
            <input style={inp} placeholder={t('parentShop.descriptionPlaceholder')} value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}/>
            <div style={{ display: 'flex', gap: 12 }}>
              <select style={{ ...inp, flex: 1 }} value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value as CategoryKey }))}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input style={{ ...inp, width: 100 }} type="number" min={1} value={formData.price_coins} onChange={e => setFormData(f => ({ ...f, price_coins: parseInt(e.target.value) || 1 }))} placeholder={t('parentShop.pricePlaceholder')}/>
              <select style={{ ...inp, flex: 1 }} value={formData.for_child ?? ''} onChange={e => setFormData(f => ({ ...f, for_child: e.target.value || null }))}>
                <option value="">{t('parentShop.forAll')}</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {formError && <div style={{ color: '#fca5a5', fontSize: 13 }}>{formError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" style={btn('#4f46e5')} disabled={formSubmitting}>{formSubmitting ? t('parentShop.saving') : editingReward ? t('parentShop.saveReward') : t('parentShop.addRewardBtn')}</button>
              <button type="button" style={btn('#374151')} onClick={closeForm}>{t('parentShop.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>{t('parentShop.loading')}</div>
      ) : rewards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <div style={{ fontSize: 40 }}>🛍️</div>
          <div style={{ marginTop: 12 }}>{t('parentShop.emptyShop')}</div>
        </div>
      ) : (
        rewards.map(r => (
          <div key={r.id} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <span style={{ fontSize: 24 }}>{r.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  {r.price_coins}🪙 · {CATEGORY_LABELS[r.category as CategoryKey] ?? r.category}
                  {r.for_child && ' · ' + (children.find(c => c.id === r.for_child)?.name ?? r.for_child)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
              <button style={btn(r.is_active ? '#14532d' : '#374151', r.is_active ? '#86efac' : '#94a3b8')} onClick={() => toggleActive(r)}>{r.is_active ? t('parentShop.activeStatus') : t('parentShop.hiddenStatus')}</button>
              <button style={{ ...btn('#1e293b', '#94a3b8'), padding: '6px 10px' }} onClick={() => openEditForm(r)}>✏️</button>
              {deletingId === r.id ? (
                <>
                  <button style={btn('#7f1d1d', '#fca5a5')} onClick={() => handleDelete(r.id)}>{t('parentShop.yes')}</button>
                  <button style={btn('#374151')} onClick={() => setDeletingId(null)}>{t('parentShop.no')}</button>
                </>
              ) : (
                <button style={{ ...btn('#1e293b', '#f87171'), padding: '6px 10px' }} onClick={() => setDeletingId(r.id)}>🗑️</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
