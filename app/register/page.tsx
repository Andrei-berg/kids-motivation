'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleGoogleOAuth() {
    const supabase = createClient()
    setError(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signUpError) {
        setError(signUpError.message)
        return
      }
      if (data.session) {
        // Email confirmation disabled — user is logged in immediately
        router.push('/dashboard')
      } else {
        // Email confirmation required
        setSuccess(true)
      }
    } finally {
      setLoading(false)
    }
  }

  // Success state: hide form, show confirmation message
  if (success) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--gray-50)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '384px',
            backgroundColor: '#ffffff',
            borderRadius: '1rem',
            boxShadow: 'var(--shadow-lg)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          {/* Email icon */}
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>

          {/* Heading */}
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--gray-900)',
              marginBottom: '0.5rem',
            }}
          >
            Check your inbox
          </h1>

          {/* Body */}
          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--gray-500)',
              marginBottom: '1.5rem',
              lineHeight: 1.6,
            }}
          >
            We sent a confirmation link to{' '}
            <strong style={{ color: 'var(--gray-900)' }}>{email}</strong>
          </p>

          {/* Back to sign in */}
          <Link
            href="/login"
            style={{
              display: 'inline-block',
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: 'var(--emerald-500)',
              textDecoration: 'none',
            }}
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--gray-50)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '384px',
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          boxShadow: 'var(--shadow-lg)',
          padding: '2rem',
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--emerald-500)',
            }}
          >
            ⭐ FamilyCoins
          </span>
        </div>

        {/* Heading */}
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--gray-900)',
            textAlign: 'center',
            marginBottom: '0.25rem',
          }}
        >
          Create your account
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--gray-500)',
            textAlign: 'center',
            marginBottom: '1.5rem',
          }}
        >
          Start your family&apos;s motivation journey
        </p>

        {/* Google OAuth button */}
        <button
          type="button"
          onClick={handleGoogleOAuth}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid var(--gray-200)',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            fontSize: '0.9375rem',
            fontWeight: 500,
            color: 'var(--gray-900)',
            transition: 'background-color var(--transition-fast)',
            marginBottom: '1.25rem',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--gray-50)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff'
          }}
        >
          {/* Google G icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.25rem',
          }}
        >
          <div
            style={{
              flex: 1,
              height: '1px',
              backgroundColor: 'var(--gray-200)',
            }}
          />
          <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>or</span>
          <div
            style={{
              flex: 1,
              height: '1px',
              backgroundColor: 'var(--gray-200)',
            }}
          />
        </div>

        {/* Registration form */}
        <form onSubmit={handleRegister}>
          {/* Email input */}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--gray-200)',
              fontSize: '0.9375rem',
              color: 'var(--gray-900)',
              outline: 'none',
              marginBottom: '0.75rem',
              boxSizing: 'border-box',
              transition: 'border-color var(--transition-fast)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--emerald-500)'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--gray-200)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />

          {/* Password input */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--gray-200)',
              fontSize: '0.9375rem',
              color: 'var(--gray-900)',
              outline: 'none',
              marginBottom: '0.25rem',
              boxSizing: 'border-box',
              transition: 'border-color var(--transition-fast)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--emerald-500)'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--gray-200)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />
          {/* Password helper text */}
          <p
            style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              marginBottom: '1rem',
            }}
          >
            At least 6 characters
          </p>

          {/* Create account button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: loading ? '#6ee7b7' : 'var(--emerald-500)',
              color: '#ffffff',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background-color var(--transition-fast)',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = 'var(--emerald-600)'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = 'var(--emerald-500)'
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          {/* Error message */}
          {error && (
            <p
              style={{
                fontSize: '0.875rem',
                color: '#ef4444',
                textAlign: 'center',
                marginTop: '0.75rem',
              }}
            >
              {error}
            </p>
          )}
        </form>

        {/* Link to login */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: 'var(--gray-500)',
            marginTop: '1.5rem',
          }}
        >
          Already have an account?{' '}
          <Link
            href="/login"
            style={{
              color: 'var(--emerald-500)',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
