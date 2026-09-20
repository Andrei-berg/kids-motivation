'use client'

// Weekly boost detail sheet — style router (Phase 09.6). Mounts one of three
// bodies (segmented-bar / quest-checklist / ring-badges) inside the shared
// Phase 9.4 BottomSheet (reused verbatim, D-02/D-14) as a read-only view — no
// fetch, no state beyond the reduced-motion guard. buildBoostDetail(boost.
// weekDetail, boost.week) is the single source of fractional fills / penalty
// state / consistency zone booleans; boost.week.gradesNext/total/max/
// nextLabel are copied verbatim, never recomputed here (BOOST-06).
//
// SegmentedBarBody (Phase 09.5, D-02..D-08) is an unchanged, extracted body.
// QuestChecklistBody (Phase 09.6, BOOST-04, D-00..D-05) is new this plan.
// ring-badges lands in plan 09.6-03.

import React, { useEffect, useState } from 'react'
import BottomSheet from '@/components/kid/day-fill/BottomSheet'
import { K } from '@/components/kid/design/kidTheme'
import { useT } from '@/lib/i18n'
import { buildBoostDetail } from '@/lib/kid/boost-detail'
import type { BoostDetailView } from '@/lib/kid/boost-detail'
import type { BoostProgress } from '@/lib/kid/boost'
import type { Child } from '@/lib/models/child.types'

interface BoostDetailSheetProps {
  open: boolean
  boost: BoostProgress | null
  onClose: () => void
  /** Optional so existing call sites keep compiling until plan 09.6-04 wires
   * the real per-child value through from ProfileSheet/day/page.tsx — safe
   * default matches the pre-Phase-9.6 behavior (segmented-bar only). */
  boostStyle?: Child['boost_style']
}

