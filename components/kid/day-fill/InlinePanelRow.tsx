'use client'

// In-place inline-panel row (D-06/D-07) — tapping the header expands a panel
// directly below it, inside the same card. No portal, no bottom sheet, no
// page navigation: DAYFORM-04's binding requirement is "in place". Stateless,
// copy-agnostic — reusable by Phase 9.4.
//
// Render this component at a stable position with a stable `key`: its panel
// (`children`) holds controlled inputs (grade buttons, reading fields) that
// must never be remounted on re-render — the reason KidDayFillForm's old
// renderSection was a plain function rather than a component.

import React from 'react'
import { K } from '@/components/kid/design/kidTheme'

interface InlinePanelRowProps {
  label: string
  icon?: React.ReactNode
  done: boolean
  open: boolean
  onToggle: (e: React.MouseEvent<HTMLElement>) => void
  disabled?: boolean
  trailing?: React.ReactNode
  children: React.ReactNode
}

export default function InlinePanelRow({ label, icon, done, open, onToggle, disabled, trailing, children }: InlinePanelRowProps) {
  return (
    <div style={{
      background: K.card, borderRadius: 18, overflow: 'hidden',
      border: `1.5px solid ${open ? K.sky : done ? K.mint : K.line}`,
      boxShadow: open ? `0 6px 20px ${K.sky}1F` : '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'border-color .15s, box-shadow .15s',
    }}>
      <button
        type="button"
        aria-expanded={open}
        disabled={disabled}
        onClick={e => onToggle(e)}
        style={{
          width: '100%', background: 'transparent', border: 'none',
          padding: '12px 14px 12px 0', minHeight: 52,
          display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{
          flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s',
        }}>
          <path d="M6 9l6 6 6-6" stroke={K.ink3} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '2px 16px 18px', borderTop: `1px solid ${K.lineSoft}` }}>
          {children}
        </div>
      )}
    </div>
  )
}
