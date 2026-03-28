'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import { verifyPin } from '@/utils/helpers'
import CoinRulesEditor from '@/components/settings/CoinRulesEditor'
import StreakSettings from '@/components/settings/StreakSettings'
import PeriodsManager from '@/components/settings/PeriodsManager'

type Section = 'coins' | 'streaks' | 'periods'

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: 'coins', label: 'Монеты', icon: '🪙' },
  { id: 'streaks', label: 'Стрики', icon: '🔥' },
  { id: 'periods', label: 'Каникулы', icon: '🌴' },
]

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [activeSection, setActiveSection] = useState<Section>('coins')

  const handlePinSubmit = () => {
    const hash = process.env.NEXT_PUBLIC_PARENT_PIN_HASH || 'MTIzNA=='
    if (verifyPin(pinInput, hash)) {
      setIsAuthenticated(true)
      setPinInput('')
      setPinError('')
    } else {
      setPinError('Неверный PIN-код. Попробуйте ещё раз.')
      setPinInput('')
    }
  }

  const appendDigit = (d: string) => {
    if (pinInput.length < 4) setPinInput(prev => prev + d)
  }

  const clearPin = () => setPinInput('')

  useEffect(() => {
    if (pinInput.length === 4) handlePinSubmit()
  }, [pinInput])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-xl font-bold text-white">Настройки родителя</h1>
            <p className="text-gray-400 text-sm mt-1">Введите PIN-код для доступа</p>
          </div>

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

          {pinError && (
            <div className="text-red-400 text-sm text-center mb-4 bg-red-400/10 rounded-lg px-3 py-2">
              {pinError}
            </div>
          )}

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

  return (
    <>
      <NavBar />
      <div className="min-h-screen bg-gray-900 pb-8">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Настройки</h1>
            <p className="text-gray-400 text-sm mt-1">Управление системой мотивации</p>
          </div>

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

          <div className="bg-gray-800 rounded-2xl p-6">
            {activeSection === 'coins' && <CoinRulesEditor familyId="default" />}
            {activeSection === 'streaks' && <StreakSettings familyId="default" />}
            {activeSection === 'periods' && <PeriodsManager />}
          </div>
        </div>
      </div>
    </>
  )
}