export default function BoostDetailSheet(props: BoostDetailSheetProps) {
  const { open, boost, onClose, boostStyle = 'segmented-bar' } = props
  const t = useT()

  // Reduced-motion double guard (mirrors BottomSheet.tsx lines 34-39): the CSS
  // half lives inside `@media (prefers-reduced-motion: no-preference)`
  // (app/globals.css); this JS half skips every animated class when the user
  // prefers less motion, so the sheet renders in its identical static shape.
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    setReduced(typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false)
  }, [])

  if (!open || boost === null) return null

  const v = buildBoostDetail(boost.weekDetail, boost.week)

  return (
    <BottomSheet
      open={open}
      title={t('kidBoost.detail.title')}
      icon="🚀"
      onClose={onClose}
      closeLabel={t('kidFillForm.sheetClose')}
      doneLabel={null}
    >
      {boostStyle === 'quest-checklist'
        ? <QuestChecklistBody v={v} t={t} boost={boost} />
        : <SegmentedBarBody v={v} reduced={reduced} t={t} boost={boost} />}
    </BottomSheet>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// SegmentedBarBody — Phase 09.5's original hero card, extracted verbatim
// (D-02 through D-08). No style/class/copy-key/attribute changed during
// extraction — pure move.
// ─────────────────────────────────────────────────────────────────────────
function SegmentedBarBody({ v, reduced, t, boost }: { v: BoostDetailView; reduced: boolean; t: ReturnType<typeof useT>; boost: BoostProgress }): JSX.Element {
  // Two independent consistency zone classNames — computed once so the
  // one-shot completion pulse (D-06) applies only to an earned zone, never
  // to the other, and never sums the two conditions into one percentage.
  const fullWeekZoneClass = [
    !reduced ? 'kid-seg-fill' : null,
    !reduced && v.consistency.fullWeekDone ? 'kid-seg-pulse' : null,
  ].filter(Boolean).join(' ') || undefined
  const streakZoneClass = [
    !reduced ? 'kid-seg-fill' : null,
    !reduced && v.consistency.streakDone ? 'kid-seg-pulse' : null,
  ].filter(Boolean).join(' ') || undefined

  return (
    <>
      {/* Hero card — D-02 layout, mango→berry gradient, matches the inline meter's own gradient */}
      <div style={{
        borderRadius: 20,
        padding: 16,
        color: '#fff',
        background: `linear-gradient(135deg, ${K.mango}, ${K.berry})`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {/* Grades sub-bar (D-04, D-05) */}
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: K.fBody, fontSize: 13, fontWeight: 700, opacity: 0.95,
          }}>
            <span>{t('kidBoost.detail.gradesLabel')}</span>
            <span>{t('kidBoost.detail.tierStatus', { tier: v.grades.tierReached, total: v.grades.tierTotal })}</span>
          </div>

          {v.grades.penalized ? (
            <div style={{
              marginTop: 6,
              background: `${K.danger}1F`,
              border: `1.5px solid ${K.danger}55`,
              borderRadius: 12,
              padding: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span aria-hidden>⚠</span>
                <span style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.danger }}>
                  {t('kidBoost.detail.gradesLabel')}
                </span>
              </div>
              <div style={{
                height: 10, borderRadius: 999, overflow: 'hidden',
                background: `${K.danger}33`, marginTop: 6,
              }}>
                <div style={{ width: `${v.grades.pct}%`, height: '100%', background: K.danger, borderRadius: 999 }} />
              </div>
              <div style={{ marginTop: 6, fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.danger }}>
                {t('kidBoost.detail.penaltyHint')}
              </div>
            </div>
          ) : (
            <>
              <div
                className={!reduced && v.grades.pct === 0 ? 'kid-seg-shimmer' : undefined}
                style={{
                  height: 10, borderRadius: 999, overflow: 'hidden',
                  background: 'rgba(255,255,255,0.28)', marginTop: 6,
                }}
              >
                <div
                  className={!reduced ? 'kid-seg-fill' : undefined}
                  style={{ width: `${v.grades.pct}%`, height: '100%', background: '#fff', borderRadius: 999 }}
                />
              </div>
              {boost.week.gradesNext && (
                <div style={{ marginTop: 6, fontFamily: K.fBody, fontSize: 13, fontWeight: 700, opacity: 0.92 }}>
                  {boost.week.gradesNext}
                </div>
              )}
            </>
          )}
        </div>

        {/* Consistency sub-bar (D-06) — two independent binary zones */}
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: K.fBody, fontSize: 13, fontWeight: 700, opacity: 0.95,
          }}>
            <span>{t('kidBoost.detail.consistencyLabel')}</span>
            <span>{t('kidBoost.detail.bonusStatus', { earned: v.consistency.bonusesEarned, total: v.consistency.bonusesTotal })}</span>
          </div>

          <div style={{ display: 'flex', gap: 3, marginTop: 6 }}>
            <div style={{ flex: 1, height: 10, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.28)' }}>
              <div
                className={fullWeekZoneClass}
                style={{
                  width: v.consistency.fullWeekDone ? '100%' : '0%',
                  height: '100%', background: '#fff', borderRadius: 999,
                }}
              />
            </div>
            <div style={{ flex: 1, height: 10, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.28)' }}>
              <div
                className={streakZoneClass}
                style={{
                  width: v.consistency.streakDone ? '100%' : '0%',
                  height: '100%', background: '#fff', borderRadius: 999,
                }}
              />
            </div>
          </div>

          {/* Status chips (D-06, required) */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
              background: v.consistency.fullWeekDone ? K.mintSoft : K.card,
              border: `1.5px solid ${v.consistency.fullWeekDone ? K.mint : K.line}`,
              fontFamily: K.fBody, fontSize: 13, fontWeight: 700,
              color: v.consistency.fullWeekDone ? K.ink : K.ink2,
            }}>
              {v.consistency.fullWeekDone
                ? t('kidBoost.detail.fullWeekDone')
                : t('kidBoost.detail.fullWeekPending', { filled: v.consistency.filledDays })}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
              background: v.consistency.streakDone ? K.mangoSoft : K.card,
              border: `1.5px solid ${v.consistency.streakDone ? K.mango : K.line}`,
              fontFamily: K.fBody, fontSize: 13, fontWeight: 700,
              color: v.consistency.streakDone ? K.mangoDeep : K.ink2,
            }}>
              {v.consistency.streakDone
                ? t('kidBoost.detail.streakDone', { count: v.consistency.streaksAtThreshold })
                : t('kidBoost.detail.streakPending')}
            </div>
          </div>
        </div>
      </div>

      {/* Total row (D-07) — outside the hero card, identical to the inline weekly boost meter's number */}
      <div style={{ padding: '8px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink3 }}>
          {t('kidBoost.detail.totalLabel')}
        </span>
        <span style={{ fontFamily: K.fDisp, fontSize: 20, fontWeight: 900, color: K.mangoDeep }}>
          +{v.total.toLocaleString('ru-RU')} 🪙
        </span>
      </div>

      {/* Explainer note — best-tier-not-summed clarification */}
      <div style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 600, color: K.ink3 }}>
        {t('kidBoost.detail.note')}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// QuestChecklistBody — Phase 09.6, BOOST-04 / D-00..D-05. Every boost
