'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { createClient } from '@/lib/supabase/client'
import {
  getOnboardingStep,
  saveParentProfile,
  createFamily,
  addChildToFamily,
  updateOnboardingStep,
} from '@/lib/onboarding-api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WizardData {
  userId: string
  familyId: string
  inviteCode: string
  parentName: string
  familyName: string
}

type Direction = 'forward' | 'backward'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 7

const EMOJI_OPTIONS = ['👦', '👧', '🧒', '👶', '🦸', '🧠', '⭐', '🏆']

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

// Step 0 — Welcome
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
      <div style={{ fontSize: '4rem', textAlign: 'center' }}>🌟</div>
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '0.5rem',
          }}
        >
          Добро пожаловать в FamilyCoins
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            maxWidth: '20rem',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Мотивируйте детей настоящей системой наград. Оценки, уборка, спорт — всё отслеживается и
          вознаграждается.
        </p>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
        <li style={featureItemStyle}>
          <span style={{ fontSize: '1.25rem' }}>🏆</span>
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
            Дети зарабатывают монеты за учёбу и домашние дела
          </span>
        </li>
        <li style={featureItemStyle}>
          <span style={{ fontSize: '1.25rem' }}>🛒</span>
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
            Монеты обмениваются на реальные награды
          </span>
        </li>
        <li style={featureItemStyle}>
          <span style={{ fontSize: '1.25rem' }}>📊</span>
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
            Вы видите прогресс каждого ребёнка
          </span>
        </li>
      </ul>
      <button onClick={onNext} style={primaryBtnStyle}>
        Начать
      </button>
    </div>
  )
}

const featureItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  background: '#f9fafb',
  borderRadius: '0.75rem',
  padding: '0.75rem 1rem',
}

// Step 1 — Profile
function StepProfile({
  parentName,
  onChange,
  onNext,
  submitting,
  error,
}: {
  parentName: string
  onChange: (v: string) => void
  onNext: () => void
  submitting: boolean
  error: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={stepHeadingStyle}>Расскажите о себе</h1>
        <p style={stepSubStyle}>Как вас зовут?</p>
      </div>
      <input
        type="text"
        placeholder="Ваше имя"
        value={parentName}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
      {error && <p style={errorStyle}>{error}</p>}
      <button onClick={onNext} disabled={submitting} style={primaryBtnStyle}>
        {submitting ? '...' : 'Далее'}
      </button>
    </div>
  )
}

// Step 2 — Family
function StepFamily({
  familyName,
  onChange,
  onNext,
  submitting,
  error,
}: {
  familyName: string
  onChange: (v: string) => void
  onNext: () => void
  submitting: boolean
  error: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={stepHeadingStyle}>Создайте вашу семью</h1>
        <p style={stepSubStyle}>Введите название вашей семьи</p>
      </div>
      <input
        type="text"
        placeholder="Например: Семья Ивановых"
        value={familyName}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
      {error && <p style={errorStyle}>{error}</p>}
      <button onClick={onNext} disabled={submitting} style={primaryBtnStyle}>
        {submitting ? '...' : 'Создать семью'}
      </button>
    </div>
  )
}

