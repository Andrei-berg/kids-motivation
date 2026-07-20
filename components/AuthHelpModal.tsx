'use client'

import { useT } from '@/lib/i18n'

interface AuthHelpModalProps {
  isOpen: boolean
  onClose: () => void
}

// Self-contained inline styling (not globals.css or the parent-center token
// system) so this renders consistently whether it's opened from the dark
// root auth page or the light parent-center Settings screen.
export default function AuthHelpModal({ isOpen, onClose }: AuthHelpModalProps) {
  const t = useT()
  if (!isOpen) return null

  const steps = [
    { title: t('authHelp.step1Title'), body: t('authHelp.step1Body') },
    { title: t('authHelp.step2Title'), body: t('authHelp.step2Body') },
    { title: t('authHelp.step3Title'), body: t('authHelp.step3Body') },
    { title: t('authHelp.step4Title'), body: t('authHelp.step4Body') },
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto',
          background: '#fff', borderRadius: '1.25rem', padding: '1.75rem',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: '#1f2937' }}>
            {t('authHelp.title')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            style={{
              background: '#f3f4f6', border: 'none', borderRadius: '9999px',
              width: '28px', height: '28px', flexShrink: 0, cursor: 'pointer',
              color: '#6b7280', fontSize: '1rem', lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {steps.map((step, i) => (
            <div key={i} style={{ padding: '0.875rem 1rem', background: '#f9fafb', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.25rem' }}>
                {step.title}
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#4b5563', lineHeight: 1.5 }}>
                {step.body}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: '1.25rem', padding: '0.75rem', borderRadius: '0.75rem',
            border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600,
            fontSize: '0.9375rem', cursor: 'pointer',
          }}
        >
          {t('common.close')}
        </button>
      </div>
    </div>
  )
}
