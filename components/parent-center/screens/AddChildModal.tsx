'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createChildWithWallet } from '@/lib/onboarding-api'
import { useT } from '@/lib/i18n'
import { T } from '../tokens'
import { Icon, Field, Btn } from '../ui'

type Props = {
  open: boolean
  familyId: string
  onClose: () => void
  onCreated: (name: string) => void
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 19 }, (_, i) => CURRENT_YEAR - i)

export default function AddChildModal({ open, familyId, onClose, onCreated }: Props) {
  const t = useT()
  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState(CURRENT_YEAR - 8)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentGate, setConsentGate] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  useEffect(() => {
    if (open) {
      setName('')
      setBirthYear(CURRENT_YEAR - 8)
      setSaving(false)
      setError(null)
      setConsentGate(false)
      setConsentChecked(false)
    }
  }, [open])

  if (!open) return null

  const age = CURRENT_YEAR - birthYear
  const needsConsent = age < 13

  async function create(consentGiven: boolean | null) {
    if (!name.trim()) { setError(t('parentCenter.addChild.nameRequired')); return }
    if (!familyId) { setError(t('parentCenter.addChild.genericError')); return }
    setSaving(true)
    setError(null)
    try {
      const { childId, memberId } = await createChildWithWallet(familyId, { name: name.trim() })
      // Child + wallet now exist. createChildWithWallet only sets name/child_id,
      // so backfill age / birth year / consent — but never let a failed backfill
      // block success, or the parent may retry and create a duplicate.
      try {
        const supabase = createClient()
        await supabase.from('children').update({ age }).eq('id', childId)
        await supabase.from('family_members')
          .update({ birth_year: birthYear, consent_given: consentGiven })
          .eq('id', memberId)
      } catch (backfillErr) {
        console.warn('[AddChildModal] backfill failed (child was still created):', backfillErr)
      }
      onCreated(name.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : t('parentCenter.addChild.genericError'))
      setSaving(false)
    }
  }

  function submit() {
    if (needsConsent) { setConsentGate(true); return }
    void create(null)
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      zIndex: 150, display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: T.bg1, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        border: `1px solid ${T.cardBorderHi}`, borderBottom: 'none',
        padding: '16px 16px 24px',
      }}>
        <div style={{ width: 34, height: 4, background: T.faint, borderRadius: 2, margin: '0 auto 14px' }}/>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: T.rM,
            background: `${T.indigo}20`, border: `1px solid ${T.indigo}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>👶</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontFamily: T.fHead, fontSize: 18, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>
              {t('parentCenter.addChild.title')}
            </h3>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%',
            background: T.cardHi, border: `1px solid ${T.cardBorder}`,
            color: T.text, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="x" size={14}/></button>
        </div>

        {!consentGate ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label={t('parentCenter.addChild.nameLabel')} value={name} onChange={setName}
                placeholder={t('parentCenter.addChild.namePlaceholder')}/>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t('parentCenter.addChild.birthYearLabel')}
                </span>
                <select
                  value={birthYear}
                  onChange={e => setBirthYear(Number(e.target.value))}
                  style={{
                    height: 40, padding: '0 12px', background: T.bg1,
                    border: `1px solid ${T.cardBorder}`, borderRadius: T.rM,
                    color: T.text, fontSize: 14, fontFamily: T.fBody, outline: 'none',
                  }}
                >
                  {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </label>
            </div>

            {error && (
              <div style={{ marginTop: 12, background: T.dangerSoft, border: `1px solid ${T.danger}44`, borderRadius: T.r, padding: '8px 12px', fontSize: 12, color: T.danger }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Btn variant="ghost" size="lg" onClick={onClose} full>{t('common.cancel')}</Btn>
              <Btn variant="primary" size="lg" icon="check" full disabled={saving} onClick={submit}>
                {saving ? t('parentCenter.addChild.submitting') : t('parentCenter.addChild.submit')}
              </Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: T.textDim, fontWeight: 600, marginBottom: 6 }}>{t('consent.title')}</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>{t('consent.subtitle')}</div>
            <div style={{ fontSize: 12, color: T.textDim, fontWeight: 600, marginBottom: 4 }}>{t('consent.dataListTitle')}</div>
            <ul style={{ fontSize: 12, color: T.muted, margin: '0 0 14px', paddingLeft: 18 }}>
              <li style={{ marginBottom: 3 }}>{t('consent.dataItem1')}</li>
              <li style={{ marginBottom: 3 }}>{t('consent.dataItem2')}</li>
              <li style={{ marginBottom: 3 }}>{t('consent.dataItem3')}</li>
              <li style={{ marginBottom: 3 }}>{t('consent.dataItem4')}</li>
            </ul>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
              <input type="checkbox" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }}/>
              <span style={{ fontSize: 12, color: T.textDim }}>{t('consent.checkboxLabel')}</span>
            </label>

            {error && (
              <div style={{ marginBottom: 12, background: T.dangerSoft, border: `1px solid ${T.danger}44`, borderRadius: T.r, padding: '8px 12px', fontSize: 12, color: T.danger }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" size="lg" onClick={() => { setConsentGate(false); setConsentChecked(false) }} full>
                {t('consent.cancelBtn')}
              </Btn>
              <Btn variant="primary" size="lg" icon="check" full disabled={!consentChecked || saving} onClick={() => create(true)}>
                {saving ? t('parentCenter.addChild.submitting') : t('consent.confirmBtn')}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
