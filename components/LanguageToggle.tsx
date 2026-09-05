'use client'
import { useLanguage, useT, SUPPORTED_LANGUAGES } from '@/lib/i18n'

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage()
  const t = useT()

  return (
    <select
      value={language}
      onChange={e => setLanguage(e.target.value)}
      className={className}
      style={{
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 8,
        padding: '4px 8px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        color: 'inherit',
      }}
      aria-label={t('common.switchLanguage')}
    >
      {SUPPORTED_LANGUAGES.map(lang => (
        <option key={lang.code} value={lang.code} style={{ background: '#111827', color: '#fff' }}>
          {lang.flag} {lang.label}
        </option>
      ))}
    </select>
  )
}
