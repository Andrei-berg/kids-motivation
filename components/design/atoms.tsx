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
  size?: 'sm' | 'md' | 'lg'
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
