'use client'

import { useState, useEffect, useCallback } from 'react'
import NavBar from '@/components/NavBar'
import { verifyPin } from '@/utils/helpers'
import { createClient } from '@/lib/supabase/client'
import CoinRulesEditor from '@/components/settings/CoinRulesEditor'
import StreakSettings from '@/components/settings/StreakSettings'
import ScheduleEditor from '@/components/settings/ScheduleEditor'
import NotificationSettings from '@/components/settings/NotificationSettings'

type Section = 'coins' | 'streaks' | 'schedule' | 'notifications'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'coins', label: 'Монеты', icon: '🪙' },
  { id: 'streaks', label: 'Стрики', icon: '🔥' },
  { id: 'schedule', label: 'Расписание', icon: '📅' },
  { id: 'notifications', label: 'Уведомления', icon: '🔔' },
]

export default function SettingsPage() {
  // PIN gate
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  // Family data
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [loadingFamily, setLoadingFamily] = useState(false)

  // Navigation
  const [activeSection, setActiveSection] = useState<Section>('coins')

  // Load family on PIN success
  const loadFamily = useCallback(async () => {
    setLoadingFamily(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('family_members')
        .select('family_id, id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (member) {
        setFamilyId(member.family_id)
        setMemberId(member.id)
      }
    } catch (err) {
      console.error('Settings: failed to load family', err)
    } finally {
      setLoadingFamily(false)
    }
  }, [])

  const handlePinSubmit = () => {
    const hash = process.env.NEXT_PUBLIC_PARENT_PIN_HASH || 'MTIzNA=='
    if (verifyPin(pinInput, hash)) {
      setIsAuthenticated(true)
      setPinInput('')
      setPinError('')
      loadFamily()
    } else {
      setPinError('Неверный PIN-код. Попробуйте ещё раз.')
      setPinInput('')
    }
  }

  const handlePinKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePinSubmit()
  }

  const appendDigit = (d: string) => {
    if (pinInput.length < 4) setPinInput(prev => prev + d)
  }

  const clearPin = () => setPinInput('')

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pinInput.length === 4) {
      handlePinSubmit()
    }
  }, [pinInput])

  // ── PIN GATE ────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-xl font-bold text-white">Настройки родителя</h1>
            <p className="text-gray-400 text-sm mt-1">Введите PIN-код для доступа</p>
          </div>

          {/* PIN display */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                  i < pinInput.length
                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                    : 'border-gray-600 bg-gray-700/50 text-gray-600'
                }`}
              >
                {i < pinInput.length ? '●' : '○'}
              </div>
            ))}
          </div>

          {/* Error message */}
          {pinError && (
            <div className="text-red-400 text-sm text-center mb-4 bg-red-400/10 rounded-lg px-3 py-2">
              {pinError}
            </div>
          )}

          {/* Digit pad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {['1','2','3','4','5','6','7','8','9'].map(d => (
              <button
                key={d}
                onClick={() => appendDigit(d)}
                className="h-14 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-indigo-600 text-white text-xl font-semibold transition-colors"
              >
                {d}
              </button>
            ))}
            <button
              onClick={clearPin}
              className="h-14 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-400 text-sm font-medium transition-colors"
            >
              Стереть
            </button>
            <button
              onClick={() => appendDigit('0')}
              className="h-14 rounded-xl bg-gray-700 hover:bg-gray-600 active:bg-indigo-600 text-white text-xl font-semibold transition-colors"
            >
              0
            </button>
            <button
              onClick={handlePinSubmit}
              className="h-14 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Войти
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── SETTINGS CONTENT ────────────────────────────────────────────────────────
  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-gray-900 pb-8">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Настройки</h1>
            <p className="text-gray-400 text-sm mt-1">Управление системой мотивации</p>
          </div>

          {/* Section navigation */}
          <div className="flex flex-wrap gap-2 mb-6">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeSection === s.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>

          {/* Loading family */}
          {loadingFamily && (
            <div className="bg-gray-800 rounded-2xl p-6 text-center text-gray-400">
              Загрузка...
            </div>
          )}

          {/* No family found */}
          {!loadingFamily && !familyId && (
            <div className="bg-gray-800 rounded-2xl p-6 text-center">
              <div className="text-gray-400">
                Семья не найдена. Пройдите онбординг для создания семьи.
              </div>
            </div>
          )}

          {/* Content area */}
          {!loadingFamily && familyId && (
            <div className="bg-gray-800 rounded-2xl p-6">
              {activeSection === 'coins' && (
                <CoinRulesEditor familyId={familyId} />
              )}
              {activeSection === 'streaks' && (
                <StreakSettings familyId={familyId} />
              )}
              {activeSection === 'schedule' && (
                <ScheduleEditor familyId={familyId} />
              )}
              {activeSection === 'notifications' && (
                <NotificationSettings familyId={familyId} memberId={memberId} />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
