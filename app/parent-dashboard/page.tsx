'use client'

import { useState, useEffect } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Child {
  id: string
  name: string
  avatar: string
  color: string
  balance: number
  streak: number
  todayCoins: number
  weekData: number[]
  avgGrade: number
  sportDays: number
  goal: { title: string; target: number; current: number }
  frozen: boolean
}

interface Activity {
  id: string
  childId: string
  type: string
  text: string
  coins: number | null
  time: string
  pending: boolean
}

type ModalType = 'freeze' | 'penalty' | 'bonus' | null

// ─── Mock Data ────────────────────────────────────────────────────────────────

const CHILDREN: Child[] = [
  {
    id: 'adam', name: 'Адам', avatar: '🦁', color: '#8b5cf6',
    balance: 247, streak: 12, todayCoins: 18,
    weekData: [15, 20, 0, 12, 18, 25, 18],
    avgGrade: 4.3, sportDays: 3,
    goal: { title: 'Новый телефон', target: 500, current: 247 },
    frozen: false,
  },
  {
    id: 'alim', name: 'Алим', avatar: '🐯', color: '#0ea5e9',
    balance: 183, streak: 7, todayCoins: 12,
    weekData: [10, 15, 8, 0, 12, 20, 12],
    avgGrade: 3.9, sportDays: 2,
    goal: { title: 'PlayStation 5', target: 1000, current: 183 },
    frozen: false,
  },
]

