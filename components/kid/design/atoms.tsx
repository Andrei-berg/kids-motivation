'use client'

import React, { useEffect, useRef, useState } from 'react'
import { K } from './kidTheme'

// Legacy alias — many kid files still read `T.*`. Same values as `K`.
import { T } from './tokens'
export { T }

// ─── Avatar ─────────────────────────────────────────────────────────────────
// One component renders all three avatar kinds:
//   • url    — pass `url` (onboarding photo, always wins)
//   • emoji  — pass `emoji` (+ optional `bg` swatch)
//   • character — pass skin/hair/hairColor/shirt/accessory (SVG builder)

export type AvatarAccessory = 'none' | 'glasses' | 'cap' | 'headphones' | 'bow'

interface AvatarProps {
  size?: number
  url?: string | null
  emoji?: string | null
  bg?: string
  skin?: string
  hair?: string
  hairColor?: string
  shirt?: string
  accessory?: AvatarAccessory
  glow?: boolean
}

export function Avatar({
  size = 56,
  url,
  emoji,
  bg,
  skin = '#F5C9A1',
  hair = 'short',
  hairColor = '#2B1810',
  shirt = K.sky,
  accessory = 'none',
  glow = false,
}: AvatarProps) {
  const s = size
  const wrap: React.CSSProperties = {
    width: s, height: s, position: 'relative', flexShrink: 0, borderRadius: '50%',
    filter: glow ? `drop-shadow(0 0 12px ${shirt}88)` : 'none',
  }

  if (url) {
    return (
      <div style={wrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" style={{ width: s, height: s, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
      </div>
    )
  }

  if (emoji) {
    return (
      <div style={{
        ...wrap, background: bg ?? K.skySoft,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(s * 0.56), lineHeight: 1,
        border: `1px solid rgba(0,0,0,0.06)`,
      }}>
        <span aria-hidden>{emoji}</span>
      </div>
    )
  }

  return <CharacterAvatar size={s} skin={skin} hair={hair} hairColor={hairColor} shirt={shirt} accessory={accessory}/>
}

// ─── Character builder (SVG) ────────────────────────────────────────────────

export const HAIR_SHAPES = ['short', 'buzz', 'curly', 'long', 'bun', 'mohawk'] as const
export type HairShape = (typeof HAIR_SHAPES)[number]

function hairPath(shape: string): React.ReactNode {
  switch (shape) {
    case 'buzz':
      return <path d="M17 23 Q17 13 28 13 Q39 13 39 23 Q35 19 28 19 Q21 19 17 23 Z" />
    case 'curly':
      return <path d="M15 24 Q13 12 22 11 Q24 7 28 9 Q33 7 35 11 Q43 13 41 24 Q39 17 34 16 Q31 13 28 14 Q25 13 22 16 Q17 17 15 24 Z" />
    case 'long':
      return <path d="M15 40 Q13 16 28 12 Q43 16 41 40 Q41 26 37 22 L37 20 Q33 14 28 14 Q23 14 19 20 L19 22 Q15 26 15 40 Z" />
    case 'bun':
      return <>
        <circle cx="28" cy="8" r="5" />
        <path d="M17 23 Q17 12 28 12 Q39 12 39 23 Q39 17 35 16 Q31 13 28 14 Q25 13 21 16 Q17 17 17 23 Z" />
      </>
    case 'mohawk':
      return <path d="M25 6 L31 6 L33 22 Q28 18 23 22 Z" />
    case 'short':
    default:
      return <path d="M17 22 Q17 12 28 12 Q39 12 39 22 Q39 18 36 17 Q32 14 28 14 Q24 14 20 17 Q17 18 17 22 Z" />
  }
}

function accessoryNode(acc: string): React.ReactNode {
  switch (acc) {
    case 'glasses':
      return <g stroke={K.ink} strokeWidth="1.4" fill="none">
        <circle cx="23.5" cy="24" r="3.4" fill="#fff" fillOpacity="0.35" />
        <circle cx="32.5" cy="24" r="3.4" fill="#fff" fillOpacity="0.35" />
        <path d="M27 24 L29 24 M19.9 22.5 L17 22 M36.1 22.5 L39 22" strokeLinecap="round" />
      </g>
    case 'cap':
      return <g><path d="M15 20 Q17 10 28 10 Q39 10 41 20 L15 20 Z" fill={K.berry} /><path d="M15 20 L9 22 Q13 24 20 22 Z" fill={K.berryDeep} /></g>
    case 'headphones':
      return <g fill="none" stroke={K.grape} strokeWidth="2.6"><path d="M15 25 Q15 11 28 11 Q41 11 41 25" strokeLinecap="round" /><rect x="12" y="23" width="5" height="9" rx="2.4" fill={K.grape} stroke="none" /><rect x="39" y="23" width="5" height="9" rx="2.4" fill={K.grape} stroke="none" /></g>
    case 'bow':
      return <g fill={K.berry}><path d="M24 12 L28 15 L24 18 Z" /><path d="M32 12 L28 15 L32 18 Z" /><circle cx="28" cy="15" r="1.6" fill={K.berryDeep} /></g>
    default:
      return null
  }
}

function CharacterAvatar({
  size, skin, hair, hairColor, shirt, accessory,
}: { size: number; skin: string; hair: string; hairColor: string; shirt: string; accessory: string }) {
  const s = size
  const clipId = `av${s}${String(shirt).slice(1)}${hair}`
  return (
    <div style={{ width: s, height: s, position: 'relative', flexShrink: 0 }}>
      <svg width={s} height={s} viewBox="0 0 56 56" style={{ display: 'block' }}>
        <defs><clipPath id={clipId}><circle cx="28" cy="28" r="27" /></clipPath></defs>
        <circle cx="28" cy="28" r="27" fill={K.skySoft} />
        <g clipPath={`url(#${clipId})`}>
          <path d="M6 56 Q6 40 18 38 L38 38 Q50 40 50 56 Z" fill={shirt} />
          <path d="M18 38 L28 44 L38 38" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.4" />
          <rect x="24" y="34" width="8" height="6" fill={skin} />
          <circle cx="28" cy="24" r="11" fill={skin} />
          <g fill={hairColor}>{hairPath(hair)}</g>
          <circle cx="24" cy="24" r="1.35" fill={K.ink} />
          <circle cx="32" cy="24" r="1.35" fill={K.ink} />
          <path d="M24 28 Q28 31 32 28" stroke={K.ink} strokeWidth="1.3" fill="none" strokeLinecap="round" />
          <circle cx="21" cy="27" r="1.5" fill={K.berry} opacity="0.45" />
          <circle cx="35" cy="27" r="1.5" fill={K.berry} opacity="0.45" />
          {accessoryNode(accessory)}
        </g>
        <circle cx="28" cy="28" r="27" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
      </svg>
    </div>
  )
}

// ─── Coin ───────────────────────────────────────────────────────────────────
// Coins are still coins — the gold glyph stays, keyed to mango now.

export function Coin({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="10" fill={K.mango} stroke={K.mangoDeep} strokeWidth="1.5" />
      <circle cx="11" cy="11" r="7" fill="none" stroke={K.mangoDeep} strokeWidth="1" opacity="0.5" />
      <text x="11" y="14.6" textAnchor="middle" fontSize="9" fontWeight="800" fontFamily={K.fDisp} fill="#7A4B00">K</text>
    </svg>
  )
}

// ─── Coin Pill ──────────────────────────────────────────────────────────────

interface CoinPillProps {
  value: number | string
  size?: 'sm' | 'md' | 'lg'
  tone?: 'sun' | 'white'
}

export function CoinPill({ value, size = 'md', tone = 'sun' }: CoinPillProps) {
  const sizes = {
    sm: { h: 24, fs: 13, pad: '0 8px 0 4px', ic: 16 },
    md: { h: 32, fs: 15, pad: '0 12px 0 6px', ic: 22 },
    lg: { h: 48, fs: 26, pad: '0 18px 0 8px', ic: 34 },
  }
  const cfg = sizes[size]
  const bg = tone === 'sun' ? K.mangoSoft : 'rgba(255,255,255,0.2)'
  const fg = tone === 'sun' ? K.ink : '#fff'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: cfg.h, padding: cfg.pad, borderRadius: cfg.h / 2,
      background: bg, border: tone === 'sun' ? `1.5px solid ${K.mangoDeep}33` : 'none',
    }}>
      <Coin size={cfg.ic} />
      <span style={{ fontFamily: K.fNum, fontSize: cfg.fs, fontWeight: 800, color: fg, letterSpacing: -0.3 }}>
        {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
      </span>
    </div>
  )
}

