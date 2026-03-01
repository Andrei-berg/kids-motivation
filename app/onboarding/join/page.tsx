'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  lookupFamilyByCode,
  getFamilyChildren,
  joinFamilyAsChild,
  ChildProfile,
} from '@/lib/onboarding-api'

// ---------------------------------------------------------------------------
// Styles (inline, matching wizard page conventions)
// ---------------------------------------------------------------------------

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1.5rem',
  background: '#10b981',
  color: '#fff',
  border: 'none',
  borderRadius: '0.5rem',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const primaryBtnDisabledStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  background: '#9ca3af',
  cursor: 'not-allowed',
}

const errorStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#ef4444',
  margin: 0,
}

// ---------------------------------------------------------------------------
// Child join page — 2-screen flow: code entry → profile confirm
// ---------------------------------------------------------------------------

export default function JoinFamilyPage() {
  const router = useRouter()

  // Screen state
  const [screen, setScreen] = useState<'code' | 'confirm'>('code')

  // Code entry screen state
  const [code, setCode] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  // Confirm screen state
  const [familyId, setFamilyId] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [children, setChildren] = useState<ChildProfile[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  // Shared state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Screen 1 — lookup by code
  // ---------------------------------------------------------------------------

  const handleLookup = async () => {
    if (code.length !== 6) return
    setLookingUp(true)
    setError(null)
    try {
      const result = await lookupFamilyByCode(code)
      if (!result) {
        setError('Код не найден. Проверьте и попробуйте ещё раз.')
        return
      }
      // Fetch children in the family
      const childList = await getFamilyChildren(result.familyId)
      setFamilyId(result.familyId)
      setFamilyName(result.name)
      setChildren(childList)
      setSelectedChildId(null)
      setError(null)
      setScreen('confirm')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте снова.')
    } finally {
      setLookingUp(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Screen 2 — confirm profile and join
  // ---------------------------------------------------------------------------

  const handleJoin = async () => {
    if (!selectedChildId) return
    const selectedChild = children.find((c) => c.memberId === selectedChildId)
    if (!selectedChild) return

    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('Ошибка авторизации. Войдите снова.')
        return
      }
      await joinFamilyAsChild(familyId, user.id, { memberId: selectedChild.memberId, displayName: selectedChild.displayName })
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось присоединиться. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f9fafb',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '4rem 1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '24rem',
          background: '#fff',
          borderRadius: '1rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          padding: '2rem',
        }}
      >
        {screen === 'code' ? (
          <ScreenCode
            code={code}
            onCodeChange={(v) => {
              setCode(v.toUpperCase().slice(0, 6))
              setError(null)
            }}
            onSubmit={handleLookup}
            loading={lookingUp}
            error={error}
          />
        ) : (
          <ScreenConfirm
            familyName={familyName}
            children={children}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
            onBack={() => {
              setScreen('code')
              setError(null)
            }}
            onConfirm={handleJoin}
            loading={loading}
            error={error}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Screen 1 — Code entry
// ---------------------------------------------------------------------------

function ScreenCode({
  code,
  onCodeChange,
  onSubmit,
  loading,
  error,
}: {
  code: string
  onCodeChange: (v: string) => void
  onSubmit: () => void
  loading: boolean
  error: string | null
}) {
  const canSubmit = code.length === 6 && !loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Logo */}
      <div style={{ textAlign: 'center' }}>
        <span
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#10b981',
            letterSpacing: '-0.02em',
          }}
        >
          FamilyCoins
        </span>
      </div>

      {/* Heading */}
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '0.375rem',
          }}
        >
          Войти в семью
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          Введите код, который дал вам родитель
        </p>
      </div>

      {/* 6-char code input */}
      <input
        type="text"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canSubmit) onSubmit()
        }}
        placeholder="XXXXXX"
        maxLength={6}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        style={{
          width: '100%',
          height: '4rem',
          textAlign: 'center',
          fontSize: '1.5rem',
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '0.25em',
          border: '2px solid #e5e7eb',
          borderRadius: '0.75rem',
          outline: 'none',
          boxSizing: 'border-box',
          background: '#fff',
          color: '#111827',
          transition: 'border-color 150ms',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#10b981')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
      />

      {/* Error */}
      {error && <p style={errorStyle}>{error}</p>}

      {/* Submit button */}
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={canSubmit ? primaryBtnStyle : primaryBtnDisabledStyle}
      >
        {loading ? 'Поиск...' : 'Найти семью'}
      </button>

      {/* Fallback link */}
      <p style={{ fontSize: '0.8125rem', color: '#9ca3af', textAlign: 'center', margin: 0 }}>
        Нет аккаунта?{' '}
        <a
          href="/register"
          style={{ color: '#10b981', textDecoration: 'none', fontWeight: 500 }}
        >
          Зарегистрироваться
        </a>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Screen 2 — Profile confirm
// ---------------------------------------------------------------------------

function ScreenConfirm({
  familyName,
  children,
  selectedChildId,
  onSelectChild,
  onBack,
  onConfirm,
  loading,
  error,
}: {
  familyName: string
  children: ChildProfile[]
  selectedChildId: string | null
  onSelectChild: (id: string) => void
  onBack: () => void
  onConfirm: () => void
  loading: boolean
  error: string | null
}) {
  const canConfirm = !!selectedChildId && !loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: '#6b7280',
          fontSize: '0.875rem',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
          alignSelf: 'flex-start',
        }}
      >
        ← Назад
      </button>

      {/* Heading */}
      <div>
        <h1
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '0.25rem',
          }}
        >
          Вы в семье: {familyName}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          Выберите ваш профиль
        </p>
      </div>

      {/* Child profiles */}
      {children.length === 0 ? (
        <div
          style={{
            background: '#f9fafb',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            Родитель ещё не добавил детей. Попросите их сделать это сначала.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {children.map((child) => {
            const isSelected = selectedChildId === child.memberId
            const isEmoji =
              child.avatarUrl !== null &&
              child.avatarUrl !== '' &&
              !child.avatarUrl.startsWith('http')

            return (
              <button
                key={child.memberId}
                onClick={() => onSelectChild(child.memberId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.75rem',
                  border: isSelected ? '2px solid #10b981' : '2px solid #e5e7eb',
                  background: isSelected ? '#f0fdf4' : '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 150ms, background 150ms',
                  width: '100%',
                }}
              >
                {/* Avatar */}
                <span
                  style={{
                    fontSize: isEmoji ? '2rem' : undefined,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '3rem',
                    height: '3rem',
                  }}
                >
                  {child.avatarUrl ? (
                    isEmoji ? (
                      child.avatarUrl
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={child.avatarUrl}
                        alt={child.displayName}
                        style={{
                          width: '3rem',
                          height: '3rem',
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />
                    )
                  ) : (
                    <span style={{ fontSize: '2rem' }}>👤</span>
                  )}
                </span>
                {/* Name */}
                <span
                  style={{
                    fontSize: '1.0625rem',
                    fontWeight: 500,
                    color: '#111827',
                  }}
                >
                  {child.displayName}
                </span>
                {/* Selected indicator */}
                {isSelected && (
                  <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: '1.125rem' }}>
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Error */}
      {error && <p style={errorStyle}>{error}</p>}

      {/* Confirm button — only show if there are children */}
      {children.length > 0 && (
        <button
          onClick={onConfirm}
          disabled={!canConfirm}
          style={canConfirm ? primaryBtnStyle : primaryBtnDisabledStyle}
        >
          {loading ? 'Присоединяюсь...' : 'Это я!'}
        </button>
      )}
    </div>
  )
}
