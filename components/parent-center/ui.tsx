'use client'

import { useState, CSSProperties, ReactNode } from 'react'
import { T } from './tokens'
import type { ParentChild } from './types'

// ───────── Icons ─────────
const PATHS: Record<string, ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></>,
  users: <><circle cx="9" cy="9" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="8" r="2.6"/><path d="M15 14.4c3 .4 5.5 2.5 5.5 5.6"/></>,
  tasks: <><path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h13"/><path d="M18 11l1.6 1.6L22 10"/></>,
  shop: <><path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></>,
  chart: <><path d="M4 20V6"/><path d="M4 20h16"/><path d="M8 16V12"/><path d="M12 16V9"/><path d="M16 16v-5"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .4 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.4 1.7 1.7 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .4-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.4H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.4 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z"/></>,
  plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
  check: <><path d="M5 12.5 10 17l9-10"/></>,
  x: <><path d="M6 6l12 12"/><path d="M18 6 6 18"/></>,
  chevL: <><path d="M15 6l-6 6 6 6"/></>,
  chevR: <><path d="M9 6l6 6-6 6"/></>,
  chevD: <><path d="M6 9l6 6 6-6"/></>,
  bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5"/><path d="M4 16h16"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
  flame: <><path d="M12 3s1 3 3 5 3 3 3 6a6 6 0 0 1-12 0c0-3 2-4 3-6 .7-1.4 1-3 1-5 0 0 2 0 2 0Z"/></>,
  search: <><circle cx="11" cy="11" r="6"/><path d="m20 20-4-4"/></>,
  filter: <><path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></>,
  edit: <><path d="M14 5l5 5"/><path d="M4 20l5-1 11-11-4-4L5 15 4 20Z"/></>,
  trash: <><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/></>,
  star: <><path d="M12 3l2.7 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.3 6.5 20.3 7.6 14 3 9.6l6.3-.9L12 3Z"/></>,
  warn: <><path d="M12 4 2 20h20L12 4Z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/></>,
  snow: <><path d="M12 3v18"/><path d="M3 12h18"/><path d="m5.6 5.6 12.8 12.8"/><path d="m18.4 5.6-12.8 12.8"/></>,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2"/></>,
  msg: <><path d="M4 5h16v11H8l-4 4V5Z"/></>,
  dots: <><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></>,
  clock: <><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></>,
  download: <><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/></>,
  send: <><path d="M4 4l17 8L4 20l3-8-3-8Z"/><path d="M7 12h14"/></>,
  mic: <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></>,
}

export function Icon({ name, size = 20, color = 'currentColor', stroke = 1.6 }: {
  name: string; size?: number; color?: string; stroke?: number
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {PATHS[name] || null}
    </svg>
  )
}

