'use client'

// One-tap binary row (D-05) — the entire row is the tap target, no sheet, no
// accordion. Re-tapping a done row toggles it straight back off (D-10): no
// lock/confirm step. Stateless, copy-agnostic — reusable by Phase 9.4.

import React from 'react'
import { K } from '@/components/kid/design/kidTheme'

interface QuickRowProps {
  label: string
  icon?: React.ReactNode
  done: boolean
  onToggle: (e: React.MouseEvent<HTMLElement>) => void
  disabled?: boolean
  trailing?: React.ReactNode
}

export default function QuickRow({ label, icon, done, onToggle, disabled, trailing }: QuickRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={done}
      disabled={disabled}
      onClick={e => onToggle(e)}
      style={{
        width: '100%', background: K.card, borderRadius: 16,
        border: `1.5px solid ${done ? K.mint : K.line}`,
        padding: '12px 14px 12px 0', minHeight: 52,
        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color .15s',
      }}
    >
      <span aria-hidden style={{ width: 5, alignSelf: 'stretch', background: done ? K.mint : K.line, borderRadius: '0 4px 4px 0', flexShrink: 0 }} />
      {icon && (
        <span aria-hidden style={{
          width: 34, height: 34, borderRadius: 11, flexShrink: 0,
          background: done ? K.mintSoft : K.lineSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>{icon}</span>
      )}
      <span style={{ flex: 1, minWidth: 0, fontFamily: K.fDisp, fontSize: 16, fontWeight: 700, color: K.ink }}>
        {label}
      </span>
      {trailing && <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{trailing}</span>}
      <span aria-hidden style={{
        width: 44, height: 26, borderRadius: 999, background: done ? K.mint : K.line,
        position: 'relative', flexShrink: 0, transition: 'background .15s',
      }}>
        <span style={{
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3, left: 3,
          transform: done ? 'translateX(18px)' : 'none', transition: 'transform .15s',
        }} />
      </span>
    </button>
  )
}
