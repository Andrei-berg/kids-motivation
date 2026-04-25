'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
import { updateStreaks, getStreakBonuses } from '@/lib/streaks'
import { checkAndAwardBadges } from '@/lib/badges'
import { compressImage, uploadPhoto, getSignedPhotoUrl } from '@/lib/photo-upload'
import { supabase } from '@/lib/supabase'
import { getReadingLog, saveReadingLog } from '@/lib/vacation-api'
import { T } from '@/components/kid/design/tokens'
import { Confetti, AnimatedNum } from '@/components/kid/design/atoms'

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
  { key: 'bed',    emoji: '🛏️', label: 'Кровать' },
  { key: 'floor',  emoji: '🧹', label: 'Пол' },
  { key: 'desk',   emoji: '🪑', label: 'Стол' },
  { key: 'closet', emoji: '🚪', label: 'Шкаф' },
  { key: 'trash',  emoji: '🗑️', label: 'Мусор' },
]

// ============================================================================
// MOOD OPTIONS
// ============================================================================

const MOOD_OPTIONS = [
  { key: 'happy',   emoji: '😄', label: 'Огонь!',  color: '#FF6B35' },
  { key: 'neutral', emoji: '🙂', label: 'Хорошо',  color: '#4ECDC4' },
  { key: 'meh',     emoji: '😐', label: 'Норм',    color: '#F5A623' },
  { key: 'sad',     emoji: '😔', label: 'Грустно', color: '#6C5CE7' },
  { key: 'tired',   emoji: '😴', label: 'Устал',   color: '#FF8FB1' },
]

// ============================================================================
// FILL SECTION HELPER
// ============================================================================