// condition as its own independent row (3 grade tiers + 3 consistency
// conditions) plus one combined total row read verbatim from v.total (never
// a sum of the 6 row amounts).
// ─────────────────────────────────────────────────────────────────────────
function QuestChecklistBody({ v, t, boost }: { v: BoostDetailView; t: ReturnType<typeof useT>; boost: BoostProgress }): JSX.Element {
  const penalized = v.grades.penalized

  const gradeRows = [
    {
      tier: v.grades.tiers[0],
      title: t('kidBoost.detail.questGradeTierTitle', { count: v.grades.tiers[0].threshold }),
      subtitle: v.grades.tiers[0].reached
        ? t('kidBoost.detail.questGradeTierSubDone')
        : t('kidBoost.detail.questGradeTierSubProgress', { left: v.grades.tiers[0].remaining }),
      showFraction: true,
      showTrack: true,
    },
    {
      tier: v.grades.tiers[1],
      title: t('kidBoost.detail.questGradeTierTitle', { count: v.grades.tiers[1].threshold }),
      subtitle: v.grades.tiers[1].reached
        ? t('kidBoost.detail.questGradeTierSubDone')
        : t('kidBoost.detail.questGradeTierSubProgress', { left: v.grades.tiers[1].remaining }),
      showFraction: true,
      showTrack: true,
    },
    {
      tier: v.grades.tiers[2],
      title: t('kidBoost.detail.questGradePerfectTitle'),
      subtitle: v.grades.tiers[2].reached
        ? t('kidBoost.detail.questGradePerfectSubDone')
        : t('kidBoost.detail.questGradePerfectSubProgress'),
      showFraction: false,
      showTrack: false,
    },
  ]

  const consistencyRows = [
    {
      title: t('kidBoost.detail.questFullWeekTitle'),
      reward: v.consistency.fullWeekCoins,
      reached: v.consistency.fullWeekDone,
      subtitle: v.consistency.fullWeekDone
        ? t('kidBoost.detail.fullWeekDone')
        : t('kidBoost.detail.fullWeekPending', { filled: v.consistency.filledDays }),
    },
    {
      title: t('kidBoost.detail.questStreak2Title'),
      reward: v.consistency.streak2Coins,
      reached: v.consistency.streak2Done,
      subtitle: null as string | null,
    },
    {
      title: t('kidBoost.detail.questStreak3Title'),
      reward: v.consistency.streak3Coins,
      reached: v.consistency.streak3Done,
      subtitle: null as string | null,
    },
  ]

  return (
    <>
      {/* Grade-tier group — 3 independent rows (D-01) */}
      <div style={{ borderRadius: 20, border: `1.5px solid ${K.line}`, background: K.card, overflow: 'hidden' }}>
        {gradeRows.map((row, i) => {
          const isLast = i === gradeRows.length - 1
          const rowStyle: React.CSSProperties = {
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: isLast ? 'none' : `1px solid ${K.lineSoft}`,
          }
          if (penalized) {
            rowStyle.background = `${K.danger}1F`
            rowStyle.border = `1.5px solid ${K.danger}55`
            rowStyle.borderBottom = isLast ? `1.5px solid ${K.danger}55` : `1px solid ${K.lineSoft}`
          }

          const circleReached = !penalized && row.tier.reached
          return (
            <div key={row.tier.index} style={rowStyle}>
              {/* Check circle */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: K.fBody, fontSize: 11, fontWeight: 700,
                background: penalized ? 'transparent' : (circleReached ? K.mint : 'transparent'),
                border: penalized ? `2px solid ${K.danger}` : (circleReached ? `2px solid ${K.mint}` : `2px solid ${K.line}`),
                color: penalized ? K.danger : (circleReached ? '#fff' : K.ink3),
              }}>
                {penalized
                  ? <span aria-hidden>⚠</span>
                  : circleReached
                    ? <span aria-hidden>✓</span>
                    : (row.showFraction ? `${row.tier.current}/${row.tier.threshold}` : '')}
              </div>

              {/* Title/subtitle */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: K.fBody, fontSize: 13, fontWeight: 700,
                  color: penalized ? K.ink : (circleReached ? K.ink3 : K.ink),
                  textDecoration: circleReached && !penalized ? 'line-through' : 'none',
                }}>
                  {row.title}
                </div>
                <div style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink3, marginTop: 2 }}>
                  {row.subtitle}
                </div>
              </div>

              {/* Mini-track (not-yet-done, tiers 1-2 only) */}
              {!penalized && row.showTrack && !row.tier.reached && (
                <div style={{ width: 44, height: 6, borderRadius: 999, background: K.lineSoft, flexShrink: 0, overflow: 'hidden' }}>
                  <div style={{ width: `${row.tier.pct}%`, height: '100%', background: K.mango, borderRadius: 999 }} />
                </div>
              )}

              {/* Reward amount */}
              <div style={{
                width: 46, textAlign: 'right', flexShrink: 0,
                fontFamily: K.fBody, fontSize: 13, fontWeight: 700,
                color: penalized ? K.danger : (circleReached ? K.mangoDeep : K.ink3),
              }}>
                +{row.tier.coins}
              </div>
            </div>
          )
        })}
      </div>

      {/* Penalty hint — rendered once beneath the grade-tier group, never per-row (D-15) */}
      {penalized && (
        <div style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.danger, padding: '4px 4px' }}>
          {t('kidBoost.detail.penaltyHint')}
        </div>
      )}

      {/* Best-tier-not-summed note (D-04) */}
      <div style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink3, padding: '4px 4px' }}>
        {t('kidBoost.detail.questNote')}
      </div>

      {/* Consistency group — 3 independent rows, never penalty-tinted */}
      <div style={{ borderRadius: 20, border: `1.5px solid ${K.line}`, background: K.card, overflow: 'hidden' }}>
        {consistencyRows.map((row, i) => {
          const isLast = i === consistencyRows.length - 1
          return (
            <div
              key={row.title}
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: isLast ? 'none' : `1px solid ${K.lineSoft}`,
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: row.reached ? K.mint : 'transparent',
                border: row.reached ? `2px solid ${K.mint}` : `2px solid ${K.line}`,
                color: row.reached ? '#fff' : K.ink3,
              }}>
                {row.reached && <span aria-hidden>✓</span>}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: K.fBody, fontSize: 13, fontWeight: 700,
                  color: row.reached ? K.ink3 : K.ink,
                  textDecoration: row.reached ? 'line-through' : 'none',
                }}>
                  {row.title}
                </div>
                {row.subtitle && (
                  <div style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink3, marginTop: 2 }}>
                    {row.subtitle}
                  </div>
                )}
              </div>

              <div style={{
                width: 46, textAlign: 'right', flexShrink: 0,
                fontFamily: K.fBody, fontSize: 13, fontWeight: 700,
                color: row.reached ? K.mangoDeep : K.ink3,
              }}>
                +{row.reward}
              </div>
            </div>
          )
        })}
      </div>

      {/* Combined total row — the real week.total, not a sum of the 6 rows */}
      <div style={{ padding: '8px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink3 }}>
          {t('kidBoost.detail.totalLabel')}
        </span>
        <span style={{ fontFamily: K.fDisp, fontSize: 20, fontWeight: 900, color: K.mangoDeep }}>
          +{v.total.toLocaleString('ru-RU')} 🪙
        </span>
      </div>

      {/* Total progress bar */}
      <div>
        <div style={{ height: 10, borderRadius: 999, overflow: 'hidden', background: K.lineSoft }}>
          <div style={{
            width: `${(boost.week.total / boost.week.max) * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${K.mango}, ${K.berry})`,
            borderRadius: 999,
          }} />
        </div>
        <div style={{ fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: K.ink3, marginTop: 6 }}>
          {boost.week.nextLabel}
        </div>
      </div>
    </>
  )
}
