'use client'

// Per-child automation settings (05.10): Trust Limit (SC2, drives the
// auto-approve OR-combine in processPurchase) and Allowance (SC1, drives the
// daily allowance cron). Both cards follow PinCard's structure — own
// useState, own save(), own <Btn>, notify(...) on success — and hydrate from
// the `children` row (RLS-readable) before saving through the parent-guarded,
// clamped server actions in automation-actions.ts. Never a client-side write.

import { useState, useEffect } from 'react'
import { T } from './tokens'
import { Card, Btn } from './ui'
import type { ParentChild } from './types'
import { supabase } from '@/lib/supabase'
import { setTrustLimitAction, setAllowanceAction } from '@/app/parent/children/automation-actions'
import { useT } from '@/lib/i18n'

type AllowancePeriod = 'weekly' | 'monthly' | null

const WEEKDAY_KEYS = ['dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat', 'daySun'] as const

function TrustLimitCard({ child, notify }: { child: ParentChild; notify: (msg: string, tone?: string) => void }) {
  const t = useT()
  const childId = child.id
  const [value, setValue] = useState('0')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    setReady(false)
    supabase.from('children').select('trust_limit_coins').eq('id', childId).maybeSingle()
      .then(({ data }) => { if (alive) { setValue(String((data as any)?.trust_limit_coins ?? 0)); setReady(true) } })
    return () => { alive = false }
  }, [childId])

  async function save() {
    setSaving(true)
    try {
      await setTrustLimitAction(childId, Number(value))
      notify(t('parentCenter.settings.child.trustLimitSaved', { name: child.name }))
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card pad={16}>
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {t('parentCenter.settings.child.trustLimit')}
      </div>
      <div style={{ padding: 12, background: T.indigoSoft, borderRadius: T.r, border: `1px solid rgba(108,92,231,0.2)`, fontSize: 13, color: T.textDim, lineHeight: 1.5, marginBottom: 10 }}>
        {t('parentCenter.settings.child.trustLimitHint', { name: child.name })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={value}
          onChange={e => setValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="off"
          disabled={!ready}
          placeholder="0"
          style={{
            flex: 1, height: 40, padding: '0 14px', borderRadius: T.r,
            background: T.bg1, border: `1px solid ${T.cardBorder}`, color: T.text,
            fontFamily: T.fBody, fontSize: 16, textAlign: 'center',
            opacity: ready ? 1 : 0.5,
          }}
        />
        <Btn variant="primary" size="md" onClick={() => save()} disabled={saving || !ready}>
          {saving ? t('common.loading') : t('parentCenter.settings.child.trustLimitSaveBtn')}
        </Btn>
      </div>
    </Card>
  )
}

function AllowanceCard({ child, notify }: { child: ParentChild; notify: (msg: string, tone?: string) => void }) {
  const t = useT()
  const childId = child.id
  const [period, setPeriod] = useState<AllowancePeriod>(null)
  const [amount, setAmount] = useState('0')
  const [anchor, setAnchor] = useState(1)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    setReady(false)
    supabase.from('children').select('allowance_amount, allowance_period, allowance_anchor').eq('id', childId).maybeSingle()
      .then(({ data }) => {
        if (!alive) return
        const row = data as any
        setPeriod(row?.allowance_period === 'weekly' || row?.allowance_period === 'monthly' ? row.allowance_period : null)
        setAmount(String(row?.allowance_amount ?? 0))
        setAnchor(row?.allowance_anchor ?? 1)
        setReady(true)
      })
    return () => { alive = false }
  }, [childId])

  async function save() {
    setSaving(true)
    try {
      await setAllowanceAction(childId, Number(amount), period, period ? anchor : null)
      notify(t('parentCenter.settings.child.allowanceSaved', { name: child.name }))
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setSaving(false)
    }
  }

  const periodOptions: { id: AllowancePeriod; label: string }[] = [
    { id: null, label: t('parentCenter.settings.child.allowanceOff') },
    { id: 'weekly', label: t('parentCenter.settings.child.allowanceWeekly') },
    { id: 'monthly', label: t('parentCenter.settings.child.allowanceMonthly') },
  ]

  return (
    <Card pad={16}>
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {t('parentCenter.settings.child.allowance')}
      </div>
      <div style={{ padding: 12, background: T.indigoSoft, borderRadius: T.r, border: `1px solid rgba(108,92,231,0.2)`, fontSize: 13, color: T.textDim, lineHeight: 1.5, marginBottom: 10 }}>
        {t('parentCenter.settings.child.allowanceHint', { name: child.name })}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {periodOptions.map(opt => {
          const active = period === opt.id
          return (
            <button
              key={String(opt.id)}
              onClick={() => setPeriod(opt.id)}
              disabled={!ready}
              style={{
                flex: 1, height: 36, borderRadius: T.rM,
                background: active ? T.indigoSoft : T.bg1,
                border: `1px solid ${active ? 'rgba(108,92,231,0.5)' : T.cardBorder}`,
                color: active ? T.text : T.muted,
                fontFamily: T.fBody, fontSize: 12, fontWeight: active ? 700 : 500,
                cursor: ready ? 'pointer' : 'default', transition: 'all .15s',
                opacity: ready ? 1 : 0.5,
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {period && (
        <>
          <div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>
            {t('parentCenter.settings.child.allowanceAmountLabel')}
          </div>
          <input
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="off"
            disabled={!ready}
            placeholder={t('parentCenter.settings.child.allowanceAmountPlaceholder')}
            style={{
              width: '100%', height: 40, padding: '0 14px', borderRadius: T.r,
              background: T.bg1, border: `1px solid ${T.cardBorder}`, color: T.text,
              fontFamily: T.fBody, fontSize: 16, textAlign: 'center', marginBottom: 10,
              opacity: ready ? 1 : 0.5,
            }}
          />

          {period === 'weekly' ? (
            <>
              <div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>
                {t('parentCenter.settings.child.allowanceWeekdayLabel')}
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {WEEKDAY_KEYS.map((key, idx) => {
                  const dow = idx + 1
                  const active = anchor === dow
                  return (
                    <button
                      key={key}
                      onClick={() => setAnchor(dow)}
                      disabled={!ready}
                      style={{
                        flex: 1, height: 36, borderRadius: T.rM,
                        background: active ? T.indigo : T.bg1,
                        border: `1px solid ${active ? T.indigo : T.cardBorder}`,
                        color: active ? '#fff' : T.muted,
                        fontFamily: T.fBody, fontSize: 11, fontWeight: active ? 700 : 500,
                        cursor: ready ? 'pointer' : 'default', transition: 'all .15s',
                        opacity: ready ? 1 : 0.5,
                      }}
                    >
                      {t(`parentCenter.settings.child.${key}`)}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: T.faint, marginBottom: 4 }}>
                {t('parentCenter.settings.child.allowanceDayOfMonthLabel')}
              </div>
              <input
                value={String(anchor)}
                onChange={e => {
                  const n = Number(e.target.value.replace(/\D/g, '').slice(0, 2))
                  setAnchor(Number.isNaN(n) ? 1 : Math.min(31, Math.max(1, n)))
                }}
                inputMode="numeric"
                autoComplete="off"
                disabled={!ready}
                style={{
                  width: '100%', height: 40, padding: '0 14px', borderRadius: T.r,
                  background: T.bg1, border: `1px solid ${T.cardBorder}`, color: T.text,
                  fontFamily: T.fBody, fontSize: 16, textAlign: 'center', marginBottom: 4,
                  opacity: ready ? 1 : 0.5,
                }}
              />
            </>
          )}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <Btn variant="primary" size="md" onClick={() => save()} disabled={saving || !ready}>
          {saving ? t('common.loading') : t('parentCenter.settings.child.allowanceSaveBtn')}
        </Btn>
      </div>
    </Card>
  )
}

export function AutomationCards({ child, notify }: { child: ParentChild; notify: (msg: string, tone?: string) => void }) {
  return (
    <>
      <TrustLimitCard child={child} notify={notify}/>
      <AllowanceCard child={child} notify={notify}/>
    </>
  )
}
