'use client'

// Shared brand atoms for the "family bank" design system (phase 05.3-02).
// Every atom is theme-aware via an explicit `theme: 'paper' | 'ink'` prop and
// pulls all of its colors from lib/design/tokens — no hardcoded new-system
// hexes in this file. Gold appears ONLY on money amounts (Amount money=true /
// LedgerRow earn tone) — never on non-money UI.

import React, { useEffect, useRef, useState } from 'react'
import { base, paper, ink as inkTheme } from '@/lib/design/tokens'

export type AtomTheme = 'paper' | 'ink'

// ─── Theme resolution ────────────────────────────────────────────────────────
// Normalizes the two theme shapes (paper uses ink/ink2/ink3/line, ink-theme
// uses text/muted) into one set of ground colors. Tone *text* colors are the
// AA text-safe variants: paper.{success,warning,danger}Text; the ink theme's
// tone colors are already on-dark-legible and double as its text-safe set.

function resolve(theme: AtomTheme) {
  if (theme === 'ink') {
    return {
      text: inkTheme.text,
      muted: inkTheme.muted,
      // ink.muted is AA-safe on ink grounds (≥5.17:1) — no darker variant needed
      mutedText: inkTheme.muted,
      goldText: inkTheme.goldText,
      leader: 'rgba(255,255,255,0.10)',
      success: inkTheme.success,
      warning: inkTheme.warning,
      danger: inkTheme.danger,
      successText: inkTheme.success,
      warningText: inkTheme.warning,
      dangerText: inkTheme.danger,
      accent: inkTheme.accent,
    }
  }
  return {
    text: paper.ink,
    muted: paper.ink3,
    // paper.ink3 is only 3.59:1 on #FAF3E9 — use ink2 where muted text must be AA
    mutedText: paper.ink2,
    goldText: paper.goldText,
    leader: paper.line,
    success: paper.success,
    warning: paper.warning,
    danger: paper.danger,
    successText: paper.successText,
    warningText: paper.warningText,
    dangerText: paper.dangerText,
    accent: paper.accent,
  }
}

// Soft-fill helper: a theme tone color at low alpha (chip backgrounds).
function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Amount ──────────────────────────────────────────────────────────────────
// Money numbers: JetBrains Mono, tabular-nums, gold. Gold is reserved for
// money — pass money={false} for any non-money figure.

interface AmountProps {
  value: number
  theme?: AtomTheme
  money?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
  signed?: boolean
  /** Explicit foreground override (used by LedgerRow tones). */
  color?: string
  style?: React.CSSProperties
}

export function Amount({ value, theme = 'paper', money = true, size = 'md', signed = false, color, style }: AmountProps) {
  const c = resolve(theme)
  const sizes = {
    sm: { fs: 13, fw: 700 },
    md: { fs: 15, fw: 800 },
    lg: { fs: 22, fw: 800 },
    // xl: hero-only (wallet сберкнижка balance, D-16) — atom-owned type exception
    xl: { fs: 30, fw: 800 },
  } as const
  const s = sizes[size]
  const fg = color ?? (money ? c.goldText : c.text)
  // '+' only for strictly positive values; '−' comes from the raw number itself.
  const prefix = signed && value > 0 ? '+' : ''
  return (
    <span style={{
      fontFamily: base.fontMono,
      fontVariantNumeric: 'tabular-nums',
      letterSpacing: -0.3,
      fontSize: s.fs,
      fontWeight: s.fw,
      color: fg,
      ...style,
    }}>
      {prefix}{value.toLocaleString('ru-RU')}
    </span>
  )
}

// ─── StatusChip ──────────────────────────────────────────────────────────────
// Soft pill: tone color at ~14% alpha as background, the theme's TEXT-SAFE
// tone variant as foreground (raw paper tones fail WCAG AA for small text).

interface StatusChipProps {
  tone: 'success' | 'warning' | 'danger'
  children: React.ReactNode
  theme?: AtomTheme
  style?: React.CSSProperties
}

