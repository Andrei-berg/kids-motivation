'use client'

import { useState, useEffect, useCallback } from 'react'
import { getWalletSettings, updateWalletSettings, getAuditLog, logSettingsChange } from '@/lib/wallet-api'
import { getChildren } from '@/lib/repositories/children.repo'
import type { WalletSettings, AuditLog } from '@/lib/wallet-api'
import type { Child } from '@/lib/models/child.types'
import FamilyManager from '@/components/settings/FamilyManager'
import SubjectsManager from '@/components/settings/SubjectsManager'

type Tab = 'family' | 'subjects' | 'coins' | 'audit'

const TABS: { id: Tab; label: string }[] = [
  { id: 'family', label: '👨‍👩‍👧 Семья' },
  { id: 'subjects', label: '📚 Предметы' },
  { id: 'coins', label: '🪙 Монеты' },
  { id: 'audit', label: '📋 Журнал' },
]

// ============================================================================
// PIN UTILITIES
// ============================================================================

async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ============================================================================
// SETTINGS FORM STATE
// ============================================================================

type SettingsForm = {
  coins_per_grade_5: number
  coins_per_grade_4: number
  coins_per_grade_3: number
  coins_per_room_task: number
  coins_per_good_behavior: number
  coins_per_exercise: number
  base_exchange_rate: number
  coins_per_coach_5: number
  coins_per_coach_4: number
  coins_per_coach_3: number
  coins_per_coach_2: number
  coins_per_coach_1: number
}