// ─── XP Bar ─────────────────────────────────────────────────────────────────

interface XPBarProps {
  xp: number
  max: number
  level: number
  compact?: boolean
  onDark?: boolean
}

export function XPBar({ xp, max, level, compact = false, onDark = false }: XPBarProps) {
  const pct = Math.min(100, (xp / max) * 100)
  return (
    <div>
      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: K.fDisp, fontWeight: 800, fontSize: 13, color: onDark ? 'rgba(255,255,255,0.85)' : K.ink3 }}>
            Уровень {level}
          </span>
          <span style={{ fontFamily: K.fNum, fontSize: 12, color: onDark ? 'rgba(255,255,255,0.85)' : K.ink3, fontWeight: 700 }}>
            {xp}/{max} XP
          </span>
        </div>
      )}
      <div style={{
        height: compact ? 8 : 12, background: onDark ? 'rgba(0,0,0,0.22)' : K.lineSoft,
        borderRadius: 999, overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: onDark ? `linear-gradient(90deg, ${K.grape}, #fff)` : K.grape,
          borderRadius: 999, transition: 'width 0.9s cubic-bezier(.2,.9,.3,1.2)',
        }} />
      </div>
    </div>
  )
}

// ─── Streak Flame ───────────────────────────────────────────────────────────

