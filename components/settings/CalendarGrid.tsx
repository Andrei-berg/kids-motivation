'use client'

// CalendarGrid — D-05/D-06 visual month/year calendar for the Settings →
// Schedule → Calendar sub-tab. Read-only: renders day-type coloring
// (school/weekend/vacation/sick) and a per-child sick-day dot overlay.
// Editing (school year, term mode, weekend days, vacation periods) stays in
// CalendarSettingsManager/PeriodsManager, composed as accordions below this
// grid in Settings.tsx — this component never writes to any table.

import { useState, useEffect, useMemo } from 'react'
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/lib/store'
import { useT, useLanguage } from '@/lib/i18n'
import { T, CHILD_ACCENTS } from '@/components/parent-center/tokens'
import { Icon, Card, Btn } from '@/components/parent-center/ui'
// WR-03 fix: use design/atoms.tsx's theme-aware Tabs (indigo active-state,
// per 05.8-UI-SPEC.md's Color table) instead of parent-center/ui.tsx's Tabs,
// whose active-tab highlight is a neutral T.cardHi — matching the convention
// this phase's other new tab-like control (DayBlocksManager.tsx's layout
// toggle / child-selector tabs) already follows.
import { Tabs } from '@/components/design/atoms'
import { getFamilyCalendar, getDaysInRange } from '@/lib/repositories/calendar.repo'
import { getVacationPeriods, type VacationPeriod } from '@/lib/vacation-api'
import { getDayType } from '@/lib/day-type'
import type { FamilyCalendar } from '@/lib/models/calendar.types'
import type { DayData } from '@/lib/models/child.types'

// hexAlpha lives in components/design/atoms.tsx but is PRIVATE (not exported)
// — copied verbatim here per the plan's interfaces note.
function hexAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

interface ChildOption {
  id: string
  name: string
}

interface SickPopover {
  date: string
  names: string[]
  x: number
  y: number
}

// Mon-first header labels reuse the same i18n keys CalendarSettingsManager
// already loads (settings.calendarSettingsManager.days.*), just reordered.
const WEEKDAY_LABEL_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

