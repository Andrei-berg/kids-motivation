'use client'

import {
  useState,
  useEffect,
  useRef,
  KeyboardEvent,
  ClipboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  lookupFamilyByCode,
  getFamilyChildren,
  joinFamilyAsChild,
  joinFamilyAsAdult,
  getUserDisplayName,
  ChildProfile,
} from '@/lib/onboarding-api'
import { useAppStore } from '@/lib/store'
import { getChildren } from '@/lib/repositories/children.repo'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Screen = 'code' | 'select' | 'adult-role'

// ---------------------------------------------------------------------------
// OTP Code Input — 6 individual boxes with auto-advance and paste support
// ---------------------------------------------------------------------------

function CodeInput({
  value,
  onChange,
  onComplete,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onComplete?: () => void
  disabled?: boolean
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const cells = Array.from({ length: 6 }, (_, i) => value[i] || '')

  const focus = (i: number) => refs.current[i]?.focus()

  const handleChange = (idx: number, raw: string) => {
    const ch = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (!ch) return
    const next = value.slice(0, idx) + ch[0] + value.slice(idx + 1)
    const trimmed = next.slice(0, 6)
    onChange(trimmed)
    if (idx < 5) focus(idx + 1)
    if (trimmed.length === 6) onComplete?.()
  }

  const handleKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (cells[idx]) {
        onChange(value.slice(0, idx) + value.slice(idx + 1))
      } else if (idx > 0) {
        focus(idx - 1)
        onChange(value.slice(0, idx - 1) + value.slice(idx))
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault(); focus(idx - 1)
    } else if (e.key === 'ArrowRight' && idx < 5) {
      e.preventDefault(); focus(idx + 1)
    } else if (e.key === 'Enter' && value.length === 6) {
      onComplete?.()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
      .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, 5)
    setTimeout(() => focus(focusIdx), 0)
    if (pasted.length === 6) onComplete?.()
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
      {cells.map((ch, i) => {
        const filled = !!ch
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el }}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={1}
            value={ch}
            disabled={disabled}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              width: 'clamp(2.5rem, 12vw, 3rem)',
              height: 'clamp(3rem, 14vw, 3.75rem)',
              textAlign: 'center',
              fontSize: '1.375rem',
              fontFamily: "'Nunito', sans-serif",
              fontWeight: 800,
              border: `2.5px solid ${filled ? '#10b981' : '#d1fae5'}`,
              borderRadius: '0.875rem',
              outline: 'none',
              background: filled ? '#f0fdf4' : '#f9fafe',
              color: '#065f46',
              transition: 'all 180ms cubic-bezier(0.4,0,0.2,1)',
              boxShadow: filled ? '0 2px 8px rgba(16,185,129,0.18)' : 'none',
              cursor: disabled ? 'not-allowed' : 'text',
              opacity: disabled ? 0.6 : 1,
            }}
          />
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Avatar display helper
// ---------------------------------------------------------------------------

function Avatar({ url, name, size = 56 }: { url: string | null; name: string; size?: number }) {
  const isEmoji = url !== null && url !== '' && !url.startsWith('http')
  if (isEmoji) {
    return (
      <span style={{
        fontSize: size * 0.6,
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        background: '#d1fae5',
        flexShrink: 0,
      }}>
        {url}
      </span>
    )
  }
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <span style={{
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      background: '#d1fae5',
      fontSize: size * 0.5,
      flexShrink: 0,
    }}>
      👤
    </span>
  )
}

// ---------------------------------------------------------------------------
// Progress dots
// ---------------------------------------------------------------------------

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center', marginBottom: '1.75rem' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? '1.5rem' : '0.5rem',
          height: '0.5rem',
          borderRadius: '9999px',
          background: i === current ? '#10b981' : '#d1fae5',
          transition: 'all 300ms cubic-bezier(0.4,0,0.2,1)',
        }} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const headingStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 800,
  color: '#064e3b',
  marginBottom: '0.375rem',
  fontFamily: "'Nunito', sans-serif",
  lineHeight: 1.2,
}

const subStyle: React.CSSProperties = {
  fontSize: '0.9375rem',
  color: '#6b7280',
  margin: 0,
  lineHeight: 1.5,
}

