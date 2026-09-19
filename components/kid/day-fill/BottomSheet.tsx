'use client'

// Bottom sheet primitive for the tile-sheet fill style (D-18) — a scrim +
// slide-up panel that only closes via an explicit action. D-18 is a hard
// rule: BottomSheet must never close itself in response to anything inside
// `children` — the ONLY three close paths are the scrim tap, the X button,
// and the optional doneLabel button. Stateless, copy-agnostic (every string
// arrives as a prop), mirroring the StickySummaryBar/QuickRow/InlinePanelRow
// contract from Phase 9.3. No react-dom portal — this codebase's fixed-overlay
// idiom (see ProfileSheet.tsx) is a `position: fixed; inset: 0` scrim with
// onClick-to-close plus a stopPropagation inner panel.

import React, { useEffect, useState } from 'react'
import { K } from '@/components/kid/design/kidTheme'

interface BottomSheetProps {
  open: boolean
  title: string
  icon?: string
  onClose: () => void
  closeLabel: string          // aria-label for the X button
  doneLabel?: string | null   // renders the explicit "Готово" close button; null/undefined = omit it
  children: React.ReactNode
}

export default function BottomSheet(props: BottomSheetProps) {
  const { open, title, icon, closeLabel, doneLabel, children } = props

  // Reduced-motion double guard (mirrors KidDayFillForm.tsx lines 167-172):
  // the CSS half lives inside `@media (prefers-reduced-motion: no-preference)`
  // (app/globals.css); this JS half skips applying the slide-up class at all
  // when the user prefers less motion, so the panel renders already in place
  // with no animation.
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    setReduced(typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false)
  }, [])

  if (!open) return null

  return (
    <>
      <div
        onClick={props.onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,30,0.45)', zIndex: 230 }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={!reduced ? 'kid-bottom-sheet' : undefined}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 231,
          background: K.card, borderRadius: '22px 22px 0 0',
          padding: '10px 16px calc(22px + env(safe-area-inset-bottom, 0px))',
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 40, height: 4, background: K.line, borderRadius: 999, margin: '0 auto 12px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {icon && <span aria-hidden style={{ fontSize: 22 }}>{icon}</span>}
          <span style={{ flex: 1, minWidth: 0, fontFamily: K.fDisp, fontSize: 22, fontWeight: 900, color: K.ink }}>
            {title}
          </span>
          <button
            type="button"
            onClick={props.onClose}
            aria-label={closeLabel}
            style={{
              minWidth: 44, minHeight: 44, borderRadius: 14,
              border: `1.5px solid ${K.line}`, background: K.card,
              fontFamily: K.fDisp, fontSize: 18, fontWeight: 700, color: K.ink2,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {children}

        {doneLabel && (
          <button
            type="button"
            onClick={props.onClose}
            style={{
              width: '100%', minHeight: 48, borderRadius: 16, marginTop: 14,
              border: 'none', background: K.sky, color: '#fff',
              fontFamily: K.fDisp, fontSize: 16, fontWeight: 800, cursor: 'pointer',
            }}
          >
            {doneLabel}
          </button>
        )}
      </div>
    </>
  )
}
