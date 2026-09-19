'use client'

// Tappable Instagram-Stories dot progress track for the story-stepper fill
// style (D-12) — one dot per step. Tapping any dot (forward or backward)
// jumps straight to that step; a current-but-not-done dot reads as a
// sky-tinted empty track (there is no fourth "skipped" state, D-11).
// Stateless, copy-agnostic.

import React from 'react'
import { K } from '@/components/kid/design/kidTheme'

interface DotTrackProps {
  dots: Array<{ id: string; label: string; done: boolean }>
  currentIdx: number
  onJump: (idx: number) => void
  ariaLabelFor: (idx: number, label: string) => string
}

export default function DotTrack({ dots, currentIdx, onJump, ariaLabelFor }: DotTrackProps) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '14px 16px 4px' }}>
      {dots.map((dot, idx) => (
        <button
          key={dot.id}
          type="button"
          onClick={() => onJump(idx)}
          aria-label={ariaLabelFor(idx, dot.label)}
          aria-current={idx === currentIdx ? 'step' : undefined}
          style={{
            flex: 1, height: 28, padding: 0, border: 'none', background: 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}
        >
          <span style={{ display: 'block', width: '100%', height: 5, borderRadius: 999, background: K.line, overflow: 'hidden' }}>
            <span
              className="kid-dot-fill"
              style={{
                display: 'block', height: '100%',
                width: dot.done ? '100%' : '0%',
                background: idx === currentIdx ? K.sky : K.mint,
              }}
            />
          </span>
        </button>
      ))}
    </div>
  )
}
