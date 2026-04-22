'use client'

import React, { useEffect, useRef, useState } from 'react'
import { T } from './tokens'

// ─── Avatar ─────────────────────────────────────────────────────────────────

interface AvatarProps {
  size?: number
  skin?: string
  hair?: string
  shirt?: string
  glow?: boolean
}

export function Avatar({ size = 56, skin = '#F5C9A1', hair = '#2B1810', shirt = '#FF6B35', glow = false }: AvatarProps) {
  const s = size
  const clipId = `av${s}${shirt.slice(1)}`
  return (
    <div style={{
      width: s, height: s, position: 'relative', flexShrink: 0,
      filter: glow ? `drop-shadow(0 0 12px ${shirt}88)` : 'none',
    }}>
      <svg width={s} height={s} viewBox="0 0 56 56" style={{ position: 'relative', display: 'block' }}>
        <defs>
          <clipPath id={clipId}><circle cx="28" cy="28" r="27"/></clipPath>
        </defs>
        <circle cx="28" cy="28" r="27" fill="#FFF5E8"/>
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="56" height="56" fill={shirt} opacity="0.15"/>
          <path d="M6 56 Q6 40 18 38 L38 38 Q50 40 50 56 Z" fill={shirt}/>
          <path d="M18 38 L28 44 L38 38" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.4"/>
          <rect x="24" y="34" width="8" height="6" fill={skin}/>
          <circle cx="28" cy="24" r="11" fill={skin}/>
          <path d="M17 22 Q17 12 28 12 Q39 12 39 22 Q39 18 36 17 Q32 14 28 14 Q24 14 20 17 Q17 18 17 22 Z" fill={hair}/>
          <circle cx="24" cy="24" r="1.3" fill={T.ink}/>
          <circle cx="32" cy="24" r="1.3" fill={T.ink}/>
          <path d="M24 28 Q28 31 32 28" stroke={T.ink} strokeWidth="1.3" fill="none" strokeLinecap="round"/>
          <circle cx="21" cy="27" r="1.5" fill="#FF8FB1" opacity="0.5"/>
          <circle cx="35" cy="27" r="1.5" fill="#FF8FB1" opacity="0.5"/>
        </g>
        <circle cx="28" cy="28" r="27" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1"/>
      </svg>
    </div>
  )
}

// ─── Coin SVG ────────────────────────────────────────────────────────────────

export function Coin({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22">
      <circle cx="11" cy="11" r="10" fill={T.sun} stroke={T.sunDeep} strokeWidth="1.5"/>
      <circle cx="11" cy="11" r="7" fill="none" stroke={T.sunDeep} strokeWidth="1" opacity="0.5"/>
      <text x="11" y="14.5" textAnchor="middle" fontSize="9" fontWeight="900" fontFamily={T.fDisp} fill={T.ink}>K</text>
    </svg>
  )
}

// ─── Coin Pill ───────────────────────────────────────────────────────────────

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
  const bg = tone === 'sun' ? T.sunSoft : 'rgba(255,255,255,0.2)'
  const fg = tone === 'sun' ? T.ink : '#fff'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      height: cfg.h, padding: cfg.pad, borderRadius: cfg.h / 2,
      background: bg, border: tone === 'sun' ? `1.5px solid ${T.sunDeep}` : 'none',
    }}>
      <Coin size={cfg.ic}/>
      <span style={{
        fontFamily: T.fNum, fontSize: cfg.fs, fontWeight: 700, color: fg,
        letterSpacing: -0.3,
      }}>
        {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
      </span>
    </div>
  )
}

// ─── XP Bar ──────────────────────────────────────────────────────────────────

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
          <span style={{ fontFamily: T.fDisp, fontWeight: 800, fontSize: 13, color: onDark ? 'rgba(255,255,255,0.8)' : T.ink3, letterSpacing: 1 }}>
            LVL {level}
          </span>
          <span style={{ fontFamily: T.fNum, fontSize: 12, color: onDark ? 'rgba(255,255,255,0.8)' : T.ink3, fontWeight: 600 }}>
            {xp}/{max} XP
          </span>
        </div>
      )}
      <div style={{
        height: compact ? 8 : 12, background: onDark ? 'rgba(0,0,0,0.25)' : '#F1EADB',
        borderRadius: 999, overflow: 'hidden', position: 'relative',
        boxShadow: onDark ? 'inset 0 1px 2px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.08)',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: onDark
            ? `linear-gradient(90deg, ${T.sun}, #fff)`
            : `linear-gradient(90deg, ${T.coral}, ${T.sunDeep}, ${T.sun})`,
          borderRadius: 999, transition: 'width 0.9s cubic-bezier(.2,.9,.3,1.2)',
          boxShadow: onDark ? `0 0 10px ${T.sun}` : undefined,
        }}/>
      </div>
    </div>
  )
}

// ─── Streak Flame ────────────────────────────────────────────────────────────

