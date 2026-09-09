'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useT } from '@/lib/i18n'
import AuthHelpModal from '@/components/AuthHelpModal'
import { paper, base } from '@/lib/design/tokens'

const ACCENT = paper.accent
const ACCENT_SOFT = base.indigoSoft

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageInner />
    </Suspense>
  )
}

function AuthPageInner() {
  const t = useT()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Carries an in-progress "join family by invite code" flow across the
  // login/register round-trip — set by /onboarding/join when it bounces an
  // unauthenticated visitor here (?next=join&code=XXXXXX), read back below
  // instead of the default post-auth destination.
  const joinCode = searchParams.get('next') === 'join' ? searchParams.get('code') : null

  // 'choose' = the three-way fork; 'parent' = the email/password + Google form.
  // A visitor arriving mid-join needs an account, so skip straight to the form.
  const [mode, setMode] = useState<'choose' | 'parent'>(joinCode ? 'parent' : 'choose')
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registered, setRegistered] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const postAuthPath = (hasFamily: boolean) => {
    if (joinCode) return `/onboarding/join?code=${encodeURIComponent(joinCode)}`
    return hasFamily ? '/parent-center' : '/onboarding'
  }

  // Auto-redirect if already logged in
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(joinCode ? `/onboarding/join?code=${encodeURIComponent(joinCode)}` : '/parent-center')
      else setChecking(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); return }
      // Check if user has a family — if not, send to onboarding (same as OAuth callback)
      const { data: membership } = await supabase
        .from('family_members')
        .select('id')
        .eq('user_id', data.user!.id)
        .maybeSingle()
      router.push(postAuthPath(!!membership))
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); return }
      if (data.session) {
        // Email confirmation disabled — go straight to onboarding (or back to the join flow)
        router.push(postAuthPath(false))
      } else {
        // Email confirmation required
        setRegistered(true)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    const supabase = createClient()
    // Supabase appends its own ?code= (the OAuth exchange code) to redirectTo,
    // so the invite code must travel under a different param name.
    const redirectTo = joinCode
      ? `${window.location.origin}/auth/callback?next=join&code_invite=${encodeURIComponent(joinCode)}`
      : `${window.location.origin}/auth/callback`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  const screenStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: paper.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    fontFamily: base.fontBody,
  }
  const cardStyle: React.CSSProperties = {
    background: paper.card,
    border: `1px solid ${paper.line}`,
    borderRadius: '1.25rem',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 12px 36px rgba(36,30,56,0.08)',
  }

  if (checking) {
    return (
      <div style={screenStyle}>
        <div style={{ color: paper.ink3 }}>{t('auth.loading')}</div>
      </div>
    )
  }

  if (registered) {
    return (
      <div style={screenStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ color: paper.ink, fontFamily: base.fontDisplay, fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {t('auth.checkEmail')}
          </h2>
          <p style={{ color: paper.ink2, fontSize: '0.875rem', lineHeight: 1.6 }}>
            {t('auth.emailSent', { email })}<br />
            {t('auth.confirmLink')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={screenStyle}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '2.75rem', marginBottom: '0.35rem' }}>⭐</div>
          <h1 style={{ color: paper.ink, fontFamily: base.fontDisplay, fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
            {t('auth.appName')}
          </h1>
          <p style={{ color: paper.ink3, fontSize: '0.875rem', margin: '0.25rem 0 0' }}>{t('auth.subtitle')}</p>
        </div>

        {mode === 'choose' ? (
          <>
            <h2 style={{ color: paper.ink, fontFamily: base.fontDisplay, fontSize: '1.05rem', fontWeight: 700, textAlign: 'center', margin: '0 0 0.25rem' }}>
              {t('auth.chooseTitle')}
            </h2>
            <p style={{ color: paper.ink3, fontSize: '0.8125rem', textAlign: 'center', margin: '0 0 1.25rem' }}>
              {t('auth.chooseSubtitle')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <ForkCard
                emoji="👨‍👩‍👧"
                title={t('auth.chooseParent')}
                sub={t('auth.chooseParentSub')}
                onClick={() => { setError(null); setMode('parent') }}
              />
              <ForkCard
                emoji="🧒"
                title={t('auth.chooseKid')}
                sub={t('auth.chooseKidSub')}
                onClick={() => router.push('/kid/login')}
              />
              <ForkCard
                emoji="🔑"
                title={t('auth.chooseJoin')}
                sub={t('auth.chooseJoinSub')}
                onClick={() => router.push('/onboarding/join')}
              />
            </div>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                style={{ background: 'none', border: 'none', color: paper.ink3, fontSize: '0.8125rem', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
              >
                {t('authHelp.trigger')}
              </button>
            </div>
          </>
        ) : (
          <>
            {!joinCode && (
              <button
                type="button"
                onClick={() => { setError(null); setMode('choose') }}
                style={{ background: 'none', border: 'none', color: ACCENT, fontSize: '0.875rem', cursor: 'pointer', padding: '0 0 1rem', fontFamily: 'inherit' }}
              >
                ← {t('auth.backToChoose')}
              </button>
            )}

            {joinCode && (
              <div style={{ background: ACCENT_SOFT, borderRadius: '0.75rem', padding: '0.75rem 0.875rem', fontSize: '0.8125rem', color: paper.ink2, marginBottom: '1.25rem', lineHeight: 1.5 }}>
                🔑 {t('auth.chooseJoinSub')}
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', background: paper.lineSoft, borderRadius: '0.75rem', padding: '0.25rem', marginBottom: '1.5rem' }}>
              {(['login', 'register'] as const).map(tabKey => (
                <button
                  key={tabKey}
                  onClick={() => { setTab(tabKey); setError(null) }}
                  style={{
                    flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s', fontFamily: 'inherit',
                    background: tab === tabKey ? paper.card : 'transparent',
                    color: tab === tabKey ? paper.ink : paper.ink3,
                    boxShadow: tab === tabKey ? '0 1px 4px rgba(36,30,56,0.08)' : 'none',
                  }}
                >
                  {tabKey === 'login' ? t('auth.loginTab') : t('auth.registerTab')}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={tab === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <input
                type="email"
                placeholder={t('auth.email')}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
              <input
                type="password"
                placeholder={t('auth.password')}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle}
              />

              {error && (
                <div style={{ color: paper.dangerText, fontSize: '0.8125rem', background: 'rgba(217,85,99,0.1)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: ACCENT,
                  color: '#fff', fontWeight: 700, fontSize: '0.9375rem', fontFamily: 'inherit',
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '0.25rem',
                }}
              >
                {loading ? '…' : tab === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}
              </button>
            </form>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: paper.line }} />
              <span style={{ color: paper.ink3, fontSize: '0.8125rem' }}>{t('common.or')}</span>
              <div style={{ flex: 1, height: '1px', background: paper.line }} />
            </div>

            <button
              onClick={handleGoogle}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: `1px solid ${paper.line}`,
                background: paper.card, color: paper.ink, fontWeight: 600, fontSize: '0.9375rem', fontFamily: 'inherit',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('auth.googleBtn')}
            </button>

            {/* Secondary links */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <a href="/kid/login" style={{ color: ACCENT, fontSize: '0.8125rem', textDecoration: 'none' }}>
                {t('auth.kidLoginLink')}
              </a>
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                style={{ background: 'none', border: 'none', color: paper.ink3, fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: '0.25rem' }}
              >
                {t('authHelp.trigger')}
              </button>
            </div>
          </>
        )}
      </div>
      <AuthHelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: '0.75rem',
  border: `1px solid ${paper.line}`,
  background: paper.bg,
  color: paper.ink,
  fontSize: '0.9375rem',
  fontFamily: base.fontBody,
  outline: 'none',
}

function ForkCard({ emoji, title, sub, onClick }: { emoji: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        width: '100%',
        textAlign: 'left',
        padding: '0.875rem 1rem',
        borderRadius: '0.875rem',
        border: `1px solid ${paper.line}`,
        background: paper.card,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.background = ACCENT_SOFT }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = paper.line; e.currentTarget.style.background = paper.card }}
    >
      <span style={{
        width: '2.5rem', height: '2.5rem', flexShrink: 0, borderRadius: '0.75rem',
        background: ACCENT_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
      }}>
        {emoji}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0 }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: paper.ink }}>{title}</span>
        <span style={{ fontSize: '0.78rem', color: paper.ink3, lineHeight: 1.4 }}>{sub}</span>
      </span>
    </button>
  )
}
