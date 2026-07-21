'use client'

import { useState, useEffect } from 'react'
import {
  getExtraActivities,
  addExtraActivity,
  updateExtraActivity,
  deleteExtraActivity,
  ExtraActivity,
} from '@/lib/expenses-api'
import { useFamilyMembers } from '@/lib/hooks/useFamilyMembers'
import { useT } from '@/lib/i18n'
import { T } from '@/components/parent-center/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

type Category = 'academic' | 'physical' | 'creative' | 'chore' | 'other'
type TrackingType = 'checkbox' | 'pages' | 'duration' | 'rating'
type DayType = 'school' | 'weekend' | 'vacation' | 'always'

interface FormState {
  name: string; emoji: string; category: Category; trackingType: TrackingType
  quantityGoal: string; quantityUnit: string; days: number[]
  dayType: DayType; coins: number; isActive: boolean
}

const EMPTY_FORM: FormState = {
  name: '', emoji: '📖', category: 'academic', trackingType: 'checkbox',
  quantityGoal: '', quantityUnit: '', days: [0, 1, 2, 3, 4],
  dayType: 'always', coins: 3, isActive: true,
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CAT: Record<Category, { label: string; color: string; bg: string }> = {
  academic:  { label: 'Учёба',      color: T.indigo,   bg: T.indigoSoft  },
  physical:  { label: 'Спорт',      color: T.success,  bg: T.successSoft },
  creative:  { label: 'Творчество', color: T.danger,   bg: T.dangerSoft  },
  chore:     { label: 'Быт',        color: T.warning,  bg: T.warningSoft },
  other:     { label: 'Другое',     color: T.indigoHi, bg: T.indigoSoft  },
}

const TRACK: Record<TrackingType, { label: string; icon: string; desc: string }> = {
  checkbox: { label: 'Чекбокс', icon: '✓',  desc: 'Сделал / не сделал'          },
  pages:    { label: 'Чтение',  icon: '📄', desc: 'Страницы + время + закладка' },
  duration: { label: 'Время',   icon: '⏱',  desc: 'Минуты занятий'              },
  rating:   { label: 'Оценка',  icon: '⭐', desc: 'Самооценка 1-5'              },
}

const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

const DAY_TYPE_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  always:   { label: 'Всегда', color: T.muted,   bg: T.card,       border: T.cardBorder },
  school:   { label: 'Школа',  color: T.indigo,  bg: T.indigoSoft, border: T.cardBorderHi },
  weekend:  { label: 'Вых',    color: T.warning, bg: T.warningSoft,border: T.cardBorderHi },
  vacation: { label: 'Кан',    color: T.danger,  bg: T.dangerSoft, border: T.cardBorderHi },
}

const DAY_TYPE_OPTS: { value: DayType; label: string }[] = [
  { value: 'always',  label: 'Всегда'      },
  { value: 'school',  label: 'Учебные дни' },
  { value: 'weekend', label: 'Выходные'    },
  { value: 'vacation',label: 'Каникулы'    },
]

