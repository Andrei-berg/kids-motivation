'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { lookupFamilyByCode, getFamilyChildren } from '@/lib/onboarding-api'
import { useAppStore } from '@/lib/store'
import type { ChildProfile } from '@/lib/onboarding-api'

const AMBER = '#f59e0b'
const AMBER_DARK = '#d97706'
const AMBER_LIGHT = 'rgba(245, 158, 11, 0.12)'

export default function KidLogin() {
  const router = useRouter()
  const { setFamilyId, setActiveMemberId } = useAppStore()

  const [step, setStep] = useState(0)
  const [code, setCode] = useState('')
  const [familyId, setFamilyIdLocal] = useState('')
  const [profiles, setProfiles] = useState<ChildProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<ChildProfile | null>(null)
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function lookupFamily() {
    setLoading(true)
    setError(null)
    try {
      const result = await lookupFamilyByCode(code.toUpperCase())
      if (!result) {
        setError('Код не найден. Проверь и попробуй снова.')
        return
      }
      const children = await getFamilyChildren(result.familyId)
      setFamilyIdLocal(result.familyId)
      setProfiles(children)
      setStep(1)
    } catch {
      setError('Ошибка соединения. Попробуй снова.')
    } finally {
      setLoading(false)
    }
  }

  async function signInWithPin() {
    if (!selectedProfile || pin.length !== 4) return
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: memberRow } = await supabase
        .from('family_members')
        .select('child_id')
        .eq('id', selectedProfile.memberId)
        .maybeSingle()

      if (!memberRow?.child_id) {
        setError('Профиль не найден. Обратись к родителю.')
        return
      }

      const syntheticEmail = `child_${memberRow.child_id}@internal.familycoins.app`
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: pin,
      })

      if (authError) {
        setError('Неверный PIN. Попробуй ещё раз.')
        return
      }

      setFamilyId(familyId)
      setActiveMemberId(memberRow.child_id)
      router.push('/kid/day')
    } catch {
      setError('Ошибка входа. Попробуй снова.')
    } finally {
      setLoading(false)
    }
  }

  const progressPct = ((step + 1) / 3) * 100

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#ffffff',
          borderRadius: '1.25rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
          padding: '2rem',
          position: 'relative',
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            height: '4px',
            backgroundColor: '#f3f4f6',
            borderRadius: '9999px',
            marginBottom: '1.75rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: `linear-gradient(90deg, ${AMBER}, ${AMBER_DARK})`,
              borderRadius: '9999px',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* STEP 0: Enter family code */}
        {step === 0 && (
          <div>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                textAlign: 'center',
                marginBottom: '0.5rem',
                marginTop: 0,
              }}
            >
              Войти как ребёнок
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                textAlign: 'center',
                marginBottom: '1.75rem',
              }}
            >
              Попроси родителя показать код семьи
            </p>

            <input
              type="text"
              placeholder="Код семьи (6 букв)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              maxLength={6}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '0.625rem',
                border: `2px solid ${AMBER}`,
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '6px',
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '1rem',
                color: '#1f2937',
                backgroundColor: AMBER_LIGHT,
              }}
              autoComplete="off"
              autoCapitalize="characters"
            />

            {error && (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#ef4444',
                  textAlign: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={lookupFamily}
              disabled={loading || code.length < 4}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '0.625rem',
                border: 'none',
                background: code.length < 4
                  ? '#d1d5db'
                  : `linear-gradient(135deg, ${AMBER}, ${AMBER_DARK})`,
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: code.length < 4 ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
              }}
            >
              {loading ? 'Проверяю...' : 'Далее →'}
            </button>
          </div>
        )}

        {/* STEP 1: Pick your name */}
        {step === 1 && (
          <div>
            {/* Back button */}
            <button
              type="button"
              onClick={() => { setStep(0); setError(null) }}
              style={{
                background: 'none',
                border: 'none',
                color: AMBER,
                fontSize: '0.875rem',
                cursor: 'pointer',
                padding: '0 0 1rem 0',
                fontFamily: 'inherit',
              }}
            >
              ← Назад
            </button>

            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                textAlign: 'center',
                marginBottom: '0.5rem',
                marginTop: 0,
              }}
            >
              Кто ты?
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                textAlign: 'center',
                marginBottom: '1.25rem',
              }}
            >
              Выбери своё имя из списка
            </p>

            {profiles.length === 0 ? (
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: '#9ca3af',
                  textAlign: 'center',
                  padding: '1rem',
                }}
              >
                Нет доступных профилей
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1rem' }}>
                {profiles.map((profile) => {
                  const isSelected = selectedProfile?.memberId === profile.memberId
                  return (
                    <button
                      key={profile.memberId}
                      type="button"
                      onClick={() => setSelectedProfile(profile)}
                      style={{
                        height: '80px',
                        width: '100%',
                        borderRadius: '0.75rem',
                        border: isSelected ? `2px solid ${AMBER}` : '2px solid #e5e7eb',
                        backgroundColor: isSelected ? AMBER_LIGHT : '#f9fafb',
                        color: '#1f2937',
                        fontSize: '1.125rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        transition: 'all 0.15s ease',
                        fontFamily: 'inherit',
                      }}
                    >
                      {profile.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatarUrl}
                          alt={profile.displayName}
                          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span style={{ fontSize: '1.75rem' }}>
                          {profile.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {profile.displayName}
                      {isSelected && <span style={{ color: AMBER, fontSize: '1.25rem' }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            )}

            <p
              style={{
                fontSize: '0.75rem',
                color: '#9ca3af',
                textAlign: 'center',
                marginBottom: '1rem',
              }}
            >
              Если тебя нет в списке — спроси родителя
            </p>

            {error && (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#ef4444',
                  textAlign: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => { setStep(2); setError(null) }}
              disabled={!selectedProfile}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '0.625rem',
                border: 'none',
                background: !selectedProfile
                  ? '#d1d5db'
                  : `linear-gradient(135deg, ${AMBER}, ${AMBER_DARK})`,
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: !selectedProfile ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                fontFamily: 'inherit',
              }}
            >
              Далее →
            </button>
          </div>
        )}

        {/* STEP 2: Enter PIN */}
        {step === 2 && (
          <div>
            {/* Back button */}
            <button
              type="button"
              onClick={() => { setStep(1); setError(null); setPin('') }}
              style={{
                background: 'none',
                border: 'none',
                color: AMBER,
                fontSize: '0.875rem',
                cursor: 'pointer',
                padding: '0 0 1rem 0',
                fontFamily: 'inherit',
              }}
            >
              ← Назад
            </button>

            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#1f2937',
                textAlign: 'center',
                marginBottom: '0.5rem',
                marginTop: 0,
              }}
            >
              Введи PIN
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                textAlign: 'center',
                marginBottom: '1.75rem',
              }}
            >
              4 цифры, которые задал родитель
            </p>

            <input
              type="text"
              inputMode="numeric"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              autoComplete="off"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.625rem',
                border: `2px solid ${AMBER}`,
                fontSize: '2.25rem',
                fontWeight: 700,
                letterSpacing: '16px',
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '1.25rem',
                color: '#1f2937',
                backgroundColor: AMBER_LIGHT,
              }}
            />

            {error && (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: '#ef4444',
                  textAlign: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={signInWithPin}
              disabled={loading || pin.length !== 4}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '0.625rem',
                border: 'none',
                background: pin.length !== 4
                  ? '#d1d5db'
                  : `linear-gradient(135deg, ${AMBER}, ${AMBER_DARK})`,
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: pin.length !== 4 ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Входим...' : 'Войти →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
