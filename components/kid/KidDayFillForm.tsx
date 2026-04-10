'use client'

import { useState, useEffect, useMemo } from 'react'
import type { DayData, SubjectGrade } from '@/lib/models/child.types'
import type { Subject } from '@/lib/models/flexible.types'
import type { ExtraActivity } from '@/lib/models/expense.types'
import type { WalletSettings } from '@/lib/models/wallet.types'
import { saveDay } from '@/lib/repositories/children.repo'
import { getExtraActivities, getActivityLogs, saveActivityLogs } from '@/lib/repositories/expenses.repo'
import { getActiveSubjects } from '@/lib/repositories/schedule.repo'
import { getSubjectGradesForDate, saveSubjectGrade } from '@/lib/repositories/grades.repo'
import {
  getWalletSettings,
  awardCoinsForRoom,
  updateWalletCoins,
} from '@/lib/repositories/wallet.repo'

const GRADE_COINS: Record<number, number> = { 5: 5, 4: 3, 3: -3, 2: -5, 1: -10 }

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
  // Grades (mode 3 only)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [existingGrades, setExistingGrades] = useState<SubjectGrade[]>([])
  const [kidGrades, setKidGrades] = useState<Record<string, number | null>>({})

  // ── Lock logic ───────────────────────────────────────────────────────────
  const isLocked = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return date < today
  }, [date])

  // ── Load data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const promises: Promise<any>[] = [
        getExtraActivities(childId, dayType),
        getWalletSettings(),
        getActivityLogs(childId, date),
      ]
      if (fillMode >= 3) {
        promises.push(getActiveSubjects(childId), getSubjectGradesForDate(childId, date))
      }
      const [acts, ws, existingLogs, subs, gradesData] = await Promise.all(promises)
      setActivities(acts)
      setSettings(ws)

      // Pre-check activities that were previously saved
      if (existingLogs.length > 0) {
        const doneIds = new Set<string>(
          existingLogs
            .filter((l: any) => l.done)
            .map((l: any) => l.activity_id as string)
        )
        setCheckedActivities(doneIds)
      }

      // Pre-fill grades (mode 3)
      if (fillMode >= 3 && subs) {
        setSubjects(subs)
        const grades: SubjectGrade[] = gradesData ?? []
        setExistingGrades(grades)
        // Pre-fill kid grades from existing data (if child already filled them)
        const preGrades: Record<string, number | null> = {}
        grades.forEach((g: SubjectGrade) => { preGrades[g.subject] = g.grade })
        setKidGrades(preGrades)
      }
    }
    load()
  }, [childId, dayType, date, fillMode])

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
    // Grade coins (mode 3)
    Object.values(kidGrades).forEach(g => {
      if (g !== null) total += GRADE_COINS[g] ?? 0
    })
    return total
  }, [roomItems, checkedActivities, activities, settings, fillMode, kidGrades])

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

      // Save grades (mode 3) — only subjects the kid actually rated
      if (fillMode >= 3) {
        const existingSubjectNames = new Set(existingGrades.map(g => g.subject))
        for (const [subject, grade] of Object.entries(kidGrades)) {
          if (grade === null) continue
          // Skip if parent already entered a grade for this subject today
          if (existingSubjectNames.has(subject)) continue
          const sub = subjects.find(s => s.name === subject)
          await saveSubjectGrade({
            childId,
            date,
            subject,
            subjectId: sub?.id,
            grade,
          })
          const coins = GRADE_COINS[grade] ?? 0
          if (coins !== 0) {
            await updateWalletCoins(childId, coins, `Оценка ${grade} — ${subject}`, '📚')
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

      {/* ── Оценки section (mode 3) ─────────────────────────────────── */}
      {fillMode >= 3 && subjects.length > 0 && (
        <div className="kid-card">
          <div className="font-bold text-base mb-1">📚 Оценки за сегодня</div>
          <p className="text-xs text-gray-400 mb-3">Мы доверяем тебе — родитель проверит по журналу</p>
          <div className="flex flex-col gap-3">
            {subjects.map(sub => {
              const existingGrade = existingGrades.find(g => g.subject === sub.name)
              const kidGrade = kidGrades[sub.name] ?? null
              return (
                <div key={sub.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700 flex-1 min-w-0 truncate">{sub.name}</span>
                  {existingGrade ? (
                    // Parent already entered — show read-only
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                      {existingGrade.grade} (родитель)
                    </span>
                  ) : (
                    // Kid can enter
                    <div className="flex gap-1">
                      {[2, 3, 4, 5].map(g => (
                        <button
                          key={g}
                          type="button"
                          disabled={isLocked}
                          onClick={() => setKidGrades(prev => ({
                            ...prev,
                            [sub.name]: prev[sub.name] === g ? null : g,
                          }))}
                          className={[
                            'w-8 h-8 rounded-lg text-sm font-bold border-2 transition-all',
                            kidGrade === g
                              ? g >= 4
                                ? 'bg-emerald-400 border-emerald-500 text-white'
                                : g === 3
                                  ? 'bg-amber-400 border-amber-500 text-white'
                                  : 'bg-rose-400 border-rose-500 text-white'
                              : 'bg-white border-gray-200 text-gray-600',
                            isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                          ].join(' ')}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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
