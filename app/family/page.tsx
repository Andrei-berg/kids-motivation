'use client'

import { useRouter } from 'next/navigation'

export default function FamilyPage() {
  const router = useRouter()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        fontFamily: 'sans-serif',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
        Family
      </h1>
      <p style={{ color: '#666', margin: 0 }}>
        Shared family space — accessible to all members.
      </p>
      <button
        onClick={() => router.push('/dashboard')}
        style={{
          marginTop: '8px',
          padding: '10px 20px',
          fontSize: '1rem',
          cursor: 'pointer',
          borderRadius: '6px',
          border: '1px solid #ccc',
          background: '#f5f5f5',
        }}
      >
        Go to dashboard
      </button>
    </div>
  )
}
