'use client'

import { useState, useCallback, useEffect } from 'react'
import { T } from '../tokens'
import { Card, Btn, Pill, Avatar, Bar, Coin, Icon, Tabs, SectionH } from '../ui'
import type { ParentChild } from '../types'
import type { RewardPurchase, Reward } from '@/lib/models/wallet.types'
import { getRewards, addReward, updateReward, deleteReward } from '@/lib/repositories/wallet.repo'

// ═══════════ CHILDREN ═══════════
export function ChildrenScreen({ children, onOpenChild }: {
  children: ParentChild[]
  onOpenChild: (id: string) => void
}) {
  return (
    <div style={{ padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>Children</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>Full profiles, stats, and settings per child</p>
      </div>

      {children.map(c => (
        <Card key={c.id} pad={16} hover onClick={() => onOpenChild(c.id)}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
            <Avatar child={c} size={56}/>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontFamily: T.fHead, fontSize: 18, fontWeight: 600, color: T.text }}>{c.name}</h3>
                <Pill tone="indigo">LVL {c.level}</Pill>
                <Pill tone="warn">🔥 {c.streak}d</Pill>
              </div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{c.age} years · Mode {c.mode} independence</div>
            </div>
            <Icon name="chevR" size={18} color={T.muted}/>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.muted, marginBottom: 5, fontFamily: T.fMono }}>
              <span>LVL {c.level}</span><span>{c.xp}/100 XP</span>
            </div>
            <Bar pct={c.xp} color={c.accent}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Balance', value: c.balance.toLocaleString(), unit: '🪙' },
              { label: 'Streak', value: c.streak, unit: 'days' },
              { label: 'Badges', value: c.badges, unit: 'earned' },
              { label: 'Today', value: c.todayPct + '%', unit: 'done' },
            ].map(s => (
              <div key={s.label} style={{ background: T.bg1, borderRadius: T.r, padding: 10, border: `1px solid ${T.cardBorder}` }}>
                <div style={{ fontSize: 9, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                <div style={{ fontFamily: T.fMono, fontWeight: 600, fontSize: 15, color: T.text, marginTop: 3 }}>{s.value}</div>
                <div style={{ fontSize: 10, color: T.faint, marginTop: 1 }}>{s.unit}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14, padding: 12, background: T.bg1, borderRadius: T.r, border: `1px solid ${T.cardBorder}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: T.textDim, fontWeight: 600 }}>🎯 Goal: {c.goal.title}</div>
              <div style={{ fontFamily: T.fMono, fontSize: 12, color: T.text, fontWeight: 600 }}>
                {c.goal.saved}<span style={{ color: T.muted }}>/{c.goal.target}</span>
              </div>
            </div>
            <Bar pct={(c.goal.saved / c.goal.target) * 100} color={T.cyan}/>
          </div>
        </Card>
      ))}

      <Btn variant="ghost" size="lg" icon="plus" full onClick={() => window.location.href = '/register'}>Add child</Btn>
    </div>
  )
}

// ═══════════ TASKS ═══════════
const MOCK_TASKS = [
  { id: 't1', title: 'Make bed', coins: 2, cat: 'chore', who: 'both', freq: 'Daily' },
  { id: 't2', title: 'Homework done', coins: 5, cat: 'study', who: 'both', freq: 'Daily' },
  { id: 't3', title: 'Room cleaned', coins: 3, cat: 'chore', who: 'both', freq: 'Daily' },
  { id: 't4', title: '30 min exercise', coins: 5, cat: 'sport', who: 'both', freq: 'Daily' },
  { id: 't5', title: 'Read 20 pages', coins: 3, cat: 'study', who: 'both', freq: 'Daily' },
  { id: 't6', title: 'Brush teeth (PM)', coins: 1, cat: 'behavior', who: 'both', freq: 'Daily' },
]
const MOCK_CHALLENGES = [
  { id: 'c1', title: '3 A-grades this week', reward: 200, progress: 2, total: 3, expires: 'Sun' },
  { id: 'c2', title: 'Month without Grade 2', reward: 500, progress: 18, total: 30, expires: 'Apr 30' },
  { id: 'c3', title: '5-day exercise streak', reward: 150, progress: 3, total: 5, expires: 'Fri' },
]

export function TasksScreen() {
  const [tab, setTab] = useState('daily')
  const catColor: Record<string, string> = { chore: T.cyan, study: T.indigo, sport: T.success, behavior: T.warning }
  const catEmoji: Record<string, string> = { chore: '🧹', study: '📚', sport: '🏃', behavior: '⭐' }

  return (
    <div style={{ padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>Tasks</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>Daily tasks, weekly & special challenges</p>
        </div>
        <Btn variant="primary" size="md" icon="plus">New</Btn>
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'daily', label: 'Daily', icon: '📋' },
        { id: 'weekly', label: 'Challenges', icon: '🏆' },
        { id: 'templates', label: 'Templates', icon: '📂' },
      ]}/>

      {tab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MOCK_TASKS.map(t => (
            <Card key={t.id} pad={14} hover style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: T.r,
                background: `${catColor[t.cat]}18`, border: `1px solid ${catColor[t.cat]}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>{catEmoji[t.cat]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{t.title}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                  <Pill>{t.freq}</Pill>
                  <Pill tone="indigo">All children</Pill>
                </div>
              </div>
              <Coin v={t.coins}/>
              <button style={{ background: 'transparent', border: 'none', color: T.muted, cursor: 'pointer', padding: 6 }}>
                <Icon name="dots" size={18}/>
              </button>
            </Card>
          ))}
        </div>
      )}

      {tab === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {MOCK_CHALLENGES.map(ch => {
            const pct = (ch.progress / ch.total) * 100
            return (
              <Card key={ch.id} pad={16} style={{
                background: pct >= 100 ? `linear-gradient(135deg, ${T.successSoft}, ${T.card})` : T.card,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{ch.title}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>Expires {ch.expires}</div>
                  </div>
                  <Coin v={ch.reward} big/>
                </div>
                <Bar pct={pct} color={pct >= 100 ? T.success : T.indigo}/>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 6, fontFamily: T.fMono, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{ch.progress} of {ch.total}</span><span>{Math.round(pct)}%</span>
                </div>
              </Card>
            )
          })}
          <Btn variant="ghost" size="md" icon="plus" full>New challenge</Btn>
        </div>
      )}

      {tab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {[
            { n: 'Chores', icon: '🧹', count: 8, color: T.cyan },
            { n: 'Homework', icon: '📚', count: 12, color: T.indigo },
            { n: 'Sports', icon: '🏃', count: 6, color: T.success },
            { n: 'Behavior', icon: '⭐', count: 5, color: T.warning },
          ].map(t => (
            <Card key={t.n} pad={14} hover>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{t.n}</div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.fMono, marginTop: 2 }}>{t.count} templates</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════ SHOP TEMPLATES ═══════════
const REWARD_TEMPLATES = [
  { title: '+1 час планшета', icon: '📱', category: 'virtual', price_coins: 150, description: 'Дополнительный час экранного времени' },
  { title: 'Пицца — твой выбор', icon: '🍕', category: 'material', price_coins: 300, description: 'Заказать любую пиццу' },
  { title: 'Кино — ты выбираешь', icon: '🎬', category: 'experience', price_coins: 250, description: 'Сам выбираешь фильм вечером' },
  { title: '+30 мин не спать', icon: '🌙', category: 'virtual', price_coins: 180, description: 'Лечь спать на 30 минут позже' },
  { title: 'Друг ночевать', icon: '🏕️', category: 'experience', price_coins: 500, description: 'Позвать друга ночевать' },
  { title: 'Пропустить 1 дело', icon: '🎟️', category: 'virtual', price_coins: 220, description: 'Отменить одно домашнее дело' },
  { title: 'Burger King', icon: '🍔', category: 'experience', price_coins: 350, description: 'Поход в фастфуд' },
  { title: 'Аквапарк всей семьёй', icon: '🏊', category: 'experience', price_coins: 1200, description: 'День в аквапарке' },
  { title: 'Новый Lego', icon: '🧱', category: 'material', price_coins: 450, description: 'Купить новый набор Lego' },
  { title: 'Книга по выбору', icon: '📚', category: 'material', price_coins: 400, description: 'Купить любую книгу' },
  { title: 'Карманные деньги', icon: '💵', category: 'money', price_coins: 333, description: 'Деньги на карманные расходы' },
  { title: 'Картинг 15 мин', icon: '🏎️', category: 'experience', price_coins: 800, description: 'Сессия картинга' },
  { title: 'Кино с попкорном', icon: '🍿', category: 'experience', price_coins: 600, description: 'Фильм + попкорн' },
  { title: 'Боулинг', icon: '🎳', category: 'experience', price_coins: 700, description: 'Игра в боулинг' },
  { title: 'Суши на двоих', icon: '🍣', category: 'material', price_coins: 550, description: 'Заказать суши' },
]

const STICKER_TEMPLATES = [
  { title: 'Minecraft стикеры', icon: '⛏️', category: 'material', price_coins: 100, description: 'Набор стикеров Minecraft' },
  { title: 'Roblox стикеры', icon: '🎮', category: 'material', price_coins: 100, description: 'Набор стикеров Roblox' },
  { title: 'Футбол стикеры', icon: '⚽', category: 'material', price_coins: 80, description: 'Стикеры футбольных клубов и игроков' },
  { title: 'Животные стикеры', icon: '🐾', category: 'material', price_coins: 80, description: 'Милые животные — котики, собачки' },
  { title: 'Супергерои стикеры', icon: '🦸', category: 'material', price_coins: 120, description: 'Marvel или DC стикеры' },
  { title: 'Аниме стикеры', icon: '🌸', category: 'material', price_coins: 100, description: 'Стикеры в стиле аниме' },
  { title: 'Космос стикеры', icon: '🚀', category: 'material', price_coins: 90, description: 'Планеты, ракеты, астронавты' },
  { title: 'Динозавры стикеры', icon: '🦕', category: 'material', price_coins: 90, description: 'Стикеры с динозаврами' },
  { title: 'Among Us стикеры', icon: '🟥', category: 'material', price_coins: 100, description: 'Стикеры Among Us' },
  { title: 'Poppy Playtime стикеры', icon: '🧸', category: 'material', price_coins: 110, description: 'Хагги Вагги и друзья' },
  { title: 'Машинки стикеры', icon: '🚗', category: 'material', price_coins: 80, description: 'Гоночные машины и авто' },
  { title: 'Emoji стикеры большие', icon: '😎', category: 'material', price_coins: 70, description: 'Большой набор смайлов' },
  { title: 'Звёздные войны стикеры', icon: '⚔️', category: 'material', price_coins: 120, description: 'Стикеры Звёздных войн' },
  { title: 'Покемон стикеры', icon: '⚡', category: 'material', price_coins: 110, description: 'Пикачу и другие покемоны' },
  { title: 'Спортивные наклейки', icon: '🏆', category: 'material', price_coins: 90, description: 'Баскетбол, теннис, плавание' },
  { title: 'Глиттер стикеры', icon: '✨', category: 'material', price_coins: 130, description: 'Блестящие голографические стикеры' },
  { title: 'Пираты стикеры', icon: '🏴‍☠️', category: 'material', price_coins: 85, description: 'Пиратская тематика' },
  { title: 'Monsterverse стикеры', icon: '🦖', category: 'material', price_coins: 100, description: 'Годзилла и монстры' },
  { title: 'Гарри Поттер стикеры', icon: '🧙', category: 'material', price_coins: 110, description: 'Волшебный мир Гарри Поттера' },
  { title: 'Ninja стикеры', icon: '🥷', category: 'material', price_coins: 90, description: 'Ниндзя и восточные мотивы' },
]

type CategoryKey = 'virtual' | 'material' | 'experience' | 'money'
const CATEGORY_LABELS: Record<CategoryKey, string> = { virtual: 'Виртуальное', material: 'Вещь', experience: 'Впечатление', money: 'Деньги' }

interface RewardForm {
  icon: string; title: string; description: string
  category: CategoryKey; price_coins: number; is_active: boolean
}
const DEFAULT_FORM: RewardForm = { icon: '🎁', title: '', description: '', category: 'material', price_coins: 100, is_active: true }

// ═══════════ SHOP ═══════════
export function ShopScreen({ pending, onApprove, onDecline, children = [] }: {
  pending: RewardPurchase[]
  rewards?: Reward[]  // kept for backwards compat but not used — ShopScreen manages own state
  onApprove: (p: RewardPurchase) => void
  onDecline: (p: RewardPurchase) => void
  children?: ParentChild[]
}) {
  const [tab, setTab] = useState('items')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [loadingRewards, setLoadingRewards] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RewardForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loadingTpl, setLoadingTpl] = useState(false)
  const [loadingStk, setLoadingStk] = useState(false)
  const [tplLoaded, setTplLoaded] = useState(false)
  const [stkLoaded, setStkLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const data = await getRewards({ activeOnly: false })
      setRewards(data)
    } catch { setError('Ошибка загрузки') } finally { setLoadingRewards(false) }
  }, [])

  useEffect(() => { reload() }, [reload])

  function openAdd() { setEditingId(null); setForm(DEFAULT_FORM); setShowForm(true) }
  function openEdit(r: Reward) {
    setEditingId(r.id)
    setForm({ icon: r.icon, title: r.title, description: r.description ?? '', category: (r.category as CategoryKey) ?? 'material', price_coins: r.price_coins ?? 100, is_active: r.is_active })
    setShowForm(true)
  }
  function closeForm() { setShowForm(false); setEditingId(null) }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const payload = { icon: form.icon, title: form.title.trim(), description: form.description.trim() || null, category: form.category, reward_type: 'coins' as const, price_coins: form.price_coins, is_active: form.is_active, for_child: null }
      if (editingId) await updateReward(editingId, payload)
      else await addReward(payload)
      closeForm(); await reload()
    } catch (e: any) { setError(e?.message ?? 'Ошибка') } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try { await deleteReward(id); setDeletingId(null); await reload() }
    catch (e: any) { setError(e?.message ?? 'Ошибка удаления') }
  }

  async function toggleActive(r: Reward) {
    try { await updateReward(r.id, { is_active: !r.is_active }); await reload() }
    catch (e: any) { setError(e?.message ?? 'Ошибка') }
  }

  async function loadTemplates(list: typeof REWARD_TEMPLATES, onDone: () => void, setLoading: (v: boolean) => void) {
    setLoading(true); setError(null)
    for (const item of list) {
      try { await addReward({ ...item, reward_type: 'coins', is_active: true, for_child: null }) }
      catch { /* skip duplicates */ }
    }
    await reload(); onDone(); setLoading(false)
  }

  const inp: React.CSSProperties = { background: T.bg1, color: T.text, borderRadius: 8, padding: '7px 10px', border: `1px solid ${T.cardBorder}`, outline: 'none', width: '100%', fontSize: 13, fontFamily: T.fBody }

  const stickerRewards = rewards.filter(r => r.title.toLowerCase().includes('стикер') || r.title.toLowerCase().includes('sticker'))
  const otherRewards = rewards.filter(r => !stickerRewards.some(s => s.id === r.id))
  const displayRewards = tab === 'stickers' ? stickerRewards : otherRewards

  return (
    <div style={{ padding: '20px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>Reward Shop</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>{rewards.length} rewards · {stickerRewards.length} stickers</p>
        </div>
        <Btn variant="primary" size="md" icon="plus" onClick={openAdd}>Add</Btn>
      </div>

      {error && (
        <div style={{ background: T.dangerSoft, border: `1px solid ${T.danger}44`, borderRadius: T.r, padding: '8px 12px', fontSize: 12, color: T.danger, display: 'flex', justifyContent: 'space-between' }}>
          {error} <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: T.danger, cursor: 'pointer', fontSize: 12 }}>✕</button>
        </div>
      )}

      {/* Template buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => loadTemplates(STICKER_TEMPLATES, () => setStkLoaded(true), setLoadingStk)}
          disabled={loadingStk || stkLoaded}
          style={{ height: 30, padding: '0 12px', borderRadius: T.rPill, border: `1px solid ${T.cardBorder}`, background: stkLoaded ? T.successSoft : T.bg1, color: stkLoaded ? T.success : T.textDim, fontSize: 12, fontWeight: 700, cursor: stkLoaded || loadingStk ? 'default' : 'pointer', fontFamily: T.fBody }}
        >
          {loadingStk ? '⏳' : stkLoaded ? '✓ Стикеры добавлены' : `🎯 + Стикеры (${STICKER_TEMPLATES.length})`}
        </button>
        <button
          onClick={() => loadTemplates(REWARD_TEMPLATES, () => setTplLoaded(true), setLoadingTpl)}
          disabled={loadingTpl || tplLoaded}
          style={{ height: 30, padding: '0 12px', borderRadius: T.rPill, border: `1px solid ${T.cardBorder}`, background: tplLoaded ? T.successSoft : T.bg1, color: tplLoaded ? T.success : T.textDim, fontSize: 12, fontWeight: 700, cursor: tplLoaded || loadingTpl ? 'default' : 'pointer', fontFamily: T.fBody }}
        >
          {loadingTpl ? '⏳' : tplLoaded ? '✓ Шаблоны добавлены' : `📦 + Шаблоны (${REWARD_TEMPLATES.length})`}
        </button>
      </div>

      {/* Inline add/edit form */}
      {showForm && (
        <Card pad={16} style={{ border: `1px solid ${T.indigo}44` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>{editingId ? 'Редактировать награду' : 'Новая награда'}</div>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...inp, width: 52, textAlign: 'center', fontSize: 20 }} value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} maxLength={4}/>
              <input style={{ ...inp, flex: 1 }} placeholder="Название" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required maxLength={60}/>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select style={{ ...inp, flex: 1 }} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as CategoryKey }))}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input style={{ ...inp, width: 90 }} type="number" min={1} value={form.price_coins} onChange={e => setForm(f => ({ ...f, price_coins: parseInt(e.target.value) || 1 }))} placeholder="Монеты"/>
            </div>
            <input style={inp} placeholder="Описание (опционально)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{ height: 28, padding: '0 14px', borderRadius: 8, border: 'none', background: T.indigo, color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: T.fBody }}>{saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Добавить'}</button>
              <button type="button" onClick={closeForm} style={{ height: 28, padding: '0 14px', borderRadius: 8, border: `1px solid ${T.cardBorder}`, background: 'transparent', color: T.muted, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.fBody }}>Отмена</button>
            </div>
          </form>
        </Card>
      )}

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'items', label: 'Награды', icon: '🛒' },
        { id: 'stickers', label: `Стикеры (${stickerRewards.length})`, icon: '🎯' },
        { id: 'queue', label: `Очередь (${pending.length})`, icon: '⏳' },
      ]}/>

      {(tab === 'items' || tab === 'stickers') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loadingRewards && <div style={{ color: T.muted, fontSize: 13, textAlign: 'center', padding: 20 }}>Загрузка...</div>}
          {!loadingRewards && displayRewards.length === 0 && (
            <Card pad={24} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{tab === 'stickers' ? '🎯' : '🛒'}</div>
              <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>
                {tab === 'stickers' ? 'Нет стикеров — нажми "+ Стикеры" выше' : 'Нет наград'}
              </div>
            </Card>
          )}
          {displayRewards.map(r => (
            <Card key={r.id} pad={12} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: T.r, background: T.bg1, border: `1px solid ${T.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{r.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2, fontFamily: T.fMono }}>{r.price_coins}🪙 · {CATEGORY_LABELS[r.category as CategoryKey] ?? r.category}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                <button
                  onClick={() => toggleActive(r)}
                  style={{ height: 22, padding: '0 8px', borderRadius: T.rPill, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, background: r.is_active ? T.successSoft : T.bg1, color: r.is_active ? T.success : T.muted }}
                >{r.is_active ? '● активна' : '○ скрыта'}</button>
                <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>✏️</button>
                {deletingId === r.id ? (
                  <>
                    <button onClick={() => handleDelete(r.id)} style={{ background: T.dangerSoft, border: 'none', color: T.danger, cursor: 'pointer', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700 }}>Да</button>
                    <button onClick={() => setDeletingId(null)} style={{ background: T.bg1, border: 'none', color: T.muted, cursor: 'pointer', borderRadius: 6, padding: '3px 8px', fontSize: 11 }}>Нет</button>
                  </>
                ) : (
                  <button onClick={() => setDeletingId(r.id)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>🗑️</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'queue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pending.map(p => {
            const child = children.find(c => c.id === p.child_id)
            const priceCoins = p.price_coins ?? p.frozen_coins
            return (
              <Card key={p.id} pad={14}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: T.r, background: T.bg1, border: `1px solid ${T.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{p.reward_icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>
                      {child ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 16 }}>{child.avatar || '👤'}</span>
                          <span style={{ color: T.cyan }}>{child.name}</span>
                          <span style={{ color: T.muted }}>запросил</span>
                        </span>
                      ) : (
                        <span style={{ color: T.muted }}>Запрошено</span>
                      )}
                    </div>
                    <div style={{ fontSize: 15, color: T.text, fontWeight: 700, marginTop: 2 }}>{p.reward_title}</div>
                  </div>
                  <div style={{ fontFamily: T.fMono, fontSize: 15, fontWeight: 700, color: T.text }}>{priceCoins}🪙</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Btn variant="danger" size="md" icon="x" onClick={() => onDecline(p)} full>Отклонить</Btn>
                  <Btn variant="success" size="md" icon="check" onClick={() => onApprove(p)} full>Одобрить</Btn>
                </div>
              </Card>
            )
          })}
          {pending.length === 0 && (
            <Card pad={24} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>✨</div>
              <div style={{ color: T.text, fontSize: 14, fontWeight: 600 }}>Нет ожидающих запросов</div>
              <div style={{ color: T.muted, fontSize: 12, marginTop: 4 }}>Запросы детей появятся здесь</div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