export function StreakFlame({ days, size = 'md' }: { days: number; size?: 'md' | 'lg' }) {
  const cfg = size === 'lg'
    ? { box: 64, fs: 22, lab: 11, pad: 10 }
    : { box: 44, fs: 16, lab: 9, pad: 6 }
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: `linear-gradient(135deg, ${T.coral}, #FF9547)`,
      padding: `${cfg.pad}px 14px ${cfg.pad}px 10px`, borderRadius: 999,
      boxShadow: `0 4px 14px ${T.coral}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
      color: '#fff',
    }}>
      <svg width={cfg.box / 2} height={cfg.box / 2} viewBox="0 0 24 24"
        style={{ animation: 'flamePulse 1.4s ease-in-out infinite', filter: 'drop-shadow(0 0 4px rgba(255,230,109,0.8))' }}>
        <path d="M12 2 C12 2 7 7 7 13 C7 17 9 21 12 22 C15 21 17 17 17 13 C17 11 15.5 10 14 10 C14 7 12 2 12 2 Z" fill="#FFE66D"/>
        <path d="M12 8 C11 10 10 12 10 14 C10 16 11 17 12 17 C13 17 14 16 14 14 C14 13 13 12 12 8 Z" fill="#fff"/>
      </svg>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: T.fNum, fontSize: cfg.fs, fontWeight: 900, lineHeight: 1 }}>{days}</span>
        <span style={{ fontFamily: T.fDisp, fontSize: cfg.lab, fontWeight: 800, letterSpacing: 1, opacity: 0.9 }}>DAYS</span>
      </div>
    </div>
  )
}

// ─── Progress Ring ───────────────────────────────────────────────────────────

interface ProgressRingProps {
  pct: number
  size?: number
  stroke?: number
  color?: string
  bg?: string
  children?: React.ReactNode
}

export function ProgressRing({ pct, size = 120, stroke = 12, color = T.coral, bg = '#F1EADB', children }: ProgressRingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const off = c - (pct / 100) * c
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke}/>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.9,.3,1.2)' }}/>
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      }}>{children}</div>
    </div>
  )
}

// ─── KM Button ───────────────────────────────────────────────────────────────

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
    coral: { bg: T.coral, fg: '#fff', shadow: T.coralDeep },
    teal:  { bg: T.teal,  fg: '#fff', shadow: T.tealDeep },
    sun:   { bg: T.sun,   fg: T.ink,  shadow: T.sunDeep },
    ghost: { bg: '#fff',  fg: T.ink,  shadow: T.line },
    dark:  { bg: T.ink,   fg: '#fff', shadow: '#000' },
  }
  const sizes = {
    sm: { h: 36, fs: 14, pad: '0 14px' },
    md: { h: 48, fs: 16, pad: '0 20px' },
    lg: { h: 56, fs: 18, pad: '0 28px' },
  }
  const tc = tones[tone], sc = sizes[size]
  return (
    <button onClick={onClick} disabled={disabled} style={{
      height: sc.h, padding: sc.pad, borderRadius: sc.h / 2.5,
      background: tc.bg, color: tc.fg, border: 'none',
      fontFamily: T.fDisp, fontWeight: 800, fontSize: sc.fs,
      letterSpacing: 0.3, cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: `0 4px 0 ${tc.shadow}, 0 6px 14px ${tc.shadow}40`,
      width: full ? '100%' : undefined, opacity: disabled ? 0.5 : 1,
      transition: 'transform 0.1s, box-shadow 0.1s',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      ...style,
    }}
    onMouseDown={e => { e.currentTarget.style.transform = 'translateY(3px)'; e.currentTarget.style.boxShadow = `0 1px 0 ${tc.shadow}, 0 2px 8px ${tc.shadow}40` }}
    onMouseUp={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 0 ${tc.shadow}, 0 6px 14px ${tc.shadow}40` }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 4px 0 ${tc.shadow}, 0 6px 14px ${tc.shadow}40` }}
    >{children}</button>
  )
}

// ─── Animated Number ─────────────────────────────────────────────────────────

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

// ─── Confetti ────────────────────────────────────────────────────────────────

interface ConfettiProps {
  trigger: number
  origin?: { x: string; y: string }
}

export function Confetti({ trigger, origin = { x: '50%', y: '50%' } }: ConfettiProps) {
  const [id, setId] = useState(0)
  useEffect(() => { if (trigger) setId(i => i + 1) }, [trigger])
  if (!id) return null
  const pieces = 24
  const colors = [T.coral, T.teal, T.sun, T.plum, T.pink, T.mint]
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
            position: 'absolute', width: 8, height: 12,
            background: col, left: 0, top: 0,
            borderRadius: shape === 0 ? 2 : shape === 1 ? '50%' : 0,
            animation: 'confettiFly 900ms cubic-bezier(.2,.7,.3,1) forwards',
            ['--dx' as string]: `${dx}px`,
            ['--dy' as string]: `${dy}px`,
            ['--rot' as string]: `${rot}deg`,
          }}/>
        )
      })}
    </div>
  )
}

// ─── Section Header ──────────────────────────────────────────────────────────

export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <h3 style={{ margin: 0, fontFamily: T.fDisp, fontSize: 20, fontWeight: 900, color: T.ink, letterSpacing: -0.3 }}>{title}</h3>
      {sub && (
        <span style={{
          fontFamily: T.fBody, fontSize: 12, color: T.ink3, fontWeight: 700,
          padding: '3px 10px', borderRadius: 999, background: T.lineSoft,
        }}>{sub}</span>
      )}
    </div>
  )
}
