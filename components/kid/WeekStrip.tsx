'use client'

// Week strip for the kid Day screen — answers "what day is it, which days did I
// fill, which did I miss". Current calendar week (Mon–Sun). Read-only: tapping a
// past day does not open it for editing (the Day screen is scoped to today).

import { getWeekRange, getDatesInRange } from '@/utils/helpers'
import { T } from '@/components/kid/design/tokens'
import { useT } from '@/lib/i18n'

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

export default function WeekStrip({
  today,
  filledDates,
  language,
}: {
  today: string
  filledDates: Set<string>
  language: string
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

          // Colors by state (today wins over everything).
          let bg: string = T.card
          let border = `1.5px solid ${T.line}`
          let numColor: string = T.ink
          let badge: string | null = null

          if (isFilled) {
            bg = T.tealSoft
            border = `1.5px solid ${T.teal}`
            numColor = T.tealDeep
            badge = '✓'
          } else if (isPast) {
            bg = 'transparent'
            border = `1.5px dashed ${T.line}`
            numColor = T.ink3
            badge = '·'
          }
          if (isToday) {
            border = `2px solid ${T.coral}`
            numColor = isFilled ? T.tealDeep : T.coral
            if (!isFilled) bg = T.coralSoft
          }

          return (
            <div
              key={d}
              aria-current={isToday ? 'date' : undefined}
              style={{
                flex: 1, minWidth: 0, borderRadius: 14, background: bg, border,
                padding: '7px 2px 6px', textAlign: 'center',
                opacity: isFuture ? 0.4 : 1,
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
                color: isFilled ? T.teal : T.ink3,
                fontWeight: 800,
              }}>
                {badge}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        display: 'flex', gap: 14, marginTop: 8,
        fontFamily: T.fBody, fontSize: 10, fontWeight: 600, color: T.ink3,
      }}>
        <span><span style={{ color: T.teal, fontWeight: 800 }}>✓</span> {t('kidWeekStrip.filled')}</span>
        <span><span style={{ color: T.ink3, fontWeight: 800 }}>·</span> {t('kidWeekStrip.missed')}</span>
        <span><span style={{ color: T.coral, fontWeight: 800 }}>●</span> {t('kidWeekStrip.todayDot')}</span>
      </div>
    </div>
  )
}
