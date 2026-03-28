'use client'

import { useState, useReducer } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChildConfig {
  name: string
  grade: number
  avatar: string
  color: string
}

interface WizardConfig {
  parentName: string
  familyName: string
  numChildren: number
  children: ChildConfig[]
  activities: { grades: boolean; room: boolean; sport: boolean; behavior: boolean }
  coinRules: { g5: number; g4: number; g3: number; g2: number; room: number; sport: number }
  rewards: { id: string; name: string; emoji: string; cost: number; enabled: boolean }[]
  notifications: { dayFilled: boolean; purchase: boolean; streakBroken: boolean; badge: boolean; lowBalance: boolean }
}

type Action =
  | { type: 'SET'; key: keyof WizardConfig; value: unknown }
  | { type: 'SET_CHILD'; idx: number; key: keyof ChildConfig; value: unknown }
  | { type: 'SET_COIN'; key: keyof WizardConfig['coinRules']; value: number }
  | { type: 'TOGGLE_ACTIVITY'; key: keyof WizardConfig['activities'] }
  | { type: 'TOGGLE_NOTIF'; key: keyof WizardConfig['notifications'] }
  | { type: 'TOGGLE_REWARD'; id: string }
  | { type: 'SET_NUM_CHILDREN'; n: number }

const AVATARS = ['🦁','🐯','🐻','🦊','🐸','🐧','🦄','🐲']
const COLORS  = ['#8b5cf6','#0ea5e9','#f59e0b','#10b981','#f43f5e','#6366f1','#ec4899','#14b8a6']

const PRESET_REWARDS = [
  { id:'r1', name:'30 мин YouTube', emoji:'📺', cost:30, enabled:true },
  { id:'r2', name:'Час играть',      emoji:'🎮', cost:50, enabled:true },
  { id:'r3', name:'Поход в кино',    emoji:'🎬', cost:100, enabled:true },
  { id:'r4', name:'Новая книга',     emoji:'📚', cost:80, enabled:true },
  { id:'r5', name:'Любимый ужин',   emoji:'🍕', cost:60, enabled:true },
  { id:'r6', name:'Прогулка в парк', emoji:'🌳', cost:40, enabled:false },
]

const DEFAULT_CHILDREN: ChildConfig[] = Array(4).fill(null).map((_, i) => ({
  name: '', grade: 5, avatar: AVATARS[i], color: COLORS[i],
}))

const INIT: WizardConfig = {
  parentName: '', familyName: '', numChildren: 2,
  children: DEFAULT_CHILDREN,
  activities:    { grades:true, room:true, sport:true, behavior:true },
  coinRules:     { g5:5, g4:3, g3:-3, g2:-5, room:3, sport:10 },
  rewards:       PRESET_REWARDS,
  notifications: { dayFilled:true, purchase:true, streakBroken:true, badge:false, lowBalance:false },
}

function reducer(state: WizardConfig, action: Action): WizardConfig {
  switch (action.type) {
    case 'SET':              return { ...state, [action.key]: action.value }
    case 'SET_CHILD': {
      const ch = [...state.children]
      ch[action.idx] = { ...ch[action.idx], [action.key]: action.value }
      return { ...state, children: ch }
    }
    case 'SET_COIN':         return { ...state, coinRules: { ...state.coinRules, [action.key]: action.value } }
    case 'TOGGLE_ACTIVITY':  return { ...state, activities: { ...state.activities, [action.key]: !state.activities[action.key] } }
    case 'TOGGLE_NOTIF':     return { ...state, notifications: { ...state.notifications, [action.key]: !state.notifications[action.key] } }
    case 'TOGGLE_REWARD':    return { ...state, rewards: state.rewards.map(r => r.id === action.id ? { ...r, enabled: !r.enabled } : r) }
    case 'SET_NUM_CHILDREN': return { ...state, numChildren: action.n }
    default: return state
  }
}

// ─── Illustration components ──────────────────────────────────────────────────

