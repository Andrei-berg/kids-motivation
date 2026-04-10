'use client'

import { useState, useEffect, useMemo } from 'react'
import type { DayData } from '@/lib/models/child.types'
import type { ExtraActivity } from '@/lib/models/expense.types'
import type { WalletSettings } from '@/lib/models/wallet.types'
import { saveDay } from '@/lib/repositories/children.repo'
import { getExtraActivities, getActivityLogs, saveActivityLogs } from '@/lib/repositories/expenses.repo'
import {
  getWalletSettings,
  awardCoinsForRoom,
  updateWalletCoins,
} from '@/lib/repositories/wallet.repo'

// ============================================================================
// TYPES
// ============================================================================

export interface KidDayFillFormProps {
  childId: string
  date: string         // YYYY-MM-DD
  fillMode: 1 | 2 | 3 // from child.kid_fill_mode
  dayType: 'school' | 'weekend' | 'vacation'
  existingDay: DayData | null   // pre-filled if parent already saved
  onSaved: (coinsEarned: number) => void // callback after successful save
}

interface RoomItems {
  bed: boolean
  floor: boolean
  desk: boolean
  closet: boolean
  trash: boolean
}

// ============================================================================
// ROOM ITEM LABELS
// ============================================================================

const ROOM_ITEM_LABELS: { key: keyof RoomItems; emoji: string; label: string }[] = [
  { key: 'bed', emoji: '🛏', label: 'Кровать' },
  { key: 'floor', emoji: '🧹', label: 'Пол' },
  { key: 'desk', emoji: '📚', label: 'Стол' },
  { key: 'closet', emoji: '👗', label: 'Шкаф' },
  { key: 'trash', emoji: '🗑', label: 'Мусор' },
]

// ============================================================================
// MOOD OPTIONS
// ============================================================================

const MOOD_OPTIONS = [
  { key: 'happy', emoji: '😄' },
  { key: 'neutral', emoji: '😐' },
  { key: 'sad', emoji: '😔' },
  { key: 'angry', emoji: '😠' },
  { key: 'tired', emoji: '😴' },
]

// ============================================================================
// COMPONENT
// ============================================================================

