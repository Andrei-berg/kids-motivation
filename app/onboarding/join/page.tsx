'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  lookupFamilyByCode,
  getFamilyChildren,
  joinFamilyAsChild,
  joinFamilyAsAdult,
  getUserDisplayName,
  getOnboardingStep,
  ChildProfile,
} from '@/lib/onboarding-api'

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const primaryBtn: React.CSSProperties = {
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

const primaryBtnDisabled: React.CSSProperties = {
  ...primaryBtn,
  background: '#9ca3af',
  cursor: 'not-allowed',
}

const secondaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1.5rem',
  background: '#fff',
  color: '#374151',
  border: '2px solid #e5e7eb',
  borderRadius: '0.5rem',
  fontSize: '1rem',
  fontWeight: 500,
  cursor: 'pointer',
}

const errorStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#ef4444',
  margin: 0,
}

// ---------------------------------------------------------------------------
// Join page — screens: code → select → adult-role
// ---------------------------------------------------------------------------

type Screen = 'code' | 'select' | 'adult-role'

export default function JoinFamilyPage() {
  const router = useRouter()

  // Auth state
  const [userId, setUserId] = useState<string | null>(null)
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Screen
  const [screen, setScreen] = useState<Screen>('code')

  // Code entry
  const [code, setCode] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  // Family data (after code lookup)
  const [familyId, setFamilyId] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [unlinkedChildren, setUnlinkedChildren] = useState<ChildProfile[]>([])

  // Selection
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<'parent' | 'extended' | null>(null)

  // Shared
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Auth check on mount — redirect if already onboarded
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }
        const step = await getOnboardingStep(user.id)
        if (step >= 6) {
          router.replace('/dashboard')
          return
        }
        const displayName = await getUserDisplayName(user.id)
        setUserId(user.id)
        setUserDisplayName(displayName)
      } catch {
        // Non-fatal — continue to join flow
      } finally {
        setAuthLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------------------------------------------------------------------------
  // Screen 1 — look up family by code
  // ---------------------------------------------------------------------------

  const handleLookup = async () => {
    if (code.length !== 6 || lookingUp) return
    setLookingUp(true)
    setError(null)
    try {
      const result = await lookupFamilyByCode(code)
      if (!result) {
        setError('Код не найден. Проверьте и попробуйте ещё раз.')
        return
      }
      const children = await getFamilyChildren(result.familyId)
      setFamilyId(result.familyId)
      setFamilyName(result.name)
      setUnlinkedChildren(children)
      setSelectedChildId(null)
      setSelectedRole(null)
      setError(null)
      setScreen('select')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте снова.')
    } finally {
      setLookingUp(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Screen 2 — join as child
  // ---------------------------------------------------------------------------

  const handleJoinAsChild = async () => {
    if (!selectedChildId || !userId) return
    const child = unlinkedChildren.find((c) => c.memberId === selectedChildId)
    if (!child) return

    setLoading(true)
    setError(null)
    try {
      await joinFamilyAsChild(familyId, userId, {
        memberId: child.memberId,
        displayName: child.displayName,
      })
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось присоединиться. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Screen 3 — join as adult (after role selection)
  // ---------------------------------------------------------------------------

  const handleJoinAsAdult = async () => {
    if (!selectedRole || !userId) return

    setLoading(true)
    setError(null)
    try {
      await joinFamilyAsAdult(familyId, userId, selectedRole, userDisplayName)
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

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Загрузка...</span>
      </div>
    )
  }

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
        {screen === 'code' && (
          <ScreenCode
            code={code}
            onCodeChange={(v) => { setCode(v.toUpperCase().slice(0, 6)); setError(null) }}
            onSubmit={handleLookup}
            loading={lookingUp}
            error={error}
          />
        )}
        {screen === 'select' && (
          <ScreenSelect
            familyName={familyName}
            unlinkedChildren={unlinkedChildren}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
            onJoinAsChild={handleJoinAsChild}
            onGoAdult={() => { setScreen('adult-role'); setSelectedChildId(null); setError(null) }}
            onBack={() => { setScreen('code'); setError(null) }}
            loading={loading}
            error={error}
          />
        )}
        {screen === 'adult-role' && (
          <ScreenAdultRole
            familyName={familyName}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            onConfirm={handleJoinAsAdult}
            onBack={() => { setScreen('select'); setError(null) }}
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
  code, onCodeChange, onSubmit, loading, error,
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
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', letterSpacing: '-0.02em' }}>
          FamilyCoins
        </span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.375rem' }}>
          Войти в семью
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          Введите код, который дал вам родитель
        </p>
      </div>
      <input
        type="text"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) onSubmit() }}
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
      {error && <p style={errorStyle}>{error}</p>}
      <button onClick={onSubmit} disabled={!canSubmit} style={canSubmit ? primaryBtn : primaryBtnDisabled}>
        {loading ? 'Поиск...' : 'Найти семью'}
      </button>
      <p style={{ fontSize: '0.8125rem', color: '#9ca3af', textAlign: 'center', margin: 0 }}>
        Нет аккаунта?{' '}
        <a href="/register" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 500 }}>
          Зарегистрироваться
        </a>
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Screen 2 — Who are you?
// ---------------------------------------------------------------------------

function ScreenSelect({
  familyName, unlinkedChildren, selectedChildId,
  onSelectChild, onJoinAsChild, onGoAdult, onBack, loading, error,
}: {
  familyName: string
  unlinkedChildren: ChildProfile[]
  selectedChildId: string | null
  onSelectChild: (id: string) => void
  onJoinAsChild: () => void
  onGoAdult: () => void
  onBack: () => void
  loading: boolean
  error: string | null
}) {
  const canJoinAsChild = !!selectedChildId && !loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.875rem', cursor: 'pointer', padding: 0, textAlign: 'left', alignSelf: 'flex-start' }}>
        ← Назад
      </button>

      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>
          Семья: {familyName}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          Кто вы в этой семье?
        </p>
      </div>

      {/* Unlinked child profiles */}
      {unlinkedChildren.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Я ребёнок
          </p>
          {unlinkedChildren.map((child) => {
            const isSelected = selectedChildId === child.memberId
            const isEmoji = child.avatarUrl !== null && child.avatarUrl !== '' && !child.avatarUrl.startsWith('http')
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
                <span style={{ fontSize: isEmoji ? '2rem' : undefined, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '3rem', height: '3rem' }}>
                  {child.avatarUrl ? (
                    isEmoji ? child.avatarUrl : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={child.avatarUrl} alt={child.displayName} style={{ width: '3rem', height: '3rem', borderRadius: '50%', objectFit: 'cover' }} />
                    )
                  ) : (
                    <span style={{ fontSize: '2rem' }}>👤</span>
                  )}
                </span>
                <span style={{ fontSize: '1.0625rem', fontWeight: 500, color: '#111827' }}>
                  {child.displayName}
                </span>
                {isSelected && <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: '1.125rem' }}>✓</span>}
              </button>
            )
          })}
          {canJoinAsChild && (
            <button onClick={onJoinAsChild} disabled={!canJoinAsChild} style={canJoinAsChild ? primaryBtn : primaryBtnDisabled}>
              {loading ? 'Присоединяюсь...' : 'Это я!'}
            </button>
          )}
        </div>
      )}

      {/* Divider if both sections visible */}
      {unlinkedChildren.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          <span style={{ fontSize: '0.8125rem', color: '#9ca3af' }}>или</span>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
        </div>
      )}

      {/* Adult join option */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {unlinkedChildren.length === 0 && (
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Я взрослый
          </p>
        )}
        <button onClick={onGoAdult} style={secondaryBtn}>
          👤 Я родитель / член семьи
        </button>
      </div>

      {error && <p style={errorStyle}>{error}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Screen 3 — Adult role selection
// ---------------------------------------------------------------------------

function ScreenAdultRole({
  familyName, selectedRole, onSelectRole, onConfirm, onBack, loading, error,
}: {
  familyName: string
  selectedRole: 'parent' | 'extended' | null
  onSelectRole: (role: 'parent' | 'extended') => void
  onConfirm: () => void
  onBack: () => void
  loading: boolean
  error: string | null
}) {
  const canConfirm = !!selectedRole && !loading

  const roles: { value: 'parent' | 'extended'; label: string; description: string }[] = [
    { value: 'parent', label: '👨‍👩‍👧 Родитель', description: 'Полный доступ: управление детьми, монетами, настройками' },
    { value: 'extended', label: '👴 Член семьи', description: 'Просмотр: бабушка, дедушка, другие близкие' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '0.875rem', cursor: 'pointer', padding: 0, textAlign: 'left', alignSelf: 'flex-start' }}>
        ← Назад
      </button>

      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>
          Ваша роль в семье
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          {familyName}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {roles.map(({ value, label, description }) => {
          const isSelected = selectedRole === value
          return (
            <button
              key={value}
              onClick={() => onSelectRole(value)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.25rem',
                padding: '1rem',
                borderRadius: '0.75rem',
                border: isSelected ? '2px solid #10b981' : '2px solid #e5e7eb',
                background: isSelected ? '#f0fdf4' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 150ms, background 150ms',
                width: '100%',
              }}
            >
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{label}</span>
              <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{description}</span>
            </button>
          )
        })}
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      <button onClick={onConfirm} disabled={!canConfirm} style={canConfirm ? primaryBtn : primaryBtnDisabled}>
        {loading ? 'Присоединяюсь...' : 'Войти в семью'}
      </button>
    </div>
  )
}
