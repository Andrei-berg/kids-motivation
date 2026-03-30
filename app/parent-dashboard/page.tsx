'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getChildren, getDay, getSubjectGradesForDate, getWeekData, getStreaks, getGoals,
} from '@/lib/api'
import type { Child, DayData, SubjectGrade } from '@/lib/api'
import {
  getWallet, getPurchases, getWithdrawals, fulfillPurchase,
  approveWithdrawal, rejectWithdrawal, updateWalletCoins,
} from '@/lib/wallet-api'
import type { RewardPurchase, CashWithdrawal } from '@/lib/wallet-api'
import { getMonday, addDays, normalizeDate } from '@/utils/helpers'

// ─── Constants ────────────────────────────────────────────────────────────────

const CHILD_COLORS: Record<string, string> = { adam: '#8b5cf6', alim: '#0ea5e9' }
const GRADE_COINS: Record<number, number>  = { 5: 5, 4: 3, 3: -3, 2: -5, 1: -10 }
const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function calcDayCoins(day: DayData | null, grades: SubjectGrade[]): number {
  let c = 0
  if (day?.room_ok) c += 3
  if (day?.good_behavior) c += 5
  grades.forEach(g => { c += GRADE_COINS[g.grade] ?? 0 })
  return c
}

function roomCount(day: DayData | null): number {
  if (!day) return 0
  return [day.room_bed, day.room_floor, day.room_desk, day.room_closet, day.room_trash].filter(Boolean).length
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildState {
  id: string
  name: string
  avatar: string
  color: string
  balance: number
  streak: number
  todayCoins: number
  weekSparkline: number[]
  weekTotal: number
  avgGrade: number
  sportDays: number
  goal: { title: string; target: number; current: number } | null
  frozen: boolean
  todayFilled: boolean
  todayDay: DayData | null
  todayGrades: SubjectGrade[]
  weekDaysFilled: boolean[]
}

type ModalType = 'freeze' | 'penalty' | 'bonus' | null

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 120, H = 36, P = 4
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => {
    const x = P + (i / (data.length - 1)) * (W - P * 2)
    const y = H - P - (Math.max(v, 0) / max) * (H - P * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" points={pts} />
      {data.map((v, i) => {
        const x = P + (i / (data.length - 1)) * (W - P * 2)
        const y = H - P - (Math.max(v, 0) / max) * (H - P * 2)
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)}
          r="2.5" fill={color} opacity={v <= 0 ? 0.3 : 1} />
      })}
    </svg>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const [children, setChildren]         = useState<ChildState[]>([])
  const [pendingPurchases, setPurchases] = useState<RewardPurchase[]>([])
  const [pendingWithdrawals, setWithdrawals] = useState<CashWithdrawal[]>([])
  const [loading, setLoading]           = useState(true)
  const [tab, setTab]                   = useState<'feed' | 'approvals' | 'stats'>('feed')
  const [modal, setModal]               = useState<{ type: ModalType; childId: string } | null>(null)
  const [reason, setReason]             = useState('')
  const [amount, setAmount]             = useState('')
  const [duration, setDuration]         = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [now, setNow]                   = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const today     = normalizeDate(new Date())
      const weekStart = getMonday(new Date())

      const rawChildren = await getChildren()

      const childStates = await Promise.all(rawChildren.map(async (child: Child) => {
        const [wallet, streaks, todayDay, todayGrades, weekData, goalsResult] = await Promise.all([
          getWallet(child.id).catch(() => null),
          getStreaks(child.id).catch(() => []),
          getDay(child.id, today).catch(() => null),
          getSubjectGradesForDate(child.id, today).catch(() => []),
          getWeekData(child.id, weekStart).catch(() => ({ days: [], grades: [], sports: [] })),
          getGoals(child.id).catch(() => ({ active: null, archived: [], all: [] })),
        ])

        const balance  = wallet?.coins ?? 0
        const streak   = Math.max(0, ...(streaks as any[]).map((s: any) => s.current_count ?? 0))

        // Per-day coins for sparkline
        const weekSparkline = Array.from({ length: 7 }, (_, i) => {
          const date     = addDays(weekStart, i)
          const day      = (weekData.days as DayData[]).find(d => d.date === date) ?? null
          const grades   = (weekData.grades as SubjectGrade[]).filter(g => g.date === date)
          return calcDayCoins(day, grades)
        })

        const weekTotal    = weekSparkline.reduce((a, b) => a + b, 0)
        const weekDaysFilled = Array.from({ length: 7 }, (_, i) => {
          const date = addDays(weekStart, i)
          return (weekData.days as DayData[]).some(d => d.date === date)
        })

        const allWeekGrades = weekData.grades as SubjectGrade[]
        const avgGrade = allWeekGrades.length > 0
          ? +(allWeekGrades.reduce((s, g) => s + g.grade, 0) / allWeekGrades.length).toFixed(1)
          : 0

        const sportDays = (weekData.sports as any[]).length

        const activeGoal = goalsResult.active as any
        const goal = activeGoal
          ? { title: activeGoal.title, target: activeGoal.target, current: balance }
          : null

        return {
          id: child.id,
          name: child.name,
          avatar: child.emoji || '👤',
          color: CHILD_COLORS[child.id] ?? '#8b5cf6',
          balance,
          streak,
          todayCoins: calcDayCoins(todayDay, todayGrades),
          weekSparkline,
          weekTotal,
          avgGrade,
          sportDays,
          goal,
          frozen: false,
          todayFilled: !!todayDay,
          todayDay,
          todayGrades,
          weekDaysFilled,
        } as ChildState
      }))

      const [purchases, withdrawals] = await Promise.all([
        getPurchases().catch(() => []),
        getWithdrawals(undefined, 'pending').catch(() => []),
      ])

      setChildren(childStates)
      setPurchases(purchases.filter((p: RewardPurchase) => !p.fulfilled))
      setWithdrawals(withdrawals as CashWithdrawal[])
    } catch (e) {
      console.error('loadData error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const pendingCount = pendingPurchases.length + pendingWithdrawals.length
  const getChild     = (id: string) => children.find(c => c.id === id)

  const approvePurchase = async (id: string) => {
    await fulfillPurchase(id, 'Одобрено родителем')
    setPurchases(p => p.filter(x => x.id !== id))
  }
  const rejectPurchase = async (id: string) => {
    // For now just remove from list (purchase already deducted coins at buy time)
    setPurchases(p => p.filter(x => x.id !== id))
  }

  const approveWd = async (id: string) => {
    await approveWithdrawal(id)
    setWithdrawals(w => w.filter(x => x.id !== id))
  }
  const rejectWd = async (id: string) => {
    await rejectWithdrawal(id, 'Отклонено родителем')
    setWithdrawals(w => w.filter(x => x.id !== id))
  }

  const openModal = (type: ModalType, childId: string) => {
    setModal({ type, childId }); setReason(''); setAmount(''); setDuration('')
  }

  const submitModal = async () => {
    if (!modal) return
    setSubmitting(true)
    try {
      if (modal.type === 'penalty' && amount) {
        await updateWalletCoins(modal.childId, -Math.abs(Number(amount)), reason || 'Штраф от родителя')
      } else if (modal.type === 'bonus' && amount) {
        await updateWalletCoins(modal.childId, +Math.abs(Number(amount)), reason || 'Бонус от родителя')
      }
      // freeze: toggle local state only (no API yet)
      if (modal.type === 'freeze') {
        setChildren(p => p.map(c => c.id === modal.childId ? { ...c, frozen: !c.frozen } : c))
      }
      setModal(null)
      await loadData()
    } finally {
      setSubmitting(false)
    }
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
  }

  const modalAccent = modal?.type === 'freeze'
    ? { btn: 'linear-gradient(135deg,#0284c7,#0ea5e9)', glow: 'rgba(14,165,233,.35)', label: '❄️ Заморозить' }
    : modal?.type === 'penalty'
    ? { btn: 'linear-gradient(135deg,#b45309,#f59e0b)', glow: 'rgba(245,158,11,.35)', label: '⚡ Штраф' }
    : { btn: 'linear-gradient(135deg,#059669,#10b981)', glow: 'rgba(16,185,129,.35)', label: '🎁 Бонус' }

  // Build activity feed from real today data
  const feedItems = children.flatMap(c => {
    const items: { key: string; child: ChildState; icon: string; text: string; coins: number | null; sub: string }[] = []
    if (c.todayFilled) {
      const rc = roomCount(c.todayDay)
      const details: string[] = []
      if (rc > 0) details.push(`комната ${rc}/5`)
      if (c.todayDay?.good_behavior) details.push('поведение ✓')
      if (c.todayGrades.length > 0) details.push(`оценок: ${c.todayGrades.length}`)
      items.push({ key:`day-${c.id}`, child:c, icon:'📋', text:`${c.name} заполнил день`, coins:c.todayCoins, sub:details.join(' · ') || 'без деталей' })
    }
    c.todayGrades.forEach(g => {
      const coins = GRADE_COINS[g.grade] ?? 0
      const emoji = g.grade===5?'🌟':g.grade===4?'✅':g.grade===3?'⚠️':'❌'
      items.push({ key:`grade-${g.id}`, child:c, icon:emoji, text:`${c.name} — ${g.grade} по ${g.subject}`, coins, sub:g.note||'' })
    })
    return items
  })

  // Stat totals
  const totalWeekCoins  = children.reduce((s, c) => s + c.weekTotal, 0)
  const totalFilledDays = children.reduce((s, c) => s + c.weekDaysFilled.filter(Boolean).length, 0)
  const maxFilledDays   = children.length * 7
  const allWeekGrades   = children.flatMap(c => c.weekSparkline).filter(v => v !== 0)
  const avgGradeAll     = children.length > 0
    ? +(children.reduce((s, c) => s + c.avgGrade, 0) / children.length).toFixed(1)
    : 0
  const totalSportDays  = children.reduce((s, c) => s + c.sportDays, 0)

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#050512 0%,#0d0920 60%,#050512 100%)', color:'#f1f5f9' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; font-family:'Outfit',system-ui,sans-serif; }
        .mono { font-family:'JetBrains Mono',monospace !important; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        .abtn { cursor:pointer; transition:all .15s ease; }
        .abtn:hover { filter:brightness(1.2); transform:translateY(-1px); }
        .tabBtn { cursor:pointer; transition:all .2s; }
        .tabBtn:hover { background:rgba(255,255,255,0.07) !important; }
        textarea, input { caret-color:#a78bfa; }
        ::-webkit-scrollbar { width:4px } ::-webkit-scrollbar-thumb { background:rgba(139,92,246,.4); border-radius:2px }
      `}</style>

      {/* Ambient glow */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        <div style={{ position:'absolute', top:'-10%', left:'15%', width:'50vw', height:'50vw', background:'radial-gradient(circle,rgba(139,92,246,.12) 0%,transparent 70%)', borderRadius:'50%' }} />
        <div style={{ position:'absolute', bottom:'-10%', right:'10%', width:'40vw', height:'40vw', background:'radial-gradient(circle,rgba(14,165,233,.08) 0%,transparent 70%)', borderRadius:'50%' }} />
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:'1380px', margin:'0 auto', padding:'16px' }}>

        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <header style={{ ...card, padding:'14px 24px', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', borderColor:'rgba(139,92,246,.18)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <div style={{ width:'44px', height:'44px', borderRadius:'13px', background:'linear-gradient(135deg,#7c3aed,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', boxShadow:'0 0 24px rgba(139,92,246,.5)' }}>🛡️</div>
            <div>
              <div style={{ fontSize:'17px', fontWeight:800, letterSpacing:'-.02em' }}>Родительский центр</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,.4)', marginTop:'1px' }}>
                {loading ? 'Загрузка...' : `${children.length} детей · Сегодня заполнили: ${children.filter(c=>c.todayFilled).length}/${children.length}`}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            {pendingCount > 0 && (
              <div style={{ background:'rgba(245,158,11,.15)', border:'1px solid rgba(245,158,11,.3)', borderRadius:'20px', padding:'6px 14px', display:'flex', alignItems:'center', gap:'7px', animation:'pulse 2s infinite' }}>
                <span style={{ fontSize:'14px' }}>⏳</span>
                <span style={{ fontSize:'13px', color:'#fbbf24', fontWeight:700 }}>{pendingCount} ожидает</span>
              </div>
            )}
            <div style={{ textAlign:'right' }}>
              <div className="mono" style={{ fontSize:'20px', fontWeight:700, color:'#a78bfa', letterSpacing:'.02em' }}>
                {now.toLocaleTimeString('ru', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
              </div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', marginTop:'1px' }}>
                {now.toLocaleDateString('ru', { weekday:'short', day:'numeric', month:'short' })}
              </div>
            </div>
          </div>
        </header>

        {/* ── MAIN GRID ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'400px', gap:'12px', color:'rgba(255,255,255,.4)' }}>
            <div style={{ width:'28px', height:'28px', border:'3px solid rgba(139,92,246,.3)', borderTopColor:'#8b5cf6', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
            <span style={{ fontSize:'16px' }}>Загрузка данных...</span>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:'16px', alignItems:'start' }}>

            {/* LEFT: Children cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              {children.map((c, ci) => (
                <div key={c.id} style={{ ...card, padding:'20px', borderColor:c.color+'28', background:`linear-gradient(135deg,${c.color}0f 0%,rgba(5,5,20,0.6) 100%)`, position:'relative', overflow:'hidden', animation:`fadeUp .4s ease ${ci*.1}s both` }}>
                  <div style={{ position:'absolute', top:-40, right:-40, width:100, height:100, background:c.color, borderRadius:'50%', filter:'blur(55px)', opacity:.18, pointerEvents:'none' }} />

                  <div style={{ position:'relative' }}>
                    {/* Top row */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'11px' }}>
                        <div style={{ fontSize:'36px', lineHeight:1 }}>{c.avatar}</div>
                        <div>
                          <div style={{ fontSize:'19px', fontWeight:800, letterSpacing:'-.02em' }}>{c.name}</div>
                          <div style={{ fontSize:'11px', color:'rgba(255,255,255,.45)', marginTop:'2px' }}>
                            🔥 <span style={{ color:'#fb923c', fontWeight:700 }}>{c.streak}</span> дней подряд
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div className="mono" style={{ fontSize:'26px', fontWeight:700, color:c.color, lineHeight:1 }}>
                          {c.balance}<span style={{ fontSize:'16px' }}>💰</span>
                        </div>
                        <div style={{ fontSize:'11px', color: c.todayCoins >= 0 ? '#34d399' : '#f87171', marginTop:'3px', fontWeight:600 }}>
                          {c.todayCoins >= 0 ? '+' : ''}{c.todayCoins}💰 сегодня
                        </div>
                      </div>
                    </div>

                    {/* Today's status */}
                    <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:'11px', padding:'11px 13px', marginBottom:'12px' }}>
                      <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'8px' }}>Сегодня</div>
                      {c.todayFilled ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                          {/* Room */}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <span style={{ fontSize:'12px', color:'rgba(255,255,255,.55)' }}>🏠 Комната</span>
                            <span style={{ fontSize:'12px', fontWeight:700, color: (c.todayDay?.room_ok) ? '#34d399' : '#f87171' }}>
                              {roomCount(c.todayDay)}/5 {c.todayDay?.room_ok ? '✓' : '✗'}
                            </span>
                          </div>
                          {/* Behavior */}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <span style={{ fontSize:'12px', color:'rgba(255,255,255,.55)' }}>😊 Поведение</span>
                            <span style={{ fontSize:'12px', fontWeight:700, color: c.todayDay?.good_behavior ? '#34d399' : '#f87171' }}>
                              {c.todayDay?.good_behavior ? '✓' : '✗'}
                            </span>
                          </div>
                          {/* Grades */}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <span style={{ fontSize:'12px', color:'rgba(255,255,255,.55)' }}>📚 Оценки</span>
                            {c.todayGrades.length > 0 ? (
                              <div style={{ display:'flex', gap:'4px' }}>
                                {c.todayGrades.map(g => (
                                  <span key={g.id} style={{ fontSize:'11px', fontWeight:700, padding:'1px 6px', borderRadius:'5px',
                                    background: g.grade===5?'rgba(52,211,153,.2)':g.grade===4?'rgba(59,130,246,.2)':g.grade===3?'rgba(245,158,11,.2)':'rgba(248,113,113,.2)',
                                    color: g.grade===5?'#34d399':g.grade===4?'#60a5fa':g.grade===3?'#fbbf24':'#f87171' }}>
                                    {g.grade}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize:'12px', color:'rgba(255,255,255,.3)' }}>—</span>
                            )}
                          </div>
                          {/* Note */}
                          {c.todayDay?.note_child && (
                            <div style={{ marginTop:'3px', fontSize:'11px', color:'rgba(255,255,255,.4)', fontStyle:'italic', borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:'5px' }}>
                              💬 «{c.todayDay.note_child}»
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', color:'rgba(255,255,255,.35)', fontSize:'12px' }}>
                          <span style={{ fontSize:'16px' }}>⚠️</span>
                          <span>День ещё не заполнен</span>
                        </div>
                      )}
                    </div>

                    {/* Stats row */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'7px', marginBottom:'13px' }}>
                      {[
                        { v: c.avgGrade > 0 ? c.avgGrade.toFixed(1) : '—', l:'Балл' },
                        { v: c.sportDays+'д',                               l:'Спорт' },
                        { v: (c.weekTotal >= 0 ? '+' : '') + c.weekTotal,  l:'Неделя' },
                      ].map(s => (
                        <div key={s.l} style={{ background:'rgba(255,255,255,.05)', borderRadius:'9px', padding:'9px 6px', textAlign:'center' }}>
                          <div className="mono" style={{ fontSize:'15px', fontWeight:700, color:c.color }}>{s.v}</div>
                          <div style={{ fontSize:'9px', color:'rgba(255,255,255,.35)', marginTop:'3px', textTransform:'uppercase', letterSpacing:'.06em' }}>{s.l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Sparkline */}
                    <div style={{ marginBottom:'12px' }}>
                      <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'5px' }}>Монеты за 7 дней</div>
                      <Sparkline data={c.weekSparkline} color={c.color} />
                    </div>

                    {/* Goal progress */}
                    {c.goal ? (
                      <div style={{ marginBottom:'15px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                          <span style={{ fontSize:'11px', color:'rgba(255,255,255,.5)' }}>🎯 {c.goal.title}</span>
                          <span className="mono" style={{ fontSize:'10px', color:c.color }}>{c.goal.current}/{c.goal.target}💰</span>
                        </div>
                        <div style={{ height:'5px', background:'rgba(255,255,255,.08)', borderRadius:'3px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${Math.min((c.goal.current/c.goal.target)*100,100)}%`, background:`linear-gradient(90deg,${c.color},${c.color}88)`, borderRadius:'3px', transition:'width 1s ease' }} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom:'15px', fontSize:'11px', color:'rgba(255,255,255,.3)' }}>🎯 Нет активной цели</div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'7px' }}>
                      {[
                        { label:c.frozen?'🔓 Разм.':'❄️ Замор.', type:'freeze'  as ModalType, fg:'#38bdf8', bg:'rgba(14,165,233,.12)',  br:'rgba(14,165,233,.25)' },
                        { label:'⚡ Штраф',                        type:'penalty' as ModalType, fg:'#fbbf24', bg:'rgba(245,158,11,.12)', br:'rgba(245,158,11,.25)' },
                        { label:'🎁 Бонус',                        type:'bonus'   as ModalType, fg:'#6ee7b7', bg:'rgba(52,211,153,.12)', br:'rgba(52,211,153,.25)' },
                      ].map(btn => (
                        <button key={btn.type} className="abtn" onClick={() => openModal(btn.type, c.id)}
                          style={{ background:btn.bg, border:`1px solid ${btn.br}`, borderRadius:'9px', padding:'7px 3px', color:btn.fg, fontSize:'10px', fontWeight:700 }}>
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    {/* Frozen overlay */}
                    {c.frozen && (
                      <div style={{ position:'absolute', inset:-20, background:'rgba(14,165,233,.07)', backdropFilter:'blur(4px)', WebkitBackdropFilter:'blur(4px)', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <div style={{ textAlign:'center', background:'rgba(14,165,233,.15)', border:'1px solid rgba(14,165,233,.3)', borderRadius:'12px', padding:'14px 20px' }}>
                          <div style={{ fontSize:'26px' }}>❄️</div>
                          <div style={{ color:'#38bdf8', fontWeight:700, fontSize:'13px', marginTop:'4px' }}>Заморожено</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* RIGHT: Tabbed panel */}
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>

              {/* Tab bar */}
              <div style={{ ...card, padding:'6px', display:'flex', gap:'4px' }}>
                {[
                  { id:'feed',      icon:'📡', label:'Активность', badge:null },
                  { id:'approvals', icon:'⏳', label:'Одобрения',  badge:pendingCount || null },
                  { id:'stats',     icon:'📊', label:'Статистика', badge:null },
                ].map(t => (
                  <button key={t.id} className="tabBtn" onClick={() => setTab(t.id as typeof tab)}
                    style={{ flex:1, background:tab===t.id?'rgba(139,92,246,.3)':'transparent', border:tab===t.id?'1px solid rgba(139,92,246,.5)':'1px solid transparent', borderRadius:'10px', padding:'10px 8px', color:tab===t.id?'#fff':'rgba(255,255,255,.45)', fontSize:'13px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:'7px' }}>
                    <span>{t.icon}</span><span>{t.label}</span>
                    {t.badge && <span style={{ background:'#f59e0b', color:'#000', borderRadius:'20px', padding:'2px 8px', fontSize:'11px', fontWeight:800 }}>{t.badge}</span>}
                  </button>
                ))}
              </div>

              {/* ── FEED ──────────────────────────────────────────────────────── */}
              {tab === 'feed' && (
                <div style={{ ...card, padding:'20px' }}>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'14px' }}>
                    Лента активности · Сегодня
                  </div>
                  {feedItems.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'60px 20px', color:'rgba(255,255,255,.3)' }}>
                      <div style={{ fontSize:'48px', marginBottom:'12px' }}>🌙</div>
                      <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'4px' }}>Ещё ничего нет</div>
                      <div style={{ fontSize:'13px' }}>Дети пока не заполняли день</div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
                      {feedItems.map((a, i) => (
                        <div key={a.key} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:'rgba(255,255,255,.025)', border:'1px solid rgba(255,255,255,.05)', borderRadius:'12px', animation:`fadeUp .3s ease ${i*.04}s both` }}>
                          <div style={{ width:'38px', height:'38px', background:a.child.color+'1a', border:`1px solid ${a.child.color}30`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
                            {a.icon}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:'13px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.text}</div>
                            {a.sub && <div style={{ fontSize:'11px', color:'rgba(255,255,255,.35)', marginTop:'2px' }}>{a.sub}</div>}
                          </div>
                          {a.coins !== null && (
                            <div className="mono" style={{ fontSize:'14px', fontWeight:700, color:a.coins>0?'#34d399':'#f87171', flexShrink:0 }}>
                              {a.coins>0?'+':''}{a.coins}💰
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── APPROVALS ─────────────────────────────────────────────────── */}
              {tab === 'approvals' && (
                <div style={{ ...card, padding:'20px' }}>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'14px' }}>
                    Ожидают одобрения · {pendingCount}
                  </div>
                  {pendingCount === 0 ? (
                    <div style={{ textAlign:'center', padding:'60px 20px', color:'rgba(255,255,255,.3)' }}>
                      <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
                      <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'4px' }}>Всё обработано!</div>
                      <div style={{ fontSize:'13px' }}>Новые запросы появятся здесь</div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

                      {/* Reward purchases */}
                      {pendingPurchases.map(p => {
                        const ch = getChild(p.child_id)
                        return (
                          <div key={p.id} style={{ padding:'18px', background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.2)', borderRadius:'14px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'13px', marginBottom:'13px' }}>
                              <span style={{ fontSize:'28px' }}>{p.reward_icon}</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:700, fontSize:'15px' }}>{ch?.name ?? p.child_id} купил награду</div>
                                <div style={{ color:'#a78bfa', fontWeight:600, marginTop:'3px', fontSize:'14px' }}>{p.reward_title}</div>
                                <div style={{ fontSize:'11px', color:'rgba(255,255,255,.35)', marginTop:'2px' }}>
                                  {new Date(p.purchased_at).toLocaleString('ru', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                                </div>
                              </div>
                              <div className="mono" style={{ fontSize:'18px', fontWeight:700, color:'#f87171', flexShrink:0 }}>
                                {p.price_coins ? `-${p.price_coins}💰` : p.price_money ? `-${p.price_money}₽` : '—'}
                              </div>
                            </div>
                            <div style={{ display:'flex', gap:'10px' }}>
                              <button className="abtn" onClick={() => approvePurchase(p.id)}
                                style={{ flex:1, background:'rgba(52,211,153,.18)', border:'1px solid rgba(52,211,153,.4)', borderRadius:'10px', padding:'11px', color:'#34d399', fontWeight:800, fontSize:'14px' }}>
                                ✓ Выдал
                              </button>
                              <button className="abtn" onClick={() => rejectPurchase(p.id)}
                                style={{ flex:1, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'10px', padding:'11px', color:'rgba(255,255,255,.4)', fontWeight:700, fontSize:'14px' }}>
                                ✕ Скрыть
                              </button>
                            </div>
                          </div>
                        )
                      })}

                      {/* Cash withdrawals */}
                      {pendingWithdrawals.map(w => {
                        const ch = getChild(w.child_id)
                        return (
                          <div key={w.id} style={{ padding:'18px', background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:'14px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'13px', marginBottom:'13px' }}>
                              <span style={{ fontSize:'28px' }}>{ch?.avatar ?? '💸'}</span>
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:700, fontSize:'15px' }}>{ch?.name ?? w.child_id} хочет вывести</div>
                                <div style={{ color:'#fbbf24', fontWeight:600, marginTop:'3px', fontSize:'14px' }}>Вывод наличными</div>
                                <div style={{ fontSize:'11px', color:'rgba(255,255,255,.35)', marginTop:'2px' }}>
                                  {new Date(w.requested_at).toLocaleString('ru', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                                </div>
                              </div>
                              <div className="mono" style={{ fontSize:'18px', fontWeight:700, color:'#fbbf24', flexShrink:0 }}>{w.amount}₽</div>
                            </div>
                            {w.note && <div style={{ fontSize:'12px', color:'rgba(255,255,255,.4)', marginBottom:'12px', fontStyle:'italic' }}>«{w.note}»</div>}
                            <div style={{ display:'flex', gap:'10px' }}>
                              <button className="abtn" onClick={() => approveWd(w.id)}
                                style={{ flex:1, background:'rgba(52,211,153,.18)', border:'1px solid rgba(52,211,153,.4)', borderRadius:'10px', padding:'11px', color:'#34d399', fontWeight:800, fontSize:'14px' }}>
                                ✓ Выдать деньги
                              </button>
                              <button className="abtn" onClick={() => rejectWd(w.id)}
                                style={{ flex:1, background:'rgba(248,113,113,.18)', border:'1px solid rgba(248,113,113,.4)', borderRadius:'10px', padding:'11px', color:'#f87171', fontWeight:800, fontSize:'14px' }}>
                                ✕ Отклонить
                              </button>
                            </div>
                          </div>
                        )
                      })}

                    </div>
                  )}
                </div>
              )}

              {/* ── STATS ─────────────────────────────────────────────────────── */}
              {tab === 'stats' && (
                <div style={{ ...card, padding:'20px' }}>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'16px' }}>Статистика недели</div>

                  {/* Quick stats */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'22px' }}>
                    {[
                      { v:`${totalWeekCoins}💰`,              l:'Монет заработано', c:'#8b5cf6', s:'оба ребёнка' },
                      { v: avgGradeAll > 0 ? String(avgGradeAll) : '—', l:'Средний балл', c:'#0ea5e9', s:'все предметы' },
                      { v:`${totalFilledDays}/${maxFilledDays}`,  l:'Дней заполнено',   c:'#34d399', s:'из возможных' },
                      { v:`${totalSportDays} дн`,             l:'Спорт дома',       c:'#f59e0b', s:'на этой неделе' },
                    ].map(s => (
                      <div key={s.l} style={{ background:s.c+'10', border:`1px solid ${s.c}22`, borderRadius:'12px', padding:'14px 16px' }}>
                        <div className="mono" style={{ fontSize:'22px', fontWeight:700, color:s.c }}>{s.v}</div>
                        <div style={{ fontSize:'12px', fontWeight:700, marginTop:'4px' }}>{s.l}</div>
                        <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', marginTop:'2px' }}>{s.s}</div>
                      </div>
                    ))}
                  </div>

                  {/* Heatmap */}
                  <div style={{ marginBottom:'22px' }}>
                    <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'10px' }}>Активность на неделе</div>
                    {children.map(ch => (
                      <div key={ch.id} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                        <span style={{ fontSize:'18px', width:'22px', textAlign:'center' }}>{ch.avatar}</span>
                        <div style={{ display:'flex', gap:'5px' }}>
                          {WEEK_DAYS.map((d, i) => (
                            <div key={d} title={`${ch.name} — ${d}`}
                              style={{ width:'34px', height:'34px', borderRadius:'8px', background:ch.weekDaysFilled[i]?ch.color+'cc':'rgba(255,255,255,.05)', border:`1px solid ${ch.weekDaysFilled[i]?ch.color:'rgba(255,255,255,.08)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:ch.weekDaysFilled[i]?'14px':'9px', color:ch.weekDaysFilled[i]?'#fff':'rgba(255,255,255,.3)' }}>
                              {ch.weekDaysFilled[i] ? '✓' : d}
                            </div>
                          ))}
                        </div>
                        <span className="mono" style={{ fontSize:'12px', color:ch.color, fontWeight:700 }}>
                          {ch.weekTotal >= 0 ? '+' : ''}{ch.weekTotal}💰
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Comparison */}
                  {children.length === 2 && (
                    <div>
                      <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'12px' }}>🏆 Соревнование</div>
                      {[
                        { l:'Монет за неделю', vals: children.map(c => c.weekTotal),              max: Math.max(...children.map(c => c.weekTotal), 1) },
                        { l:'Средний балл',    vals: children.map(c => Math.round(c.avgGrade*10)),max: 50 },
                        { l:'Дней заполнено',  vals: children.map(c => c.weekDaysFilled.filter(Boolean).length), max: 7 },
                      ].map(row => (
                        <div key={row.l} style={{ marginBottom:'12px' }}>
                          <div style={{ fontSize:'11px', color:'rgba(255,255,255,.4)', marginBottom:'5px' }}>{row.l}</div>
                          {children.map((c, ci) => (
                            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                              <span style={{ fontSize:'13px', width:'18px' }}>{c.avatar}</span>
                              <div style={{ flex:1, height:'7px', background:'rgba(255,255,255,.07)', borderRadius:'4px', overflow:'hidden' }}>
                                <div style={{ width:`${Math.max((row.vals[ci]/row.max)*100,0)}%`, height:'100%', background:c.color, borderRadius:'4px', transition:'width 1s ease' }} />
                              </div>
                              <span className="mono" style={{ fontSize:'11px', color:c.color, width:'30px', textAlign:'right' }}>{row.vals[ci]}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* ── MODAL ──────────────────────────────────────────────────────────── */}
      {modal && (() => {
        const ch = getChild(modal.childId)
        return (
          <div onClick={() => setModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.78)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
            <div onClick={e => e.stopPropagation()} style={{ background:'linear-gradient(135deg,#0c0c22,#14142e)', border:'1px solid rgba(139,92,246,.3)', borderRadius:'22px', padding:'30px', width:'100%', maxWidth:'400px', boxShadow:'0 0 80px rgba(139,92,246,.2)', animation:'fadeUp .2s ease' }}>
              <h2 style={{ margin:'0 0 5px', fontSize:'20px', fontWeight:800 }}>
                {modal.type==='freeze'?'❄️ Заморозить кошелёк':modal.type==='penalty'?'⚡ Выдать штраф':'🎁 Добавить бонус'}
              </h2>
              <p style={{ margin:'0 0 22px', fontSize:'13px', color:'rgba(255,255,255,.4)' }}>
                Для: {ch?.avatar} {ch?.name} · баланс: <span style={{ color:ch?.color }}>{ch?.balance}💰</span>
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                {modal.type !== 'freeze' && (
                  <div>
                    <label style={{ display:'block', fontSize:'11px', color:'rgba(255,255,255,.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px' }}>Сумма монет</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="например: 10"
                      style={{ width:'100%', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.15)', borderRadius:'10px', padding:'12px 15px', color:'#fff', fontSize:'16px', outline:'none' }} />
                  </div>
                )}
                {modal.type === 'freeze' && (
                  <div>
                    <label style={{ display:'block', fontSize:'11px', color:'rgba(255,255,255,.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'8px' }}>Длительность</label>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                      {['1 час','1 день','1 нед.'].map(o => (
                        <button key={o} className="abtn" onClick={() => setDuration(o)}
                          style={{ background:duration===o?'rgba(14,165,233,.25)':'rgba(255,255,255,.06)', border:`1px solid ${duration===o?'#0ea5e9':'rgba(255,255,255,.1)'}`, borderRadius:'9px', padding:'11px', color:duration===o?'#38bdf8':'rgba(255,255,255,.5)', fontSize:'13px', fontWeight:700 }}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'rgba(255,255,255,.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px' }}>Причина</label>
                  <textarea value={reason} onChange={e => setReason(e.target.value)}
                    placeholder={modal.type==='freeze'?'Нарушение правил...':modal.type==='penalty'?'За что штраф...':'За что бонус...'}
                    rows={3}
                    style={{ width:'100%', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.15)', borderRadius:'10px', padding:'12px 15px', color:'#fff', fontSize:'14px', outline:'none', resize:'vertical' }} />
                </div>
                <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
                  <button className="abtn" onClick={() => setModal(null)}
                    style={{ flex:1, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:'11px', padding:'13px', color:'rgba(255,255,255,.6)', fontWeight:700 }}>
                    Отмена
                  </button>
                  <button className="abtn" onClick={submitModal} disabled={submitting}
                    style={{ flex:2, background:modalAccent.btn, border:'none', borderRadius:'11px', padding:'13px', color:'#fff', fontWeight:800, fontSize:'14px', boxShadow:`0 4px 20px ${modalAccent.glow}`, opacity:submitting?0.7:1 }}>
                    {submitting ? '...' : modalAccent.label}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
