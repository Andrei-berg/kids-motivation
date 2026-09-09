'use client'

// Week strip for the kid Day screen — "what day is it, which days did I fill,
// which did I miss", plus back-filling past days per the child's backfill_mode:
//   'off'     — informational only (past days inert)
//   'request' — tap a missed day → request → (parent approves) → tap → fill →
//               (parent reviews) → coins
//   'open'    — tap a missed in-window day → fill now, coins auto-credit

import { getWeekRange, getDatesInRange } from '@/utils/helpers'
import { T } from '@/components/kid/design/tokens'
import { useT } from '@/lib/i18n'
import type { BackfillRequestStatus } from '@/lib/models/child.types'

function fmtFullDate(iso: string, language: string): string {
  const locale = language === 'ru' ? 'ru-RU' : 'en-US'
  return new Date(iso + 'T12:00:00').toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function weekdayShort(iso: string, language: string): string {
  const locale = language === 'ru' ? 'ru-RU' : 'en-US'
  return new Date(iso + 'T12:00:00')
    .toLocaleDateString(locale, { weekday: 'short' })
    .replace('.', '')
}

function daysBack(today: string, d: string): number {
  return Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000)
}

export default function WeekStrip({
  today,
  filledDates,
  language,
  backfillMode = 'off',
  backfillDays = 0,
  requests = {},
  busyDate = null,
  onRequestDay,
  onFillDay,
}: {
  today: string
  filledDates: Set<string>
  language: string
  backfillMode?: 'off' | 'request' | 'open'
  backfillDays?: number
  requests?: Record<string, BackfillRequestStatus>
  busyDate?: string | null
  onRequestDay?: (date: string) => void
  onFillDay?: (date: string) => void
}) {
  const t = useT()
  const { start, end } = getWeekRange(today)
  const days = getDatesInRange(start, end)

  return (
    <div style={{ padding: '10px 16px 4px' }}>
      <div style={{
        fontFamily: T.fBody, fontSize: 12, fontWeight: 700, color: T.ink3,
        letterSpacing: 0.4, marginBottom: 8, textTransform: 'capitalize',
      }}>
        {t('kidWeekStrip.today')}: {fmtFullDate(today, language)}
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {days.map((d) => {
          const isToday = d === today
          const isFilled = filledDates.has(d)
          const isPast = d < today
          const isFuture = d > today
          const dayNum = Number(d.slice(8, 10))
          const reqStatus = requests[d]
          const inWindow = isPast && daysBack(today, d) <= backfillDays

          // Is this past cell actionable, and what does tapping do?
          let action: 'request' | 'fill' | null = null
          let stateBadge: string | null = null // overrides the plain filled/missed badge
          if (isPast && !isToday) {
            if (backfillMode === 'open' && inWindow && !isFilled) {
              action = 'fill'
            } else if (backfillMode === 'request' && inWindow) {
              if (reqStatus === 'approved') action = 'fill'
              else if (reqStatus === 'requested') stateBadge = '⏳'
              else if (reqStatus === 'submitted') stateBadge = '🔎'
              else if (reqStatus === 'rejected') { stateBadge = '✕'; action = 'request' }
              else if (!isFilled) action = 'request'
            }
          }
          const isBusy = busyDate === d

          // Colors by state (today wins over everything).
          let bg: string = T.card
          let border = `1.5px solid ${T.line}`
          let numColor: string = T.ink
          let badge: string | null = stateBadge

          if (isFilled && !stateBadge) {
            bg = T.tealSoft
            border = `1.5px solid ${T.teal}`
            numColor = T.tealDeep
            badge = '✓'
          } else if (isPast && !stateBadge) {
            bg = 'transparent'
            border = `1.5px dashed ${T.line}`
            numColor = T.ink3
            badge = '·'
          }
          if (action) {
            border = `1.5px solid ${T.coral}`
            numColor = T.coral
          }
          if (isToday) {
            border = `2px solid ${T.coral}`
            numColor = isFilled ? T.tealDeep : T.coral
            if (!isFilled) bg = T.coralSoft
          }

          const clickable = !!action && !isBusy
          const Cell: 'button' | 'div' = clickable ? 'button' : 'div'

          return (
            <Cell
              key={d}
              type={clickable ? 'button' : undefined}
              onClick={clickable
                ? () => (action === 'fill' ? onFillDay?.(d) : onRequestDay?.(d))
                : undefined}
              aria-current={isToday ? 'date' : undefined}
              title={action === 'fill'
                ? t('kidWeekStrip.fillPast')
                : action === 'request'
                  ? t('kidWeekStrip.requestPast')
                  : undefined}
              style={{
                flex: 1, minWidth: 0, borderRadius: 14, background: bg, border,
                padding: '7px 2px 6px', textAlign: 'center',
                opacity: isFuture ? 0.4 : isBusy ? 0.5 : 1,
                cursor: clickable ? 'pointer' : 'default',
                font: 'inherit', color: 'inherit',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}
            >
              <div style={{
                fontFamily: T.fBody, fontSize: 10, fontWeight: 700, color: T.ink3,
                textTransform: 'uppercase', letterSpacing: 0.3,
              }}>
                {weekdayShort(d, language)}
              </div>
              <div style={{ fontFamily: T.fNum, fontSize: 15, fontWeight: 800, color: numColor, lineHeight: 1 }}>
                {dayNum}
              </div>
              <div style={{
                fontSize: 11, lineHeight: 1, minHeight: 11,
                color: badge === '✓' ? T.teal : badge === '✕' ? T.coral : T.ink3,
                fontWeight: 800,
              }}>
                {isBusy ? '…' : (action === 'request' && !stateBadge ? '+' : badge)}
              </div>
            </Cell>
          )
        })}
      </div>

      <div style={{
        display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap',
        fontFamily: T.fBody, fontSize: 10, fontWeight: 600, color: T.ink3,
      }}>
        <span><span style={{ color: T.teal, fontWeight: 800 }}>✓</span> {t('kidWeekStrip.filled')}</span>
        <span><span style={{ color: T.ink3, fontWeight: 800 }}>·</span> {t('kidWeekStrip.missed')}</span>
        <span><span style={{ color: T.coral, fontWeight: 800 }}>●</span> {t('kidWeekStrip.todayDot')}</span>
        {backfillMode === 'request' && (
          <span><span style={{ fontWeight: 800 }}>⏳</span> {t('kidWeekStrip.waiting')}</span>
        )}
      </div>

      {backfillMode !== 'off' && (
        <div style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3, marginTop: 4 }}>
          {backfillMode === 'open' ? t('kidWeekStrip.hintOpen') : t('kidWeekStrip.hintRequest')}
        </div>
      )}
    </div>
  )
}
