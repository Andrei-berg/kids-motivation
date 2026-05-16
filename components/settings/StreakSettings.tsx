'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/lib/i18n'

interface Milestone {
  days: number
  label: string
  bonus: number
}

interface StreakRules {
  milestones: Milestone[]
  weeklyComboEnabled: boolean
  weeklyComboBonus: number
  streakShieldEnabled: boolean
}

const DEFAULT_RULES: StreakRules = {
  milestones: [
    { days: 7, label: '7', bonus: 100 },
    { days: 14, label: '14', bonus: 200 },
    { days: 30, label: '30', bonus: 500 },
  ],
  weeklyComboEnabled: true,
  weeklyComboBonus: 50,
  streakShieldEnabled: true,
}

interface Props {
  familyId: string
}

export default function StreakSettings({ familyId }: Props) {
  const t = useT()
  const [rules, setRules] = useState<StreakRules>(DEFAULT_RULES)
  const [saved, setSaved] = useState(false)

  const storageKey = `family_streak_rules_${familyId}`

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as StreakRules
        setRules(parsed)
      }
    } catch {
      // Use defaults
    }
  }, [storageKey])

  const updateMilestoneBonus = (days: number, bonus: number) => {
    setRules(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => m.days === days ? { ...m, bonus } : m),
    }))
  }

  const handleSave = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(rules))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // localStorage not available
    }
  }

  const handleReset = () => {
    setRules(DEFAULT_RULES)
    localStorage.removeItem(storageKey)
    setSaved(false)
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-1">{t('settings.streakSettings.title')}</h2>
      <p className="text-gray-400 text-sm mb-6">
        {t('settings.streakSettings.shieldDays')}
      </p>

      {/* Milestone bonuses */}
      <div className="bg-gray-700/50 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-gray-600/50">
          <h3 className="text-sm font-medium text-white">{t('settings.streakSettings.milestones')}</h3>
        </div>
        <div className="divide-y divide-gray-600/30">
          {rules.milestones.map(m => (
            <div key={m.days} className="flex items-center px-4 py-3 gap-4">
              <div className="flex-1">
                <span className="text-sm font-medium text-white">{m.label} {t('common.days')}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={m.bonus}
                  onChange={e => updateMilestoneBonus(m.days, Number(e.target.value))}
                  className="w-24 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-right font-medium text-yellow-400 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-gray-400 text-sm w-14">{t('common.coins')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly academic combo */}
      <div className="bg-gray-700/50 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-gray-600/50 flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">{t('settings.streakSettings.weeklyCombo')}</h3>
          <button
            onClick={() => setRules(prev => ({ ...prev, weeklyComboEnabled: !prev.weeklyComboEnabled }))}
            className={`relative w-10 h-6 rounded-full transition-colors ${
              rules.weeklyComboEnabled ? 'bg-indigo-600' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              rules.weeklyComboEnabled ? 'left-5' : 'left-1'
            }`} />
          </button>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-400 mb-3">
            {t('settings.streakSettings.weeklyComboDesc')}
          </p>
          {rules.weeklyComboEnabled && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">{t('settings.streakSettings.bonusCoins')}</label>
              <input
                type="number"
                min={0}
                value={rules.weeklyComboBonus}
                onChange={e => setRules(prev => ({ ...prev, weeklyComboBonus: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Streak shield */}
      <div className="bg-gray-700/50 rounded-xl overflow-hidden mb-6">
        <div className="p-4 flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-white mb-1">{t('settings.streakSettings.shield')}</h3>
            <p className="text-xs text-gray-400">
              {t('settings.streakSettings.shieldDesc')}
            </p>
          </div>
          <button
            onClick={() => setRules(prev => ({ ...prev, streakShieldEnabled: !prev.streakShieldEnabled }))}
            className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
              rules.streakShieldEnabled ? 'bg-indigo-600' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              rules.streakShieldEnabled ? 'left-5' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm text-center">
          {t('common.success')}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {t('settings.streakSettings.save')}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-xl transition-colors"
        >
          {t('settings.streakSettings.reset')}
        </button>
      </div>
    </div>
  )
}
