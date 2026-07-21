'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createFamily, createChildWithWallet, completeOnboarding } from '@/lib/onboarding-api'
import { PRESET_IDS, type PresetId } from '@/lib/presets'
import { useT } from '@/lib/i18n'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChildRow {
  name: string
}

// ---------------------------------------------------------------------------
// Step sub-components (render props pattern — parent owns all state)
// ---------------------------------------------------------------------------

function StepWelcome({ onNext }: { onNext: () => void }) {
  const t = useT()
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1f2937', margin: '0 0 12px', lineHeight: 1.2 }}>
          {t('onboarding.title')}
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
          {t('onboarding.welcomeDesc')}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {[
          { icon: '🎓', text: t('onboarding.feature1') },
          { icon: '🪙', text: t('onboarding.feature2') },
          { icon: '👨‍👩‍👧', text: t('onboarding.feature3') },
        ].map(({ icon, text }) => (
          <div
            key={text}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 16px',
              background: '#fffbeb',
              borderRadius: '12px',
              border: '1px solid #fde68a',
            }}
          >
            <span style={{ fontSize: '24px', flexShrink: 0 }}>{icon}</span>
            <span style={{ fontSize: '14px', color: '#374151', fontWeight: 500 }}>{text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(135deg,#f59e0b,#f97316)',
          color: '#fff',
          border: 'none',
          borderRadius: '14px',
          fontSize: '17px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(245,158,11,.35)',
        }}
      >
        {t('onboarding.createFamily')}
      </button>
    </div>
  )
}