const primaryBtnStyle = (enabled: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '0.875rem 1.5rem',
  background: enabled ? '#10b981' : '#a7f3d0',
  color: enabled ? '#fff' : '#6b7280',
  border: 'none',
  borderRadius: '0.875rem',
  fontSize: '1.0625rem',
  fontWeight: 700,
  cursor: enabled ? 'pointer' : 'not-allowed',
  fontFamily: "'Nunito', sans-serif",
  transition: 'all 180ms cubic-bezier(0.4,0,0.2,1)',
  boxShadow: enabled ? '0 4px 14px rgba(16,185,129,0.3)' : 'none',
})

const ghostBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#6b7280',
  fontSize: '0.9375rem',
  cursor: 'pointer',
  padding: '0.25rem 0',
  fontFamily: "'Nunito', sans-serif",
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: '0.25rem',
}

const errorBoxStyle: React.CSSProperties = {
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '0.75rem',
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#dc2626',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <span style={{
      width: '1.125rem',
      height: '1.125rem',
      border: '2.5px solid rgba(255,255,255,0.4)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

// ---------------------------------------------------------------------------
// Screen 1 — Code entry
// ---------------------------------------------------------------------------

function ScreenCode({
  code, onChange, onSubmit, loading, error,
}: {
  code: string
  onChange: (v: string) => void
  onSubmit: () => void
  loading: boolean
  error: string | null
}) {
  const canSubmit = code.length === 6 && !loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hero icon */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '5rem',
          height: '5rem',
          borderRadius: '1.5rem',
          background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
          boxShadow: '0 8px 24px rgba(16,185,129,0.2)',
          marginBottom: '0.25rem',
        }}>
          🔑
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={headingStyle}>Войти в семью</h1>
        <p style={subStyle}>Введите 6-значный код,<br />который дал вам родитель</p>
      </div>

      <CodeInput value={code} onChange={onChange} onComplete={canSubmit ? onSubmit : undefined} disabled={loading} />

      {error && (
        <div style={errorBoxStyle}>
          <span>⚠️</span> {error}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        style={primaryBtnStyle(canSubmit)}
      >
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Spinner /> Ищем семью...
          </span>
        ) : 'Найти семью →'}
      </button>

      <p style={{ fontSize: '0.8125rem', color: '#9ca3af', textAlign: 'center', margin: 0 }}>
        Нет аккаунта?{' '}
        <a href="/register" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 700 }}>
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
  familyName,
  unlinkedChildren,
  selectedChildId,
  onSelectChild,
  onJoinAsChild,
  onGoAdult,
  onBack,
  loading,
  error,
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
  const canJoin = !!selectedChildId && !loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <button onClick={onBack} style={ghostBtnStyle}>
        ← Назад
      </button>

      {/* Family header */}
      <div style={{
        background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
        borderRadius: '1rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <span style={{ fontSize: '2rem' }}>🏠</span>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Семья найдена</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#064e3b', fontFamily: "'Nunito', sans-serif" }}>{familyName}</div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '1.25rem', color: '#10b981' }}>✓</span>
      </div>

      <div>
        <h1 style={{ ...headingStyle, fontSize: '1.25rem' }}>Кто вы в этой семье?</h1>
      </div>

      {/* Child profiles */}
      {unlinkedChildren.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Я ребёнок
          </div>
          {unlinkedChildren.map((child) => {
            const isSelected = selectedChildId === child.memberId
            return (
              <button
                key={child.memberId}
                onClick={() => onSelectChild(child.memberId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1rem',
                  borderRadius: '1rem',
                  border: `2.5px solid ${isSelected ? '#10b981' : '#e5e7eb'}`,
                  background: isSelected ? '#f0fdf4' : '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 180ms cubic-bezier(0.4,0,0.2,1)',
                  width: '100%',
                  boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.15)' : 'none',
                }}
              >
                <Avatar url={child.avatarUrl} name={child.displayName} size={48} />
                <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#111827', fontFamily: "'Nunito', sans-serif", flex: 1 }}>
                  {child.displayName}
                </span>
                <div style={{
                  width: '1.5rem',
                  height: '1.5rem',
                  borderRadius: '50%',
                  border: `2px solid ${isSelected ? '#10b981' : '#d1d5db'}`,
                  background: isSelected ? '#10b981' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 180ms',
                }}>
                  {isSelected && <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>}
                </div>
              </button>
            )
          })}

          {canJoin && (
            <button onClick={onJoinAsChild} disabled={loading} style={primaryBtnStyle(canJoin)}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Spinner /> Присоединяюсь...
                </span>
              ) : '🎉 Это я!'}
            </button>
          )}
        </div>
      )}

      {/* Divider */}
      {unlinkedChildren.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          <span style={{ fontSize: '0.8125rem', color: '#9ca3af', fontWeight: 600 }}>или</span>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
        </div>
      )}

      {/* Adult join */}
      <button
        onClick={onGoAdult}
        style={{
          width: '100%',
          padding: '0.875rem 1.25rem',
          background: '#fff',
          color: '#374151',
          border: '2px solid #e5e7eb',
          borderRadius: '1rem',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'Nunito', sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          transition: 'border-color 180ms',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#10b981')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
      >
        <span>👨‍👩‍👧</span>
        Я родитель / взрослый
      </button>

      {error && <div style={errorBoxStyle}><span>⚠️</span> {error}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Screen 3 — Adult role selection
// ---------------------------------------------------------------------------

const ROLES: { value: 'parent' | 'extended'; emoji: string; label: string; desc: string; color: string }[] = [
  {
    value: 'parent',
    emoji: '👨‍👩‍👧',
    label: 'Родитель',
    desc: 'Полный доступ: управление детьми, монетами и настройками',
    color: '#10b981',
  },
  {
    value: 'extended',
    emoji: '👴',
    label: 'Член семьи',
    desc: 'Просмотр прогресса: бабушка, дедушка или другой близкий',
    color: '#f59e0b',
  },
]

function ScreenAdultRole({
  familyName,
  selectedRole,
  onSelectRole,
  onConfirm,
  onBack,
  loading,
  error,
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <button onClick={onBack} style={ghostBtnStyle}>← Назад</button>

      <div>
        <h1 style={headingStyle}>Ваша роль</h1>
        <p style={subStyle}>Семья <strong style={{ color: '#065f46' }}>{familyName}</strong></p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {ROLES.map((role) => {
          const isSelected = selectedRole === role.value
          return (
            <button
              key={role.value}
              onClick={() => onSelectRole(role.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem 1.25rem',
                borderRadius: '1rem',
                border: `2.5px solid ${isSelected ? role.color : '#e5e7eb'}`,
                background: isSelected ? `${role.color}10` : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 180ms cubic-bezier(0.4,0,0.2,1)',
                width: '100%',
                boxShadow: isSelected ? `0 4px 12px ${role.color}30` : 'none',
              }}
            >
              <span style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '0.875rem',
                background: `${role.color}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                flexShrink: 0,
              }}>
                {role.emoji}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', fontFamily: "'Nunito', sans-serif", marginBottom: '0.2rem' }}>
                  {role.label}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.4 }}>
                  {role.desc}
                </div>
              </div>
              <div style={{
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '50%',
                border: `2px solid ${isSelected ? role.color : '#d1d5db'}`,
                background: isSelected ? role.color : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 180ms',
              }}>
                {isSelected && <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>}
              </div>
            </button>
          )
        })}
      </div>

      {error && <div style={errorBoxStyle}><span>⚠️</span> {error}</div>}

      <button onClick={onConfirm} disabled={!canConfirm} style={primaryBtnStyle(canConfirm)}>
        {loading ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <Spinner /> Присоединяюсь...
          </span>
        ) : 'Войти в семью →'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const SCREEN_ORDER: Screen[] = ['code', 'select', 'adult-role']

// Resolves family_members display_name → old children.id ('adam'/'alim')
// The rest of the app uses the legacy TEXT primary key from the children table.
async function resolveLegacyChildId(displayName: string | null): Promise<string | null> {
  if (!displayName) return null
  try {
    const children = await getChildren()
    const needle = displayName.trim().toLowerCase()
    const match = children.find(c => c.name.trim().toLowerCase() === needle)
    return match?.id ?? null
  } catch {
    return null
  }
}

export default function JoinFamilyPage() {
  const router = useRouter()
  const { setFamilyId: setStoreFamilyId, setActiveMemberId } = useAppStore()

  // Auth state
  const [userId, setUserId] = useState<string | null>(null)
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Screen
  const [screen, setScreen] = useState<Screen>('code')
  const [animating, setAnimating] = useState(false)
  const [slideDir, setSlideDir] = useState<'forward' | 'backward'>('forward')

  // Code entry
  const [code, setCode] = useState('')
  const [lookingUp, setLookingUp] = useState(false)

  // Family data
  const [familyId, setFamilyId] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [unlinkedChildren, setUnlinkedChildren] = useState<ChildProfile[]>([])

  // Selection
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<'parent' | 'extended' | null>(null)

  // Shared
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auth check on mount
  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.replace('/login'); return }

        const { data: existingRows } = await supabase
          .from('family_members')
          .select('id, family_id, display_name')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(1)

        const existing = existingRows?.[0]
        if (existing) {
          setStoreFamilyId(existing.family_id)
          // Map family_members UUID → old children.id by display_name
          const legacyId = await resolveLegacyChildId(existing.display_name)
          if (legacyId) setActiveMemberId(legacyId)
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

  const goTo = (next: Screen, dir: 'forward' | 'backward') => {
    if (animating) return
    setSlideDir(dir)
    setAnimating(true)
    setError(null)
    setTimeout(() => {
      setScreen(next)
      setAnimating(false)
    }, 180)
  }

  // Screen 1 → look up family by code
  const handleLookup = async () => {
    if (code.length !== 6 || lookingUp) return
    setLookingUp(true)
    setError(null)
    try {
      const result = await lookupFamilyByCode(code)
      if (!result) { setError('Код не найден. Проверьте и попробуйте ещё раз.'); return }
      const children = await getFamilyChildren(result.familyId)
      setFamilyId(result.familyId)
      setFamilyName(result.name)
      setUnlinkedChildren(children)
      setSelectedChildId(null)
      setSelectedRole(null)
      goTo('select', 'forward')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте снова.')
    } finally {
      setLookingUp(false)
    }
  }

  // Screen 2 → join as child
  const handleJoinAsChild = async () => {
    if (!selectedChildId || !userId) return
    const child = unlinkedChildren.find((c) => c.memberId === selectedChildId)
    if (!child) return
    setLoading(true)
    setError(null)
    try {
      await joinFamilyAsChild(familyId, userId, { memberId: child.memberId, displayName: child.displayName })
      setStoreFamilyId(familyId)
      const legacyId = await resolveLegacyChildId(child.displayName)
      setActiveMemberId(legacyId ?? child.memberId)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось присоединиться. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  // Screen 3 → join as adult
  const handleJoinAsAdult = async () => {
    if (!selectedRole || !userId) return
    setLoading(true)
    setError(null)
    try {
      await joinFamilyAsAdult(familyId, userId, selectedRole, userDisplayName)
      setStoreFamilyId(familyId)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось присоединиться. Попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  const currentDotIndex = SCREEN_ORDER.indexOf(screen)

  const slideStyle: React.CSSProperties = animating
    ? {
        transform: slideDir === 'forward' ? 'translateX(40px)' : 'translateX(-40px)',
        opacity: 0,
        transition: 'transform 180ms cubic-bezier(0.4,0,0.2,1), opacity 180ms',
      }
    : {
        transform: 'translateX(0)',
        opacity: 1,
        transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1), opacity 280ms',
      }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: '2.5rem', height: '2.5rem',
          border: '3px solid #d1fae5',
          borderTopColor: '#10b981',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #ecfdf5 0%, #f9fafb 50%, #fffbeb 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '3rem 1rem 2rem',
        fontFamily: "'Nunito', sans-serif",
      }}>
        {/* Logo */}
        <div style={{
          position: 'fixed',
          top: '1.25rem',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '1.125rem',
          fontWeight: 900,
          color: '#10b981',
          letterSpacing: '-0.02em',
          fontFamily: "'Nunito', sans-serif",
          pointerEvents: 'none',
        }}>
          FamilyCoins
        </div>

        <div style={{
          width: '100%',
          maxWidth: '26rem',
          background: '#fff',
          borderRadius: '1.5rem',
          boxShadow: '0 24px 80px rgba(0,0,0,0.08), 0 4px 16px rgba(16,185,129,0.06)',
          padding: '2rem',
          overflow: 'hidden',
        }}>
          <ProgressDots current={currentDotIndex} total={3} />

          <div style={slideStyle}>
            {screen === 'code' && (
              <ScreenCode
                code={code}
                onChange={(v) => { setCode(v); setError(null) }}
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
                onGoAdult={() => goTo('adult-role', 'forward')}
                onBack={() => goTo('code', 'backward')}
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
                onBack={() => goTo('select', 'backward')}
                loading={loading}
                error={error}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
