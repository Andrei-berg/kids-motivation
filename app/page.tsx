'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [registered, setRegistered] = useState(false)

  // Auto-redirect if already logged in
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
      else setChecking(false)
    })
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
      router.push(membership ? '/dashboard' : '/onboarding')
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
        // Email confirmation disabled — go straight to onboarding
        router.push('/onboarding')
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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#64748b' }}>Загрузка...</div>
      </div>
    )
  }

  if (registered) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: '#1e293b', borderRadius: '1.5rem', padding: '2.5rem', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
          <h2 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Проверьте почту</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Письмо отправлено на <strong style={{ color: '#e2e8f0' }}>{email}</strong>.<br />
            Перейдите по ссылке для подтверждения аккаунта.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#1e293b', borderRadius: '1.5rem', padding: '2.5rem', width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⭐</div>
          <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Kids Motivation</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.25rem 0 0' }}>Семейная система мотивации</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#0f172a', borderRadius: '0.75rem', padding: '0.25rem', marginBottom: '1.5rem' }}>
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null) }}
              style={{
                flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.875rem', transition: 'all 0.15s',
                background: tab === t ? '#4f46e5' : 'transparent',
                color: tab === t ? '#fff' : '#64748b',
              }}
            >
              {t === 'login' ? 'Войти' : 'Регистрация'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={tab === 'login' ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '0.9375rem', outline: 'none' }}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: '0.9375rem', outline: 'none' }}
          />

          {error && (
            <div style={{ color: '#f87171', fontSize: '0.8125rem', background: 'rgba(127,29,29,0.2)', borderRadius: '0.5rem', padding: '0.625rem 0.875rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '0.75rem', borderRadius: '0.75rem', border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600, fontSize: '0.9375rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '0.25rem' }}
          >
            {loading ? '...' : tab === 'login' ? 'Войти' : 'Создать аккаунт'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#334155' }} />
          <span style={{ color: '#475569', fontSize: '0.8125rem' }}>или</span>
          <div style={{ flex: 1, height: '1px', background: '#334155' }} />
        </div>

        <button
          onClick={handleGoogle}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontWeight: 500, fontSize: '0.9375rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Войти через Google
        </button>

        {/* Join family */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <a href="/onboarding/join" style={{ color: '#6366f1', fontSize: '0.8125rem', textDecoration: 'none' }}>
            Есть код приглашения? Присоединиться к семье →
          </a>
        </div>
      </div>
    </div>
  )
}