function StepFamily({
  parentName,
  setParentName,
  familyName,
  setFamilyName,
  onNext,
  onBack,
}: {
  parentName: string
  setParentName: (v: string) => void
  familyName: string
  setFamilyName: (v: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const t = useT()
  const [localError, setLocalError] = useState<string | null>(null)

  function handleNext() {
    if (parentName.trim().length < 1 || parentName.trim().length > 40) {
      setLocalError(t('onboarding.yourNameError'))
      return
    }
    if (familyName.trim().length < 2 || familyName.trim().length > 40) {
      setLocalError(t('onboarding.familyNameError'))
      return
    }
    setLocalError(null)
    onNext()
  }

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1f2937', margin: '0 0 6px' }}>
        {t('onboarding.familyStep')}
      </h2>
      <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 28px' }}>
        {t('onboarding.step1of4')}
      </p>

      <label style={labelStyle}>
        {t('onboarding.yourName')}
        <input
          value={parentName}
          onChange={e => setParentName(e.target.value)}
          placeholder={t('onboarding.namePlaceholder')}
          maxLength={40}
          style={inputStyle}
        />
      </label>

      <label style={{ ...labelStyle, marginTop: '16px' }}>
        {t('onboarding.familyName')}
        <input
          value={familyName}
          onChange={e => setFamilyName(e.target.value)}
          placeholder={t('onboarding.familyNamePlaceholder')}
          maxLength={40}
          style={inputStyle}
        />
      </label>

      {localError && <p style={errorTextStyle}>{localError}</p>}

      <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
        <button onClick={onBack} style={backBtnStyle}>← {t('onboarding.back')}</button>
        <button onClick={handleNext} style={{ ...primaryBtnStyle, flex: 1 }}>{t('onboarding.next')} →</button>
      </div>
    </div>
  )
}

function StepChildren({
  children,
  setChildren,
  onNext,
  onBack,
}: {
  children: ChildRow[]
  setChildren: (v: ChildRow[]) => void
  onNext: () => void
  onBack: () => void
}) {
  const t = useT()
  const [localError, setLocalError] = useState<string | null>(null)

  function addChild() {
    if (children.length < 4) setChildren([...children, { name: '' }])
  }

  function removeChild(idx: number) {
    if (children.length <= 1) return
    setChildren(children.filter((_, i) => i !== idx))
  }

  function updateName(idx: number, value: string) {
    const updated = children.map((c, i) => i === idx ? { name: value } : c)
    setChildren(updated)
  }

  function handleNext() {
    for (const c of children) {
      if (!c.name.trim() || c.name.trim().length > 30) {
        setLocalError(t('onboarding.childNameError'))
        return
      }
    }
    setLocalError(null)
    onNext()
  }

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1f2937', margin: '0 0 6px' }}>
        {t('onboarding.addChildren')}
      </h2>
      <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 28px' }}>
        {t('onboarding.step2of4')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children.map((child, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              value={child.name}
              onChange={e => updateName(idx, e.target.value)}
              placeholder={t('onboarding.childPlaceholder', { n: idx + 1 })}
              maxLength={30}
              style={{ ...inputStyle, flex: 1, marginTop: 0 }}
            />
            {children.length > 1 && (
              <button
                onClick={() => removeChild(idx)}
                style={{
                  background: 'none',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  color: '#ef4444',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('onboarding.remove')}
              </button>
            )}
          </div>
        ))}
      </div>

      {children.length < 4 && (
        <button
          onClick={addChild}
          style={{
            marginTop: '12px',
            background: 'none',
            border: '2px dashed #fbbf24',
            borderRadius: '12px',
            color: '#f59e0b',
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            width: '100%',
          }}
        >
          {t('onboarding.addChild')}
        </button>
      )}

      {localError && <p style={errorTextStyle}>{localError}</p>}

      <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
        <button onClick={onBack} style={backBtnStyle}>← {t('onboarding.back')}</button>
        <button onClick={handleNext} style={{ ...primaryBtnStyle, flex: 1 }}>{t('onboarding.next')} →</button>
      </div>
    </div>
  )
}

// D-04: 3-card preset picker — no manual coin-rule number entry. Tap a card,
// then "Continue with this preset"; fine-tuning moves to post-onboarding
// Settings/CoinsRulesTab. Card copy reuses the SAME strings as Settings'
// "Apply preset" flow (settings.rulePresets.*) — D-01/D-02 keep the value
// sets and their labels identical across both surfaces (05.9-PATTERNS.md
// Pattern 1); only the CTA (onboarding.presetStep.continueBtn) is unique to
// this step. Card-select interaction structure mirrors
// components/parent-center/screens/Settings.tsx ChildrenTab's mode picker
// (icon + label + desc + selected-dot), styled in onboarding's own light
// theme rather than the ink tokens used there.
const PRESET_ICONS: Record<PresetId, string> = {
  classic: '⚖️',
  no_penalties: '🛡️',
  bonuses_only: '🎁',
}

function StepPresetPicker({
  selectedPresetId,
  setSelectedPresetId,
  onNext,
  onBack,
  saving,
}: {
  selectedPresetId: PresetId | null
  setSelectedPresetId: (v: PresetId) => void
  onNext: () => void
  onBack: () => void
  saving: boolean
}) {
  const t = useT()

  const presetCopy: Record<PresetId, { title: string; subhead: string }> = {
    classic: {
      title: t('settings.rulePresets.presetClassicTitle'),
      subhead: t('settings.rulePresets.presetClassicSubhead'),
    },
    no_penalties: {
      title: t('settings.rulePresets.presetNoPenaltiesTitle'),
      subhead: t('settings.rulePresets.presetNoPenaltiesSubhead'),
    },
    bonuses_only: {
      title: t('settings.rulePresets.presetBonusesOnlyTitle'),
      subhead: t('settings.rulePresets.presetBonusesOnlySubhead'),
    },
  }

  const canContinue = !saving && selectedPresetId !== null

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1f2937', margin: '0 0 6px' }}>
        {t('onboarding.coinRulesTitle')}
      </h2>
      <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 20px' }}>
        {t('onboarding.step3of4')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {PRESET_IDS.map(id => {
          const active = selectedPresetId === id
          const { title, subhead } = presetCopy[id]
          return (
            <button
              key={id}
              onClick={() => setSelectedPresetId(id)}
              disabled={saving}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '16px',
                background: active ? '#fffbeb' : '#f9fafb',
                border: `1.5px solid ${active ? '#f59e0b' : '#e5e7eb'}`,
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all .15s',
              }}
            >
              <span style={{ fontSize: '24px', flexShrink: 0 }}>{PRESET_ICONS[id]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1f2937' }}>{title}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px', lineHeight: 1.4 }}>{subhead}</div>
              </div>
              {active && (
                <span
                  style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0, marginTop: '4px' }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button onClick={onBack} disabled={saving} style={{ ...backBtnStyle, opacity: saving ? 0.5 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>← {t('onboarding.back')}</button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          style={{
            ...primaryBtnStyle,
            flex: 1,
            background: canContinue ? 'linear-gradient(135deg,#f59e0b,#f97316)' : '#e5e7eb',
            color: canContinue ? '#fff' : '#9ca3af',
            cursor: canContinue ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? t('onboarding.creating') : t('onboarding.presetStep.continueBtn')}
        </button>
      </div>
    </div>
  )
}

function StepDone({
  inviteCode,
  children,
  onFinish,
}: {
  inviteCode: string
  children: ChildRow[]
  onFinish: () => void
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: user can copy manually
    }
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
      <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1f2937', margin: '0 0 8px' }}>
        {t('onboarding.familyReady')}
      </h2>
      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 28px' }}>
        {t('onboarding.earnTogether')}
      </p>

      {/* Invite code card */}
      <div
        style={{
          padding: '20px',
          background: '#f9fafb',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          marginBottom: '16px',
        }}
      >
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {t('onboarding.inviteCodeLabel')}
        </p>
        <p
          style={{
            fontSize: '28px',
            fontWeight: 800,
            fontFamily: 'monospace',
            color: '#f59e0b',
            letterSpacing: '0.15em',
            margin: '0 0 12px',
          }}
        >
          {inviteCode}
        </p>
        <button
          onClick={handleCopy}
          style={{
            padding: '10px 24px',
            background: copied ? '#10b981' : 'linear-gradient(135deg,#f59e0b,#f97316)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {copied ? t('onboarding.copied') : t('onboarding.copyCode')}
        </button>
      </div>

      {/* Second parent section */}
      <div
        style={{
          marginTop: '16px',
          padding: '16px',
          background: '#fffbeb',
          borderRadius: '12px',
          border: '1px solid #fde68a',
          textAlign: 'left',
          marginBottom: '16px',
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: '8px', margin: '0 0 8px', fontSize: '15px', color: '#1f2937' }}>
          {t('onboarding.secondParent')}
        </p>
        <p style={{ fontSize: '14px', color: '#374151', marginBottom: '4px', margin: '0 0 4px' }}>
          {t('onboarding.shareCode', { code: inviteCode })}
        </p>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
          {t('onboarding.settingsLater')}
        </p>
      </div>

      {/* Per-child PIN hints */}
      {children.length > 0 && (
        <div
          style={{
            padding: '14px 16px',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            textAlign: 'left',
            marginBottom: '24px',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#6b7280', margin: '0 0 8px' }}>
            {t('onboarding.pinForKids')}
          </p>
          {children.map((child, idx) => (
            <p key={idx} style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 4px' }}>
              {t('onboarding.childPin', { name: child.name.trim() || t('onboarding.childPlaceholder', { n: idx + 1 }) })}
            </p>
          ))}
        </div>
      )}

      <button
        onClick={onFinish}
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(135deg,#f59e0b,#f97316)',
          color: '#fff',
          border: 'none',
          borderRadius: '14px',
          fontSize: '17px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(245,158,11,.35)',
        }}
      >
        {t('onboarding.openApp')}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 600,
  color: '#374151',
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '8px',
  padding: '12px 14px',
  border: '1.5px solid #e5e7eb',
  borderRadius: '10px',
  fontSize: '15px',
  color: '#1f2937',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '14px 20px',
  background: 'linear-gradient(135deg,#f59e0b,#f97316)',
  color: '#fff',
  border: 'none',
  borderRadius: '12px',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(245,158,11,.3)',
}

const backBtnStyle: React.CSSProperties = {
  padding: '14px 18px',
  background: '#f9fafb',
  color: '#6b7280',
  border: '1.5px solid #e5e7eb',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
}

const errorTextStyle: React.CSSProperties = {
  marginTop: '10px',
  padding: '10px 14px',
  background: '#fef2f2',
  border: '1px solid #fca5a5',
  borderRadius: '8px',
  color: '#dc2626',
  fontSize: '13px',
}

// ---------------------------------------------------------------------------
// Main wizard component
// ---------------------------------------------------------------------------

export default function OnboardingWizard() {
  const t = useT()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [parentName, setParentName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [children, setChildren] = useState<ChildRow[]>([{ name: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId | null>(null)

  // Fire confetti when Done screen mounts (step 4)
  useEffect(() => {
    if (step === 4) {
      import('@/utils/confetti').then(({ triggerConfetti }) => triggerConfetti())
    }
  }, [step])

  // -------------------------------------------------------------------------
  // handleFinish — writes all rows to DB
  // -------------------------------------------------------------------------
  async function handleFinish(presetId: PresetId) {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t('onboarding.notAuthorized'))

      // 1. Create family + parent member.
      //    createFamily() upserts parent family_members row — safe even if auth
      //    callback pre-created the row. No duplicate parent row risk.
      //    parentDisplayName is passed here to set display_name on the family_members
      //    row (REQ-ONB-003). /register does not capture display_name — this wizard
      //    step is the sole collection point.
      const { familyId, inviteCode: code } = await createFamily(user.id, {
        name: familyName.trim(),
        parentDisplayName: parentName.trim(),
      })

      // 2. Create each child with wallet (sequential, order matters for FK)
      for (const child of children.filter(c => c.name.trim())) {
        await createChildWithWallet(familyId, { name: child.name.trim() })
      }

      // 3. Write the chosen coin-rule preset. completeOnboarding resolves the
      //    preset's values (getPresetValues) and writes them server-side via
      //    PATCH /api/wallet/settings (requireParent + service-role) — the
      //    parent is now a confirmed member of familyId from step 1, so
      //    requireParent resolves. This replaces the old RLS-denied direct
      //    browser upsert (05.9-RESEARCH.md Pitfall 3).
      await completeOnboarding(familyId, presetId)

      setInviteCode(code)
      setStep(4) // advance to Done screen
    } catch (err) {
      setError(err instanceof Error ? err.message : t('onboarding.generalError'))
    } finally {
      setSaving(false)
    }
  }

  // -------------------------------------------------------------------------
  // Progress bar
  // -------------------------------------------------------------------------
  const progress = ((step + 1) / 5) * 100

  // -------------------------------------------------------------------------
  // Page shell
  // -------------------------------------------------------------------------
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg,#fffbeb 0%,#fff7ed 50%,#fef3c7 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px 16px 48px',
        fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#fff',
          borderRadius: '24px',
          boxShadow: '0 24px 80px rgba(0,0,0,.1)',
          overflow: 'hidden',
        }}
      >
        {/* Progress bar */}
        <div style={{ height: '4px', background: '#f3f4f6' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg,#f59e0b,#f97316)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Card content */}
        <div style={{ padding: '28px 28px 32px' }}>
          {/* Global error (from handleFinish) */}
          {error && (
            <div
              style={{
                ...errorTextStyle,
                marginBottom: '20px',
              }}
            >
              {error}
            </div>
          )}

          {step === 0 && (
            <StepWelcome onNext={() => setStep(1)} />
          )}

          {step === 1 && (
            <StepFamily
              parentName={parentName}
              setParentName={setParentName}
              familyName={familyName}
              setFamilyName={setFamilyName}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <StepChildren
              children={children}
              setChildren={setChildren}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepPresetPicker
              selectedPresetId={selectedPresetId}
              setSelectedPresetId={setSelectedPresetId}
              onNext={() => { if (selectedPresetId) handleFinish(selectedPresetId) }}
              onBack={() => setStep(2)}
              saving={saving}
            />
          )}

          {step === 4 && (
            <StepDone
              inviteCode={inviteCode}
              children={children}
              onFinish={() => router.push('/parent/dashboard')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
