'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { lookupFamilyByCode, getFamilyPinProfiles } from '@/lib/onboarding-api'
import { useAppStore } from '@/lib/store'
import type { ChildProfile } from '@/lib/onboarding-api'
import { useT } from '@/lib/i18n'
import { paper, base } from '@/lib/design/tokens'

const ACCENT = paper.accent
const ACCENT_SOFT = base.indigoSoft

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

  const t = useT()

  async function lookupFamily() {
    setLoading(true)
    setError(null)
    try {
      const result = await lookupFamilyByCode(code.toUpperCase())
      if (!result) {
        setError(t('kidLogin.codeNotFound'))
        return
      }
      const children = await getFamilyPinProfiles(result.familyId)
      setFamilyIdLocal(result.familyId)
      setProfiles(children)
      setStep(1)
    } catch {
      setError(t('kidLogin.connectionError'))
    } finally {
      setLoading(false)
    }
  }

  async function signInWithPin() {
    if (!selectedProfile || pin.length < 4) return
    // child_id comes straight from the (SECURITY DEFINER) picker RPC.
    if (!selectedProfile.childId) {
      setError(t('kidLogin.profileNotFound'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Login goes through our server route: it verifies the PIN against a bcrypt
      // hash with an authoritative lockout, then mints the session (the synthetic
      // account has no usable password, so the public endpoint can't be brute-forced).
      const res = await fetch('/api/kid/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, childId: selectedProfile.childId, pin }),
      })

      if (res.status === 429) {
        const { retryAfter } = await res.json().catch(() => ({ retryAfter: 900 }))
        const mins = Math.max(1, Math.ceil((retryAfter ?? 900) / 60))
        setError(t('kidLogin.lockedRetry', { mins }))
        return
      }
      if (!res.ok) {
        setError(t('kidLogin.wrongPinRetry'))
        return
      }

      setFamilyId(familyId)
      setActiveMemberId(selectedProfile.childId)
      // Session cookies were set by the route; refresh so the browser client and
      // middleware pick them up before landing on the guarded /kid/day.
      router.refresh()
      router.push('/kid/day')
    } catch {
      setError(t('kidLogin.loginError'))
    } finally {
      setLoading(false)
    }
  }

  const progressPct = ((step + 1) / 3) * 100

  return (
    <div
      style={{
        minHeight: '100vh',
        background: paper.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        fontFamily: base.fontBody,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: paper.card,
          borderRadius: '1rem',
          border: `1px solid ${paper.line}`,
          boxShadow: '0 12px 36px rgba(36,30,56,0.08)',
          padding: '2rem',
          position: 'relative',
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            height: '4px',
            backgroundColor: paper.lineSoft,
            borderRadius: '9999px',
            marginBottom: '1.75rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressPct}%`,
              background: ACCENT,
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
                fontFamily: base.fontDisplay,
                fontSize: '1.5rem',
                fontWeight: 700,
                color: paper.ink,
                textAlign: 'center',
                marginBottom: '0.5rem',
                marginTop: 0,
              }}
            >
              {t('kidLogin.step0Title')}
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: paper.ink2,
                textAlign: 'center',
                marginBottom: '1.75rem',
              }}
            >
              {t('kidLogin.step0Subtitle')}
            </p>

            <input
              type="text"
              placeholder={t('kidLogin.familyCodePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              maxLength={6}
              style={{
                width: '100%',
                padding: '0.875rem 1rem',
                borderRadius: '0.625rem',
                border: `2px solid ${ACCENT}`,
                fontFamily: base.fontMono,
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '6px',
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '1rem',
                color: paper.ink,
                backgroundColor: ACCENT_SOFT,
              }}
              autoComplete="off"
              autoCapitalize="characters"
            />

            {error && (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: paper.dangerText,
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
                background: code.length < 4 ? paper.line : ACCENT,
                color: code.length < 4 ? paper.ink3 : '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: code.length < 4 ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {loading ? t('kidLogin.checking') : t('kidLogin.next')}
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
                color: ACCENT,
                fontSize: '0.875rem',
                cursor: 'pointer',
                padding: '0 0 1rem 0',
                fontFamily: 'inherit',
              }}
            >
              ← {t('kidLogin.back')}
            </button>

            <h1
              style={{
                fontFamily: base.fontDisplay,
                fontSize: '1.5rem',
                fontWeight: 700,
                color: paper.ink,
                textAlign: 'center',
                marginBottom: '0.5rem',
                marginTop: 0,
              }}
            >
              {t('kidLogin.step1Title')}
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: paper.ink2,
                textAlign: 'center',
                marginBottom: '1.25rem',
              }}
            >
              {t('kidLogin.step1Subtitle')}
            </p>

            {profiles.length === 0 ? (
              <p
                style={{
                  fontSize: '0.9375rem',
                  color: paper.ink3,
                  textAlign: 'center',
                  padding: '1rem',
                }}
              >
                {t('kidLogin.noProfiles')}
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
                        border: isSelected ? `2px solid ${ACCENT}` : `2px solid ${paper.line}`,
                        backgroundColor: isSelected ? ACCENT_SOFT : paper.lineSoft,
                        color: paper.ink,
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
                      {isSelected && <span style={{ color: ACCENT, fontSize: '1.25rem' }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            )}

            <p
              style={{
                fontSize: '0.75rem',
                color: paper.ink3,
                textAlign: 'center',
                marginBottom: '1rem',
              }}
            >
              {t('kidLogin.notInList')}
            </p>

            {error && (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: paper.dangerText,
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
                background: !selectedProfile ? paper.line : ACCENT,
                color: !selectedProfile ? paper.ink3 : '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: !selectedProfile ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {t('kidLogin.next')}
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
                color: ACCENT,
                fontSize: '0.875rem',
                cursor: 'pointer',
                padding: '0 0 1rem 0',
                fontFamily: 'inherit',
              }}
            >
              ← {t('kidLogin.back')}
            </button>

            <h1
              style={{
                fontFamily: base.fontDisplay,
                fontSize: '1.5rem',
                fontWeight: 700,
                color: paper.ink,
                textAlign: 'center',
                marginBottom: '0.5rem',
                marginTop: 0,
              }}
            >
              {t('kidLogin.step2Title')}
            </h1>
            <p
              style={{
                fontSize: '0.875rem',
                color: paper.ink2,
                textAlign: 'center',
                marginBottom: '1.75rem',
              }}
            >
              {t('kidLogin.step2Subtitle')}
            </p>

            <input
              type="text"
              inputMode="numeric"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              autoComplete="off"
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '0.625rem',
                border: `2px solid ${ACCENT}`,
                fontFamily: base.fontMono,
                fontSize: '2.25rem',
                fontWeight: 700,
                letterSpacing: '16px',
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '1.25rem',
                color: paper.ink,
                backgroundColor: ACCENT_SOFT,
              }}
            />

            {error && (
              <p
                style={{
                  fontSize: '0.875rem',
                  color: paper.dangerText,
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
              disabled={loading || pin.length < 4}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '0.625rem',
                border: 'none',
                background: pin.length < 4 ? paper.line : ACCENT,
                color: pin.length < 4 ? paper.ink3 : '#ffffff',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: pin.length < 4 ? 'not-allowed' : 'pointer',
                transition: 'opacity 0.2s',
                fontFamily: 'inherit',
              }}
            >
              {loading ? t('kidLogin.loggingIn') : t('kidLogin.loginBtn')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