const ILL_WELCOME = () => (
  <div style={{ position:'relative', overflow:'hidden', width:'100%', height:'200px', background:'linear-gradient(135deg,#fef3c7 0%,#fde68a 60%,#fbbf24 100%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
    {/* Concentric rings */}
    {[180,140,100].map((s,i) => (
      <div key={i} style={{ position:'absolute', width:s, height:s, border:`2px solid rgba(251,191,36,${.15+i*.1})`, borderRadius:'50%' }} />
    ))}
    <div style={{ fontSize:'72px', position:'relative', zIndex:2, filter:'drop-shadow(0 8px 24px rgba(0,0,0,.15))' }}>🌟</div>
    {[['20%','18%','💰','20px'],['75%','25%','⭐','16px'],['15%','65%','✨','18px'],['80%','70%','🎯','20px'],['50%','15%','🏆','15px']].map(([l,t,e,fs]) => (
      <div key={l+t} style={{ position:'absolute', left:l as string, top:t as string, fontSize:fs as string, opacity:.7 }}>{e}</div>
    ))}
  </div>
)

const ILL_FAMILY = () => (
  <div style={{ position:'relative', overflow:'hidden', width:'100%', height:'200px', background:'linear-gradient(135deg,#fff7ed 0%,#fed7aa 100%)', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingBottom:'16px' }}>
    {/* House */}
    <svg width="180" height="160" viewBox="0 0 180 160" style={{ position:'absolute', bottom:0 }}>
      {/* Roof */}
      <polygon points="20,80 90,10 160,80" fill="#f97316" />
      <polygon points="20,80 90,15 160,80" fill="#ea580c" fillOpacity=".3" />
      {/* Body */}
      <rect x="30" y="78" width="120" height="82" fill="#fff" rx="4" />
      {/* Door */}
      <rect x="74" y="108" width="32" height="52" fill="#fb923c" rx="4" />
      <circle cx="100" cy="135" r="3" fill="#fff" />
      {/* Windows */}
      <rect x="40" y="92" width="28" height="24" fill="#bae6fd" rx="3" />
      <rect x="112" y="92" width="28" height="24" fill="#bae6fd" rx="3" />
      {/* Chimney */}
      <rect x="120" y="26" width="16" height="36" fill="#ef4444" />
      <rect x="116" y="22" width="24" height="8" fill="#dc2626" rx="2" />
    </svg>
    {/* Family members peeking */}
    <div style={{ position:'absolute', bottom:'50px', left:'44px', fontSize:'22px' }}>👨</div>
    <div style={{ position:'absolute', bottom:'50px', right:'44px', fontSize:'22px' }}>👩</div>
    <div style={{ position:'absolute', bottom:'30px', left:'66px', fontSize:'18px' }}>👦</div>
    <div style={{ position:'absolute', bottom:'30px', right:'66px', fontSize:'18px' }}>👧</div>
  </div>
)

const ILL_CHILDREN = ({ n }: { n: number }) => (
  <div style={{ width:'100%', height:'200px', background:'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%)', display:'flex', alignItems:'center', justifyContent:'center', gap:'16px' }}>
    {Array(n).fill(null).map((_, i) => (
      <div key={i} style={{ width:'72px', height:'72px', borderRadius:'50%', background:COLORS[i], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'36px', boxShadow:`0 8px 24px ${COLORS[i]}55`, transform:`translateY(${i%2===0?0:-12}px)` }}>
        {AVATARS[i]}
      </div>
    ))}
  </div>
)

const ILL_CALENDAR = () => (
  <div style={{ width:'100%', height:'200px', background:'linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
    <div style={{ background:'#fff', borderRadius:'16px', padding:'16px', boxShadow:'0 8px 32px rgba(59,130,246,.2)' }}>
      <div style={{ fontSize:'11px', fontWeight:700, color:'#3b82f6', textAlign:'center', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'.06em' }}>Март 2026</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,32px)', gap:'3px' }}>
        {'ПнВтСрЧтПтСбВс'.match(/.{2}/g)!.map(d => (
          <div key={d} style={{ height:'16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'9px', color:'#94a3b8', fontWeight:600 }}>{d}</div>
        ))}
        {Array(31).fill(null).map((_, i) => {
          const isWeekend = (i+0) % 7 >= 5
          const isHoliday = [7,8,9].includes(i)
          const bg = isHoliday ? '#fef3c7' : isWeekend ? '#f0fdf4' : '#eff6ff'
          const color = isHoliday ? '#f59e0b' : isWeekend ? '#10b981' : '#3b82f6'
          return (
            <div key={i} style={{ width:'32px', height:'32px', borderRadius:'6px', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:600, color }}>
              {i+1}
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:'12px', marginTop:'10px' }}>
        {[['#eff6ff','#3b82f6','Учёба'],['#f0fdf4','#10b981','Выходные'],['#fef3c7','#f59e0b','Каникулы']].map(([bg,c,l]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
            <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:bg, border:`1.5px solid ${c}` }} />
            <span style={{ fontSize:'9px', color:'#64748b' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const ILL_ACTIVITIES = () => (
  <div style={{ width:'100%', height:'200px', background:'linear-gradient(135deg,#fdf4ff 0%,#f3e8ff 100%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
      {[['📚','Учёба','#8b5cf6'],['🧹','Комната','#0ea5e9'],['⚽','Спорт','#10b981'],['😊','Поведение','#f59e0b']].map(([e,l,c]) => (
        <div key={l} style={{ width:'80px', height:'80px', background:'#fff', borderRadius:'16px', boxShadow:`0 6px 20px ${c}33`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'6px', border:`2px solid ${c}30` }}>
          <span style={{ fontSize:'28px' }}>{e}</span>
          <span style={{ fontSize:'11px', fontWeight:700, color:c }}>{l}</span>
        </div>
      ))}
    </div>
  </div>
)

const ILL_COINS = () => (
  <div style={{ width:'100%', height:'200px', background:'linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%)', display:'flex', alignItems:'center', justifyContent:'center', gap:'20px' }}>
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r="42" fill="#f59e0b" />
      <circle cx="45" cy="45" r="38" fill="#fbbf24" />
      <circle cx="45" cy="45" r="30" fill="#f59e0b" fillOpacity=".5" />
      <text x="45" y="52" textAnchor="middle" fontSize="28" fontWeight="bold" fill="#fff">💰</text>
    </svg>
    <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
      {[['5','#10b981','+5💰'],['4','#3b82f6','+3💰'],['3','#f59e0b','−3💰'],['2','#ef4444','−5💰']].map(([grade,c,coins]) => (
        <div key={grade} style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'7px', background:c, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:800, color:'#fff' }}>{grade}</div>
          <span style={{ fontSize:'14px', fontWeight:700, color:c }}>{coins}</span>
        </div>
      ))}
    </div>
  </div>
)

const ILL_REWARDS = () => (
  <div style={{ width:'100%', height:'200px', background:'linear-gradient(135deg,#fdf2f8 0%,#fce7f3 100%)', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px' }}>
    {['🎁','🏆','⭐','🎮','📺'].map((e,i) => (
      <div key={i} style={{ background:'#fff', borderRadius:'14px', width:'60px', height:'60px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px', boxShadow:'0 6px 20px rgba(236,72,153,.15)', transform:`rotate(${(i-2)*5}deg) translateY(${Math.abs(i-2)*4}px)` }}>
        {e}
      </div>
    ))}
  </div>
)

const ILL_NOTIF = () => (
  <div style={{ width:'100%', height:'200px', background:'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
    <svg width="90" height="100" viewBox="0 0 90 100">
      <path d="M45 10 C45 10, 20 25, 20 55 L20 70 L70 70 L70 55 C70 25, 45 10, 45 10Z" fill="#0ea5e9" />
      <rect x="20" y="68" width="50" height="8" rx="4" fill="#0284c7" />
      <ellipse cx="45" cy="80" rx="10" ry="6" fill="#bae6fd" />
      <circle cx="45" cy="8" r="5" fill="#f59e0b" />
    </svg>
    {[['8px','20px','#f59e0b','📚 Балл'],['62px','14px','#10b981','✅ День'],['68px','55px','#f43f5e','🛒 Покупка']].map(([l,t,c,label]) => (
      <div key={label} style={{ position:'absolute', left:l as string, top:t as string, background:'#fff', borderRadius:'20px', padding:'4px 10px', fontSize:'11px', fontWeight:700, color:c, boxShadow:`0 4px 12px ${c}33`, border:`1px solid ${c}30` }}>
        {label}
      </div>
    ))}
  </div>
)

const ILL_DONE = ({ names }: { names: string[] }) => (
  <div style={{ width:'100%', height:'200px', background:'linear-gradient(135deg,#f0fdf4 0%,#dcfce7 50%,#d1fae5 100%)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
    {/* Confetti dots */}
    {['#f59e0b','#3b82f6','#10b981','#f43f5e','#8b5cf6','#f97316'].map((c,i) => (
      Array(4).fill(null).map((_,j) => (
        <div key={c+j} style={{ position:'absolute', width:'8px', height:'8px', background:c, borderRadius:j%2===0?'50%':'2px', left:`${10+i*15+j*3}%`, top:`${10+j*20}%`, opacity:.7, transform:`rotate(${i*30+j*45}deg)` }} />
      ))
    ))}
    <div style={{ textAlign:'center', zIndex:1 }}>
      <div style={{ fontSize:'64px', filter:'drop-shadow(0 8px 20px rgba(0,0,0,.1))' }}>🏆</div>
      <div style={{ marginTop:'8px', display:'flex', gap:'8px', justifyContent:'center' }}>
        {names.slice(0,3).map((n,i) => (
          <div key={i} style={{ background:'#fff', borderRadius:'20px', padding:'4px 12px', fontSize:'12px', fontWeight:700, color:COLORS[i], boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}>{n||`Ребёнок ${i+1}`}</div>
        ))}
      </div>
    </div>
  </div>
)

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp: React.CSSProperties = {
  width:'100%', padding:'13px 16px',
  border:'2px solid #e5e7eb', borderRadius:'12px',
  fontSize:'16px', color:'#111827', outline:'none',
  background:'#fff', transition:'border-color .15s',
}

const Toggle = ({ on, onClick }: { on: boolean; onClick: () => void }) => (
  <button onClick={onClick} style={{ width:'44px', height:'24px', borderRadius:'12px', background:on?'#10b981':'#d1d5db', border:'none', cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0 }}>
    <div style={{ position:'absolute', top:'3px', left:on?'23px':'3px', width:'18px', height:'18px', background:'#fff', borderRadius:'50%', transition:'left .2s', boxShadow:'0 1px 4px rgba(0,0,0,.2)' }} />
  </button>
)

// ─── Step components ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div style={{ textAlign:'center' }}>
        <h1 style={{ margin:'0 0 8px', fontSize:'26px', fontWeight:900, color:'#111827', letterSpacing:'-.02em' }}>Давайте познакомимся! 👋</h1>
        <p style={{ margin:0, fontSize:'15px', color:'#6b7280', lineHeight:1.6, maxWidth:'320px', marginInline:'auto' }}>Настроим приложение за 2 минуты — и ваши дети начнут зарабатывать монеты за всё хорошее</p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
        {[
          ['🏆','Монеты за оценки, уборку, спорт — всё считается'],
          ['🛒','Дети тратят монеты на реальные призы'],
          ['📅','Мотивация работает в школе, дома и на каникулах'],
          ['🛡️','Вы одобряете покупки и видите всю активность'],
        ].map(([icon, text]) => (
          <div key={text} style={{ display:'flex', alignItems:'center', gap:'12px', background:'#f9fafb', borderRadius:'12px', padding:'13px 16px' }}>
            <span style={{ fontSize:'22px', flexShrink:0 }}>{icon}</span>
            <span style={{ fontSize:'14px', color:'#374151', fontWeight:500 }}>{text}</span>
          </div>
        ))}
      </div>
      <button onClick={onNext} style={{ width:'100%', padding:'16px', background:'linear-gradient(135deg,#f59e0b,#f97316)', border:'none', borderRadius:'14px', fontSize:'17px', fontWeight:800, color:'#fff', cursor:'pointer', boxShadow:'0 8px 24px rgba(245,158,11,.4)' }}>
        Начать настройку →
      </button>
    </div>
  )
}

function StepFamily({ config, dispatch }: { config: WizardConfig; dispatch: React.Dispatch<Action> }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div>
        <h1 style={{ margin:'0 0 6px', fontSize:'22px', fontWeight:900, color:'#111827' }}>О вашей семье</h1>
        <p style={{ margin:0, fontSize:'14px', color:'#6b7280' }}>Как вас зовут и сколько детей?</p>
      </div>
      <div>
        <label style={{ display:'block', fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>Ваше имя (родитель)</label>
        <input style={inp} placeholder="Например: Мама или Папа" value={config.parentName} onChange={e => dispatch({ type:'SET', key:'parentName', value:e.target.value })} />
      </div>
      <div>
        <label style={{ display:'block', fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>Название семьи</label>
        <input style={inp} placeholder="Например: Семья Ивановых" value={config.familyName} onChange={e => dispatch({ type:'SET', key:'familyName', value:e.target.value })} />
      </div>
      <div>
        <label style={{ display:'block', fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'12px' }}>Сколько детей?</label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px' }}>
          {[1,2,3,4].map(n => (
            <button key={n} onClick={() => dispatch({ type:'SET_NUM_CHILDREN', n })} style={{ padding:'16px 8px', borderRadius:'14px', border:`2px solid ${config.numChildren===n?'#f59e0b':'#e5e7eb'}`, background:config.numChildren===n?'#fffbeb':'#fff', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', transition:'all .15s' }}>
              <span style={{ fontSize:'28px' }}>{['👶','👨‍👩‍👦','👨‍👩‍👧‍👦','👨‍👩‍👧‍👦‍👦'][n-1]}</span>
              <span style={{ fontSize:'20px', fontWeight:900, color:config.numChildren===n?'#f59e0b':'#374151' }}>{n}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepChildren({ config, dispatch }: { config: WizardConfig; dispatch: React.Dispatch<Action> }) {
  const [activeChild, setActiveChild] = useState(0)
  const c = config.children[activeChild]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div>
        <h1 style={{ margin:'0 0 6px', fontSize:'22px', fontWeight:900, color:'#111827' }}>Ваши дети</h1>
        <p style={{ margin:0, fontSize:'14px', color:'#6b7280' }}>Расскажите о каждом ребёнке</p>
      </div>

      {/* Child tabs */}
      {config.numChildren > 1 && (
        <div style={{ display:'flex', gap:'8px' }}>
          {Array(config.numChildren).fill(null).map((_, i) => (
            <button key={i} onClick={() => setActiveChild(i)} style={{ flex:1, padding:'10px', borderRadius:'10px', border:`2px solid ${activeChild===i?COLORS[i]:'#e5e7eb'}`, background:activeChild===i?COLORS[i]+'15':'#fff', cursor:'pointer', fontWeight:700, fontSize:'14px', color:activeChild===i?COLORS[i]:'#6b7280', transition:'all .15s' }}>
              {config.children[i].avatar || AVATARS[i]} {config.children[i].name || `Ребёнок ${i+1}`}
            </button>
          ))}
        </div>
      )}

      {/* Name */}
      <div>
        <label style={{ display:'block', fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>Имя</label>
        <input style={inp} placeholder="Имя ребёнка" value={c.name} onChange={e => dispatch({ type:'SET_CHILD', idx:activeChild, key:'name', value:e.target.value })} />
      </div>

      {/* Grade */}
      <div>
        <label style={{ display:'block', fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>Класс</label>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          {Array(11).fill(null).map((_,i) => (
            <button key={i+1} onClick={() => dispatch({ type:'SET_CHILD', idx:activeChild, key:'grade', value:i+1 })} style={{ width:'40px', height:'40px', borderRadius:'10px', border:`2px solid ${c.grade===i+1?COLORS[activeChild]:'#e5e7eb'}`, background:c.grade===i+1?COLORS[activeChild]:'#fff', color:c.grade===i+1?'#fff':'#374151', fontWeight:700, fontSize:'14px', cursor:'pointer', transition:'all .15s' }}>
              {i+1}
            </button>
          ))}
        </div>
      </div>

      {/* Avatar */}
      <div>
        <label style={{ display:'block', fontSize:'13px', fontWeight:700, color:'#374151', marginBottom:'8px' }}>Аватар</label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:'6px' }}>
          {AVATARS.map(a => (
            <button key={a} onClick={() => dispatch({ type:'SET_CHILD', idx:activeChild, key:'avatar', value:a })} style={{ width:'40px', height:'40px', borderRadius:'10px', border:`2px solid ${c.avatar===a?COLORS[activeChild]:'transparent'}`, background:c.avatar===a?COLORS[activeChild]+'15':'#f9fafb', fontSize:'22px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s' }}>
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function StepCalendar() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div>
        <h1 style={{ margin:'0 0 6px', fontSize:'22px', fontWeight:900, color:'#111827' }}>Учебный календарь</h1>
        <p style={{ margin:0, fontSize:'14px', color:'#6b7280' }}>Приложение работает каждый день, не только в школе</p>
      </div>
      <div style={{ background:'#eff6ff', borderRadius:'14px', padding:'16px', border:'1px solid #bfdbfe' }}>
        <p style={{ margin:'0 0 10px', fontSize:'15px', fontWeight:700, color:'#1d4ed8' }}>💡 Мотивация без выходных</p>
        <p style={{ margin:0, fontSize:'14px', color:'#1e40af', lineHeight:1.7 }}>
          В учебные дни дети зарабатывают монеты за оценки и уборку.<br/>
          В выходные и каникулы — за помощь по дому, прогулки, чтение.<br/>
          <strong>Приложение мотивирует всегда — за любую активность.</strong>
        </p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
        {[
          ['#eff6ff','#3b82f6','📚','Учебные дни','Оценки, домашние задания, поведение'],
          ['#f0fdf4','#10b981','🏠','Выходные','Уборка комнаты, помощь, домашние задания'],
          ['#fef3c7','#f59e0b','🌴','Каникулы','Чтение, спорт, помощь дома — всё вознаграждается'],
        ].map(([bg, c, icon, title, desc]) => (
          <div key={title} style={{ background:bg as string, border:`1px solid ${c}33`, borderRadius:'12px', padding:'14px 16px', display:'flex', gap:'12px' }}>
            <span style={{ fontSize:'24px', flexShrink:0 }}>{icon}</span>
            <div>
              <div style={{ fontSize:'14px', fontWeight:700, color:c as string, marginBottom:'3px' }}>{title}</div>
              <div style={{ fontSize:'13px', color:'#6b7280' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepActivities({ config, dispatch }: { config: WizardConfig; dispatch: React.Dispatch<Action> }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div>
        <h1 style={{ margin:'0 0 6px', fontSize:'22px', fontWeight:900, color:'#111827' }}>Виды активностей</h1>
        <p style={{ margin:0, fontSize:'14px', color:'#6b7280' }}>Выберите, что будем отслеживать и вознаграждать</p>
      </div>
      {[
        { key:'grades'   as const, icon:'📚', title:'Оценки',    desc:'5→+5💰, 4→+3💰, 3→−3💰, 2→−5💰', color:'#8b5cf6' },
        { key:'room'     as const, icon:'🧹', title:'Комната',   desc:'Уборка (≥3/5 пунктов) → +3💰 в день',  color:'#0ea5e9' },
        { key:'sport'    as const, icon:'⚽', title:'Спорт',     desc:'Тренировки и секции → монеты за занятие', color:'#10b981' },
        { key:'behavior' as const, icon:'😊', title:'Поведение', desc:'Хорошее поведение → +5💰 в день',      color:'#f59e0b' },
      ].map(a => (
        <div key={a.key} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'16px', background:'#f9fafb', borderRadius:'14px', border:'1px solid #e5e7eb' }}>
          <span style={{ fontSize:'28px', flexShrink:0 }}>{a.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'15px', fontWeight:700, color:'#111827', marginBottom:'3px' }}>{a.title}</div>
            <div style={{ fontSize:'12px', color:'#6b7280' }}>{a.desc}</div>
          </div>
          <Toggle on={config.activities[a.key]} onClick={() => dispatch({ type:'TOGGLE_ACTIVITY', key:a.key })} />
        </div>
      ))}
    </div>
  )
}

function StepCoinRules({ config, dispatch }: { config: WizardConfig; dispatch: React.Dispatch<Action> }) {
  const rules = config.coinRules
  const preview = config.children.slice(0, config.numChildren).map(c => c.name || 'Ребёнок')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div>
        <h1 style={{ margin:'0 0 6px', fontSize:'22px', fontWeight:900, color:'#111827' }}>Правила монет</h1>
        <p style={{ margin:0, fontSize:'14px', color:'#6b7280' }}>Настройте, сколько монет зарабатывает каждое действие</p>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {[
          { key:'g5' as const, label:'Оценка 5', color:'#10b981', icon:'⭐' },
          { key:'g4' as const, label:'Оценка 4', color:'#3b82f6', icon:'✅' },
          { key:'g3' as const, label:'Оценка 3', color:'#f59e0b', icon:'⚠️' },
          { key:'g2' as const, label:'Оценка 2', color:'#ef4444', icon:'❌' },
          { key:'room' as const, label:'Уборка комнаты', color:'#0ea5e9', icon:'🧹' },
          { key:'sport' as const, label:'Спорт/тренировка', color:'#8b5cf6', icon:'⚽' },
        ].map(r => (
          <div key={r.key} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <span style={{ fontSize:'18px', width:'24px', textAlign:'center', flexShrink:0 }}>{r.icon}</span>
            <div style={{ flex:1, fontSize:'14px', fontWeight:600, color:'#374151' }}>{r.label}</div>
            <input type="range" min={r.key==='g2'||r.key==='g3'?-15:0} max={r.key==='g5'||r.key==='sport'?20:15} value={rules[r.key]} onChange={e => dispatch({ type:'SET_COIN', key:r.key, value:Number(e.target.value) })} style={{ width:'90px', accentColor:r.color }} />
            <div style={{ fontFamily:'monospace', fontSize:'15px', fontWeight:700, color:rules[r.key]>=0?r.color:'#ef4444', width:'48px', textAlign:'right' }}>
              {rules[r.key]>=0?'+':''}{rules[r.key]}💰
            </div>
          </div>
        ))}
      </div>
      {/* Preview */}
      <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'12px', padding:'14px 16px' }}>
        <div style={{ fontSize:'12px', fontWeight:700, color:'#92400e', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'8px' }}>Пример сегодня</div>
        <div style={{ fontSize:'14px', color:'#78350f', lineHeight:1.8 }}>
          Если <strong>{preview[0]||'ребёнок'}</strong> получит 5 по математике → <strong style={{ color:'#10b981' }}>+{rules.g5}💰</strong><br/>
          и уберёт комнату → <strong style={{ color:'#0ea5e9' }}>+{rules.room}💰</strong><br/>
          Итого за день: <strong style={{ color:'#f59e0b' }}>{rules.g5+rules.room}💰</strong> 🎉
        </div>
      </div>
    </div>
  )
}

function StepRewards({ config, dispatch }: { config: WizardConfig; dispatch: React.Dispatch<Action> }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div>
        <h1 style={{ margin:'0 0 6px', fontSize:'22px', fontWeight:900, color:'#111827' }}>Магазин наград</h1>
        <p style={{ margin:0, fontSize:'14px', color:'#6b7280' }}>Выберите, на что дети смогут тратить монеты</p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
        {config.rewards.map(r => (
          <button key={r.id} onClick={() => dispatch({ type:'TOGGLE_REWARD', id:r.id })} style={{ padding:'14px', borderRadius:'14px', border:`2px solid ${r.enabled?'#10b981':'#e5e7eb'}`, background:r.enabled?'#f0fdf4':'#fff', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'flex-start', gap:'6px', transition:'all .15s', textAlign:'left' }}>
            <div style={{ display:'flex', justifyContent:'space-between', width:'100%', alignItems:'center' }}>
              <span style={{ fontSize:'24px' }}>{r.emoji}</span>
              <div style={{ width:'20px', height:'20px', borderRadius:'50%', background:r.enabled?'#10b981':'#e5e7eb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px' }}>
                {r.enabled?'✓':''}
              </div>
            </div>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#111827' }}>{r.name}</div>
            <div style={{ fontSize:'12px', color:'#10b981', fontWeight:600 }}>{r.cost}💰</div>
          </button>
        ))}
      </div>
      <div style={{ background:'#f9fafb', borderRadius:'12px', padding:'14px 16px', border:'1px dashed #d1d5db', textAlign:'center', color:'#9ca3af', fontSize:'14px' }}>
        ➕ Добавить свою награду можно в Настройках
      </div>
    </div>
  )
}

function StepNotifications({ config, dispatch }: { config: WizardConfig; dispatch: React.Dispatch<Action> }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div>
        <h1 style={{ margin:'0 0 6px', fontSize:'22px', fontWeight:900, color:'#111827' }}>Уведомления</h1>
        <p style={{ margin:0, fontSize:'14px', color:'#6b7280' }}>Когда вас уведомлять?</p>
      </div>
      {[
        { key:'dayFilled'    as const, icon:'📅', title:'День заполнен',          desc:'Адам заполнил день, +15💰'         },
        { key:'purchase'     as const, icon:'🛒', title:'Запрос на покупку',       desc:'Алим хочет купить «Поход в кино»'  },
        { key:'streakBroken' as const, icon:'🔥', title:'Серия прервана',          desc:'Адам не заполнил день вчера'       },
        { key:'badge'        as const, icon:'🏅', title:'Новый значок',            desc:'Алим получил «Отличник недели»'    },
        { key:'lowBalance'   as const, icon:'💰', title:'Низкий баланс',           desc:'Адам — меньше 20 монет'            },
      ].map(n => (
        <div key={n.key} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px', background:'#f9fafb', borderRadius:'12px', border:'1px solid #e5e7eb' }}>
          <span style={{ fontSize:'24px', flexShrink:0 }}>{n.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:'14px', fontWeight:700, color:'#111827', marginBottom:'2px' }}>{n.title}</div>
            <div style={{ fontSize:'12px', color:'#9ca3af', fontStyle:'italic' }}>«{n.desc}»</div>
          </div>
          <Toggle on={config.notifications[n.key]} onClick={() => dispatch({ type:'TOGGLE_NOTIF', key:n.key })} />
        </div>
      ))}
    </div>
  )
}

function StepDone({ config }: { config: WizardConfig }) {
  const names = config.children.slice(0, config.numChildren).map(c => c.name)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'56px', marginBottom:'10px' }}>🎉</div>
        <h1 style={{ margin:'0 0 8px', fontSize:'26px', fontWeight:900, color:'#111827' }}>Всё готово!</h1>
        <p style={{ margin:0, fontSize:'15px', color:'#6b7280' }}>Ваша семья настроена и готова к мотивации</p>
      </div>
      <div style={{ background:'#f9fafb', borderRadius:'14px', padding:'18px', display:'flex', flexDirection:'column', gap:'12px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px', paddingBottom:'10px', borderBottom:'1px solid #e5e7eb' }}>
          <span style={{ color:'#6b7280' }}>👤 Родитель</span>
          <span style={{ fontWeight:700, color:'#111827' }}>{config.parentName || '—'}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px', paddingBottom:'10px', borderBottom:'1px solid #e5e7eb' }}>
          <span style={{ color:'#6b7280' }}>🏠 Семья</span>
          <span style={{ fontWeight:700, color:'#111827' }}>{config.familyName || '—'}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px', paddingBottom:'10px', borderBottom:'1px solid #e5e7eb' }}>
          <span style={{ color:'#6b7280' }}>👧 Дети</span>
          <span style={{ fontWeight:700, color:'#111827' }}>{names.filter(Boolean).join(', ') || '—'}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px' }}>
          <span style={{ color:'#6b7280' }}>🏆 Активных наград</span>
          <span style={{ fontWeight:700, color:'#10b981' }}>{config.rewards.filter(r=>r.enabled).length} шт.</span>
        </div>
      </div>
      <button onClick={() => { console.log('Wizard config:', config); window.location.href = '/dashboard' }} style={{ width:'100%', padding:'16px', background:'linear-gradient(135deg,#10b981,#059669)', border:'none', borderRadius:'14px', fontSize:'17px', fontWeight:800, color:'#fff', cursor:'pointer', boxShadow:'0 8px 24px rgba(16,185,129,.4)' }}>
        🚀 Перейти в приложение
      </button>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const TOTAL = 9

const STEP_TITLES = [
  'Добро пожаловать','О семье','Ваши дети','Календарь',
  'Активности','Монеты','Награды','Уведомления','Готово!',
]

export default function OnboardingV2() {
  const [config, dispatch] = useReducer(reducer, INIT)
  const [step, setStep]     = useState(0)
  const [dir, setDir]       = useState<1|-1>(1)
  const [anim, setAnim]     = useState(false)

  const go = (delta: 1 | -1) => {
    if (anim) return
    setDir(delta); setAnim(true)
    setTimeout(() => { setStep(s => s + delta); setAnim(false) }, 220)
  }

  const next = () => go(1)
  const back = () => go(-1)

  const illustrations: React.ReactNode[] = [
    <ILL_WELCOME />,
    <ILL_FAMILY />,
    <ILL_CHILDREN n={config.numChildren} />,
    <ILL_CALENDAR />,
    <ILL_ACTIVITIES />,
    <ILL_COINS />,
    <ILL_REWARDS />,
    <ILL_NOTIF />,
    <ILL_DONE names={config.children.slice(0,config.numChildren).map(c=>c.name)} />,
  ]

  const stepContent = [
    <StepWelcome onNext={next} />,
    <StepFamily config={config} dispatch={dispatch} />,
    <StepChildren config={config} dispatch={dispatch} />,
    <StepCalendar />,
    <StepActivities config={config} dispatch={dispatch} />,
    <StepCoinRules config={config} dispatch={dispatch} />,
    <StepRewards config={config} dispatch={dispatch} />,
    <StepNotifications config={config} dispatch={dispatch} />,
    <StepDone config={config} />,
  ]

  const isLast = step === TOTAL - 1
  const isFirst = step === 0

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#fdf8ef 0%,#fef3c7 50%,#fdf8ef 100%)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'24px 16px 40px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing:border-box; font-family:'Nunito', system-ui, sans-serif; }
        @keyframes slideInR { from{opacity:0;transform:translateX(60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideInL { from{opacity:0;transform:translateX(-60px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        input:focus { border-color:#f59e0b !important; box-shadow:0 0 0 3px rgba(245,158,11,.15) !important; }
        input[type=range] { height:6px; cursor:pointer; }
        ::-webkit-scrollbar { width:4px } ::-webkit-scrollbar-thumb { background:#f59e0b55; border-radius:2px }
      `}</style>

      <div style={{ width:'100%', maxWidth:'460px', background:'#fff', borderRadius:'24px', boxShadow:'0 24px 80px rgba(0,0,0,.1)', overflow:'hidden' }}>

        {/* Progress bar */}
        <div style={{ padding:'16px 20px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
            <span style={{ fontSize:'12px', color:'#9ca3af', fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em' }}>{STEP_TITLES[step]}</span>
            <span style={{ fontSize:'12px', color:'#9ca3af', fontWeight:700 }}>{step+1}/{TOTAL}</span>
          </div>
          <div style={{ height:'6px', background:'#f3f4f6', borderRadius:'3px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${((step+1)/TOTAL)*100}%`, background:'linear-gradient(90deg,#f59e0b,#f97316)', borderRadius:'3px', transition:'width .4s cubic-bezier(.4,0,.2,1)' }} />
          </div>
          {/* Dot indicators */}
          <div style={{ display:'flex', justifyContent:'center', gap:'6px', marginTop:'10px' }}>
            {Array(TOTAL).fill(null).map((_,i) => (
              <div key={i} style={{ width:i===step?20:6, height:6, borderRadius:'3px', background:i<=step?'#f59e0b':'#e5e7eb', transition:'all .3s ease' }} />
            ))}
          </div>
        </div>

        {/* Illustration */}
        <div style={{ marginTop:'16px' }}>
          {illustrations[step]}
        </div>

        {/* Step content */}
        <div key={step} style={{ padding:'24px', animation:`${dir>0?'slideInR':'slideInL'} .25s ease` }}>
          {stepContent[step]}

          {/* Navigation (not shown for step 0 which has its own CTA, or last step) */}
          {!isFirst && !isLast && (
            <div style={{ display:'flex', gap:'10px', marginTop:'24px' }}>
              <button onClick={back} style={{ flex:1, padding:'14px', background:'#f9fafb', border:'2px solid #e5e7eb', borderRadius:'12px', fontSize:'15px', fontWeight:700, color:'#6b7280', cursor:'pointer', transition:'all .15s' }}>
                ← Назад
              </button>
              {step < TOTAL - 1 && (
                <button onClick={next} style={{ flex:2, padding:'14px', background:'linear-gradient(135deg,#f59e0b,#f97316)', border:'none', borderRadius:'12px', fontSize:'15px', fontWeight:800, color:'#fff', cursor:'pointer', boxShadow:'0 6px 18px rgba(245,158,11,.35)', transition:'all .15s' }}>
                  Далее →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
