'use client'

// One-category-at-a-time stepper for the story-stepper fill style (D-04,
// D-10, D-11, D-12, D-15) — a dot-progress track, a full-screen step card,
// an explicit skip/next control, and a final summary screen that carries the
// caller's unchanged save footer (D-15). Stateless over caller state: `steps`
// (with each step's `done`) is the only source of truth this component reads
// from — it owns no coin maths and performs no network I/O of any kind; the
// data layer is entirely out of scope for this presentation shell.

import React, { useEffect, useRef, useState } from 'react'
import { K } from '@/components/kid/design/kidTheme'
import DotTrack from '@/components/kid/day-fill/DotTrack'

export interface FillStep {
  id: string
  label: string
  icon: string
  status: string        // reused tileDone/tileNotFilled copy, shown as the step-card description
  done: boolean
  autoAdvance: boolean   // true only when the step presents a single answer control
  body: React.ReactNode
}

interface StoryStepperProps {
  steps: FillStep[]
  locked: boolean
  subtitle: string
  labels: {
    skip: string        // t('kidFillForm.stepSkip')
    next: string        // t('kidFillForm.stepNext')
    doneToast: string   // t('kidFillForm.stepDoneToast')
    summaryTitle: string
    summaryBody: string
    dotLabel: (idx: number, label: string) => string
  }
  footer: React.ReactNode   // the unchanged saveError banner + pinned Save block (D-15)
}

export default function StoryStepper({ steps, locked, subtitle, labels, footer }: StoryStepperProps) {
  const [stepIdx, setStepIdx] = useState(0)
  const [toast, setToast] = useState(false)

  // Previous-done snapshot per step id — seeded from the first `steps` value
  // this effect sees, so a step already done when the stepper mounts never
  // produces a false→true transition (no auto-advance on mount).
  const prevDoneRef = useRef<Record<string, boolean>>({})
  const seededRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!seededRef.current) {
      const seed: Record<string, boolean> = {}
      steps.forEach(s => { seed[s.id] = s.done })
      prevDoneRef.current = seed
      seededRef.current = true
      return
    }

    if (!locked && stepIdx < steps.length) {
      const current = steps[stepIdx]
      const prevDone = prevDoneRef.current[current.id] ?? false
      if (current.autoAdvance && !prevDone && current.done) {
        setToast(true)
        timerRef.current = setTimeout(() => {
          advance()
          setToast(false)
        }, 450)
      }
    }

    const next: Record<string, boolean> = {}
    steps.forEach(s => { next[s.id] = s.done })
    prevDoneRef.current = next

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  // advance() sets stepIdx to the first index greater than the current one
  // whose `done` is false, or to steps.length (the summary) when no such
  // index exists — never hides a blank applicable step, only moves past it.
  function advance() {
    setStepIdx(current => {
      for (let i = current + 1; i < steps.length; i++) {
        if (!steps[i].done) return i
      }
      return steps.length
    })
  }

  if (steps.length === 0) {
    return (
      <div>
        <SummaryScreen steps={steps} labels={labels} footer={footer} onJump={setStepIdx} />
      </div>
    )
  }

  const onSummary = stepIdx >= steps.length
  const current = onSummary ? null : steps[stepIdx]

  return (
    <div>
      <DotTrack
        dots={steps.map(s => ({ id: s.id, label: s.label, done: s.done }))}
        currentIdx={stepIdx}
        onJump={setStepIdx}
        ariaLabelFor={labels.dotLabel}
      />

      {stepIdx === 0 && !onSummary && (
        <div style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink3, padding: '0 16px 4px' }}>
          {subtitle}
        </div>
      )}

      {toast && (
        <div style={{
          margin: '4px auto 0', width: 'fit-content', padding: '6px 16px', borderRadius: 999,
          background: K.mintSoft, border: `1.5px solid ${K.mint}`,
          fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.mintDeep,
        }}>
          {labels.doneToast}
        </div>
      )}

      {onSummary ? (
        <SummaryScreen steps={steps} labels={labels} footer={footer} onJump={setStepIdx} />
      ) : (
        current && (
          <div style={{
            margin: '20px 16px', borderRadius: 24, minHeight: 340, padding: '28px 22px',
            background: K.card, border: `1.5px solid ${K.line}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center',
          }}>
            <span aria-hidden style={{ fontSize: 52 }}>{current.icon}</span>
            <div style={{ fontFamily: K.fDisp, fontSize: 20, fontWeight: 900, color: K.ink, margin: '14px 0 4px' }}>
              {current.label}
            </div>
            <div style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink3, margin: '0 0 20px' }}>
              {current.status}
            </div>
            <div data-fill-row style={{ width: '100%', textAlign: 'left' }}>
              {current.body}
            </div>
          </div>
        )
      )}

      {!onSummary && !locked && current && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            type="button"
            onClick={advance}
            style={{
              width: '100%', minHeight: 48, borderRadius: 16, cursor: 'pointer',
              border: `1.5px solid ${K.line}`, background: K.card, color: K.ink2,
              fontFamily: K.fDisp, fontSize: 15, fontWeight: 800,
            }}
          >
            {current.done ? labels.next : labels.skip}
          </button>
        </div>
      )}
    </div>
  )
}

// Summary screen (D-15) — recap list + the caller's unchanged save footer.
// Never submits anything itself: the Save action lives entirely inside the
// `footer` node the caller passes, so no style ever auto-submits.
function SummaryScreen({
  steps, labels, footer, onJump,
}: {
  steps: FillStep[]
  labels: StoryStepperProps['labels']
  footer: React.ReactNode
  onJump: (idx: number) => void
}) {
  return (
    <div style={{ padding: '20px 16px 0' }}>
      <div style={{ fontFamily: K.fDisp, fontSize: 22, fontWeight: 900, color: K.ink, textAlign: 'center' }}>
        {labels.summaryTitle}
      </div>
      <div style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink3, textAlign: 'center', margin: '4px 0 16px' }}>
        {labels.summaryBody}
      </div>

      {steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {steps.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onJump(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 14px', borderRadius: 14, cursor: 'pointer',
                background: K.card, border: `1.5px solid ${K.line}`, textAlign: 'left',
              }}
            >
              <span aria-hidden style={{ fontSize: 18 }}>{s.icon}</span>
              <span style={{ flex: 1, minWidth: 0, fontFamily: K.fBody, fontSize: 14, fontWeight: 700, color: K.ink }}>
                {s.label}
              </span>
              <span aria-hidden style={{
                fontFamily: K.fBody, fontSize: 14, fontWeight: 900,
                color: s.done ? K.mintDeep : K.ink3,
              }}>
                {s.done ? '✓' : '—'}
              </span>
            </button>
          ))}
        </div>
      )}

      {footer}
    </div>
  )
}
