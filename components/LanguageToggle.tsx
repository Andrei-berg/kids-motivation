'use client'
import { useLanguage } from '@/lib/i18n'

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage()
  return (
    <button
      onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
      className={className}
      style={{
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.3)',
        borderRadius: 8,
        padding: '4px 10px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        color: 'inherit',
        letterSpacing: 0.5,
      }}
      title={language === 'ru' ? 'Switch to English' : 'Переключить на Русский'}
      aria-label="Switch language"
    >
      {language === 'ru' ? 'EN' : 'RU'}
    </button>
  )
}