// ───────── Card ─────────
export function Card({ children, style, pad = 16, hover, glow, onClick }: {
  children: ReactNode; style?: CSSProperties; pad?: number
  hover?: boolean; glow?: boolean; onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHovered(true)}
      onMouseLeave={() => hover && setHovered(false)}
      style={{
        background: hover && hovered ? T.cardHi : T.card,
        border: `1px solid ${hover && hovered ? T.cardBorderHi : T.cardBorder}`,
        borderRadius: T.rL,
        padding: pad,
        boxShadow: glow
          ? `0 0 0 1px ${T.indigoSoft}, 0 8px 24px rgba(108,92,231,0.12)`
          : '0 1px 0 rgba(255,255,255,0.02), 0 10px 30px rgba(0,0,0,0.25)',
        transition: 'border-color .18s ease, background .18s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ───────── Button ─────────
type BtnVariant = 'primary' | 'cyan' | 'success' | 'warn' | 'danger' | 'ghost' | 'solid' | 'outline'
type BtnSize = 'sm' | 'md' | 'lg'

export function Btn({ variant = 'ghost', size = 'md', children, icon, onClick, style, full, disabled }: {
  variant?: BtnVariant; size?: BtnSize; children?: ReactNode
  icon?: string; onClick?: () => void; style?: CSSProperties
  full?: boolean; disabled?: boolean
}) {
  const [hover, setHover] = useState(false)
  const palettes: Record<BtnVariant, { bg: string; fg: string; bd: string; hBg: string }> = {
    primary: { bg: T.indigo, fg: '#fff', bd: T.indigo, hBg: T.indigoHi },
    cyan: { bg: T.cyan, fg: '#04131A', bd: T.cyan, hBg: '#4DDCFF' },
    success: { bg: T.successSoft, fg: T.success, bd: 'rgba(0,230,118,0.25)', hBg: 'rgba(0,230,118,0.18)' },
    warn: { bg: T.warningSoft, fg: T.warning, bd: 'rgba(255,217,61,0.25)', hBg: 'rgba(255,217,61,0.18)' },
    danger: { bg: T.dangerSoft, fg: T.danger, bd: 'rgba(255,107,107,0.25)', hBg: 'rgba(255,107,107,0.18)' },
    ghost: { bg: 'rgba(255,255,255,0.04)', fg: T.text, bd: T.cardBorder, hBg: 'rgba(255,255,255,0.08)' },
    solid: { bg: T.cardHi, fg: T.text, bd: T.cardBorderHi, hBg: '#2A2A3D' },
    outline: { bg: 'transparent', fg: T.textDim, bd: T.cardBorder, hBg: 'rgba(255,255,255,0.04)' },
  }
  const p = palettes[variant]
  const sizes = { sm: { h: 28, px: 10, fs: 12, g: 6 }, md: { h: 36, px: 14, fs: 13, g: 8 }, lg: { h: 44, px: 18, fs: 14, g: 10 } }
  const sz = sizes[size]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: sz.h, padding: `0 ${sz.px}px`,
        background: hover && !disabled ? p.hBg : p.bg,
        color: p.fg, border: `1px solid ${p.bd}`,
        borderRadius: T.rPill,
        fontFamily: T.fBody, fontSize: sz.fs, fontWeight: 600,
        display: 'inline-flex', alignItems: 'center', gap: sz.g,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background .15s ease', opacity: disabled ? 0.5 : 1,
        width: full ? '100%' : 'auto', justifyContent: 'center',
        whiteSpace: 'nowrap', letterSpacing: '-0.005em',
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={sz.fs + 3} />}
      {children}
    </button>
  )
}

// ───────── Pill ─────────
type PillTone = 'default' | 'indigo' | 'cyan' | 'success' | 'warn' | 'danger'

export function Pill({ children, tone = 'default', style, icon }: {
  children: ReactNode; tone?: PillTone; style?: CSSProperties; icon?: string
}) {
  const tones: Record<PillTone, { bg: string; fg: string; bd: string }> = {
    default: { bg: 'rgba(255,255,255,0.04)', fg: T.textDim, bd: T.cardBorder },
    indigo: { bg: T.indigoSoft, fg: T.indigoHi, bd: 'rgba(108,92,231,0.25)' },
    cyan: { bg: T.cyanSoft, fg: T.cyan, bd: 'rgba(0,210,255,0.25)' },
    success: { bg: T.successSoft, fg: T.success, bd: 'rgba(0,230,118,0.25)' },
    warn: { bg: T.warningSoft, fg: T.warning, bd: 'rgba(255,217,61,0.25)' },
    danger: { bg: T.dangerSoft, fg: T.danger, bd: 'rgba(255,107,107,0.25)' },
  }
  const p = tones[tone]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      height: 22, padding: '0 9px', borderRadius: T.rPill,
      background: p.bg, color: p.fg, border: `1px solid ${p.bd}`,
      fontFamily: T.fBody, fontSize: 11, fontWeight: 600,
      letterSpacing: '0.02em', ...style,
    }}>
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  )
}

// ───────── Avatar ─────────
export function Avatar({ child, size = 40, ring = true }: {
  child: { avatar: string; accent: string }; size?: number; ring?: boolean
}) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${child.accent}55, ${child.accent}22)`,
      border: ring ? `2px solid ${child.accent}` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.55, flexShrink: 0,
      boxShadow: ring ? `0 0 0 3px ${T.bg1}, 0 0 12px ${child.accent}33` : 'none',
    }}>
      <span style={{ filter: 'saturate(1.1)' }}>{child.avatar}</span>
    </div>
  )
}

// ───────── Coin display ─────────
export function Coin({ v, big, neutral }: { v: number; big?: boolean; neutral?: boolean }) {
  const color = neutral ? T.text : v >= 0 ? T.success : T.danger
  const sign = v > 0 ? '+' : ''
  return (
    <span style={{
      fontFamily: T.fMono, fontWeight: 600, color,
      fontSize: big ? 18 : 13, letterSpacing: '-0.01em', whiteSpace: 'nowrap',
    }}>
      {sign}{v}<span style={{ opacity: 0.85, marginLeft: 3 }}>🪙</span>
    </span>
  )
}

// ───────── Sparkline ─────────
let sparkId = 0
export function Sparkline({ data, color = T.cyan, w = 120, h = 34, fill = true }: {
  data: number[]; color?: string; w?: number; h?: number; fill?: boolean
}) {
  const max = Math.max(...data, 1), min = Math.min(...data, 0)
  const range = max - min || 1
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => [i * step, h - 4 - ((v - min) / range) * (h - 8)])
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const fillD = d + ` L ${w} ${h} L 0 ${h} Z`
  const gid = 'spk' + (sparkId++)
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={fillD} fill={`url(#${gid})`}/>
        </>
      )}
      <path d={d} stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p, i) => i === pts.length - 1 && (
        <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={color}/>
      ))}
    </svg>
  )
}

