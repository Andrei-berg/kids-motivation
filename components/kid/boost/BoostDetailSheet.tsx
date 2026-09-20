'use client'

// Segmented-bar weekly boost detail body (Phase 09.5 — D-02, D-03, D-04, D-05,
// D-06, D-07, D-08). Renders inside the Phase 9.4 BottomSheet (reused
// verbatim, D-02) as a read-only view — no fetch, no state beyond the
// reduced-motion guard. buildBoostDetail(boost.weekDetail, boost.week) is the
// single source of fractional fills / penalty state / consistency zone
// booleans; boost.week.gradesNext and boost.week.total are copied verbatim,
// never recomputed here (BOOST-06). Not mounted anywhere yet — plan 04 wires
// the three entry points.

import React, { useEffect, useState } from 'react'
import BottomSheet from '@/components/kid/day-fill/BottomSheet'
import { K } from '@/components/kid/design/kidTheme'
import { useT } from '@/lib/i18n'
import { buildBoostDetail } from '@/lib/kid/boost-detail'
import type { BoostProgress } from '@/lib/kid/boost'

interface BoostDetailSheetProps {
  open: boolean
  boost: BoostProgress | null
  onClose: () => void
}

export default function BoostDetailSheet(props: BoostDetailSheetProps) {
  const { open, boost, onClose } = props
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
    <BottomSheet
      open={open}
      title={t('kidBoost.detail.title')}
      icon="🚀"
      onClose={onClose}
      closeLabel={t('kidFillForm.sheetClose')}
      doneLabel={null}
    >
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
    </BottomSheet>
  )
}
