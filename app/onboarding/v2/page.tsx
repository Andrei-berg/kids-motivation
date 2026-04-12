'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createFamily, createChildWithWallet, completeOnboarding } from '@/lib/onboarding-api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChildRow {
  name: string
}

interface CoinRulesState {
  g5: number
  g4: number
  g3: number
  room: number
  sport: number
}

// ---------------------------------------------------------------------------
// Step sub-components (render props pattern — parent owns all state)
// ---------------------------------------------------------------------------

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🏆</div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#1f2937', margin: '0 0 12px', lineHeight: 1.2 }}>
          Добро пожаловать в FamilyCoins
        </h1>
        <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
          FamilyCoins помогает детям учиться ответственности и достигать целей через
          систему монет и наград. Родители задают правила — дети зарабатывают монеты за
          учёбу, спорт и домашние дела. Обменивайте монеты на реальные награды!
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
        {[
          { icon: '🎓', text: 'Учёба, спорт и домашние дела — всё в одном месте' },
          { icon: '🪙', text: 'Прозрачная система монет и наград' },
          { icon: '👨‍👩‍👧', text: 'Приглашайте всю семью — каждый ребёнок видит только своё' },
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
        Создать семью →
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
  const [localError, setLocalError] = useState<string | null>(null)

  function handleNext() {
    if (parentName.trim().length < 1 || parentName.trim().length > 40) {
      setLocalError('Введите ваше имя (до 40 символов)')
      return
    }
    if (familyName.trim().length < 2 || familyName.trim().length > 40) {
      setLocalError('Название семьи: от 2 до 40 символов')
      return
    }
    setLocalError(null)
    onNext()
  }

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1f2937', margin: '0 0 6px' }}>
        Расскажите о вашей семье
      </h2>
      <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 28px' }}>
        Шаг 1 из 4
      </p>

      <label style={labelStyle}>
        Ваше имя
        <input
          value={parentName}
          onChange={e => setParentName(e.target.value)}
          placeholder="Иван"
          maxLength={40}
          style={inputStyle}
        />
      </label>

      <label style={{ ...labelStyle, marginTop: '16px' }}>
        Название семьи
        <input
          value={familyName}
          onChange={e => setFamilyName(e.target.value)}
          placeholder="Семья Ивановых"
          maxLength={40}
          style={inputStyle}
        />
      </label>

      {localError && <p style={errorTextStyle}>{localError}</p>}

      <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
        <button onClick={onBack} style={backBtnStyle}>← Назад</button>
        <button onClick={handleNext} style={{ ...primaryBtnStyle, flex: 1 }}>Далее →</button>
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
        setLocalError('Введите имя для каждого ребёнка (до 30 символов)')
        return
      }
    }
    setLocalError(null)
    onNext()
  }

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1f2937', margin: '0 0 6px' }}>
        Добавьте детей
      </h2>
      <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 28px' }}>
        Шаг 2 из 4
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children.map((child, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              value={child.name}
              onChange={e => updateName(idx, e.target.value)}
              placeholder={`Ребёнок ${idx + 1}`}
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
                Удалить
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
          + Добавить ребёнка
        </button>
      )}

      {localError && <p style={errorTextStyle}>{localError}</p>}

      <div style={{ display: 'flex', gap: '10px', marginTop: '28px' }}>
        <button onClick={onBack} style={backBtnStyle}>← Назад</button>
        <button onClick={handleNext} style={{ ...primaryBtnStyle, flex: 1 }}>Далее →</button>
      </div>
    </div>
  )
}