export function StatusChip({ tone, children, theme = 'paper', style }: StatusChipProps) {
  const c = resolve(theme)
  const tones = {
    success: { bg: hexAlpha(c.success, 0.14), fg: c.successText },
    warning: { bg: hexAlpha(c.warning, 0.14), fg: c.warningText },
    danger: { bg: hexAlpha(c.danger, 0.14), fg: c.dangerText },
  } as const
  const t = tones[tone]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      height: 22,
      padding: '0 9px',
      borderRadius: 999,
      background: t.bg,
      color: t.fg,
      fontFamily: base.fontBody,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.02em',
      ...style,
    }}>
      {children}
    </span>
  )
}

// ─── LedgerRow ───────────────────────────────────────────────────────────────
// The brand signature: name · dotted leader · mono amount. Tones:
//   earn    → gold money Amount (the sole gold path)
//   spend   → neutral Amount in theme text
//   penalty → Amount in the theme's text-safe danger variant
//   pending → muted Amount with a "≈" prefix

interface LedgerRowProps {
  name: string
  amount: number
  tone?: 'earn' | 'spend' | 'penalty' | 'pending'
  theme?: AtomTheme
  /** Optional small muted second line under `name`. */
  sub?: string
  style?: React.CSSProperties
}

export function LedgerRow({ name, amount, tone = 'earn', theme = 'paper', sub, style }: LedgerRowProps) {
  const c = resolve(theme)
  const tones = {
    earn: { money: true, color: undefined as string | undefined, approx: false },
    spend: { money: false, color: c.text, approx: false },
    penalty: { money: false, color: c.dangerText, approx: false },
    pending: { money: false, color: c.mutedText, approx: true },
  } as const
  const t = tones[tone]
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0, ...style }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: base.fontBody, fontSize: 14, fontWeight: 600, color: c.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {name}
        </div>
        {sub && (
          <div style={{ fontFamily: base.fontBody, fontSize: 11.5, color: c.muted, marginTop: 2 }}>
            {sub}
          </div>
        )}
      </div>
      {/* Dotted leader — the empty flex item's baseline is its bottom edge,
          so the dots sit right on the text baseline. */}
      <span aria-hidden style={{
        flex: 1, minWidth: 12,
        borderBottom: `1px dotted ${c.leader}`,
        transform: 'translateY(-2px)',
      }}/>
      <span style={{ whiteSpace: 'nowrap' }}>
        {t.approx && (
          <span style={{ fontFamily: base.fontMono, fontSize: 13, fontWeight: 700, color: c.mutedText, marginRight: 3 }}>
            ≈
          </span>
        )}
        <Amount value={amount} theme={theme} money={t.money} color={t.color}/>
      </span>
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
// Theme-aware segmented control, ported from components/parent-center/ui.tsx's
// ink-hardcoded Tabs (lines 330-358) — active tab renders in the theme's
// accent color (indigo on paper per D-02/D-05), inactive in muted. Each tab
// button is >=44px tall to satisfy the touch-target requirement.

interface TabsProps {
  tabs: { id: string; label: string; icon?: string }[]
  value: string
  onChange: (id: string) => void
  theme?: AtomTheme
  scroll?: boolean
}

