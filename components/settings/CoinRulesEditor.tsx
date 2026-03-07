'use client'

import { useState, useEffect } from 'react'

interface GradeRule {
  grade: number
  label: string
  coins: number
}

interface CoinRules {
  grades: GradeRule[]
  monthlyLimitEnabled: boolean
  monthlyLimitAmount: number
}

const DEFAULT_RULES: CoinRules = {
  grades: [
    { grade: 5, label: '5 ⭐', coins: 50 },
    { grade: 4, label: '4', coins: 30 },
    { grade: 3, label: '3', coins: 0 },
    { grade: 2, label: '2', coins: -50 },
    { grade: 1, label: '1', coins: -100 },
  ],
  monthlyLimitEnabled: false,
  monthlyLimitAmount: 500,
}

interface Props {
  familyId: string
}

export default function CoinRulesEditor({ familyId }: Props) {
  const [rules, setRules] = useState<CoinRules>(DEFAULT_RULES)
  const [saved, setSaved] = useState(false)

  const storageKey = `family_coin_rules_${familyId}`

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as CoinRules
        setRules(parsed)
      }
    } catch {
      // Ignore parse errors — use defaults
    }
  }, [storageKey])

  const updateGradeCoins = (grade: number, value: number) => {
    setRules(prev => ({
      ...prev,
      grades: prev.grades.map(g => g.grade === grade ? { ...g, coins: value } : g),
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
      <h2 className="text-lg font-semibold text-white mb-1">Правила монет</h2>
      <p className="text-gray-400 text-sm mb-6">
        Настройки сохраняются локально. В Phase 2.1 будут мигрированы в БД.
      </p>

      {/* Grade rules table */}
      <div className="bg-gray-700/50 rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-600/50">
          <h3 className="text-sm font-medium text-white">Правила монет за оценки</h3>
        </div>
        <div className="divide-y divide-gray-600/30">
          {rules.grades.map(rule => (
            <div key={rule.grade} className="flex items-center px-4 py-3 gap-4">
              <div className="w-12 text-center">
                <span className="text-lg font-bold text-white">{rule.label}</span>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="number"
                    value={rule.coins}
                    onChange={e => updateGradeCoins(rule.grade, Number(e.target.value))}
                    className={`w-24 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2 text-sm text-right font-medium focus:outline-none focus:border-indigo-500 ${
                      rule.coins > 0 ? 'text-green-400' : rule.coins < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}
                  />
                </div>
                <span className="text-gray-400 text-sm w-14">монет</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly limit */}
      <div className="bg-gray-700/50 rounded-xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-600/50">
          <h3 className="text-sm font-medium text-white">Ежемесячный лимит монет</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Включить лимит</span>
            <button
              onClick={() => setRules(prev => ({ ...prev, monthlyLimitEnabled: !prev.monthlyLimitEnabled }))}
              className={`relative w-10 h-6 rounded-full transition-colors ${
                rules.monthlyLimitEnabled ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                rules.monthlyLimitEnabled ? 'left-5' : 'left-1'
              }`} />
            </button>
          </div>

          {rules.monthlyLimitEnabled && (
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Максимум монет за задачу в месяц
              </label>
              <input
                type="number"
                min={1}
                value={rules.monthlyLimitAmount}
                onChange={e => setRules(prev => ({ ...prev, monthlyLimitAmount: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-2">
                Оценки не подпадают под лимит — только задачи.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm text-center">
          Настройки сохранены
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Сохранить
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-xl transition-colors"
        >
          Сбросить к умолчаниям
        </button>
      </div>
    </div>
  )
}