export function StreakFlame({ days, size = 'md', label = 'дней' }: { days: number; size?: 'md' | 'lg'; label?: string }) {
  const cfg = size === 'lg' ? { box: 64, fs: 22, lab: 11, pad: 10 } : { box: 44, fs: 16, lab: 9, pad: 6 }
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: `linear-gradient(135deg, ${K.mango}, ${K.berry})`,
      padding: `${cfg.pad}px 14px ${cfg.pad}px 10px`, borderRadius: 999,
      boxShadow: `0 4px 14px ${K.mango}44`, color: '#fff',
    }}>
      <svg width={cfg.box / 2} height={cfg.box / 2} viewBox="0 0 24 24"
        style={{ animation: 'flamePulse 1.4s ease-in-out infinite', filter: 'drop-shadow(0 0 4px rgba(255,220,140,0.8))' }}>
        <path d="M12 2 C12 2 7 7 7 13 C7 17 9 21 12 22 C15 21 17 17 17 13 C17 11 15.5 10 14 10 C14 7 12 2 12 2 Z" fill="#FFE0A3" />
        <path d="M12 8 C11 10 10 12 10 14 C10 16 11 17 12 17 C13 17 14 16 14 14 C14 13 13 12 12 8 Z" fill="#fff" />
      </svg>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: K.fNum, fontSize: cfg.fs, fontWeight: 800, lineHeight: 1 }}>{days}</span>
        <span style={{ fontFamily: K.fDisp, fontSize: cfg.lab, fontWeight: 700, opacity: 0.92 }}>{label}</span>
      </div>
    </div>
  )
}

// ─── Progress Ring ──────────────────────────────────────────────────────────

interface ProgressRingProps {
  pct: number
  size?: number
  stroke?: number
  color?: string
  bg?: string
  children?: React.ReactNode
}

export function ProgressRing({ pct, size = 120, stroke = 12, color = K.sky, bg = K.lineSoft, children }: ProgressRingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (pct / 100) * c
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.9,.3,1.2)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

// ─── KM Button ──────────────────────────────────────────────────────────────