export function Tabs({ tabs, value, onChange, theme = 'paper', scroll = false }: TabsProps) {
  const c = resolve(theme)
  const cardSurface = theme === 'ink' ? inkTheme.card : paper.card
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4,
      background: 'transparent', border: `1px solid ${c.leader}`,
      borderRadius: 999, overflowX: scroll ? 'auto' : 'visible',
      scrollbarWidth: 'none',
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: scroll ? '0 0 auto' : 1, minHeight: 44, padding: '0 14px',
          background: value === t.id ? cardSurface : 'transparent',
          color: value === t.id ? c.accent : c.muted,
          border: 'none', borderRadius: 999,
          fontFamily: base.fontBody, fontSize: 12, fontWeight: value === t.id ? 700 : 600,
          cursor: 'pointer', whiteSpace: 'nowrap',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all .15s',
        }}>
          {t.icon && <span style={{ fontSize: 13, color: value === t.id ? c.accent : c.muted }}>{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── Tick ────────────────────────────────────────────────────────────────────
// Micro-tick primitive (D-18): a checkmark that draws in via stroke-dashoffset
// (<=200ms) plus a short scale pulse, replacing per-toggle confetti bursts.
// Reuses the exact Stamp-style double guard: keyframes injected once inside a
// `@media (prefers-reduced-motion: no-preference)` block, plus a JS post-mount
// check that drops the animation. Under reduced motion it renders the final
// checked/unchecked state instantly, with no particles.

const TICK_STYLE_ID = 'fc-tick-kf'

function ensureTickKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(TICK_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = TICK_STYLE_ID
  el.textContent =
    '@media (prefers-reduced-motion: no-preference){' +
    '@keyframes fcTickDraw{from{stroke-dashoffset:16}to{stroke-dashoffset:0}}' +
    '@keyframes fcTickPulse{0%{transform:scale(0.85)}60%{transform:scale(1.08)}100%{transform:scale(1)}}' +
    '}'
  document.head.appendChild(el)
}

interface TickProps {
  on: boolean
  theme?: AtomTheme
  size?: number
}

export function Tick({ on, theme = 'paper', size = 18 }: TickProps) {
  const c = resolve(theme)
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    ensureTickKeyframes()
    setReduced(reducedMotion())
  }, [])
  return (
    <span
      key={on ? 'on' : 'off'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size,
        ...(reduced ? {} : { animation: 'fcTickPulse 200ms cubic-bezier(.2,.9,.3,1) both' }),
      }}
    >
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="9" fill={on ? c.success : 'transparent'} stroke={on ? c.success : c.leader} strokeWidth="1.5"/>
        {on && (
          <path
            d="M5.5 10.2l2.7 2.7 6.3-6.3"
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="16"
            style={reduced ? { strokeDashoffset: 0 } : { strokeDashoffset: 16, animation: 'fcTickDraw 200ms cubic-bezier(.2,.9,.3,1) forwards' }}
          />
        )}
      </svg>
    </span>
  )
}

// ─── Reduced motion ──────────────────────────────────────────────────────────

function reducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ─── useCountUp ──────────────────────────────────────────────────────────────
// rAF cubic ease-out count-up (mirrors the kid AnimatedNum math). Counts from
// 0 on first mount, then animates between value changes. Under
// prefers-reduced-motion it skips the animation and returns the target.

export function useCountUp(target: number, duration = 700): number {
  const [n, setN] = useState(() => (reducedMotion() ? target : 0))
  const prev = useRef(reducedMotion() ? target : 0)
  useEffect(() => {
    if (reducedMotion()) {
      prev.current = target
      setN(target)
      return
    }
    const from = prev.current
    const to = target
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
  }, [target, duration])
  return n
}

// ─── Stamp ───────────────────────────────────────────────────────────────────
// ~450ms entrance (translateY(8px) + scale(0.96) → settle) on mount and
// whenever `trigger` changes (key remount replays the CSS animation).
// Keyframes are self-contained: injected once via a guarded <style> tag and
// wrapped in a no-preference media query, so under prefers-reduced-motion the
// keyframes never exist and the wrapper renders children with no
// transform/animation. A JS check additionally drops the animation property.

const STAMP_STYLE_ID = 'fc-stamp-kf'

function ensureStampKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STAMP_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STAMP_STYLE_ID
  el.textContent =
    '@media (prefers-reduced-motion: no-preference){' +
    '@keyframes fcStamp{from{opacity:0;transform:translateY(8px) scale(0.96)}to{opacity:1;transform:none}}' +
    '}'
  document.head.appendChild(el)
}

interface StampProps {
  children: React.ReactNode
  /** Replay the entrance when this value changes. */
  trigger?: number | string
  style?: React.CSSProperties
}

export function Stamp({ children, trigger, style }: StampProps) {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    ensureStampKeyframes()
    setReduced(reducedMotion())
  }, [])
  return (
    <div
      key={trigger ?? 0}
      style={{
        ...(reduced ? {} : { animation: 'fcStamp 450ms cubic-bezier(.2,.9,.3,1) both' }),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
