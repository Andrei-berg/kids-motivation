'use client'
import { createContext, useContext, useCallback } from 'react'
import { useAppStore } from './store'
import en from '../public/locales/en.json'
import ru from '../public/locales/ru.json'

function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const parts = key.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return key
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : key
}

type TFn = (key: string, vars?: Record<string, string | number>) => string

const I18nContext = createContext<TFn>((key) => key)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useAppStore((s) => s.language)
  const translations = (language === 'ru' ? ru : en) as Record<string, unknown>

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    let str = getNestedValue(translations, key)
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v))
      })
    }
    return str
  }, [translations])

  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>
}

export function useT(): TFn {
  return useContext(I18nContext)
}

export function useLanguage() {
  const language = useAppStore((s) => s.language)
  const setLanguage = useAppStore((s) => s.setLanguage)
  return { language, setLanguage }
}