interface KMButtonProps {
  children: React.ReactNode
  tone?: 'coral' | 'teal' | 'sun' | 'ghost' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  disabled?: boolean
  full?: boolean
  style?: React.CSSProperties
}

export function KMButton({ children, tone = 'coral', size = 'md', onClick, disabled, full, style }: KMButtonProps) {
  const tones = {
    coral: { bg: K.sky,   fg: '#fff', shadow: K.skyDeep },
    teal:  { bg: K.mint,  fg: '#fff', shadow: K.mintDeep },
    sun:   { bg: K.mango, fg: '#5A3A00', shadow: K.mangoDeep },
    ghost: { bg: '#fff',  fg: K.ink,  shadow: K.line },
    dark:  { bg: K.ink,   fg: '#fff', shadow: '#0d1526' },
  }
  const sizes = {
    sm: { h: 40, fs: 14, pad: '0 16px' },
    md: { h: 52, fs: 16, pad: '0 22px' },
    lg: { h: 58, fs: 18, pad: '0 28px' },
  }
  const tc = tones[tone], sc = sizes[size]
  const rest = `0 4px 0 ${tc.shadow}, 0 6px 16px ${tc.shadow}40`
  const pressed = `0 1px 0 ${tc.shadow}, 0 2px 8px ${tc.shadow}40`
  return (
    <button onClick={onClick} disabled={disabled} style={{
      height: sc.h, padding: sc.pad, borderRadius: 18,
      background: tc.bg, color: tc.fg, border: 'none',
      fontFamily: K.fDisp, fontWeight: 800, fontSize: sc.fs, letterSpacing: 0.2,
      cursor: disabled ? 'not-allowed' : 'pointer', boxShadow: rest,
      width: full ? '100%' : undefined, opacity: disabled ? 0.5 : 1,
      transition: 'transform 0.1s, box-shadow 0.1s',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      ...style,
    }}
    onMouseDown={e => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = pressed }}
    onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = rest }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = rest }}
    >{children}</button>
  )
}

// ─── Animated Number ────────────────────────────────────────────────────────

interface AnimatedNumProps {
  value: number
  duration?: number
  style?: React.CSSProperties
  format?: (n: number) => string
}

export function AnimatedNum({ value, duration = 700, style, format = (n) => n.toLocaleString('ru-RU') }: AnimatedNumProps) {
  const [n, setN] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current, to = value
    if (from === to) return
    const t0 = performance.now()
    let raf: number
    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / duration)
      const e = 1 - Math.pow(1 - t, 3)
      setN(Math.round(from + (to - from) * e))
      if (t < 1) raf = requestAnimationFrame(tick)
      else prev.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return <span style={style}>{format(n)}</span>
}

// ─── Confetti ───────────────────────────────────────────────────────────────

interface ConfettiProps {
  trigger: number
  origin?: { x: string; y: string }
}