// Reduced-motion double-guard for the month-switch fade — mirrors the
// Stamp/Tick pattern in components/design/atoms.tsx: keyframes injected once
// inside a `no-preference` media query, plus a JS post-mount check that
// drops the animation under prefers-reduced-motion.
const GRID_STYLE_ID = 'fc-calendar-grid-kf'
function ensureGridKeyframes() {
  if (typeof document === 'undefined') return
  if (document.getElementById(GRID_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = GRID_STYLE_ID
  el.textContent =
    '@media (prefers-reduced-motion: no-preference){' +
    '@keyframes fcCalendarFade{from{opacity:0}to{opacity:1}}' +
    '}'
  document.head.appendChild(el)
}

// WR-04 fix: D-05's locked "tap cell to add/edit vacation period" contract.
// Cells with no sick dots had no interaction at all; this callback lets the
// host (Settings.tsx's ScheduleTab) open PeriodsManager's add form
// pre-filled with the tapped date, or its edit form if the date falls
// inside an existing period. CalendarGrid itself still never writes to any
// table — it only reports the tap + whichever period (if any) covers it.
export default function CalendarGrid({ onCellClick }: {
  onCellClick?: (dateStr: string, period: VacationPeriod | null) => void
} = {}) {
  const t = useT()
  const { language } = useLanguage()
  const { familyId } = useAppStore()

  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()))
  const [childFilter, setChildFilter] = useState<string>('family')
  const [children, setChildren] = useState<ChildOption[]>([])
  const [familyCalendar, setFamilyCalendar] = useState<FamilyCalendar | null>(null)
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([])
  const [daysByChild, setDaysByChild] = useState<Record<string, DayData[]>>({})
  const [reduced, setReduced] = useState(false)
  const [popover, setPopover] = useState<SickPopover | null>(null)

  useEffect(() => {
    ensureGridKeyframes()
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    }
  }, [])

  // Resolve children (verbatim PeriodsManager.tsx:71-83 query pattern — never
  // the legacy all-children repo helper) + family calendar + vacation periods,
  // once per family.
  useEffect(() => {
    if (!familyId) return
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data: childRows } = await supabase
        .from('family_members')
        .select('id, child_id, display_name')
        .eq('family_id', familyId as string)
        .eq('role', 'child')
        .order('created_at')
      if (cancelled) return
      setChildren((childRows || [])
        .filter((c: any) => c.child_id)
        .map((c: any) => ({ id: c.child_id as string, name: c.display_name || 'Child' })))

      const [cal, periods] = await Promise.all([
        getFamilyCalendar(familyId as string),
        getVacationPeriods(familyId as string),
      ])
      if (cancelled) return
      setFamilyCalendar(cal)
      setVacationPeriods(periods)
    }
    load()
    return () => { cancelled = true }
  }, [familyId])

  const monthStart = useMemo(() => startOfMonth(visibleMonth), [visibleMonth])
  const monthEnd = useMemo(() => endOfMonth(visibleMonth), [visibleMonth])
  const monthStartStr = format(monthStart, 'yyyy-MM-dd')
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd')

  // getDaysInRange for whichever children are needed this month/filter: all
  // children in family-wide view (sick dots), just the one in single-child view.
  useEffect(() => {
    if (children.length === 0) return
    const neededIds = childFilter === 'family' ? children.map(c => c.id) : [childFilter]
    let cancelled = false
    async function load() {
      const entries = await Promise.all(
        neededIds.map(async id => [id, await getDaysInRange(id, monthStartStr, monthEndStr)] as const)
      )
      if (cancelled) return
      setDaysByChild(prev => {
        const next = { ...prev }
        entries.forEach(([id, rows]) => { next[id] = rows as unknown as DayData[] })
        return next
      })
    }
    load()
    return () => { cancelled = true }
  }, [children, childFilter, monthStartStr, monthEndStr])

  // Mon-first padded grid: map getDay() (Sun=0..Sat=6) to a Mon-first column
  // index at RENDER time only — never touch weekend_days/getDayType conventions.
  const cells = useMemo(() => {
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const leadPad = (getDay(monthStart) + 6) % 7
    const trailPad = (7 - ((leadPad + daysInMonth.length) % 7)) % 7
    const arr: (Date | null)[] = [
      ...Array(leadPad).fill(null),
      ...daysInMonth,
      ...Array(trailPad).fill(null),
    ]
    return arr
  }, [monthStart, monthEnd])

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const monthLabel = new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' }).format(visibleMonth)

  function sickChildrenFor(dateStr: string): ChildOption[] {
    return children.filter(c => (daysByChild[c.id] || []).some(row => row.date === dateStr && row.is_sick))
  }

  function openPopover(e: React.MouseEvent<HTMLButtonElement>, dateStr: string, names: string[]) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = typeof window !== 'undefined' ? Math.max(8, Math.min(rect.left, window.innerWidth - 248)) : rect.left
    const y = rect.bottom + 6
    setPopover({ date: dateStr, names, x, y })
  }

  const tabs = [
    { id: 'family', label: t('settings.calendarSettingsManager.filterFamily') },
    ...children.map(c => ({ id: c.id, label: c.name })),
  ]

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Tabs theme="ink" tabs={tabs} value={childFilter} onChange={id => { setChildFilter(id); setPopover(null) }} scroll />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            aria-label={t('settings.calendarSettingsManager.ariaPrevMonth')}
            onClick={() => setVisibleMonth(m => subMonths(m, 1))}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.cardBorder}`, borderRadius: T.rPill,
              color: T.text, cursor: 'pointer',
            }}
          >
            <Icon name="chevL" size={16} />
          </button>
          <div style={{ fontFamily: T.fHead, fontWeight: 700, fontSize: 17, color: T.text, minWidth: 150, textAlign: 'center', textTransform: 'capitalize' }}>
            {monthLabel}
          </div>
          <button
            type="button"
            aria-label={t('settings.calendarSettingsManager.ariaNextMonth')}
            onClick={() => setVisibleMonth(m => addMonths(m, 1))}
            style={{
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.cardBorder}`, borderRadius: T.rPill,
              color: T.text, cursor: 'pointer',
            }}
          >
            <Icon name="chevR" size={16} />
          </button>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => setVisibleMonth(startOfMonth(new Date()))}>
          {t('settings.calendarSettingsManager.today')}
        </Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {WEEKDAY_LABEL_KEYS.map(k => (
          <div key={k} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' }}>
            {t(`settings.calendarSettingsManager.days.${k}`)}
          </div>
        ))}
      </div>

      <div
        key={format(visibleMonth, 'yyyy-MM')}
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
          animation: reduced ? 'none' : 'fcCalendarFade 0.25s ease',
        }}
      >
        {cells.map((day, idx) => {
          if (!day) return <div key={`pad-${idx}`} />

          const dateStr = format(day, 'yyyy-MM-dd')
          const isToday = dateStr === todayStr
          const isSingleChild = childFilter !== 'family'
          const isSick = isSingleChild && (daysByChild[childFilter] || []).some(row => row.date === dateStr && row.is_sick)
          const info = getDayType(dateStr, isSick, vacationPeriods, isSingleChild ? childFilter : undefined, t, familyCalendar)

          let bg: string = T.card
          let fg: string = T.text
          if (info.type === 'weekend') { bg = T.bg1; fg = T.muted }
          else if (info.type === 'vacation') { bg = hexAlpha(T.warning, 0.14); fg = T.warning }
          else if (info.type === 'sick') { bg = hexAlpha(T.danger, 0.14); fg = T.danger }

          const sickChildren = !isSingleChild ? sickChildrenFor(dateStr) : []
          const showCount = sickChildren.length > 3
          const dotChildren = showCount ? sickChildren.slice(0, 2) : sickChildren
          const extraCount = showCount ? sickChildren.length - 2 : 0
          const hasDots = sickChildren.length > 0

          return (
            <button
              key={dateStr}
              type="button"
              onClick={e => {
                if (hasDots) { openPopover(e, dateStr, sickChildren.map(c => c.name)); return }
                if (onCellClick) {
                  const period = vacationPeriods.find(p => dateStr >= p.start_date && dateStr <= p.end_date) ?? null
                  onCellClick(dateStr, period)
                }
              }}
              style={{
                position: 'relative', minHeight: 44, borderRadius: T.r, border: 'none',
                background: bg, color: fg, cursor: (hasDots || onCellClick) ? 'pointer' : 'default',
                boxShadow: isToday ? `0 0 0 2px ${T.indigo} inset` : 'none',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: 4,
              }}
            >
              <span style={{ fontFamily: T.fMono, fontSize: 11, fontWeight: 600 }}>{format(day, 'd')}</span>
              {hasDots && (
                <span style={{ position: 'absolute', bottom: 4, right: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
                  {dotChildren.map(c => (
                    <span
                      key={c.id}
                      style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: CHILD_ACCENTS[children.findIndex(ch => ch.id === c.id) % CHILD_ACCENTS.length],
                      }}
                    />
                  ))}
                  {extraCount > 0 && (
                    <span style={{ fontFamily: T.fMono, fontSize: 8, color: T.muted }}>+{extraCount}</span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {popover && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setPopover(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'fixed', top: popover.y, left: popover.x }}
          >
            <Card pad={12} style={{ background: T.cardHi, maxWidth: 240 }}>
              {popover.names.length > 1 && (
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>
                  {t('settings.calendarSettingsManager.sickMany')}
                </div>
              )}
              {popover.names.length === 1 ? (
                <div style={{ fontSize: 13, color: T.text }}>
                  {t('settings.calendarSettingsManager.sickOne', { name: popover.names[0] })}
                </div>
              ) : (
                popover.names.map(name => (
                  <div key={name} style={{ fontSize: 13, color: T.text, marginBottom: 2 }}>{name}</div>
                ))
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
