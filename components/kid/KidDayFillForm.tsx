'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCoinAnimation, CoinFlyup } from '@/components/kid/CoinAnimation'
import type { DayData, SubjectGrade } from '@/lib/models/child.types'
import type { Subject, ExerciseType } from '@/lib/models/flexible.types'
import type { ExtraActivity, Section, SectionVisit } from '@/lib/models/expense.types'
import type { WalletSettings } from '@/lib/models/wallet.types'
import { saveDay } from '@/lib/repositories/children.repo'
import { getExtraActivities, getActivityLogs, saveActivityLogs, getSectionsForDate, markSectionVisit } from '@/lib/repositories/expenses.repo'
import { getActiveSubjects, getExerciseTypes, saveHomeExercise, getHomeExercises } from '@/lib/repositories/schedule.repo'
import { getSubjectGradesForDate, saveSubjectGrade } from '@/lib/repositories/grades.repo'
import {
  getWalletSettings,
  awardCoinsForRoom,
  awardCoinsForSport,
  updateWalletCoins,
} from '@/lib/repositories/wallet.repo'
import { updateStreaks } from '@/lib/streaks'
import { getReadingLog, saveReadingLog } from '@/lib/vacation-api'

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
  // ── Coin animation ───────────────────────────────────────────────────────
  const { flyups, trigger: triggerCoinFlyup } = useCoinAnimation()

  // ── State ────────────────────────────────────────────────────────────────
  const isChildFilled = existingDay?.filled_by === 'child'

  const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([])
  const [exercises, setExercises] = useState<Array<{ exercise_type_id: string; quantity: number | null; unit: string }>>([])
  const [sections, setSections] = useState<Array<Section & { visit?: SectionVisit }>>([])
  const [sectionNotes, setSectionNotes] = useState<Record<string, { progress: string; coachRating: number | null }>>({})

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
  // saved=true means already in DB — skip on submit to avoid duplicates
  type GradeEntry = { grade: number | null; isDigital: boolean; saved: boolean }
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [kidGrades, setKidGrades] = useState<Record<string, GradeEntry[]>>({})

  // ── Reading state ────────────────────────────────────────────────────────
  const [reading, setReading] = useState({
    bookTitle: '',
    pagesRead: '',
    minutesRead: '',
    currentPage: '',
    bookFinished: false,
    note: '',
  })
  const [readingActive, setReadingActive] = useState(false) // toggle "читал сегодня"

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
        getExerciseTypes(),
        getHomeExercises(childId, date),
        getSectionsForDate(childId, date),
      ]
      if (fillMode >= 3 && dayType === 'school') {
        promises.push(getActiveSubjects(childId), getSubjectGradesForDate(childId, date))
      }
      const [acts, ws, existingLogs, exTypes, existingExercises, sectionsData, subs, gradesData] = await Promise.all(promises)
      setActivities(acts)
      setSettings(ws)

      // Pre-fill exercises
      setExerciseTypes(exTypes)
      setExercises((existingExercises ?? []).map((ex: any) => ({
        exercise_type_id: ex.exercise_type_id,
        quantity: ex.quantity,
        unit: ex.exercise_type?.unit ?? 'раз',
      })))

      // Pre-fill sections
      setSections(sectionsData ?? [])
      const notes: Record<string, { progress: string; coachRating: number | null }> = {}
      ;(sectionsData ?? []).forEach((s: Section & { visit?: SectionVisit }) => {
        if (s.visit) {
          notes[s.id] = { progress: s.visit.progress_note ?? '', coachRating: null }
        }
      })
      setSectionNotes(notes)

      // Pre-fill reading log
      const existingReading = await getReadingLog(childId, date)
      if (existingReading) {
        setReadingActive(true)
        setReading({
          bookTitle: existingReading.book_title ?? '',
          pagesRead: String(existingReading.pages_read ?? ''),
          minutesRead: String(existingReading.minutes_read ?? ''),
          currentPage: String((existingReading as any).current_page ?? ''),
          bookFinished: existingReading.book_finished ?? false,
          note: existingReading.note ?? '',
        })
      }

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
        // Group existing grades by subject — pre-fill as saved entries
        const bySubject: Record<string, Array<{ grade: number | null; isDigital: boolean; saved: boolean }>> = {}
        grades.forEach((g: SubjectGrade) => {
          if (!bySubject[g.subject]) bySubject[g.subject] = []
          bySubject[g.subject].push({ grade: g.grade, isDigital: g.note === 'цифровое задание', saved: true })
        })
        // Ensure every active subject has at least one empty entry for new input
        ;(subs as Subject[]).forEach((s: Subject) => {
          if (!bySubject[s.name]) bySubject[s.name] = []
          bySubject[s.name].push({ grade: null, isDigital: false, saved: false })
        })
        setKidGrades(bySubject)
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
    // Grade coins (mode 3) — only unsaved (new) entries
    Object.values(kidGrades).flat().forEach(e => {
      if (!e.saved && e.grade !== null) total += GRADE_COINS[e.grade] ?? 0
    })
    // Coach rating coins for attended sections
    if (settings) {
      sections.forEach(s => {
        const note = sectionNotes[s.id]
        if (!note?.coachRating) return
        const r = note.coachRating
        if (r === 5) total += settings.coins_per_coach_5
        else if (r === 4) total += settings.coins_per_coach_4
        else if (r === 3) total += settings.coins_per_coach_3 // usually 0
        else if (r === 2) total -= settings.coins_per_coach_2
        else if (r === 1) total -= settings.coins_per_coach_1
      })
    }
    // Book finished bonus
    if (readingActive && reading.bookFinished) {
      total += (settings as any)?.coins_per_book ?? 20
    }
    return total
  }, [roomItems, checkedActivities, activities, settings, fillMode, kidGrades, sections, sectionNotes, reading, readingActive])

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

  function toggleExercise(exerciseTypeId: string) {
    if (isLocked) return
    setExercises(prev => {
      const exists = prev.find(e => e.exercise_type_id === exerciseTypeId)
      if (exists) return prev.filter(e => e.exercise_type_id !== exerciseTypeId)
      const et = exerciseTypes.find(t => t.id === exerciseTypeId)
      return [...prev, { exercise_type_id: exerciseTypeId, quantity: null, unit: et?.unit ?? 'раз' }]
    })
  }

  function updateExerciseQuantity(exerciseTypeId: string, quantity: number | null) {
    setExercises(prev => prev.map(e => e.exercise_type_id === exerciseTypeId ? { ...e, quantity } : e))
  }

  function toggleSectionAttended(sectionId: string) {
    if (isLocked) return
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      if (s.visit) {
        return { ...s, visit: { ...s.visit, attended: !s.visit.attended } }
      }
      return { ...s, visit: { id: '', section_id: sectionId, date, attended: true, progress_note: null, trainer_feedback: null, created_at: '' } as SectionVisit }
    }))
  }

  function updateSectionCoachRating(sectionId: string, rating: number | null) {
    setSectionNotes(prev => ({ ...prev, [sectionId]: { ...(prev[sectionId] ?? { progress: '' }), coachRating: rating } }))
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

      // Save grades (mode 3) — only new (unsaved) entries with a grade set
      if (fillMode >= 3) {
        for (const [subject, entries] of Object.entries(kidGrades)) {
          const sub = subjects.find(s => s.name === subject)
          for (const entry of entries) {
            if (entry.saved || entry.grade === null) continue
            await saveSubjectGrade({
              childId,
              date,
              subject,
              subjectId: sub?.id,
              grade: entry.grade,
              note: entry.isDigital ? 'цифровое задание' : undefined,
            })
            const coins = GRADE_COINS[entry.grade] ?? 0
            if (coins !== 0) {
              const label = entry.isDigital ? `Цифр. ${entry.grade} — ${subject}` : `Оценка ${entry.grade} — ${subject}`
              await updateWalletCoins(childId, coins, label, '📚')
            }
          }
        }
      }

      // Save home exercises
      for (const ex of exercises) {
        await saveHomeExercise(childId, date, ex.exercise_type_id, ex.quantity, undefined)
      }

      // Save section visits + award coach rating coins
      for (const section of sections) {
        if (section.visit) {
          const note = sectionNotes[section.id] ?? { progress: '', coachRating: null }
          await markSectionVisit(section.id, date, section.visit.attended, note.progress || undefined, undefined)
          if (section.visit.attended && note.coachRating && note.coachRating >= 1 && note.coachRating <= 5) {
            await awardCoinsForSport(childId, note.coachRating, section.name)
          }
        }
      }

      // Save reading log
      if (readingActive && reading.bookTitle.trim()) {
        await saveReadingLog({
          child_id: childId,
          date,
          book_title: reading.bookTitle.trim(),
          pages_read: Number(reading.pagesRead) || 0,
          minutes_read: Number(reading.minutesRead) || 0,
          book_finished: reading.bookFinished,
          note: reading.note.trim(),
          // current_page added via migration
          ...(reading.currentPage ? { current_page: Number(reading.currentPage) } : {}),
        } as any)
        // Award coins for finishing a book
        if (reading.bookFinished) {
          const bookCoins = (settings as any)?.coins_per_book ?? 20
          if (bookCoins > 0) {
            await updateWalletCoins(childId, bookCoins, `Книга: ${reading.bookTitle.trim()}`, '📚')
          }
        }
      }

      triggerCoinFlyup(coinsPreview)
      const streakEvents = await updateStreaks(childId, date)
      // Fire-and-forget: don't block save completion on push delivery
      import('@/app/actions/push-streaks').then(({ notifyStreakEvents }) => {
        notifyStreakEvents(childId, '', streakEvents).catch(() => {})
      })

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
      {fillMode >= 3 && dayType === 'school' && subjects.length > 0 && (
        <div className="kid-card">
          <div className="font-bold text-base mb-1">📚 Оценки за сегодня</div>
          <p className="text-xs text-gray-400 mb-3">Мы доверяем тебе — родитель проверит по журналу</p>
          <div className="flex flex-col gap-4">
            {subjects.map(sub => {
              const entries = kidGrades[sub.name] ?? []
              return (
                <div key={sub.id}>
                  <div className="text-sm font-semibold text-gray-700 mb-2">{sub.name}</div>
                  <div className="flex flex-col gap-2">
                    {entries.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-2 flex-wrap">
                        {/* Grade buttons */}
                        <div className="flex gap-1">
                          {[2, 3, 4, 5].map(g => (
                            <button
                              key={g}
                              type="button"
                              disabled={isLocked || entry.saved}
                              onClick={() => setKidGrades(prev => {
                                const next = prev[sub.name].map((e, i) =>
                                  i === idx ? { ...e, grade: e.grade === g ? null : g } : e
                                )
                                return { ...prev, [sub.name]: next }
                              })}
                              className={[
                                'w-8 h-8 rounded-lg text-sm font-bold border-2 transition-all',
                                entry.grade === g
                                  ? g >= 4 ? 'bg-emerald-400 border-emerald-500 text-white'
                                  : g === 3 ? 'bg-amber-400 border-amber-500 text-white'
                                  : 'bg-rose-400 border-rose-500 text-white'
                                  : 'bg-white border-gray-200 text-gray-600',
                                (isLocked || entry.saved) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                              ].join(' ')}
                            >{g}</button>
                          ))}
                        </div>
                        {/* Digital toggle */}
                        {!entry.saved && (
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => setKidGrades(prev => {
                              const next = prev[sub.name].map((e, i) =>
                                i === idx ? { ...e, isDigital: !e.isDigital } : e
                              )
                              return { ...prev, [sub.name]: next }
                            })}
                            className={[
                              'text-xs px-2 py-1 rounded-full border transition-all',
                              entry.isDigital
                                ? 'bg-blue-100 border-blue-400 text-blue-700 font-semibold'
                                : 'bg-white border-gray-200 text-gray-400',
                            ].join(' ')}
                          >💻 Цифр.</button>
                        )}
                        {/* Saved badge */}
                        {entry.saved && (
                          <span className="text-xs text-gray-400">
                            {entry.isDigital ? '💻 цифр.' : ''}
                          </span>
                        )}
                        {/* Remove entry (if more than 1 unsaved) */}
                        {!entry.saved && entries.filter(e => !e.saved).length > 1 && (
                          <button
                            type="button"
                            onClick={() => setKidGrades(prev => ({
                              ...prev,
                              [sub.name]: prev[sub.name].filter((_, i) => i !== idx),
                            }))}
                            className="text-xs text-gray-300 hover:text-rose-400 ml-auto"
                          >✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Add another grade */}
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => setKidGrades(prev => ({
                        ...prev,
                        [sub.name]: [...(prev[sub.name] ?? []), { grade: null, isDigital: false, saved: false }],
                      }))}
                      className="mt-2 text-xs text-amber-600 font-semibold"
                    >+ ещё оценка</button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Упражнения section ──────────────────────────────────────── */}
      {exerciseTypes.length > 0 && (
        <div className="kid-card">
          <div className="font-bold text-base mb-3">🏃 Упражнения</div>
          <div className="flex flex-col gap-2">
            {exerciseTypes.map(et => {
              const active = exercises.find(e => e.exercise_type_id === et.id)
              return (
                <div key={et.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => toggleExercise(et.id)}
                    disabled={isLocked}
                    className={[
                      'flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                      active
                        ? 'bg-amber-50 border-amber-400'
                        : 'bg-white border-gray-200 text-gray-700',
                      isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    <span className={['w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0', active ? 'bg-amber-400 border-amber-500' : 'border-gray-300'].join(' ')}>
                      {active && <span className="text-white text-xs">✓</span>}
                    </span>
                    <span>{et.name}</span>
                  </button>
                  {active && (
                    <div className="flex items-center gap-2 pl-7">
                      <input
                        type="number"
                        min={1}
                        disabled={isLocked}
                        value={active.quantity ?? ''}
                        onChange={e => updateExerciseQuantity(et.id, e.target.value ? Number(e.target.value) : null)}
                        placeholder="Кол-во"
                        className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                      <span className="text-xs text-gray-400">{active.unit}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Секции section ───────────────────────────────────────────── */}
      {sections.length > 0 && (
        <div className="kid-card">
          <div className="font-bold text-base mb-3">🏫 Секции</div>
          <div className="flex flex-col gap-4">
            {sections.map(section => {
              const attended = section.visit?.attended ?? false
              const note = sectionNotes[section.id] ?? { progress: '', coachRating: null }
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => toggleSectionAttended(section.id)}
                    disabled={isLocked}
                    className={[
                      'flex items-center gap-2 w-full px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                      attended
                        ? 'bg-amber-50 border-amber-400'
                        : 'bg-white border-gray-200 text-gray-700',
                      isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    <span className={['w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0', attended ? 'bg-amber-400 border-amber-500' : 'border-gray-300'].join(' ')}>
                      {attended && <span className="text-white text-xs">✓</span>}
                    </span>
                    <span>{section.name}</span>
                  </button>
                  {attended && (
                    <div className="mt-2 pl-7 flex flex-col gap-2">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Оценка тренера</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(r => (
                            <button
                              key={r}
                              type="button"
                              disabled={isLocked}
                              onClick={() => updateSectionCoachRating(section.id, note.coachRating === r ? null : r)}
                              className={[
                                'w-8 h-8 rounded-lg text-sm font-bold border-2 transition-all',
                                note.coachRating === r
                                  ? r >= 4 ? 'bg-emerald-400 border-emerald-500 text-white'
                                  : r === 3 ? 'bg-amber-400 border-amber-500 text-white'
                                  : 'bg-rose-400 border-rose-500 text-white'
                                  : 'bg-white border-gray-200 text-gray-600',
                                isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                              ].join(' ')}
                            >{r}</button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={note.progress}
                        onChange={e => setSectionNotes(prev => ({ ...prev, [section.id]: { ...note, progress: e.target.value } }))}
                        disabled={isLocked}
                        placeholder="Заметка о тренировке…"
                        rows={2}
                        className="w-full rounded-xl border border-gray-200 p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Reading section ─────────────────────────────────────────── */}
      <div className="kid-card">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-base">📚 Чтение</div>
          <button
            type="button"
            disabled={isLocked}
            onClick={() => setReadingActive(v => !v)}
            className={[
              'px-3 py-1 rounded-xl text-sm font-semibold border-2 transition-all',
              readingActive
                ? 'bg-emerald-400 border-emerald-500 text-white'
                : 'bg-white border-gray-200 text-gray-500',
              isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            {readingActive ? '✓ Читал' : 'Читал сегодня?'}
          </button>
        </div>

        {readingActive && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Название книги"
              value={reading.bookTitle}
              disabled={isLocked}
              onChange={e => setReading(r => ({ ...r, bookTitle: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-xs text-gray-500 mb-1">Страниц</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={reading.pagesRead}
                  disabled={isLocked}
                  onChange={e => setReading(r => ({ ...r, pagesRead: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Минут</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={reading.minutesRead}
                  disabled={isLocked}
                  onChange={e => setReading(r => ({ ...r, minutesRead: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Стр. закладка</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={reading.currentPage}
                  disabled={isLocked}
                  onChange={e => setReading(r => ({ ...r, currentPage: e.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
            </div>

            {/* Finished book toggle */}
            <button
              type="button"
              disabled={isLocked}
              onClick={() => setReading(r => ({ ...r, bookFinished: !r.bookFinished }))}
              className={[
                'flex items-center gap-2 w-full px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all',
                reading.bookFinished
                  ? 'bg-amber-50 border-amber-400 text-amber-700'
                  : 'bg-white border-gray-200 text-gray-600',
                isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <span className={['w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0', reading.bookFinished ? 'bg-amber-400 border-amber-500' : 'border-gray-300'].join(' ')}>
                {reading.bookFinished && <span className="text-white text-xs">✓</span>}
              </span>
              🏆 Дочитал книгу до конца!
              {reading.bookFinished && (
                <span className="ml-auto text-amber-600 font-bold">
                  +{(settings as any)?.coins_per_book ?? 20} 💰
                </span>
              )}
            </button>
          </div>
        )}
      </div>

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

      {/* ── Coin fly-up animation ────────────────────────────────────── */}
      <CoinFlyup flyups={flyups} />
    </div>
  )
}