// ───────── Progress Ring ─────────
export function Ring({ pct, size = 44, stroke = 4, color = T.indigo, children }: {
  pct: number; size?: number; stroke?: number; color?: string; children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (pct / 100) * c
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .6s ease' }}/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.fMono, fontSize: 11, fontWeight: 600, color: T.text,
      }}>
        {children}
      </div>
    </div>
  )
}

// ───────── Bar ─────────
export function Bar({ pct, color = T.indigo, h = 6 }: { pct: number; color?: string; h?: number }) {
  return (
    <div style={{ height: h, background: 'rgba(255,255,255,0.06)', borderRadius: T.rPill, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`,
        background: color.includes('gradient') ? color : `linear-gradient(90deg, ${color}, ${color}cc)`,
        borderRadius: T.rPill, transition: 'width .5s ease',
      }}/>
    </div>
  )
}

// ───────── Input ─────────
export function Field({ label, value, onChange, placeholder, type = 'text', suffix, mono, style }: {
  label?: string; value: string | number; onChange?: (v: string) => void
  placeholder?: string; type?: string; suffix?: string; mono?: boolean; style?: CSSProperties
}) {
  const [focus, setFocus] = useState(false)
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        height: 40, padding: '0 12px',
        background: T.bg1, border: `1px solid ${focus ? T.indigo : T.cardBorder}`,
        borderRadius: T.rM, transition: 'border-color .15s ease',
        boxShadow: focus ? `0 0 0 3px ${T.indigoSoft}` : 'none',
        ...style,
      }}>
        <input
          type={type} value={value ?? ''} onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
            color: T.text, fontSize: 14, fontFamily: mono ? T.fMono : T.fBody, fontWeight: mono ? 600 : 500,
          }}
        />
        {suffix && <span style={{ fontSize: 12, color: T.muted, fontFamily: T.fMono }}>{suffix}</span>}
      </div>
    </label>
  )
}

// ───────── Toggle ─────────
export function Toggle({ on, onChange }: { on: boolean; onChange?: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange?.(!on)} style={{
      width: 36, height: 20, borderRadius: T.rPill,
      background: on ? T.indigo : 'rgba(255,255,255,0.1)',
      border: 'none', padding: 2, cursor: 'pointer',
      transition: 'background .18s', position: 'relative',
      flexShrink: 0,
    }}>
      <span style={{
        display: 'block', width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transform: `translateX(${on ? 16 : 0}px)`,
        transition: 'transform .18s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }}/>
    </button>
  )
}

// ───────── Section header ─────────
export function SectionH({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
      <div>
        <h3 style={{ margin: 0, fontFamily: T.fHead, fontWeight: 600, fontSize: 17, color: T.text, letterSpacing: '-0.01em' }}>{title}</h3>
        {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: T.muted }}>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

// ───────── Tabs ─────────
export function Tabs({ tabs, value, onChange, scroll }: {
  tabs: { id: string; label: string; icon?: string }[]
  value: string; onChange: (id: string) => void; scroll?: boolean
}) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4,
      background: T.bg1, border: `1px solid ${T.cardBorder}`,
      borderRadius: T.rPill, overflowX: scroll ? 'auto' : 'visible',
      scrollbarWidth: 'none',
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: scroll ? '0 0 auto' : 1, height: 30, padding: '0 14px',
          background: value === t.id ? T.cardHi : 'transparent',
          color: value === t.id ? T.text : T.muted,
          border: 'none', borderRadius: T.rPill,
          fontFamily: T.fBody, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: 'all .15s',
        }}>
          {t.icon && <span style={{ fontSize: 13 }}>{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ───────── Toast ─────────
export function Toast({ toast }: { toast: { msg: string; tone?: string } | null }) {
  if (!toast) return null
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      background: T.cardHi, border: `1px solid ${T.cardBorderHi}`, borderRadius: T.rPill,
      padding: '10px 16px', color: T.text, fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(108,92,231,0.2)',
      zIndex: 200, fontFamily: T.fBody, pointerEvents: 'none',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: toast.tone === 'danger' ? T.danger : toast.tone === 'warn' ? T.warning : T.success,
        boxShadow: `0 0 10px ${toast.tone === 'danger' ? T.danger : toast.tone === 'warn' ? T.warning : T.success}`,
      }}/>
      {toast.msg}
    </div>
  )
}