const INIT_ACTIVITY: Activity[] = [
  { id: '1', childId: 'adam', type: 'day',      text: 'Адам заполнил день',               coins: 18,   time: '14:32', pending: false },
  { id: '2', childId: 'alim', type: 'purchase', text: 'Алим хочет «30 мин YouTube»',      coins: -30,  time: '13:15', pending: true  },
  { id: '3', childId: 'adam', type: 'badge',    text: 'Адам — значок «Отличник»',          coins: 20,   time: '12:00', pending: false },
  { id: '4', childId: 'alim', type: 'day',      text: 'Алим заполнил день',               coins: 12,   time: '11:45', pending: false },
  { id: '5', childId: 'adam', type: 'grade',    text: 'Адам — пятёрка по математике',      coins: 5,    time: '09:20', pending: false },
  { id: '6', childId: 'alim', type: 'purchase', text: 'Алим хочет «Поход в кино»',        coins: -100, time: '08:55', pending: true  },
  { id: '7', childId: 'adam', type: 'streak',   text: 'Адам — 12 дней подряд! 🔥',        coins: null, time: '08:00', pending: false },
]

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const ADAM_DAYS  = [true,  true,  true, true,  true, true,  false]
const ALIM_DAYS  = [true,  true,  true, false, true, false, false]

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const W = 120, H = 36, P = 4
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => {
    const x = P + (i / (data.length - 1)) * (W - P * 2)
    const y = H - P - (v / max) * (H - P * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" points={pts} />
      {data.map((v, i) => {
        const x = P + (i / (data.length - 1)) * (W - P * 2)
        const y = H - P - (v / max) * (H - P * 2)
        return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)}
          r="2.5" fill={color} opacity={v === 0 ? 0.3 : 1} />
      })}
    </svg>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const [children, setChildren] = useState(CHILDREN)
  const [activity, setActivity]  = useState(INIT_ACTIVITY)
  const [tab, setTab]             = useState<'feed' | 'approvals' | 'stats'>('feed')
  const [modal, setModal]         = useState<{ type: ModalType; childId: string } | null>(null)
  const [reason, setReason]       = useState('')
  const [amount, setAmount]       = useState('')
  const [duration, setDuration]   = useState('')
  const [now, setNow]             = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const pending   = activity.filter(a => a.pending)
  const getChild  = (id: string) => children.find(c => c.id === id)!

  const approve = (id: string) => setActivity(p => p.map(a => a.id === id ? { ...a, pending: false } : a))
  const reject  = (id: string) => setActivity(p => p.filter(a => a.id !== id))

  const openModal = (type: ModalType, childId: string) => {
    setModal({ type, childId }); setReason(''); setAmount(''); setDuration('')
  }

  const submitModal = () => {
    if (modal?.type === 'freeze') {
      setChildren(p => p.map(c => c.id === modal.childId ? { ...c, frozen: !c.frozen } : c))
    }
    console.log('Parent action:', modal, { reason, amount, duration })
    setModal(null)
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

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#050512 0%,#0d0920 60%,#050512 100%)', color: '#f1f5f9' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; font-family: 'Outfit', system-ui, sans-serif; }
        .mono { font-family: 'JetBrains Mono', monospace !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse  { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .abtn { cursor:pointer; transition:all .15s ease; }
        .abtn:hover { filter:brightness(1.2); transform:translateY(-1px); }
        .tabBtn { cursor:pointer; transition:all .2s; }
        .tabBtn:hover { background:rgba(255,255,255,0.07) !important; }
        textarea, input { caret-color:#a78bfa; }
        ::-webkit-scrollbar { width:4px } ::-webkit-scrollbar-thumb { background:rgba(139,92,246,.4); border-radius:2px }
      `}</style>

      {/* Ambient glow bg */}
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
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,.4)', marginTop:'1px' }}>Полный контроль · Семья Ивановых</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
            {pending.length > 0 && (
              <div style={{ background:'rgba(245,158,11,.15)', border:'1px solid rgba(245,158,11,.3)', borderRadius:'20px', padding:'6px 14px', display:'flex', alignItems:'center', gap:'7px', animation:'pulse 2s infinite' }}>
                <span style={{ fontSize:'14px' }}>⏳</span>
                <span style={{ fontSize:'13px', color:'#fbbf24', fontWeight:700 }}>{pending.length} ожидает</span>
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
        <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:'16px', alignItems:'start' }}>

          {/* LEFT: Children cards */}
          <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
            {children.map((c, ci) => (
              <div key={c.id} style={{ ...card, padding:'20px', borderColor:c.color+'28', background:`linear-gradient(135deg,${c.color}0f 0%,rgba(5,5,20,0.6) 100%)`, position:'relative', overflow:'hidden', animation:`fadeUp .4s ease ${ci*.1}s both` }}>
                {/* Glow orb */}
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
                      <div style={{ fontSize:'11px', color:'#34d399', marginTop:'3px', fontWeight:600 }}>+{c.todayCoins}💰 сегодня</div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'7px', marginBottom:'13px' }}>
                    {[
                      { v:c.avgGrade.toFixed(1), l:'Балл' },
                      { v:c.sportDays+'д',       l:'Спорт' },
                      { v:'+'+c.weekData.reduce((a,b)=>a+b,0), l:'Неделя' },
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
                    <Sparkline data={c.weekData} color={c.color} />
                  </div>

                  {/* Goal progress */}
                  <div style={{ marginBottom:'15px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                      <span style={{ fontSize:'11px', color:'rgba(255,255,255,.5)' }}>🎯 {c.goal.title}</span>
                      <span className="mono" style={{ fontSize:'10px', color:c.color }}>{c.goal.current}/{c.goal.target}💰</span>
                    </div>
                    <div style={{ height:'5px', background:'rgba(255,255,255,.08)', borderRadius:'3px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(c.goal.current/c.goal.target*100,100)}%`, background:`linear-gradient(90deg,${c.color},${c.color}88)`, borderRadius:'3px', transition:'width 1s ease' }} />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'7px' }}>
                    {[
                      { label:c.frozen?'🔓 Разм.':'❄️ Замор.', type:'freeze'  as ModalType, fg:'#38bdf8', bg:'rgba(14,165,233,.12)',  br:'rgba(14,165,233,.25)'  },
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
                { id:'feed',      icon:'📡', label:'Активность',  badge:null             },
                { id:'approvals', icon:'⏳', label:'Одобрения',   badge:pending.length||null },
                { id:'stats',     icon:'📊', label:'Статистика',  badge:null             },
              ].map(t => (
                <button key={t.id} className="tabBtn" onClick={() => setTab(t.id as typeof tab)} style={{ flex:1, background:tab===t.id?'rgba(139,92,246,.3)':'transparent', border:tab===t.id?'1px solid rgba(139,92,246,.5)':'1px solid transparent', borderRadius:'10px', padding:'10px 8px', color:tab===t.id?'#fff':'rgba(255,255,255,.45)', fontSize:'13px', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:'7px' }}>
                  <span>{t.icon}</span><span>{t.label}</span>
                  {t.badge && <span style={{ background:'#f59e0b', color:'#000', borderRadius:'20px', padding:'2px 8px', fontSize:'11px', fontWeight:800 }}>{t.badge}</span>}
                </button>
              ))}
            </div>

            {/* ── FEED ──────────────────────────────────────────────────────── */}
            {tab === 'feed' && (
              <div style={{ ...card, padding:'20px' }}>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'14px' }}>Лента активности · Сегодня</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
                  {activity.map((a, i) => {
                    const ch = getChild(a.childId)
                    return (
                      <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', background:a.pending?'rgba(245,158,11,.07)':'rgba(255,255,255,.025)', border:a.pending?'1px solid rgba(245,158,11,.2)':'1px solid rgba(255,255,255,.05)', borderRadius:'12px', animation:`fadeUp .3s ease ${i*.04}s both` }}>
                        <div style={{ width:'38px', height:'38px', background:ch.color+'1a', border:`1px solid ${ch.color}30`, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 }}>
                          {ch.avatar}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:'13px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.text}</div>
                          <div style={{ fontSize:'11px', color:'rgba(255,255,255,.35)', marginTop:'2px', display:'flex', gap:'8px' }}>
                            <span>{a.time}</span>
                            {a.pending && <span style={{ color:'#f59e0b', fontWeight:600 }}>● ожидает одобрения</span>}
                          </div>
                        </div>
                        {a.coins !== null && (
                          <div className="mono" style={{ fontSize:'14px', fontWeight:700, color:a.coins>0?'#34d399':'#f87171', flexShrink:0 }}>
                            {a.coins>0?'+':''}{a.coins}💰
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── APPROVALS ─────────────────────────────────────────────────── */}
            {tab === 'approvals' && (
              <div style={{ ...card, padding:'20px' }}>
                <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'14px' }}>Ожидают одобрения · {pending.length}</div>
                {pending.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px 20px', color:'rgba(255,255,255,.3)' }}>
                    <div style={{ fontSize:'48px', marginBottom:'12px' }}>✅</div>
                    <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'4px' }}>Всё обработано!</div>
                    <div style={{ fontSize:'13px' }}>Новые запросы появятся здесь</div>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                    {pending.map(a => {
                      const ch = getChild(a.childId)
                      return (
                        <div key={a.id} style={{ padding:'18px', background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:'14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'13px', marginBottom:'13px' }}>
                            <span style={{ fontSize:'28px' }}>{ch.avatar}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:700, fontSize:'15px' }}>{ch.name} хочет купить</div>
                              <div style={{ color:'#fbbf24', fontWeight:600, marginTop:'3px', fontSize:'14px' }}>{a.text.replace(`${ch.name} хочет `, '')}</div>
                            </div>
                            <div className="mono" style={{ fontSize:'20px', fontWeight:700, color:'#f87171', flexShrink:0 }}>{a.coins}💰</div>
                          </div>
                          <div style={{ display:'flex', gap:'10px' }}>
                            <button className="abtn" onClick={() => approve(a.id)} style={{ flex:1, background:'rgba(52,211,153,.18)', border:'1px solid rgba(52,211,153,.4)', borderRadius:'10px', padding:'11px', color:'#34d399', fontWeight:800, fontSize:'14px' }}>✓ Одобрить</button>
                            <button className="abtn" onClick={() => reject(a.id)}  style={{ flex:1, background:'rgba(248,113,113,.18)', border:'1px solid rgba(248,113,113,.4)', borderRadius:'10px', padding:'11px', color:'#f87171', fontWeight:800, fontSize:'14px' }}>✕ Отклонить</button>
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
                    { v:'108💰', l:'Монет заработано', c:'#8b5cf6', s:'оба ребёнка'     },
                    { v:'4.1',  l:'Средний балл',      c:'#0ea5e9', s:'все предметы'    },
                    { v:'9/14', l:'Дней заполнено',    c:'#34d399', s:'из возможных'    },
                    { v:'5 дн', l:'Спорт',             c:'#f59e0b', s:'на этой неделе'  },
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
                  {[
                    { child:children[0], filled:ADAM_DAYS },
                    { child:children[1], filled:ALIM_DAYS },
                  ].map(({ child:ch, filled }) => (
                    <div key={ch.id} style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' }}>
                      <span style={{ fontSize:'18px', width:'22px', textAlign:'center' }}>{ch.avatar}</span>
                      <div style={{ display:'flex', gap:'5px' }}>
                        {WEEK_DAYS.map((d, i) => (
                          <div key={d} title={`${ch.name} — ${d}`} style={{ width:'34px', height:'34px', borderRadius:'8px', background:filled[i]?ch.color+'cc':'rgba(255,255,255,.05)', border:`1px solid ${filled[i]?ch.color:'rgba(255,255,255,.08)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:filled[i]?'14px':'9px', color:filled[i]?'#fff':'rgba(255,255,255,.3)', cursor:'pointer' }}>
                            {filled[i] ? '✓' : d}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comparison */}
                <div>
                  <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:'12px' }}>🏆 Соревнование</div>
                  {[
                    { l:'Монет за неделю', a:108, b:77,  max:130 },
                    { l:'Ср. балл × 10',  a:43,  b:39,  max:50  },
                    { l:'Дней заполнено', a:6,   b:5,   max:7   },
                  ].map(row => (
                    <div key={row.l} style={{ marginBottom:'12px' }}>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,.4)', marginBottom:'5px' }}>{row.l}</div>
                      {[
                        { e:'🦁', v:row.a, c:'#8b5cf6' },
                        { e:'🐯', v:row.b, c:'#0ea5e9' },
                      ].map(r => (
                        <div key={r.e} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                          <span style={{ fontSize:'13px', width:'18px' }}>{r.e}</span>
                          <div style={{ flex:1, height:'7px', background:'rgba(255,255,255,.07)', borderRadius:'4px', overflow:'hidden' }}>
                            <div style={{ width:`${(r.v/row.max)*100}%`, height:'100%', background:r.c, borderRadius:'4px', transition:'width 1s ease' }} />
                          </div>
                          <span className="mono" style={{ fontSize:'11px', color:r.c, width:'26px', textAlign:'right' }}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── MODAL ──────────────────────────────────────────────────────────── */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.78)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'linear-gradient(135deg,#0c0c22,#14142e)', border:'1px solid rgba(139,92,246,.3)', borderRadius:'22px', padding:'30px', width:'100%', maxWidth:'400px', boxShadow:'0 0 80px rgba(139,92,246,.2)', animation:'fadeUp .2s ease' }}>
            <h2 style={{ margin:'0 0 5px', fontSize:'20px', fontWeight:800 }}>
              {modal.type==='freeze'?'❄️ Заморозить монеты':modal.type==='penalty'?'⚡ Выдать штраф':'🎁 Добавить бонус'}
            </h2>
            <p style={{ margin:'0 0 22px', fontSize:'13px', color:'rgba(255,255,255,.4)' }}>
              Для: {getChild(modal.childId).avatar} {getChild(modal.childId).name}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
              {modal.type !== 'freeze' && (
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'rgba(255,255,255,.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px' }}>Сумма монет</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="например: 10" style={{ width:'100%', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.15)', borderRadius:'10px', padding:'12px 15px', color:'#fff', fontSize:'16px', outline:'none' }} />
                </div>
              )}
              {modal.type === 'freeze' && (
                <div>
                  <label style={{ display:'block', fontSize:'11px', color:'rgba(255,255,255,.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'8px' }}>Длительность</label>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                    {['1 час','1 день','1 нед.'].map(o => (
                      <button key={o} className="abtn" onClick={() => setDuration(o)} style={{ background:duration===o?'rgba(14,165,233,.25)':'rgba(255,255,255,.06)', border:`1px solid ${duration===o?'#0ea5e9':'rgba(255,255,255,.1)'}`, borderRadius:'9px', padding:'11px', color:duration===o?'#38bdf8':'rgba(255,255,255,.5)', fontSize:'13px', fontWeight:700 }}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label style={{ display:'block', fontSize:'11px', color:'rgba(255,255,255,.45)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'6px' }}>Причина</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={modal.type==='freeze'?'Нарушение правил...':modal.type==='penalty'?'За что штраф...':'За что бонус...'} rows={3} style={{ width:'100%', background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.15)', borderRadius:'10px', padding:'12px 15px', color:'#fff', fontSize:'14px', outline:'none', resize:'vertical' }} />
              </div>
              <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
                <button className="abtn" onClick={() => setModal(null)} style={{ flex:1, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', borderRadius:'11px', padding:'13px', color:'rgba(255,255,255,.6)', fontWeight:700 }}>
                  Отмена
                </button>
                <button className="abtn" onClick={submitModal} style={{ flex:2, background:modalAccent.btn, border:'none', borderRadius:'11px', padding:'13px', color:'#fff', fontWeight:800, fontSize:'14px', boxShadow:`0 4px 20px ${modalAccent.glow}` }}>
                  {modalAccent.label}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