// Step 3 — Add Child
function StepAddChild({
  onNext,
  submitting,
  error,
  userId,
  familyId,
  onChildAdded,
}: {
  onNext: () => void
  submitting: boolean
  error: string
  userId: string
  familyId: string
  onChildAdded: (inviteCode: string) => void
}) {
  const [childName, setChildName] = useState('')
  const [birthYear, setBirthYear] = useState(new Date().getFullYear() - 8)
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>('👦')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [localSubmitting, setLocalSubmitting] = useState(false)
  const [localError, setLocalError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentYear = new Date().getFullYear()
  const yearOptions: number[] = []
  for (let y = currentYear; y >= currentYear - 18; y--) {
    yearOptions.push(y)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreviewUrl(URL.createObjectURL(file))
    setSelectedEmoji(null)
  }

  const handleSubmit = async () => {
    if (!childName.trim()) {
      setLocalError('Введите имя ребёнка')
      return
    }
    setLocalSubmitting(true)
    setLocalError('')
    try {
      let avatarUrl: string | undefined
      if (photoFile) {
        const supabase = createClient()
        const ext = photoFile.name.split('.').pop()
        const path = `children/${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, photoFile, { upsert: true })
        if (uploadError) throw new Error(uploadError.message)
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = urlData.publicUrl
      } else if (selectedEmoji) {
        avatarUrl = selectedEmoji
      }

      const result = await addChildToFamily(familyId, userId, {
        displayName: childName.trim(),
        birthYear,
        avatarUrl,
      })
      onChildAdded(result.inviteCode)
      onNext()
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Ошибка при добавлении ребёнка')
    } finally {
      setLocalSubmitting(false)
    }
  }

  const isSubmitting = submitting || localSubmitting
  const displayError = error || localError

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={stepHeadingStyle}>Добавьте ребёнка</h1>
        <p style={stepSubStyle}>Введите данные вашего первого ребёнка</p>
      </div>
      <input
        type="text"
        placeholder="Имя ребёнка"
        value={childName}
        onChange={(e) => setChildName(e.target.value)}
        style={inputStyle}
      />
      <div>
        <label style={labelStyle}>Год рождения</label>
        <select
          value={birthYear}
          onChange={(e) => setBirthYear(Number(e.target.value))}
          style={inputStyle}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p style={labelStyle}>Фото профиля</p>
        {photoPreviewUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreviewUrl}
              alt="Превью"
              style={{
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #10b981',
              }}
            />
            <button
              onClick={() => {
                setPhotoFile(null)
                setPhotoPreviewUrl(null)
                setSelectedEmoji('👦')
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              style={{ fontSize: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Удалить фото
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.5rem',
              marginBottom: '0.5rem',
            }}
          >
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(emoji)}
                style={{
                  fontSize: '1.5rem',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  border: selectedEmoji === emoji ? '2px solid #10b981' : '2px solid transparent',
                  background: selectedEmoji === emoji ? '#f0fdf4' : '#f9fafb',
                  cursor: 'pointer',
                  outline: selectedEmoji === emoji ? '2px solid #10b981' : 'none',
                  outlineOffset: '1px',
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', margin: '0.5rem 0' }}>
          или
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            fontSize: '0.875rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: '#fff',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Загрузить фото
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
      {displayError && <p style={errorStyle}>{displayError}</p>}
      <button onClick={handleSubmit} disabled={isSubmitting} style={primaryBtnStyle}>
        {isSubmitting ? '...' : 'Добавить ребёнка'}
      </button>
    </div>
  )
}

// Step 4 — Invite Parent
function StepInviteParent({
  inviteCode,
  onSkip,
  onNext,
  submitting,
}: {
  inviteCode: string
  onSkip: () => void
  onNext: () => void
  submitting: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={stepHeadingStyle}>Пригласите второго родителя</h1>
        <p style={stepSubStyle}>Поделитесь этим кодом с супругом(ой)</p>
      </div>
      <div
        style={{
          border: '2px solid #10b981',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          background: '#f0fdf4',
        }}
      >
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '1.5rem',
            fontWeight: 700,
            letterSpacing: '0.15em',
            color: '#111827',
          }}
        >
          {inviteCode}
        </span>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.25rem',
            color: copied ? '#10b981' : '#6b7280',
          }}
          title="Скопировать"
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
      {copied && (
        <p style={{ fontSize: '0.75rem', color: '#10b981', textAlign: 'center', margin: 0 }}>
          Скопировано!
        </p>
      )}
      <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center' }}>
        Ребёнок тоже использует этот код чтобы присоединиться
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={onSkip} disabled={submitting} style={ghostBtnStyle}>
          Пропустить
        </button>
        <button onClick={onNext} disabled={submitting} style={{ ...primaryBtnStyle, flex: 1 }}>
          {submitting ? '...' : 'Далее'}
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 5 — Categories
// ---------------------------------------------------------------------------

interface Category {
  id: string
  emoji: string
  name: string
  description: string
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'study', emoji: '📚', name: 'Учёба', description: 'Оценки, домашние задания' },
  { id: 'home', emoji: '🏠', name: 'Дом', description: 'Уборка комнаты, помощь по дому' },
  { id: 'sport', emoji: '⚽', name: 'Спорт', description: 'Тренировки, секции, упражнения' },
  { id: 'routine', emoji: '⏰', name: 'Распорядок', description: 'Режим дня, личная гигиена' },
]

function StepCategories({
  onNext,
  submitting,
}: {
  onNext: () => void
  submitting: boolean
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(DEFAULT_CATEGORIES.map((c) => c.id))
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h1 style={stepHeadingStyle}>Выберите категории активностей</h1>
        <p style={stepSubStyle}>Вы сможете добавить больше в настройках</p>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.75rem',
        }}
      >
        {DEFAULT_CATEGORIES.map((cat) => {
          const isSelected = selected.has(cat.id)
          return (
            <button
              key={cat.id}
              onClick={() => toggle(cat.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.25rem',
                padding: '0.875rem',
                borderRadius: '0.75rem',
                border: isSelected ? '2px solid #10b981' : '2px solid #e5e7eb',
                background: isSelected ? '#f0fdf4' : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 150ms, background 150ms',
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>{cat.emoji}</span>
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                {cat.name}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  lineHeight: 1.4,
                }}
              >
                {cat.description}
              </span>
            </button>
          )
        })}
      </div>
      <button onClick={onNext} disabled={submitting} style={primaryBtnStyle}>
        {submitting ? '...' : 'Продолжить'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 6 — Done
// ---------------------------------------------------------------------------

function StepDone({
  parentName,
  familyName,
  inviteCode,
  onFinish,
  submitting,
}: {
  parentName: string
  familyName: string
  inviteCode: string
  onFinish: () => void
  submitting: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3.75rem', marginBottom: '0.75rem' }}>🎉</div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '0.25rem',
          }}
        >
          Всё готово!
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          Ваша семья создана. Пора начинать!
        </p>
      </div>

      {/* Summary card */}
      <div
        style={{
          background: '#f9fafb',
          borderRadius: '0.75rem',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.625rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>👤</span>
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
            <strong>Родитель:</strong> {parentName || '—'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>🏠</span>
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
            <strong>Семья:</strong> {familyName || '—'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '1rem' }}>🔑</span>
            <span style={{ fontSize: '0.875rem', color: '#374151', flex: 1, minWidth: 0 }}>
              <strong>Код приглашения:</strong>{' '}
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: '#111827',
                }}
              >
                {inviteCode || '—'}
              </span>
            </span>
          </div>
          {inviteCode && (
            <button
              onClick={handleCopy}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.1rem',
                color: copied ? '#10b981' : '#6b7280',
                padding: '0.25rem',
                flexShrink: 0,
              }}
              title="Скопировать код"
            >
              {copied ? '✓' : '📋'}
            </button>
          )}
        </div>
        {copied && (
          <p style={{ fontSize: '0.75rem', color: '#10b981', margin: 0, textAlign: 'center' }}>
            Скопировано!
          </p>
        )}
      </div>

      <button onClick={onFinish} disabled={submitting} style={primaryBtnStyle}>
        {submitting ? '...' : 'Перейти в приложение'}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const stepHeadingStyle: React.CSSProperties = {
  fontSize: '1.375rem',
  fontWeight: 700,
  color: '#111827',
  marginBottom: '0.25rem',
}

const stepSubStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#6b7280',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  fontSize: '1rem',
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '0.5rem',
  display: 'block',
}

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

const ghostBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.75rem 1rem',
  background: 'none',
  color: '#6b7280',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  fontSize: '1rem',
  cursor: 'pointer',
}

const errorStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#ef4444',
  margin: 0,
}

// ---------------------------------------------------------------------------
// Main Wizard Page
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState<Direction>('forward')
  const [animating, setAnimating] = useState(false)
  const [wizardData, setWizardData] = useState<WizardData>({
    userId: '',
    familyId: '',
    inviteCode: '',
    parentName: '',
    familyName: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // On mount: get authenticated user and resume from last onboarding step.
  // Already-onboarded users (step >= 6) are sent directly to /dashboard.
  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.replace('/login')
          return
        }
        setWizardData((prev) => ({ ...prev, userId: user.id }))
        const step = await getOnboardingStep(user.id)
        if (step >= 6) {
          router.replace('/dashboard')
          return
        }
        setCurrentStep(step)
      } catch {
        // Non-fatal: stay at step 0
      } finally {
        setLoading(false)
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fire confetti when user reaches the Done screen (step 6)
  useEffect(() => {
    if (currentStep === 6) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#059669', '#f59e0b', '#3b82f6'],
      })
    }
  }, [currentStep])

  const goTo = (step: number, dir: Direction) => {
    if (animating) return
    setDirection(dir)
    setAnimating(true)
    setError('')
    setTimeout(() => {
      setCurrentStep(step)
      setAnimating(false)
    }, 150)
  }

  const goForward = () => goTo(currentStep + 1, 'forward')
  const goBackward = () => goTo(currentStep - 1, 'backward')

  // Step 0: Welcome — no DB call
  const handleWelcomeNext = () => goForward()

  // Step 1: Profile — save display name
  const handleProfileNext = async () => {
    if (!wizardData.parentName.trim()) {
      setError('Введите ваше имя')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await saveParentProfile(wizardData.userId, { displayName: wizardData.parentName.trim() })
      goForward()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении профиля')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 2: Family — create family in DB
  const handleFamilyNext = async () => {
    if (!wizardData.familyName.trim()) {
      setError('Введите название семьи')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const result = await createFamily(wizardData.userId, { name: wizardData.familyName.trim() })
      setWizardData((prev) => ({
        ...prev,
        familyId: result.familyId,
        inviteCode: result.inviteCode,
      }))
      goForward()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при создании семьи')
    } finally {
      setSubmitting(false)
    }
  }

  // Step 4: Invite — both buttons advance to step 5
  const handleInviteSkip = async () => {
    setSubmitting(true)
    try {
      await updateOnboardingStep(wizardData.userId, 5)
    } catch {
      // Non-fatal
    } finally {
      setSubmitting(false)
    }
    goForward()
  }

  const handleInviteNext = async () => {
    setSubmitting(true)
    try {
      await updateOnboardingStep(wizardData.userId, 5)
    } catch {
      // Non-fatal
    } finally {
      setSubmitting(false)
    }
    goForward()
  }

  // Step 5: Categories — UI only; no DB write for category selections in Phase 1.2.
  // Phase 1.3 will seed default categories for every family unconditionally.
  // Only DB call here is updateOnboardingStep to advance the wizard.
  const handleCategoriesNext = async () => {
    setSubmitting(true)
    try {
      await updateOnboardingStep(wizardData.userId, 6)
    } catch {
      // Non-fatal
    } finally {
      setSubmitting(false)
    }
    goForward()
  }

  // Step 6: Done — mark onboarding complete (step 6 already set by Step 5 handler),
  // then navigate to /dashboard.
  const handleFinish = async () => {
    setSubmitting(true)
    try {
      await updateOnboardingStep(wizardData.userId, 6)
    } catch {
      // Non-fatal: DB may already be at 6
    } finally {
      setSubmitting(false)
    }
    // Full navigation to flush middleware session check
    window.location.href = '/dashboard'
  }

  // Progress bar percentage (1-indexed display: step 1 of 7 on step 0)
  const progressPct = ((currentStep + 1) / TOTAL_STEPS) * 100

  // Slide animation styles
  const slideStyle: React.CSSProperties = animating
    ? {
        transform: direction === 'forward' ? 'translateX(100%)' : 'translateX(-100%)',
        opacity: 0,
        transition: 'transform 150ms cubic-bezier(0.4,0,0.2,1), opacity 150ms',
      }
    : {
        transform: 'translateX(0)',
        opacity: 1,
        transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms',
      }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
        }}
      >
        <div
          style={{
            width: '2rem',
            height: '2rem',
            border: '3px solid #e5e7eb',
            borderTopColor: '#10b981',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          background: '#fff',
          borderRadius: '1rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          padding: '2rem',
          overflow: 'hidden',
        }}
      >
        {/* Progress bar */}
        <div style={{ marginBottom: '2rem' }}>
          <p
            style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginBottom: '0.375rem',
              textAlign: 'right',
            }}
          >
            Шаг {currentStep + 1} из {TOTAL_STEPS}
          </p>
          <div
            style={{
              height: '0.375rem',
              background: '#e5e7eb',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: '#10b981',
                borderRadius: '9999px',
                transition: 'width 300ms cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </div>
        </div>

        {/* Step content with slide animation */}
        <div style={{ ...slideStyle, minHeight: '16rem' }}>
          {currentStep === 0 && <StepWelcome onNext={handleWelcomeNext} />}

          {currentStep === 1 && (
            <StepProfile
              parentName={wizardData.parentName}
              onChange={(v) => setWizardData((prev) => ({ ...prev, parentName: v }))}
              onNext={handleProfileNext}
              submitting={submitting}
              error={error}
            />
          )}

          {currentStep === 2 && (
            <StepFamily
              familyName={wizardData.familyName}
              onChange={(v) => setWizardData((prev) => ({ ...prev, familyName: v }))}
              onNext={handleFamilyNext}
              submitting={submitting}
              error={error}
            />
          )}

          {currentStep === 3 && (
            <StepAddChild
              onNext={goForward}
              submitting={submitting}
              error={error}
              userId={wizardData.userId}
              familyId={wizardData.familyId}
              onChildAdded={(code) =>
                setWizardData((prev) => ({ ...prev, inviteCode: prev.inviteCode || code }))
              }
            />
          )}

          {currentStep === 4 && (
            <StepInviteParent
              inviteCode={wizardData.inviteCode}
              onSkip={handleInviteSkip}
              onNext={handleInviteNext}
              submitting={submitting}
            />
          )}

          {currentStep === 5 && (
            <StepCategories
              onNext={handleCategoriesNext}
              submitting={submitting}
            />
          )}

          {currentStep === 6 && (
            <StepDone
              parentName={wizardData.parentName}
              familyName={wizardData.familyName}
              inviteCode={wizardData.inviteCode}
              onFinish={handleFinish}
              submitting={submitting}
            />
          )}
        </div>

        {/* Back button — hidden on step 0 (Welcome) and steps 5+ (categories / done) */}
        {currentStep > 0 && currentStep < 5 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
            <button
              onClick={goBackward}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '0.875rem',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ← Назад
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