const COINS_OPTIONS = [1, 2, 3, 5, 7, 10, 15]
const EMOJIS = ['📖','✏️','🧮','🔬','🌍','🎨','🎵','💻','♟️','🏃','🤸','🧩','📝','🌱','🍳','🔧','🧹','📐','🎯','🌟','🎸','🎤','🧪','📷']

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES = [
  { id:'academic', emoji:'📚', name:'Учёба', desc:'ДЗ, чтение, повторение', activities: [
    { name:'Домашнее задание', emoji:'✏️', category:'academic'  as Category, trackingType:'checkbox' as TrackingType, days:[0,1,2,3,4], dayType:'school'  as DayType, coins:5 },
    { name:'Чтение',           emoji:'📖', category:'academic'  as Category, trackingType:'pages'    as TrackingType, days:[0,1,2,3,4,5,6], dayType:'always' as DayType, coins:3, quantityGoal:20, quantityUnit:'стр' },
  ]},
  { id:'sport', emoji:'🏃', name:'Спорт', desc:'Зарядка, активность', activities: [
    { name:'Зарядка',  emoji:'🏃', category:'physical' as Category, trackingType:'duration' as TrackingType, days:[0,2,4,5,6], dayType:'always'  as DayType, coins:5, quantityGoal:15, quantityUnit:'мин' },
    { name:'Прогулка', emoji:'🚶', category:'physical' as Category, trackingType:'duration' as TrackingType, days:[5,6],       dayType:'weekend' as DayType, coins:3, quantityGoal:30, quantityUnit:'мин' },
  ]},
  { id:'reading', emoji:'📖', name:'Чтение', desc:'Книги, журналы', activities: [
    { name:'Вечернее чтение', emoji:'📖', category:'academic' as Category, trackingType:'pages' as TrackingType, days:[0,1,2,3,4,5,6], dayType:'always' as DayType, coins:4, quantityGoal:15, quantityUnit:'стр' },
  ]},
  { id:'creative', emoji:'🎨', name:'Творчество', desc:'Рисование, музыка', activities: [
    { name:'Рисование',           emoji:'🎨', category:'creative' as Category, trackingType:'duration' as TrackingType, days:[5,6],   dayType:'weekend' as DayType, coins:3, quantityGoal:20, quantityUnit:'мин' },
    { name:'Игра на инструменте', emoji:'🎵', category:'creative' as Category, trackingType:'duration' as TrackingType, days:[1,3,5], dayType:'always'  as DayType, coins:5, quantityGoal:15, quantityUnit:'мин' },
  ]},
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function ActivitiesManager() {
  const t = useT()
  const { members } = useFamilyMembers()
  const children = members.filter(m => m.role === 'child')

  const [childId, setChildId] = useState('')
  const [activities, setActivities] = useState<ExtraActivity[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!childId && children.length > 0) setChildId(children[0].id)
  }, [children, childId])

  useEffect(() => { if (childId) load() }, [childId])

  async function load() {
    setLoading(true)
    try { setActivities(await getExtraActivities(childId)) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  function openAdd() { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true); setError('') }

  function openEdit(a: ExtraActivity) {
    const dayType = (a.day_types?.includes('always') ? 'always' : a.day_types?.[0] || 'always') as DayType
    setForm({
      name: a.name, emoji: a.emoji,
      category: (a.category || 'other') as Category,
      trackingType: (a.tracking_type || 'checkbox') as TrackingType,
      quantityGoal: a.quantity_goal?.toString() || '',
      quantityUnit: a.quantity_unit || '',
      days: a.days_of_week || [],
      dayType,
      coins: a.coins, isActive: a.is_active,
    })
    setEditingId(a.id); setShowModal(true); setError('')
  }

  function toggleFormDay(day: number) {
    setForm(p => ({ ...p, days: p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day].sort((a,b)=>a-b) }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Введите название'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        name: form.name.trim(), emoji: form.emoji, category: form.category,
        trackingType: form.trackingType, daysOfWeek: form.days,
        dayTypes: [form.dayType],
        quantityGoal: form.quantityGoal ? parseInt(form.quantityGoal) : undefined,
        quantityUnit: form.quantityUnit || undefined,
        coins: form.coins,
      }
      if (editingId) {
        await updateExtraActivity(editingId, { ...payload, isActive: form.isActive })
      } else {
        await addExtraActivity({ childId, ...payload })
      }
      setShowModal(false); setEditingId(null)
      await load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Удалить активность?')) return
    try { await deleteExtraActivity(id); await load() }
    catch (e: any) { setError(e.message) }
  }

  async function toggleActive(a: ExtraActivity) {
    try { await updateExtraActivity(a.id, { isActive: !a.is_active }); await load() }
    catch {}
  }

  async function toggleGridDay(a: ExtraActivity, day: number) {
    const cur = a.days_of_week || []
    const next = cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day].sort((x,y)=>x-y)
    try { await updateExtraActivity(a.id, { daysOfWeek: next }); await load() }
    catch {}
  }

  async function applyTemplate(tmpl: typeof TEMPLATES[number]) {
    setSaving(true)
    try {
      for (const ta of tmpl.activities) {
        await addExtraActivity({
          childId, name: ta.name, emoji: ta.emoji, category: ta.category,
          trackingType: ta.trackingType, daysOfWeek: ta.days, dayTypes: [ta.dayType],
          coins: ta.coins,
          quantityGoal: (ta as any).quantityGoal,
          quantityUnit: (ta as any).quantityUnit,
        })
      }
      setShowTemplates(false)
      await load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const sh: React.CSSProperties = { display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:700, cursor:'pointer' }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:16, fontWeight:800, color:T.text, marginBottom:3 }}>🎯 Активности</div>
          <div style={{ fontSize:12, color:T.muted }}>
            Настройте что ребёнок делает каждый день — появится в форме автоматически
          </div>
        </div>
        <button onClick={() => setShowTemplates(true)} style={{ ...sh, background:T.card, border:`1px solid ${T.cardBorder}`, color:T.textDim }}>
          📦 Шаблоны
        </button>
        <button onClick={openAdd} style={{ ...sh, background:T.successSoft, border:`1px solid ${T.success}66`, color:T.success }}>
          + Добавить
        </button>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {children.map(c => (
            <button key={c.id} onClick={() => setChildId(c.id)} style={{
              ...sh,
              background: childId === c.id ? T.successSoft : T.card,
              border: `1.5px solid ${childId === c.id ? `${T.success}66` : T.cardBorder}`,
              color: childId === c.id ? T.success : T.muted,
            }}>
              {c.display_name}
            </button>
          ))}
        </div>
      )}

      {error && <div style={{ padding:'8px 12px', background:T.dangerSoft, border:`1px solid ${T.danger}55`, borderRadius:8, color:T.danger, fontSize:12, marginBottom:10 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign:'center', padding:24, color:T.faint, fontSize:13 }}>Загрузка…</div>
      ) : activities.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
          <div style={{ fontSize:14, fontWeight:700, color:T.text, marginBottom:6 }}>Нет активностей</div>
          <div style={{ fontSize:12, color:T.muted, maxWidth:220, margin:'0 auto 20px', lineHeight:1.5 }}>
            Добавьте первую активность или выберите шаблон
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
            <button onClick={() => setShowTemplates(true)} style={{ ...sh, background:T.warningSoft, border:`1px solid ${T.warning}59`, color:T.warning }}>📦 Шаблон</button>
            <button onClick={openAdd} style={{ ...sh, background:T.successSoft, border:`1px solid ${T.success}59`, color:T.success }}>+ Создать</button>
          </div>
        </div>
      ) : (
        <>
          {/* Weekly grid */}
          <div style={{ overflowX:'auto', borderRadius:12, border:`1px solid ${T.cardBorder}`, background:T.card }}>
            <div style={{ minWidth:580 }}>
              {/* Column headers */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr repeat(7,28px) 70px 60px', gap:0, padding:'8px 12px 6px', borderBottom:`1px solid ${T.cardBorder}` }}>
                <div style={hdr}>Активность</div>
                {DAYS_SHORT.map(d => <div key={d} style={{ ...hdr, textAlign:'center' }}>{d}</div>)}
                <div style={{ ...hdr, textAlign:'center' }}>Тип</div>
                <div style={{ ...hdr, textAlign:'right' }}>💰</div>
              </div>

              {activities.map((a, idx) => {
                const cat = CAT[(a.category as Category) || 'other']
                const track = TRACK[(a.tracking_type as TrackingType) || 'checkbox']
                const badge = DAY_TYPE_BADGE[a.day_types?.[0] || 'always'] || DAY_TYPE_BADGE.always
                const hov = hoveredId === a.id
                return (
                  <div key={a.id}
                    onMouseEnter={() => setHoveredId(a.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display:'grid', gridTemplateColumns:'1fr repeat(7,28px) 70px 60px', gap:0,
                      padding:'9px 12px', alignItems:'center',
                      borderBottom: idx < activities.length-1 ? `1px solid ${T.cardBorder}` : 'none',
                      background: hov ? T.cardHi : 'transparent',
                      opacity: a.is_active ? 1 : 0.42, transition:'background 0.15s, opacity 0.2s',
                    }}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:8, paddingRight:8, minWidth:0 }}>
                      <span style={{ fontSize:17, flexShrink:0 }}>{a.emoji}</span>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:T.text, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.name}</div>
                        <div style={{ display:'flex', gap:4, alignItems:'center', marginTop:2 }}>
                          <span style={{ fontSize:9, fontWeight:700, padding:'1px 4px', borderRadius:3, color:cat.color, background:cat.bg }}>{cat.label}</span>
                          <span style={{ fontSize:9, color:T.faint }}>{track.icon} {track.desc}</span>
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:3, flexShrink:0, opacity: hov ? 1 : 0, transition:'opacity 0.15s' }}>
                        <button onClick={() => openEdit(a)} title="Изменить" style={actionBtn}>✏️</button>
                        <button onClick={() => toggleActive(a)} title={a.is_active ? 'Выключить' : 'Включить'}
                          style={{ ...actionBtn, borderColor: a.is_active ? T.success : T.cardBorder, color: a.is_active ? T.success : T.muted }}>
                          {a.is_active ? '●' : '○'}
                        </button>
                        <button onClick={() => handleDelete(a.id)} title="Удалить" style={{ ...actionBtn, borderColor:T.dangerSoft, color:T.danger }}>✕</button>
                      </div>
                    </div>

                    {[0,1,2,3,4,5,6].map(day => {
                      const on = (a.days_of_week || []).includes(day)
                      const isWknd = day >= 5
                      return (
                        <div key={day} style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <button onClick={() => toggleGridDay(a, day)} title={`${DAYS_SHORT[day]}`}
                            style={{
                              width:15, height:15, borderRadius:'50%', border:'none', cursor:'pointer', padding:0,
                              background: on ? (isWknd ? T.warning : T.success) : T.cardBorderHi,
                              boxShadow: on ? (isWknd ? `0 0 5px ${T.warning}59` : `0 0 5px ${T.success}59`) : 'none',
                              transition:'all 0.13s',
                            }} />
                        </div>
                      )
                    })}

                    <div style={{ display:'flex', justifyContent:'center' }}>
                      <span style={{ fontSize:9, fontWeight:700, padding:'2px 5px', borderRadius:4, color:badge.color, background:badge.bg, border:`1px solid ${badge.border}`, whiteSpace:'nowrap' }}>
                        {badge.label}
                      </span>
                    </div>

                    <div style={{ textAlign:'right', fontSize:12, fontWeight:800, color:T.warning }}>+{a.coins}💰</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:12, marginTop:10, flexWrap:'wrap', fontSize:11, color:T.faint }}>
            <LegDot color={T.success} label="Пн–Пт" />
            <LegDot color={T.warning} label="Сб–Вс" />
            <LegDot color={T.cardBorderHi} label="Выключен" />
            <span style={{ marginLeft:'auto' }}>Нажмите на точку — переключить день</span>
          </div>
        </>
      )}

      {/* ── TEMPLATES OVERLAY ─────────────────────────────────────────────── */}
      {showTemplates && (
        <Overlay onClose={() => setShowTemplates(false)}>
          <div style={{ fontSize:15, fontWeight:800, color:T.text, marginBottom:3 }}>📦 Шаблоны</div>
          <div style={{ fontSize:12, color:T.muted, marginBottom:18 }}>Готовые наборы для быстрого старта</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {TEMPLATES.map(tmpl => (
              <div key={tmpl.id} style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:10, padding:12 }}>
                <div style={{ fontSize:22, marginBottom:5 }}>{tmpl.emoji}</div>
                <div style={{ fontSize:13, fontWeight:800, color:T.text, marginBottom:2 }}>{tmpl.name}</div>
                <div style={{ fontSize:11, color:T.muted, marginBottom:8, lineHeight:1.4 }}>{tmpl.desc}</div>
                <div style={{ marginBottom:10 }}>
                  {tmpl.activities.map((a,i) => <div key={i} style={{ fontSize:10, color:T.textDim, marginBottom:2 }}>{a.emoji} {a.name}</div>)}
                </div>
                <button
                  onClick={() => applyTemplate(tmpl)} disabled={saving}
                  style={{ width:'100%', padding:'7px 0', borderRadius:7, background:T.successSoft, border:`1px solid ${T.success}4D`, color:T.success, fontSize:12, fontWeight:700, cursor:'pointer' }}
                >
                  {saving ? '…' : 'Подключить'}
                </button>
              </div>
            ))}
          </div>
        </Overlay>
      )}

      {/* ── ADD / EDIT MODAL ──────────────────────────────────────────────── */}
      {showModal && (
        <Overlay onClose={() => { setShowModal(false); setEditingId(null) }}>
          <div style={{ fontSize:15, fontWeight:800, color:T.text, marginBottom:18 }}>
            {editingId ? '✏️ Редактировать' : '➕ Новая активность'}
          </div>

          {/* Emoji */}
          <FL>Эмодзи</FL>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:14 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setForm(p=>({...p,emoji:e}))}
                style={{ width:34, height:34, fontSize:17, borderRadius:7, cursor:'pointer',
                  border:`1.5px solid ${form.emoji===e?`${T.success}80`:T.cardBorder}`,
                  background: form.emoji===e?T.successSoft:T.card }}>
                {e}
              </button>
            ))}
          </div>

          <FL>Название *</FL>
          <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Например: Чтение" style={inp} />

          <FL>Категория</FL>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:14 }}>
            {(Object.entries(CAT) as [Category, typeof CAT[Category]][]).map(([k,c]) => (
              <button key={k} onClick={() => setForm(p=>({...p,category:k}))}
                style={{ padding:'6px 11px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer',
                  background: form.category===k ? c.bg : T.card,
                  border:`1.5px solid ${form.category===k ? c.color+'55' : T.cardBorder}`,
                  color: form.category===k ? c.color : T.muted }}>
                {c.label}
              </button>
            ))}
          </div>

          <FL>Тип отслеживания</FL>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
            {(Object.entries(TRACK) as [TrackingType, typeof TRACK[TrackingType]][]).map(([k,c]) => (
              <button key={k} onClick={() => setForm(p=>({...p,trackingType:k}))}
                style={{ padding:'9px 11px', borderRadius:9, textAlign:'left', cursor:'pointer',
                  background: form.trackingType===k ? T.indigoSoft : T.card,
                  border:`1.5px solid ${form.trackingType===k ? `${T.indigo}73` : T.cardBorder}`,
                  color: form.trackingType===k ? T.indigoHi : T.muted }}>
                <div style={{ fontSize:15, marginBottom:2 }}>{c.icon}</div>
                <div style={{ fontSize:11, fontWeight:700 }}>{c.label}</div>
                <div style={{ fontSize:10, opacity:0.55, marginTop:1, lineHeight:1.3 }}>{c.desc}</div>
              </button>
            ))}
          </div>

          {form.trackingType === 'pages' && (
            <div style={{ marginBottom:14, padding:11, background:T.indigoSoft, border:`1px solid ${T.cardBorderHi}`, borderRadius:9 }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.indigo, marginBottom:8 }}>📖 Режим чтения</div>
              <div>
                <div style={{ fontSize:10, color:T.muted, marginBottom:3 }}>Цель страниц в день</div>
                <input type="number" min="1" value={form.quantityGoal} placeholder="20"
                  onChange={e=>setForm(p=>({...p,quantityGoal:e.target.value,quantityUnit:'стр'}))} style={inp} />
              </div>
              <div style={{ fontSize:10, color:T.muted, lineHeight:1.5 }}>В форме: страниц • минут • закладка</div>
            </div>
          )}

          {form.trackingType === 'duration' && (
            <>
              <FL>Цель (минут)</FL>
              <input type="number" min="1" value={form.quantityGoal} placeholder="15"
                onChange={e=>setForm(p=>({...p,quantityGoal:e.target.value,quantityUnit:'мин'}))} style={inp} />
            </>
          )}

          <FL>Дни недели</FL>
          <div style={{ display:'flex', gap:4, marginBottom:14 }}>
            {DAYS_SHORT.map((d,i) => {
              const on = form.days.includes(i); const wknd = i>=5
              return (
                <button key={i} onClick={() => toggleFormDay(i)}
                  style={{ flex:1, padding:'7px 0', borderRadius:7, fontSize:10, fontWeight:700, cursor:'pointer',
                    background: on ? (wknd?T.warningSoft:T.successSoft) : T.card,
                    border:`1.5px solid ${on ? (wknd?`${T.warning}66`:`${T.success}66`) : T.cardBorder}`,
                    color: on ? (wknd?T.warning:T.success) : T.faint }}>
                  {d}
                </button>
              )
            })}
          </div>

          <FL>Тип дня</FL>
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:14 }}>
            {DAY_TYPE_OPTS.map(o => (
              <button key={o.value} onClick={() => setForm(p=>({...p,dayType:o.value}))}
                style={{ padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:700, cursor:'pointer',
                  background: form.dayType===o.value ? T.indigoSoft : T.card,
                  border:`1.5px solid ${form.dayType===o.value ? `${T.indigoHi}73` : T.cardBorder}`,
                  color: form.dayType===o.value ? T.indigoHi : T.muted }}>
                {o.label}
              </button>
            ))}
          </div>

          <FL>Монеты за выполнение</FL>
          <div style={{ display:'flex', gap:4, marginBottom:14 }}>
            {COINS_OPTIONS.map(c => (
              <button key={c} onClick={() => setForm(p=>({...p,coins:c}))}
                style={{ flex:1, padding:'7px 0', borderRadius:7, fontSize:10, fontWeight:800, cursor:'pointer',
                  background: form.coins===c ? T.warningSoft : T.card,
                  border:`1.5px solid ${form.coins===c ? `${T.warning}73` : T.cardBorder}`,
                  color: form.coins===c ? T.warning : T.faint }}>
                +{c}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 11px', background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:9, marginBottom:18 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:T.text }}>Активна</div>
              <div style={{ fontSize:10, color:T.faint, marginTop:1 }}>Показывать в ежедневной форме</div>
            </div>
            <button onClick={() => setForm(p=>({...p,isActive:!p.isActive}))}
              style={{ width:42, height:23, borderRadius:12, border:'none', cursor:'pointer', flexShrink:0, position:'relative',
                background: form.isActive ? T.success : T.cardBorderHi, transition:'background 0.2s' }}>
              <div style={{ position:'absolute', top:2, left: form.isActive ? 21 : 2, width:19, height:19, borderRadius:'50%', background:T.text, transition:'left 0.18s', boxShadow:'0 1px 3px rgba(0,0,0,0.35)' }} />
            </button>
          </div>

          {error && <div style={{ padding:'7px 10px', background:T.dangerSoft, border:`1px solid ${T.danger}55`, borderRadius:7, color:T.danger, fontSize:11, marginBottom:12 }}>{error}</div>}

          <div style={{ display:'flex', gap:7 }}>
            <button onClick={handleSave} disabled={saving || !form.name.trim()}
              style={{ flex:1, padding:'11px 0', borderRadius:10, border:'none',
                background: form.name.trim() ? T.success : T.card,
                color: form.name.trim() ? T.bg1 : T.faint,
                fontSize:13, fontWeight:800, cursor: form.name.trim() ? 'pointer' : 'not-allowed' }}>
              {saving ? '…' : '💾 Сохранить'}
            </button>
            <button onClick={() => { setShowModal(false); setEditingId(null) }}
              style={{ padding:'11px 16px', borderRadius:10, background:T.card, border:`1px solid ${T.cardBorderHi}`, color:T.textDim, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Отмена
            </button>
          </div>
        </Overlay>
      )}
    </div>
  )
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const hdr: React.CSSProperties = { fontSize:10, fontWeight:600, color:T.faint, textTransform:'uppercase', letterSpacing:'0.06em' }
const actionBtn: React.CSSProperties = { width:21, height:21, fontSize:11, borderRadius:5, cursor:'pointer', border:`1px solid ${T.cardBorder}`, background:T.card, color:T.textDim, display:'flex', alignItems:'center', justifyContent:'center' }
const inp: React.CSSProperties = { width:'100%', padding:'9px 11px', borderRadius:9, marginBottom:14, background:T.card, border:`1px solid ${T.cardBorderHi}`, color:T.text, fontSize:13, boxSizing:'border-box', outline:'none' }

function FL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:10, fontWeight:700, color:T.muted, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:7 }}>{children}</div>
}
function LegDot({ color, label }: { color: string; label: string }) {
  return <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:9, height:9, borderRadius:'50%', background:color, display:'inline-block' }}/>{label}</span>
}
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:50, display:'flex', alignItems:'flex-end', justifyContent:'center', backdropFilter:'blur(4px)' }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:'100%', maxWidth:580, background:T.bg1, border:`1px solid ${T.cardBorderHi}`, borderRadius:'18px 18px 0 0', padding:'18px 18px 42px', maxHeight:'92dvh', overflowY:'auto' }}>
        <div style={{ width:34, height:4, background:T.faint, borderRadius:2, margin:'0 auto 20px' }}/>
        {children}
      </div>
    </div>
  )
}
