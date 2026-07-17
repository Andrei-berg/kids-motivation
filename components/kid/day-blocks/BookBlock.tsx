'use client'

// Reading-log renderer (phase 05.7-04, D-09/D-18) — extracted from
// KidDayFillForm's inline readingBody. The setReading/setReadingActive
// dispatchers are the form's own state setters passed down unchanged.
// The "finished the book" toggle shows a Tick micro-tick — no confetti.
// The book bonus amount is credited server-side (/api/wallet/award) and is
// intentionally not displayed here — no coin values are hardcoded.

import React from 'react'
import { Tick } from '@/components/design/atoms'
import { base, paper } from '@/lib/design/tokens'
import { useT } from '@/lib/i18n'

export interface ReadingState {
  bookTitle: string
  pagesRead: string
  minutesRead: string
  currentPage: string
  bookFinished: boolean
  note: string
}

interface BookBlockProps {
  reading: ReadingState
  setReading: React.Dispatch<React.SetStateAction<ReadingState>>
  readingActive: boolean
  setReadingActive: React.Dispatch<React.SetStateAction<boolean>>
  isLocked: boolean
  requireReadingCheck: boolean
}

export default function BookBlock({
  reading, setReading, readingActive, setReadingActive, isLocked, requireReadingCheck,
}: BookBlockProps) {
  const t = useT()
  const fieldLabels: Record<'pagesRead' | 'minutesRead' | 'currentPage', string> = {
    pagesRead: t('kidFillForm.pagesLabel'),
    minutesRead: t('kidFillForm.minutesLabel'),
    currentPage: t('kidFillForm.bookmarkLabel'),
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: readingActive ? 12 : 0 }}>
        <span style={{
          flex: 1, minWidth: 0, fontFamily: base.fontBody, fontSize: 14, fontWeight: 600, color: paper.ink,
        }}>{t('kidFillForm.readingSection')}?</span>
        <button
          onClick={() => !isLocked && setReadingActive(v => !v)}
          disabled={isLocked}
          style={{
            minHeight: 44, padding: '0 14px', borderRadius: 12,
            border: readingActive ? `1.5px solid ${paper.accent}` : `1px solid ${paper.line}`,
            background: paper.card,
            color: readingActive ? paper.accent : paper.ink2,
            cursor: isLocked ? 'not-allowed' : 'pointer',
            fontFamily: base.fontBody, fontSize: 12, fontWeight: 600,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <Tick on={readingActive} theme="paper" size={16}/>
          {readingActive ? t('kidFillForm.didRead') : t('kidFillForm.readToggle')}
        </button>
      </div>
      {readingActive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            value={reading.bookTitle}
            onChange={e => setReading(r => ({ ...r, bookTitle: e.target.value }))}
            disabled={isLocked}
            placeholder={t('kidFillForm.bookField')}
            style={{
              minHeight: 44, padding: '0 12px', borderRadius: 12,
              border: `1px solid ${paper.line}`, background: paper.lineSoft,
              fontFamily: base.fontBody, fontSize: 14, fontWeight: 500, color: paper.ink,
              outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {(['pagesRead', 'minutesRead', 'currentPage'] as const).map(field => (
              <div key={field} style={{
                borderRadius: 12, background: paper.lineSoft,
                border: `1px solid ${paper.line}`, padding: '6px 10px',
              }}>
                <div style={{
                  fontFamily: base.fontBody, fontSize: 10, fontWeight: 600, color: paper.ink3,
                  letterSpacing: 0.5, textTransform: 'uppercase',
                }}>{fieldLabels[field]}</div>
                <input
                  type="number" inputMode="numeric" min="0"
                  value={reading[field] || ''}
                  disabled={isLocked}
                  onChange={e => setReading(r => ({ ...r, [field]: e.target.value }))}
                  placeholder="0"
                  style={{
                    width: '100%', border: 'none', background: 'transparent', outline: 'none',
                    fontFamily: base.fontMono, fontVariantNumeric: 'tabular-nums',
                    fontSize: 16, fontWeight: 700, color: paper.ink, padding: 0,
                  }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => { if (!isLocked) setReading(r => ({ ...r, bookFinished: !r.bookFinished })) }}
            disabled={isLocked}
            style={{
              minHeight: 48, borderRadius: 12,
              border: reading.bookFinished ? `1.5px solid ${paper.accent}` : `1px solid ${paper.line}`,
              background: paper.card,
              cursor: isLocked ? 'not-allowed' : 'pointer',
              fontFamily: base.fontBody, fontSize: 14, fontWeight: 600,
              color: reading.bookFinished ? paper.accent : paper.ink2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Tick on={reading.bookFinished} theme="paper"/>
            {reading.bookFinished ? t('kidFillForm.finishedBtnDone') : t('kidFillForm.finishedBtn')}
          </button>
          {reading.bookFinished && requireReadingCheck && (
            <div style={{
              fontFamily: base.fontBody, fontSize: 12, fontWeight: 600,
              color: paper.warningText, textAlign: 'center',
            }}>
              {t('kidFillForm.readingPending')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