function defaultForm(): SettingsForm {
  return {
    coins_per_grade_5: 10,
    coins_per_grade_4: 5,
    coins_per_grade_3: 2,
    coins_per_room_task: 3,
    coins_per_good_behavior: 5,
    coins_per_exercise: 5,
    base_exchange_rate: 10,
    coins_per_coach_5: 10,
    coins_per_coach_4: 5,
    coins_per_coach_3: 0,
    coins_per_coach_2: 3,
    coins_per_coach_1: 10,
  }
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

function formatDate(iso: string): string {
  const d = new Date(iso)
  const dd = d.getDate().toString().padStart(2, '0')
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function ParentSettingsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('family')

  // PIN gate state
  const [pinUnlocked, setPinUnlocked] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [isSettingPin, setIsSettingPin] = useState(false)
  const [pinConfirmStep, setPinConfirmStep] = useState(false)
  const [pinFirstEntry, setPinFirstEntry] = useState('')

  // Settings state
  const [form, setForm] = useState<SettingsForm>(defaultForm())
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Audit log state
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [auditEntries, setAuditEntries] = useState<AuditLog[]>([])
  const [auditOffset, setAuditOffset] = useState(0)
  const [auditLoading, setAuditLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  // Check PIN on mount
  useEffect(() => {
    const stored = localStorage.getItem('parent_pin_hash')
    if (!stored) {
      setIsSettingPin(true)
    }
  }, [])

  // Load settings and children after unlock
  useEffect(() => {
    if (!pinUnlocked) return

    async function load() {
      const [settings, kids] = await Promise.all([
        getWalletSettings(),
        getChildren(),
      ])

      setForm({
        coins_per_grade_5: settings.coins_per_grade_5,
        coins_per_grade_4: settings.coins_per_grade_4,
        coins_per_grade_3: settings.coins_per_grade_3,
        coins_per_room_task: settings.coins_per_room_task,
        coins_per_good_behavior: settings.coins_per_good_behavior,
        coins_per_exercise: settings.coins_per_exercise,
        base_exchange_rate: settings.base_exchange_rate,
        coins_per_coach_5: settings.coins_per_coach_5,
        coins_per_coach_4: settings.coins_per_coach_4,
        coins_per_coach_3: settings.coins_per_coach_3,
        coins_per_coach_2: settings.coins_per_coach_2,
        coins_per_coach_1: settings.coins_per_coach_1,
      })

      setChildren(kids)
      if (kids.length > 0) {
        setSelectedChildId(kids[0].id)
      }
    }

    load()
  }, [pinUnlocked])

  // Load audit log when child selection changes
  useEffect(() => {
    if (!pinUnlocked || !selectedChildId) return
    setAuditOffset(0)
    setAuditEntries([])
    loadAudit(selectedChildId, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinUnlocked, selectedChildId])

  const loadAudit = useCallback(async (childId: string, offset: number) => {
    setAuditLoading(true)
    try {
      const entries = await getAuditLog(childId, 30)
      if (offset === 0) {
        setAuditEntries(entries)
      } else {
        setAuditEntries(prev => [...prev, ...entries])
      }
      setHasMore(entries.length === 30)
    } catch (err) {
      console.error('Failed to load audit log', err)
    } finally {
      setAuditLoading(false)
    }
  }, [])

  // ============================================================================
  // PIN HANDLERS
  // ============================================================================

  async function handlePinInput(value: string) {
    if (value.length > 4) return
    setPinInput(value)
    setPinError('')

    if (value.length === 4) {
      if (isSettingPin) {
        if (!pinConfirmStep) {
          // First entry of new PIN — ask to confirm
          setPinFirstEntry(value)
          setPinConfirmStep(true)
          setPinInput('')
        } else {
          // Confirm step
          if (value === pinFirstEntry) {
            const hash = await hashPin(value)
            localStorage.setItem('parent_pin_hash', hash)
            setPinUnlocked(true)
            setIsSettingPin(false)
            setPinConfirmStep(false)
          } else {
            setPinError('PIN не совпадает. Попробуйте снова.')
            setPinInput('')
            setPinConfirmStep(false)
            setPinFirstEntry('')
          }
        }
      } else {
        // Verification
        const hash = await hashPin(value)
        const stored = localStorage.getItem('parent_pin_hash')
        if (hash === stored) {
          setPinUnlocked(true)
        } else {
          setPinError('Неверный PIN')
          setPinInput('')
        }
      }
    }
  }

  function handleChangePin() {
    setPinUnlocked(false)
    setIsSettingPin(true)
    setPinConfirmStep(false)
    setPinFirstEntry('')
    setPinInput('')
    setPinError('')
  }

  // ============================================================================
  // SETTINGS SAVE
  // ============================================================================

  async function handleSave() {
    setSaveStatus('saving')
    try {
      await updateWalletSettings(form)
      // Log settings change in audit trail for each child (settings are global but log per-child)
      if (children.length > 0) {
        await Promise.all(
          children.map(child =>
            logSettingsChange(child.id, 'Правила монет обновлены родителем')
          )
        )
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      console.error('Failed to save settings', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // ============================================================================
  // AUDIT LOAD MORE
  // ============================================================================

  function handleLoadMore() {
    const newOffset = auditOffset + 30
    setAuditOffset(newOffset)
    loadAudit(selectedChildId, newOffset)
  }

  // ============================================================================
  // RENDER — PIN GATE
  // ============================================================================

  if (!pinUnlocked) {
    const title = isSettingPin
      ? (pinConfirmStep ? 'Подтвердите PIN' : 'Создайте PIN')
      : 'Введите PIN'

    return (
      <div className="min-h-screen flex flex-col">
        <div className="px-4 pt-6">
          <h1 className="text-2xl font-bold text-white mb-6">Настройки</h1>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-gray-800 rounded-xl p-8 max-w-xs w-full mx-auto">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔒</div>
              <h2 className="text-xl font-semibold text-white">{title}</h2>
              {isSettingPin && !pinConfirmStep && (
                <p className="text-sm text-gray-400 mt-2">Введите 4-значный PIN для защиты настроек</p>
              )}
              {pinConfirmStep && (
                <p className="text-sm text-gray-400 mt-2">Введите PIN ещё раз для подтверждения</p>
              )}
            </div>

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinInput}
              onChange={e => handlePinInput(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full text-center text-3xl tracking-[0.5em] bg-gray-700 text-white rounded-lg px-4 py-4 outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
              autoFocus
            />

            {pinError && (
              <p className="text-red-400 text-sm text-center mt-3">{pinError}</p>
            )}

            <div className="flex justify-center gap-2 mt-4">
              {[1, 2, 3, 4].map(i => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    pinInput.length >= i ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER — SETTINGS CONTENT
  // ============================================================================

  const fields: { label: string; key: keyof SettingsForm }[] = [
    { label: 'Оценка 5', key: 'coins_per_grade_5' },
    { label: 'Оценка 4', key: 'coins_per_grade_4' },
    { label: 'Оценка 3', key: 'coins_per_grade_3' },
    { label: 'Уборка комнаты (за чекбокс)', key: 'coins_per_room_task' },
    { label: 'Хорошее поведение', key: 'coins_per_good_behavior' },
    { label: 'Упражнение', key: 'coins_per_exercise' },
    { label: 'Курс обмена (монет за 1 руб.)', key: 'base_exchange_rate' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-12">
      <h1 className="text-2xl font-bold text-white mb-4">Настройки</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Семья */}
      {activeTab === 'family' && (
        <div className="bg-gray-800 rounded-xl p-5">
          <FamilyManager />
        </div>
      )}

      {/* Предметы */}
      {activeTab === 'subjects' && (
        <div className="bg-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Предметы</h2>
          <p className="text-sm text-gray-400 mb-5">
            Предметы отображаются в разделе «Учёба» при заполнении дня.
          </p>
          <SubjectsManager children={children} />
        </div>
      )}

      {/* Монеты */}
      {activeTab === 'coins' && (
      <div className="bg-gray-800 rounded-xl p-5 mt-4">
        <h2 className="text-lg font-semibold text-white mb-4">Правила монет</h2>

        <div className="space-y-4">
          {fields.map(({ label, key }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-300 flex-1">{label}</label>
              <input
                type="number"
                min={0}
                max={50}
                value={form[key]}
                onChange={e => setForm(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                className="bg-gray-700 text-white rounded-lg px-3 py-2 w-24 text-center outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        {/* Coach rating coin rules */}
        <div style={{ marginTop: '16px' }}>
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Оценка тренера (секции)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {([
              { label: 'Оценка 5 (награда)', field: 'coins_per_coach_5' as const },
              { label: 'Оценка 4 (награда)', field: 'coins_per_coach_4' as const },
              { label: 'Оценка 3 (нейтрально)', field: 'coins_per_coach_3' as const },
              { label: 'Оценка 2 (штраф)', field: 'coins_per_coach_2' as const },
              { label: 'Оценка 1 (штраф)', field: 'coins_per_coach_1' as const },
            ] as { label: string; field: keyof SettingsForm }[]).map(({ label, field }) => (
              <div key={field} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="text-sm text-gray-300">{label}</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={form[field]}
                  onChange={e => setForm(prev => ({ ...prev, [field]: Number(e.target.value) }))}
                  className="bg-gray-700 text-white rounded-lg px-3 py-2 w-24 text-center"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Оценки 1 и 2 применяются как штраф (значение вычитается)</p>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold rounded-lg px-6 py-2.5 transition-colors"
          >
            {saveStatus === 'saving' ? 'Сохраняем...' : 'Сохранить'}
          </button>

          {saveStatus === 'saved' && (
            <span className="text-green-400 text-sm font-medium">Настройки сохранены</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-400 text-sm font-medium">Ошибка сохранения</span>
          )}
        </div>
      </div>
      )} {/* end activeTab === 'coins' */}

      {/* Журнал */}
      {activeTab === 'audit' && (
      <div className="bg-gray-800 rounded-xl p-5 mt-0">
        <h2 className="text-lg font-semibold text-white mb-3">Журнал действий</h2>

        {children.length > 0 && (
          <div className="mb-4">
            <select
              value={selectedChildId}
              onChange={e => setSelectedChildId(e.target.value)}
              className="bg-gray-700 text-white rounded px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {auditEntries.length === 0 && !auditLoading && (
          <p className="text-gray-500 text-sm text-center py-4">Действий пока нет</p>
        )}

        <div className="space-y-0">
          {auditEntries.map(entry => (
            <div
              key={entry.id}
              className="flex items-center gap-3 py-2 border-b border-gray-700 last:border-b-0"
            >
              <span className="text-xl flex-shrink-0">{entry.icon || '📋'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">{entry.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="bg-gray-700 text-gray-300 rounded px-2 text-xs">
                    {entry.action_type}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(entry.created_at)}</span>
                </div>
              </div>
              {entry.coins_change !== 0 && entry.coins_change !== null && (
                <span
                  className={`text-sm font-semibold flex-shrink-0 ${
                    (entry.coins_change ?? 0) > 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {(entry.coins_change ?? 0) > 0 ? '+' : ''}{entry.coins_change}
                </span>
              )}
            </div>
          ))}
        </div>

        {auditLoading && (
          <p className="text-gray-500 text-sm text-center py-4">Загрузка...</p>
        )}

        {hasMore && !auditLoading && (
          <button
            onClick={handleLoadMore}
            className="w-full mt-4 text-sm text-blue-400 hover:text-blue-300 py-2 transition-colors"
          >
            Загрузить ещё
          </button>
        )}
      </div>
      )} {/* end activeTab === 'audit' */}

      {/* Change PIN */}
      <div className="mt-6 text-right">
        <button
          onClick={handleChangePin}
          className="text-sm text-gray-400 hover:text-gray-200 underline transition-colors"
        >
          Изменить PIN
        </button>
      </div>
    </div>
  )
}