function StepCoinRules({
  coinRules,
  setCoinRules,
  onSkip,
  onNext,
  onBack,
  saving,
}: {
  coinRules: CoinRulesState
  setCoinRules: (v: CoinRulesState) => void
  onSkip: () => void
  onNext: () => void
  onBack: () => void
  saving: boolean
}) {
  function setField(key: keyof CoinRulesState, value: string) {
    const num = parseInt(value, 10)
    if (!isNaN(num)) setCoinRules({ ...coinRules, [key]: num })
  }

  const fields: { key: keyof CoinRulesState; label: string; hint?: string }[] = [
    { key: 'g5', label: 'Оценка 5 → монеты' },
    { key: 'g4', label: 'Оценка 4 → монеты' },
    { key: 'g3', label: 'Оценка 3 → монеты', hint: 'Отрицательное значение — штраф (по умолчанию -3)' },
    { key: 'room', label: 'Уборка комнаты → монеты' },
    { key: 'sport', label: 'Рейтинг тренера 5 → монеты' },
  ]

  return (
    <div>
      <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1f2937', margin: '0 0 6px' }}>
        Правила монет
      </h2>
      <p style={{ fontSize: '14px', color: '#9ca3af', margin: '0 0 20px' }}>
        Шаг 3 из 4 — можно настроить позже в Настройках
      </p>

      <button
        onClick={onSkip}
        disabled={saving}
        style={{
          width: '100%',
          padding: '14px',
          background: saving ? '#e5e7eb' : 'linear-gradient(135deg,#f59e0b,#f97316)',
          color: saving ? '#9ca3af' : '#fff',
          border: 'none',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
          boxShadow: saving ? 'none' : '0 4px 12px rgba(245,158,11,.3)',
        }}
      >
        {saving ? 'Создаём семью...' : 'Использовать стандартные настройки →'}
      </button>

      <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {fields.map(({ key, label, hint }) => (
          <label key={key} style={labelStyle}>
            {label}
            {hint && <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 400, marginLeft: '6px' }}>{hint}</span>}
            <input
              type="number"
              value={coinRules[key]}
              onChange={e => setField(key, e.target.value)}
              style={{ ...inputStyle, marginTop: '6px' }}
            />
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        <button onClick={onBack} disabled={saving} style={{ ...backBtnStyle, opacity: saving ? 0.5 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>← Назад</button>
        <button
          onClick={onNext}
          disabled={saving}
          style={{
            ...primaryBtnStyle,
            flex: 1,
            background: saving ? '#e5e7eb' : 'linear-gradient(135deg,#f59e0b,#f97316)',
            color: saving ? '#9ca3af' : '#fff',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Создаём семью...' : 'Далее →'}
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
        Ваша семья готова!
      </h2>
      <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 28px' }}>
        Добавляйте достижения и зарабатывайте монеты вместе
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
          Код приглашения
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
          {copied ? '✓ Скопировано!' : 'Скопировать код'}
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
          👫 Второй родитель
        </p>
        <p style={{ fontSize: '14px', color: '#374151', marginBottom: '4px', margin: '0 0 4px' }}>
          Поделитесь кодом <strong>{inviteCode}</strong> с партнёром — они смогут войти через /onboarding/join
        </p>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
          Можно настроить позже в <em>Настройках</em>
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
            PIN для детей
          </p>
          {children.map((child, idx) => (
            <p key={idx} style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 4px' }}>
              {child.name.trim() || `Ребёнок ${idx + 1}`}: нет email? → задай PIN в настройках (/parent/settings)
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
        Открыть приложение →
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
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [parentName, setParentName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [children, setChildren] = useState<ChildRow[]>([{ name: '' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [coinRules, setCoinRules] = useState<CoinRulesState>({ g5: 5, g4: 3, g3: -3, room: 3, sport: 10 })

  // Fire confetti when Done screen mounts (step 4)
  useEffect(() => {
    if (step === 4) {
      import('@/utils/confetti').then(({ triggerConfetti }) => triggerConfetti())
    }
  }, [step])

  // -------------------------------------------------------------------------
  // handleFinish — writes all rows to DB
  // -------------------------------------------------------------------------
  async function handleFinish(customCoinRules?: CoinRulesState) {
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Не авторизован')

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

      // 3. Insert wallet_settings defaults (pass overrides if user customized)
      await completeOnboarding(familyId, customCoinRules)

      setInviteCode(code)
      setStep(4) // advance to Done screen
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте снова.')
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
            <StepCoinRules
              coinRules={coinRules}
              setCoinRules={setCoinRules}
              onSkip={() => handleFinish()}
              onNext={() => handleFinish(coinRules)}
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