export function KidDayFillForm({
  childId,
  date,
  fillMode,
  dayType,
  existingDay,
  onSaved,
}: KidDayFillFormProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const isChildFilled = existingDay?.filled_by === 'child'

  const [roomItems, setRoomItems] = useState<RoomItems>({
    bed: isChildFilled ? (existingDay?.room_bed ?? false) : false,
    floor: isChildFilled ? (existingDay?.room_floor ?? false) : false,
    desk: isChildFilled ? (existingDay?.room_desk ?? false) : false,
    closet: isChildFilled ? (existingDay?.room_closet ?? false) : false,
    trash: isChildFilled ? (existingDay?.room_trash ?? false) : false,
  })

  const [mood, setMood] = useState<string | null>(existingDay?.mood ?? null)
  const [checkedActivities, setCheckedActivities] = useState<Set<string>>(new Set())
  const [activities, setActivities] = useState<ExtraActivity[]>([])
  const [settings, setSettings] = useState<WalletSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [noteChild, setNoteChild] = useState<string>(existingDay?.note_child ?? '')

  // ── Lock logic ───────────────────────────────────────────────────────────
  const isLocked = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return date < today
  }, [date])

  // ── Load data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [acts, ws, existingLogs] = await Promise.all([
        getExtraActivities(childId, dayType),
        getWalletSettings(),
        getActivityLogs(childId, date),
      ])
      setActivities(acts)
      setSettings(ws)

      // Pre-check activities that were previously saved
      if (existingLogs.length > 0) {
        const doneIds = new Set(
          existingLogs
            .filter(l => l.done)
            .map(l => l.activity_id)
        )
        setCheckedActivities(doneIds)
      }
    }
    load()
  }, [childId, dayType, date])

  // ── Live coin calculation (no state — pure compute) ──────────────────────
  const coinsPreview = useMemo(() => {
    let total = 0
    const roomCount = Object.values(roomItems).filter(Boolean).length
    if (roomCount >= 3 && fillMode >= 2) {
      total += settings?.coins_per_room_task ?? 3
    }
    checkedActivities.forEach(id => {
      const act = activities.find(a => a.id === id)
      if (act) total += act.coins
    })
    return total
  }, [roomItems, checkedActivities, activities, settings, fillMode])

  // ── Handlers ─────────────────────────────────────────────────────────────
  function toggleRoomItem(key: keyof RoomItems) {
    if (isLocked) return
    setRoomItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleActivity(id: string) {
    if (isLocked) return
    setCheckedActivities(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleSubmit() {
    if (isLocked || saving) return
    setSaving(true)

    try {
      const roomCount = Object.values(roomItems).filter(Boolean).length
      const roomOk = roomCount >= 3

      // Build saveDay params based on fillMode
      const dayParams: Parameters<typeof saveDay>[0] = {
        childId,
        date,
        filledBy: 'child',
        mood: mood ?? undefined,
        noteChild: noteChild.trim() || undefined,
      }

      if (fillMode >= 2) {
        dayParams.roomBed = roomItems.bed
        dayParams.roomFloor = roomItems.floor
        dayParams.roomDesk = roomItems.desk
        dayParams.roomCloset = roomItems.closet
        dayParams.roomTrash = roomItems.trash
      }

      await saveDay(dayParams)

      // Award room coins if applicable
      if (fillMode >= 2 && roomOk) {
        await awardCoinsForRoom(childId)
      }

      // Save extra activities + award coins per activity
      if (activities.length > 0) {
        const logs = activities.map(act => ({
          activityId: act.id,
          done: checkedActivities.has(act.id),
        }))
        await saveActivityLogs(childId, date, logs)

        // Award coins for each checked activity
        for (const id of Array.from(checkedActivities)) {
          const act = activities.find(a => a.id === id)
          if (act && act.coins > 0) {
            await updateWalletCoins(childId, act.coins, act.name, act.emoji)
          }
        }
      }

      onSaved(coinsPreview)
    } catch (err) {
      console.error('KidDayFillForm submit error:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Room section visibility ──────────────────────────────────────────────
  const showRoomSection =
    fillMode >= 2 && !(isLocked && existingDay?.filled_by !== 'child')

  const roomCount = Object.values(roomItems).filter(Boolean).length

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* ── Live coin counter (sticky pill) ─────────────────────────── */}
      <div className="sticky top-2 z-10 flex justify-center">
        <div
          className="kid-hero-gradient rounded-full px-6 py-2 text-white font-bold text-lg shadow-lg"
          style={{ transition: 'all 0.2s ease' }}
        >
          🪙 +{coinsPreview} монет сегодня
        </div>
      </div>

      {/* ── Комната section ─────────────────────────────────────────── */}
      {showRoomSection && (
        <div className="kid-card">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-base">🏠 Комната</span>
            {roomCount >= 3 && (
              <span className="text-xs text-amber-600 font-semibold">
                +{settings?.coins_per_room_task ?? 3}💰
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ROOM_ITEM_LABELS.map(({ key, emoji, label }) => {
              const active = roomItems[key]
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleRoomItem(key)}
                  disabled={isLocked}
                  className={[
                    'flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                    active
                      ? 'bg-amber-400 border-amber-500 text-white shadow-sm'
                      : 'bg-white border-amber-200 text-gray-700',
                    isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              )
            })}
          </div>
          {roomCount > 0 && roomCount < 3 && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Ещё {3 - roomCount} пункта для получения монет
            </p>
          )}
        </div>
      )}

      {/* ── Настроение section ──────────────────────────────────────── */}
      <div className="kid-card">
        <div className="font-bold text-base mb-3">😊 Настроение</div>
        <div className="flex justify-around">
          {MOOD_OPTIONS.map(({ key, emoji }) => (
            <button
              key={key}
              type="button"
              onClick={() => !isLocked && setMood(prev => prev === key ? null : key)}
              disabled={isLocked}
              className={[
                'text-3xl transition-transform',
                mood === key ? 'scale-125 ring-2 ring-amber-400 rounded-full' : 'opacity-70',
                isLocked ? 'cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
              title={key}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* ── Доп. занятия section ────────────────────────────────────── */}
      {activities.length > 0 && (
        <div className="kid-card">
          <div className="font-bold text-base mb-3">⭐ Доп. занятия</div>
          <div className="flex flex-col gap-2">
            {activities.map(act => {
              const checked = checkedActivities.has(act.id)
              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => toggleActivity(act.id)}
                  disabled={isLocked}
                  className={[
                    'flex items-center justify-between px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                    checked
                      ? 'bg-amber-50 border-amber-400'
                      : 'bg-white border-gray-200 text-gray-700',
                    isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={[
                        'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                        checked ? 'bg-amber-400 border-amber-500' : 'border-gray-300',
                      ].join(' ')}
                    >
                      {checked && <span className="text-white text-xs">✓</span>}
                    </span>
                    <span>{act.emoji} {act.name}</span>
                  </span>
                  {act.coins > 0 && (
                    <span className="text-amber-600 font-semibold text-xs">+{act.coins}💰</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Note section (mode 1 — diary) ───────────────────────────── */}
      {fillMode === 1 && (
        <div className="kid-card">
          <div className="font-bold text-base mb-2">📝 Заметка дня</div>
          <textarea
            value={noteChild}
            onChange={e => setNoteChild(e.target.value)}
            disabled={isLocked}
            placeholder="Как прошёл день?"
            rows={3}
            className="w-full rounded-xl border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
      )}

      {/* ── Trust message ───────────────────────────────────────────── */}
      <p className="text-center text-xs text-gray-400">Мы доверяем тебе ✨</p>

      {/* ── Submit / locked ─────────────────────────────────────────── */}
      {isLocked ? (
        <div className="text-center text-sm text-gray-500 py-3">
          🔒 День закрыт
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="kid-hero-gradient w-full py-4 rounded-2xl text-white font-bold text-lg shadow-md disabled:opacity-60 transition-opacity"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Сохраняем…
            </span>
          ) : (
            'Сохранить день'
          )}
        </button>
      )}
    </div>
  )
}