function FillSection({ title, icon, sub, children }: { title: string; icon: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '22px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: T.fDisp, fontSize: 19, fontWeight: 900, color: T.ink, letterSpacing: -0.3, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span> {title}
        </h3>
        {sub && <span style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: T.lineSoft }}>{sub}</span>}
      </div>
      {children}
    </div>
  )
}

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

  // ── Confetti ─────────────────────────────────────────────────────────────
  const [confettiTrig, setConfettiTrig] = useState(0)
  const triggerConfetti = () => setConfettiTrig(c => c + 1)

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
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofLocalUrl, setProofLocalUrl] = useState<string | null>(null)
  const proofInputRef = useRef<HTMLInputElement>(null)
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

  function handleProofCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Revoke previous preview URL to avoid memory leak
    if (proofLocalUrl) URL.revokeObjectURL(proofLocalUrl)
    const url = URL.createObjectURL(file)
    setProofFile(file)
    setProofLocalUrl(url)
    // Reset input so the same file can trigger onChange again (retake)
    e.target.value = ''
  }

  function handleProofRetake() {
    if (proofLocalUrl) URL.revokeObjectURL(proofLocalUrl)
    setProofFile(null)
    setProofLocalUrl(null)
    // Re-open camera
    setTimeout(() => proofInputRef.current?.click(), 50)
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

      // Upload room proof photo if captured
      let roomProofSignedUrl: string | undefined
      if (proofFile) {
        try {
          // Fetch family_id for the storage path
          const { data: childRow } = await supabase
            .from('children')
            .select('family_id')
            .eq('id', childId)
            .single()
          const familyId = childRow?.family_id ?? childId
          const compressed = await compressImage(proofFile)
          const path = `${familyId}/proof/${childId}/${date}.jpg`
          await uploadPhoto(compressed, path)
          roomProofSignedUrl = await getSignedPhotoUrl(path)
        } catch (err) {
          console.warn('[KidDayFillForm] proof upload failed (continuing without proof):', err)
        }
      }

      await saveDay({ ...dayParams, roomProofUrl: roomProofSignedUrl })

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

      const streakBonus = await getStreakBonuses(childId)
      if (streakBonus > 0) {
        await updateWalletCoins(childId, streakBonus, 'streak_bonus', '🔥')
      }

      await checkAndAwardBadges(childId, date)

      if (proofLocalUrl) URL.revokeObjectURL(proofLocalUrl)
      onSaved(coinsPreview)
    } catch (err) {
      console.error('KidDayFillForm submit error:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 130, position: 'relative' }}>
      <Confetti trigger={confettiTrig}/>
      {/* CoinFlyup keeps working */}
      <CoinFlyup flyups={flyups} />

      {/* ─── Hero ─── */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{
          background: `linear-gradient(135deg, ${T.coral} 0%, #FF9547 50%, ${T.sunDeep} 100%)`,
          borderRadius: 28, padding: 18, position: 'relative', overflow: 'hidden',
          boxShadow: `0 10px 30px ${T.coral}40`,
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }}/>
          <div style={{
            marginTop: 0, padding: '12px 14px', borderRadius: 18,
            background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="32" height="32" viewBox="0 0 22 22">
              <circle cx="11" cy="11" r="10" fill="#FFE66D" stroke="#F5C83D" strokeWidth="1.5"/>
              <text x="11" y="14.5" textAnchor="middle" fontSize="9" fontWeight="900" fontFamily={T.fDisp} fill="#1A1423">K</text>
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.fBody, fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 1 }}>МОНЕТ ЗА СЕГОДНЯ</div>
              <div style={{ fontFamily: T.fNum, fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1, marginTop: 2 }}>
                +<AnimatedNum value={coinsPreview} duration={500}/>
              </div>
            </div>
            {isLocked && (
              <div style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.2)', color: '#fff', fontFamily: T.fDisp, fontSize: 11, fontWeight: 900 }}>🔒 Закрыт</div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Room ─── */}
      {fillMode >= 2 && (
        <FillSection title="Комната" icon="🏠" sub={`${Object.values(roomItems).filter(Boolean).length}/${ROOM_ITEM_LABELS.length}`}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ROOM_ITEM_LABELS.map(({ key, emoji, label }) => {
              const on = roomItems[key]
              return (
                <button key={key} onClick={() => { toggleRoomItem(key); if (!on) triggerConfetti() }} disabled={isLocked} style={{
                  height: 48, padding: '0 14px', borderRadius: 24,
                  background: on ? T.tealSoft : '#fff',
                  border: on ? `2px solid ${T.teal}` : `1.5px solid ${T.line}`,
                  display: 'flex', alignItems: 'center', gap: 8, cursor: isLocked ? 'not-allowed' : 'pointer',
                  fontFamily: T.fDisp, fontSize: 13, fontWeight: 800, color: T.ink,
                  boxShadow: on ? `0 4px 12px ${T.teal}30` : '0 2px 6px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 18 }}>{emoji}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                  {on && <span style={{ width: 22, height: 22, borderRadius: 11, background: T.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>}
                </button>
              )
            })}
          </div>
          {/* Photo proof */}
          {proofLocalUrl ? (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={proofLocalUrl} alt="Фото" style={{ width: 60, height: 60, borderRadius: 14, objectFit: 'cover', border: `2px solid ${T.teal}` }}/>
              <div>
                <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.teal, fontWeight: 700 }}>Фото приложено ✓</div>
                <button onClick={handleProofRetake} style={{ fontFamily: T.fBody, fontSize: 11, color: T.coral, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>Переснять</button>
              </div>
            </div>
          ) : (
            <button onClick={() => proofInputRef.current?.click()} disabled={isLocked} style={{
              marginTop: 10, height: 44, width: '100%', borderRadius: 22,
              background: '#fff', border: `1.5px dashed ${T.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: T.fDisp, fontSize: 13, fontWeight: 800,
              color: T.ink3, cursor: isLocked ? 'not-allowed' : 'pointer',
            }}>📸 Сфотографировать комнату</button>
          )}
          <input ref={proofInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleProofCapture}/>
        </FillSection>
      )}

      {/* ─── Mood ─── */}
      <FillSection title="Настроение" icon="✨">
        <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
          {MOOD_OPTIONS.map(m => {
            const on = mood === m.key
            return (
              <button key={m.key} onClick={() => !isLocked && setMood(prev => prev === m.key ? null : m.key)} disabled={isLocked} style={{
                flex: 1, height: 72, borderRadius: 20, cursor: isLocked ? 'not-allowed' : 'pointer',
                background: on ? `${m.color}22` : '#fff',
                border: on ? `2px solid ${m.color}` : `1.5px solid ${T.line}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                boxShadow: on ? `0 4px 14px ${m.color}40` : '0 2px 6px rgba(0,0,0,0.03)',
                transform: on ? 'translateY(-2px)' : 'none', transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: 26 }}>{m.emoji}</div>
                <div style={{ fontFamily: T.fDisp, fontSize: 10, fontWeight: 800, color: on ? m.color : T.ink3 }}>{m.label}</div>
              </button>
            )
          })}
        </div>
      </FillSection>

      {/* ─── Extra activities ─── */}
      {activities.length > 0 && (
        <FillSection title="Доп. занятия" icon="⭐">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activities.map(act => {
              const checked = checkedActivities.has(act.id)
              return (
                <button key={act.id} onClick={() => { toggleActivity(act.id); if (!checked) triggerConfetti() }} disabled={isLocked} style={{
                  height: 48, padding: '0 14px', borderRadius: 24,
                  background: checked ? T.tealSoft : '#fff',
                  border: checked ? `2px solid ${T.teal}` : `1.5px solid ${T.line}`,
                  display: 'flex', alignItems: 'center', gap: 8, cursor: isLocked ? 'not-allowed' : 'pointer',
                  fontFamily: T.fDisp, fontSize: 13, fontWeight: 800, color: T.ink,
                  transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 18 }}>{act.emoji ?? '⭐'}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{act.name}</span>
                  {act.coins > 0 && <span style={{ fontFamily: T.fNum, fontSize: 12, color: checked ? T.tealDeep : T.ink3, fontWeight: 800 }}>+{act.coins}🪙</span>}
                  {checked && <span style={{ width: 22, height: 22, borderRadius: 11, background: T.teal, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>}
                </button>
              )
            })}
          </div>
        </FillSection>
      )}

      {/* ─── Grades ─── */}
      {fillMode >= 3 && dayType === 'school' && subjects.length > 0 && (
        <FillSection title="Оценки за сегодня" icon="📚" sub="Школа">
          <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, marginBottom: 10, lineHeight: 1.4 }}>
            Можно ставить несколько оценок по одному предмету. <b style={{ color: T.coral }}>📱 Цифр</b> — задание с приставкой.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {subjects.map(sub => {
              const entries = kidGrades[sub.name] ?? []
              const gradeEntries = entries.filter(e => e.grade !== null)
              return (
                <div key={sub.id} style={{
                  background: '#fff', borderRadius: 20, padding: 14,
                  border: `1.5px solid ${T.line}`, boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: T.plumSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📝</div>
                    <span style={{ flex: 1, fontFamily: T.fDisp, fontSize: 14, fontWeight: 800, color: T.ink }}>{sub.name}</span>
                    {gradeEntries.length > 0 && (
                      <span style={{ padding: '2px 8px', borderRadius: 999, background: T.coralSoft, fontFamily: T.fNum, fontSize: 11, fontWeight: 800, color: T.coralDeep }}>
                        {gradeEntries.length} {gradeEntries.length === 1 ? 'оценка' : 'оценок'}
                      </span>
                    )}
                  </div>
                  {/* Grade picker for each unsaved entry */}
                  {entries.map((entry, idx) => (
                    <div key={idx}>
                      {!entry.saved && (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                          {[2, 3, 4, 5].map(g => {
                            const colors: Record<number, string> = { 5: T.teal, 4: '#95E1B4', 3: T.sunDeep, 2: '#FF8FB1' }
                            const c = colors[g]
                            const on = entry.grade === g
                            return (
                              <button key={g} disabled={isLocked} onClick={() => setKidGrades(prev => ({ ...prev, [sub.name]: prev[sub.name].map((e, i) => i === idx ? { ...e, grade: e.grade === g ? null : g } : e) }))} style={{
                                width: 38, height: 38, borderRadius: 19, cursor: isLocked ? 'not-allowed' : 'pointer',
                                background: on ? c : '#fff', border: on ? `2px solid ${c}` : `1.5px solid ${T.line}`,
                                fontFamily: T.fDisp, fontSize: 16, fontWeight: 900, color: on ? '#fff' : T.ink, padding: 0,
                                boxShadow: on ? `0 3px 10px ${c}55` : 'none', transition: 'all 0.15s',
                              }}>{g}</button>
                            )
                          })}
                          <button disabled={isLocked} onClick={() => setKidGrades(prev => ({ ...prev, [sub.name]: prev[sub.name].map((e, i) => i === idx ? { ...e, isDigital: !e.isDigital } : e) }))} style={{
                            height: 30, padding: '0 10px', borderRadius: 15, border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
                            background: entry.isDigital ? T.coral : T.lineSoft,
                            color: entry.isDigital ? '#fff' : T.ink3,
                            fontFamily: T.fDisp, fontSize: 11, fontWeight: 800,
                          }}>📱 Цифр</button>
                          {entries.filter(e => !e.saved).length > 1 && (
                            <button onClick={() => setKidGrades(prev => ({ ...prev, [sub.name]: prev[sub.name].filter((_, i) => i !== idx) }))} style={{
                              width: 26, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                              background: 'transparent', color: T.ink3, fontSize: 16, lineHeight: '1', padding: 0,
                            }}>×</button>
                          )}
                        </div>
                      )}
                      {entry.saved && entry.grade !== null && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: T.lineSoft, marginRight: 6, marginBottom: 4 }}>
                          <span style={{ fontFamily: T.fDisp, fontSize: 13, fontWeight: 900, color: entry.grade >= 4 ? T.tealDeep : entry.grade === 3 ? T.sunDeep : T.coral }}>{entry.grade}</span>
                          {entry.isDigital && <span style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3 }}>📱</span>}
                          <span style={{ fontFamily: T.fBody, fontSize: 10, color: T.teal, fontWeight: 700 }}>✓</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {!isLocked && (
                    <button onClick={() => setKidGrades(prev => ({ ...prev, [sub.name]: [...(prev[sub.name] ?? []), { grade: null, isDigital: false, saved: false }] }))} style={{
                      height: 30, padding: '0 14px', borderRadius: 15, border: `1.5px dashed ${T.line}`,
                      background: 'transparent', cursor: 'pointer',
                      fontFamily: T.fBody, fontSize: 12, color: T.coral, fontWeight: 700,
                    }}>+ ещё оценка</button>
                  )}
                </div>
              )
            })}
          </div>
        </FillSection>
      )}

      {/* ─── Exercises ─── */}
      {exerciseTypes.length > 0 && (
        <FillSection title="Упражнения" icon="💪" sub="Дома">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exerciseTypes.map(et => {
              const active = exercises.find(e => e.exercise_type_id === et.id)
              return (
                <div key={et.id} style={{
                  background: '#fff', borderRadius: 20, padding: '12px 14px',
                  border: active ? `2px solid ${T.teal}` : `1.5px solid ${T.line}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 12, background: active ? T.tealSoft : T.lineSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💪</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.fDisp, fontSize: 14, fontWeight: 800, color: T.ink }}>{et.name}</div>
                      <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 600 }}>{et.unit}</div>
                    </div>
                    <button onClick={() => { if (!isLocked && active && (active.quantity ?? 0) > 0) updateExerciseQuantity(et.id, (active.quantity ?? 1) - 1) }} style={{
                      width: 32, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer',
                      background: T.lineSoft, fontSize: 18, fontWeight: 900, color: T.ink, padding: 0, lineHeight: '1',
                    }}>−</button>
                    <button onClick={() => {
                      if (isLocked) return
                      if (!active) {
                        toggleExercise(et.id)
                        setTimeout(() => updateExerciseQuantity(et.id, 1), 0)
                      } else {
                        updateExerciseQuantity(et.id, (active.quantity ?? 0) + 1)
                      }
                    }} style={{
                      width: 32, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer',
                      background: T.coral, color: '#fff', fontSize: 18, fontWeight: 900, padding: 0, lineHeight: '1',
                    }}>+</button>
                    <div style={{
                      minWidth: 52, height: 32, borderRadius: 16,
                      background: active ? T.teal : T.lineSoft, color: active ? '#fff' : T.ink,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: T.fNum, fontSize: 14, fontWeight: 800, padding: '0 8px',
                    }}>{active?.quantity ?? 0}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </FillSection>
      )}

      {/* ─── Clubs / Sections ─── */}
      {sections.length > 0 && (
        <FillSection title="Секции" icon="🏆" sub="Тренер">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sections.map(section => {
              const attended = section.visit?.attended ?? false
              const note = sectionNotes[section.id] ?? { progress: '', coachRating: null }
              return (
                <div key={section.id} style={{
                  background: '#fff', borderRadius: 22, padding: 14,
                  border: attended ? `2px solid ${T.coral}` : `1.5px solid ${T.line}`,
                  boxShadow: attended ? `0 6px 18px ${T.coral}20` : '0 2px 8px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: T.coralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏅</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.fDisp, fontSize: 15, fontWeight: 900, color: T.ink }}>{section.name}</div>
                    </div>
                    <button onClick={() => !isLocked && toggleSectionAttended(section.id)} style={{
                      height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
                      background: attended ? T.coral : T.lineSoft, color: attended ? '#fff' : T.ink,
                      fontFamily: T.fDisp, fontSize: 12, fontWeight: 800,
                    }}>{attended ? '✓ Был' : 'Был?'}</button>
                  </div>
                  {attended && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 16, background: T.lineSoft, border: `1px solid ${T.line}` }}>
                      <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>Оценка тренера</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[1, 2, 3, 4, 5].map(s => {
                          const on = s <= (note.coachRating ?? 0)
                          return (
                            <button key={s} onClick={() => !isLocked && updateSectionCoachRating(section.id, note.coachRating === s ? null : s)} style={{
                              flex: 1, height: 38, borderRadius: 12, border: on ? 'none' : `1.5px solid ${T.line}`,
                              background: on ? T.coral : '#fff', cursor: isLocked ? 'not-allowed' : 'pointer',
                              fontSize: 20, padding: 0, transition: 'all 0.15s',
                            }}>{on ? '⭐' : '☆'}</button>
                          )
                        })}
                      </div>
                      {note.coachRating && (
                        <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.coral, fontWeight: 700, marginTop: 6, textAlign: 'center' }}>
                          {note.coachRating === 5 ? '+25🪙' : note.coachRating === 4 ? '+15🪙' : note.coachRating === 3 ? '+5🪙' : note.coachRating === 2 ? '-3🪙' : '-10🪙'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </FillSection>
      )}

      {/* ─── Reading ─── */}
      <FillSection title="Чтение" icon="📖" sub="Каждый день">
        <div style={{
          background: '#fff', borderRadius: 22, padding: 14,
          border: readingActive ? `2px solid ${T.plum}` : `1.5px solid ${T.line}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: readingActive ? 14 : 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: T.plumSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📖</div>
            <span style={{ flex: 1, fontFamily: T.fDisp, fontSize: 14, fontWeight: 800, color: T.ink }}>Читал сегодня?</span>
            <button onClick={() => !isLocked && setReadingActive(v => !v)} style={{
              height: 34, padding: '0 14px', borderRadius: 17, border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
              background: readingActive ? T.teal : T.lineSoft, color: readingActive ? '#fff' : T.ink,
              fontFamily: T.fDisp, fontSize: 12, fontWeight: 800,
            }}>{readingActive ? '✓ Читал' : 'Читал'}</button>
          </div>
          {readingActive && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={reading.bookTitle} onChange={e => setReading(r => ({ ...r, bookTitle: e.target.value }))} disabled={isLocked} placeholder="Название книги" style={{
                height: 44, padding: '0 16px', borderRadius: 22,
                border: `1.5px solid ${T.line}`, background: T.lineSoft,
                fontFamily: T.fBody, fontSize: 14, color: T.ink, outline: 'none', width: '100%', boxSizing: 'border-box',
              }}/>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {(['pagesRead', 'minutesRead', 'currentPage'] as const).map((field, fi) => {
                  const labels = ['Страниц', 'Минут', 'Закладка']
                  return (
                    <div key={field} style={{ borderRadius: 16, background: T.lineSoft, border: `1.5px solid ${T.line}`, padding: '6px 10px' }}>
                      <div style={{ fontFamily: T.fBody, fontSize: 9, color: T.ink3, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{labels[fi]}</div>
                      <input type="number" inputMode="numeric" min="0" value={reading[field] || ''} disabled={isLocked}
                        onChange={e => setReading(r => ({ ...r, [field]: e.target.value }))} placeholder="0"
                        style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontFamily: T.fNum, fontSize: 18, fontWeight: 800, color: T.ink, padding: 0 }}/>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => { if (!isLocked) { setReading(r => ({ ...r, bookFinished: !r.bookFinished })); if (!reading.bookFinished) triggerConfetti() } }} style={{
                height: 48, borderRadius: 24, border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
                background: reading.bookFinished ? `linear-gradient(135deg, ${T.sun}, ${T.sunDeep})` : T.lineSoft,
                color: reading.bookFinished ? T.ink : T.ink2,
                fontFamily: T.fDisp, fontSize: 13, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                🏆 {reading.bookFinished ? 'Дочитал книгу до конца! +50🪙' : 'Дочитал книгу до конца?'}
              </button>
            </div>
          )}
        </div>
      </FillSection>

      {/* ─── Save button ─── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ textAlign: 'center', fontFamily: T.fBody, fontSize: 12, color: T.ink3, marginBottom: 10 }}>
          Мы доверяем тебе ✨ Родители проверят запись.
        </div>
        {isLocked ? (
          <div style={{ textAlign: 'center', fontFamily: T.fBody, fontSize: 14, color: T.ink3, padding: '16px 0' }}>🔒 День закрыт для редактирования</div>
        ) : (
          <button onClick={handleSubmit} disabled={saving} style={{
            width: '100%', height: 58, borderRadius: 29, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            background: `linear-gradient(135deg, ${T.coral}, #FF9547)`,
            color: '#fff', fontFamily: T.fDisp, fontSize: 17, fontWeight: 900, letterSpacing: 0.3,
            boxShadow: `0 8px 22px ${T.coral}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? (
              <>
                <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
                Сохраняем…
              </>
            ) : (
              `✨ Сохранить день · +${coinsPreview} монет`
            )}
          </button>
        )}
      </div>
    </div>
  )
}