export function Confetti({ trigger, origin = { x: '50%', y: '50%' } }: ConfettiProps) {
  const [id, setId] = useState(0)
  useEffect(() => { if (trigger) setId(i => i + 1) }, [trigger])
  if (!id) return null
  const pieces = 24
  const colors = [K.sky, K.mint, K.mango, K.grape, K.berry]
  return (
    <div key={id} style={{ position: 'absolute', left: origin.x, top: origin.y, pointerEvents: 'none', zIndex: 100 }}>
      {Array.from({ length: pieces }).map((_, i) => {
        const ang = (i / pieces) * Math.PI * 2 + Math.random() * 0.4
        const dist = 50 + Math.random() * 90
        const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist - 30
        const rot = Math.random() * 720
        const col = colors[i % colors.length]
        const shape = i % 3
        return (
          <div key={i} style={{
            position: 'absolute', width: 8, height: 12, background: col, left: 0, top: 0,
            borderRadius: shape === 0 ? 2 : shape === 1 ? '50%' : 0,
            animation: 'confettiFly 900ms cubic-bezier(.2,.7,.3,1) forwards',
            ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`, ['--rot' as string]: `${rot}deg`,
          }} />
        )
      })}
    </div>
  )
}

// ─── Section Header ─────────────────────────────────────────────────────────

export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <h3 style={{ margin: 0, fontFamily: K.fDisp, fontSize: 20, fontWeight: 800, color: K.ink, letterSpacing: -0.2 }}>{title}</h3>
      {sub && (
        <span style={{
          fontFamily: K.fBody, fontSize: 12, color: K.ink3, fontWeight: 700,
          padding: '3px 10px', borderRadius: 999, background: K.lineSoft,
        }}>{sub}</span>
      )}
    </div>
  )
}

// ─── Collapsible Row ────────────────────────────────────────────────────────
// The kid Day screen's core structure: a task is a row, not a full section.
// Collapsed shows a status rail (mint = done) + title + a trailing slot
// (earned coins / mood emoji / count). Tap toggles; only the row you're
// working on stays open. Shared with the parent DailyModal via `theme`.

interface CollapsibleRowProps {
  title: string
  icon?: React.ReactNode
  done?: boolean
  trailing?: React.ReactNode
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  theme?: 'kid' | 'paper'
  disabled?: boolean
}

export function CollapsibleRow({
  title, icon, done = false, trailing, open, onToggle, children, theme = 'kid', disabled = false,
}: CollapsibleRowProps) {
  const railOn = done ? K.mint : K.line
  const surface = theme === 'kid' ? K.card : '#fff'
  return (
    <div style={{
      background: surface, borderRadius: 18, overflow: 'hidden',
      border: `1.5px solid ${open ? K.sky : K.line}`,
      boxShadow: open ? `0 6px 20px ${K.sky}1F` : '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'border-color .15s, box-shadow .15s',
    }}>
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 14px 14px 0', background: 'transparent', border: 'none',
          cursor: disabled ? 'default' : 'pointer', textAlign: 'left', minHeight: 56,
        }}
      >
        <span aria-hidden style={{ width: 5, alignSelf: 'stretch', background: railOn, borderRadius: '0 4px 4px 0', flexShrink: 0 }} />
        {icon && (
          <span style={{
            width: 34, height: 34, borderRadius: 11, flexShrink: 0,
            background: done ? K.mintSoft : K.lineSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>{icon}</span>
        )}
        <span style={{ flex: 1, minWidth: 0, fontFamily: K.fDisp, fontSize: 16, fontWeight: 700, color: K.ink }}>
          {title}
        </span>
        {trailing && <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{trailing}</span>}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{
          flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s',
        }}>
          <path d="M6 9l6 6 6-6" stroke={K.ink3} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div style={{ padding: '2px 16px 18px', borderTop: `1px solid ${K.lineSoft}` }}>{children}</div>}
    </div>
  )
}

// ─── Boost Meter ────────────────────────────────────────────────────────────
// One-line mango progress bar for the weekly boost. Lives on the Day hero and
// the profile sheet. Pure display — the award route is authoritative.

interface BoostMeterProps {
  earned: number
  max: number
  label: string
  compact?: boolean
}

export function BoostMeter({ earned, max, label, compact = false }: BoostMeterProps) {
  const pct = max > 0 ? Math.min(100, (earned / max) * 100) : 0
  return (
    <div style={{
      background: K.mangoSoft, borderRadius: 14, padding: compact ? '10px 12px' : '12px 14px',
      border: `1.5px solid ${K.mango}55`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
        <span style={{ fontFamily: K.fDisp, fontSize: 13, fontWeight: 800, color: K.mangoDeep }}>Буст недели</span>
        <span style={{ fontFamily: K.fNum, fontSize: 12, fontWeight: 800, color: K.mangoDeep }}>
          +{earned.toLocaleString('ru-RU')} 🪙
        </span>
      </div>
      <div style={{ height: 8, background: '#fff', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${K.mango}, ${K.berry})`,
          borderRadius: 999, transition: 'width 0.9s cubic-bezier(.2,.9,.3,1.2)',
        }} />
      </div>
      <div style={{ fontFamily: K.fBody, fontSize: 12, color: K.mangoDeep, fontWeight: 600, marginTop: 6 }}>
        {label}
      </div>
    </div>
  )
}
