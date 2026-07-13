'use client'

import { useState, useEffect, useCallback } from 'react'
import { useT } from '@/lib/i18n'
import { api } from '@/lib/api'
import { flexibleApi, Subject, ExerciseType } from '@/lib/flexible-api'
import { getSectionsForDate, markSectionVisit, Section, SectionVisit, ExtraActivity, getActivitiesForDay, getActivityLogs, saveActivityLogs } from '@/lib/expenses-api'
import { checkAndAwardBadges } from '@/lib/badges'
import { getGradeColor } from '@/utils/helpers'
import { triggerConfetti } from '@/utils/confetti'
import { useAppStore } from '@/lib/store'
import {
  getVacationPeriods,
  getReadingLog,
  saveReadingLog,
  VacationPeriod,
} from '@/lib/vacation-api'
import {
  getDayType,
  DayTypeInfo,
  isNonSchoolDay,
  calcReadingCoins,
  calcHomeHelpCoins,
  readingCoinHint,
} from '@/lib/day-type'
import { PhotoLightbox } from '@/components/chat/PhotoLightbox'
import { track } from '@/lib/analytics'
import { supabase } from '@/lib/supabase'
import { getRoomTasks, getRoomChecks, saveRoomChecks } from '@/lib/repositories/room.repo'
import type { RoomTask, RoomLegacyKey } from '@/lib/models/room.types'

// ─── Local Types ──────────────────────────────────────────────────────────────

interface SubjectGrade {
  id?: string
  subject: string
  subject_id?: string | null
  grade: number
  note: string
}

interface ExerciseEntry {
  exercise_type_id: string
  exercise_name: string
  quantity: number | null
  unit: string
}

interface DailyModalProps {
  isOpen: boolean
  onClose: () => void
  childId: string
  date: string
  onSave?: () => void
}

// ─── Day type style helpers ───────────────────────────────────────────────────

const DAY_TYPE_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  vacation: {
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    text: '#F59E0B',
    badge: 'linear-gradient(135deg,#F59E0B,#FCD34D)',
  },
  weekend: {
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.25)',
    text: '#8B5CF6',
    badge: 'linear-gradient(135deg,#8B5CF6,#C4B5FD)',
  },
  sick: {
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.25)',
    text: '#F43F5E',
    badge: 'linear-gradient(135deg,#F43F5E,#FDA4AF)',
  },
  school: {
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    text: '#3B82F6',
    badge: 'linear-gradient(135deg,#3B82F6,#93C5FD)',
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyModal({ isOpen, onClose, childId, date, onSave }: DailyModalProps) {
  const t = useT()
  const { familyId } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(false)

  // Day type
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([])
  const [dayTypeInfo, setDayTypeInfo] = useState<DayTypeInfo>({ type: 'school', label: 'School', emoji: '📚' })
  const [isSick, setIsSick] = useState(false)

  // Справочники
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([])
  const [scheduleForToday, setScheduleForToday] = useState<any[]>([])

  // УЧЁБА (school days)
  const [grades, setGrades] = useState<SubjectGrade[]>([])
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddSubject, setQuickAddSubject] = useState('')
  const [quickAddGrade, setQuickAddGrade] = useState(5)
  const [showSchedulePanel, setShowSchedulePanel] = useState(false)
  const [scheduleGrades, setScheduleGrades] = useState<{ [key: string]: number }>({})

  // КОМНАТА — data-driven checklist from room_tasks (active, sort_order asc);
  // roomChecked is keyed by task id.
  const [roomTasks, setRoomTasks] = useState<RoomTask[]>([])
  const [roomChecked, setRoomChecked] = useState<Record<string, boolean>>({})
  const [roomProofUrl, setRoomProofUrl] = useState<string | null>(null)
  const [lightboxProofUrl, setLightboxProofUrl] = useState<string | null>(null)

  // ДЕНЬ
  const [goodBehavior, setGoodBehavior] = useState(true)
  const [diaryNotDone, setDiaryNotDone] = useState(false)
  const [dayNote, setDayNote] = useState('')

  // СПОРТ
  const [exercises, setExercises] = useState<ExerciseEntry[]>([])
  const [sportNote, setSportNote] = useState('')

  // СЕКЦИИ
  const [sections, setSections] = useState<(Section & { visit?: SectionVisit })[]>([])
  const [sectionNotes, setSectionNotes] = useState<{ [key: string]: { progress: string; feedback: string; coachRating: number | null } }>({})

  // ЧТЕНИЕ (vacation + weekend)
  const [bookTitle, setBookTitle] = useState('')
  const [pagesRead, setPagesRead] = useState(0)
  const [minutesRead, setMinutesRead] = useState(0)
  const [bookFinished, setBookFinished] = useState(false)
  const [readingNote, setReadingNote] = useState('')

  // ДОП. ЗАНЯТИЯ — catalog-based, pre-filtered by getActivitiesForDay
  const [activities, setActivities] = useState<ExtraActivity[]>([])
  const [activityDone, setActivityDone] = useState<Record<string, boolean>>({})
  const [activityNote, setActivityNote] = useState<Record<string, string>>({})
  const [activityPages, setActivityPages] = useState<Record<string, number>>({})
  const [activityDuration, setActivityDuration] = useState<Record<string, number>>({})
  const [activityRating, setActivityRating] = useState<Record<string, number>>({})
  const [activityBookmark, setActivityBookmark] = useState<Record<string, number>>({})

  // ПОМОЩЬ ПО ДОМУ (vacation + weekend)
  const [homeHelp, setHomeHelp] = useState(false)
  const [homeHelpNote, setHomeHelpNote] = useState('')

  // ДОМАШНЕЕ ЗАДАНИЕ (weekend only)
  const [homeworkDone, setHomeworkDone] = useState(false)

  // ─── Load / Reset ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) loadData()
    else resetForm()
  }, [isOpen, date, childId])

  // Recompute day type when isSick or vacationPeriods change
  useEffect(() => {
    setDayTypeInfo(getDayType(date, isSick, vacationPeriods, childId, t))
  }, [isSick, vacationPeriods, date, childId])

  async function loadData() {
    try {
      setLoading(true)

      // Load vacation periods first (needed for day type)
      let periods: VacationPeriod[] = []
      try { periods = await getVacationPeriods(familyId ?? 'default') } catch { periods = [] }
      setVacationPeriods(periods)

      let subjectsData: Subject[] = []
      let exerciseTypesData: ExerciseType[] = []

      try { subjectsData = await flexibleApi.getActiveSubjects(childId) } catch { subjectsData = [] }
      try { exerciseTypesData = await flexibleApi.getExerciseTypes() } catch { exerciseTypesData = [] }

      setSubjects(subjectsData)
      setExerciseTypes(exerciseTypesData)

      const d = new Date(date)
      const dayOfWeek = d.getDay()
      const actualDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek

      if (actualDayOfWeek >= 1 && actualDayOfWeek <= 5) {
        try {
          const schedule = await flexibleApi.getScheduleForDay(childId, actualDayOfWeek)
          setScheduleForToday(schedule)
        } catch { setScheduleForToday([]) }
      } else {
        setScheduleForToday([])
      }

      // Load existing day data
      let isSickLocal = false
      const legacyRoom: Record<RoomLegacyKey, boolean> = {
        bed: false, floor: false, desk: false, closet: false, trash: false,
      }
      try {
        const dayData = await api.getDay(childId, date)
        if (dayData) {
          legacyRoom.bed = dayData.room_bed ?? false
          legacyRoom.floor = dayData.room_floor ?? false
          legacyRoom.desk = dayData.room_desk ?? false
          legacyRoom.closet = dayData.room_closet ?? false
          legacyRoom.trash = dayData.room_trash ?? false
          setRoomProofUrl(dayData.room_proof_url ?? null)
          setGoodBehavior(dayData.good_behavior)
          setDiaryNotDone(dayData.diary_not_done)
          setDayNote(dayData.note_child || '')
          isSickLocal = dayData.is_sick ?? false
          setIsSick(isSickLocal)
          setHomeHelp(dayData.home_help ?? false)
          setHomeHelpNote(dayData.home_help_note || '')
          setHomeworkDone(dayData.homework_done ?? false)
        }
      } catch {}

      // Room checklist — active room_tasks for the child's family (replaces the
      // hardcoded 5-item array). Pre-fill from room_checks; when no room_checks
      // rows exist (legacy-only saved day), fall back to the days.room_*
      // booleans mapped via each task's legacy_key.
      try {
        const { data: childRow } = await supabase
          .from('children')
          .select('family_id')
          .eq('id', childId)
          .maybeSingle()
        const roomFamilyId = (childRow?.family_id as string | undefined) ?? familyId ?? undefined
        if (roomFamilyId) {
          const tasks = await getRoomTasks(roomFamilyId)
          setRoomTasks(tasks)
          const initialChecked: Record<string, boolean> = {}
          const checks = await getRoomChecks(childId, date)
          if (checks.length > 0) {
            tasks.forEach(task => { initialChecked[task.id] = false })
            checks.forEach(c => { initialChecked[c.task_id] = c.done })
          } else {
            tasks.forEach(task => {
              initialChecked[task.id] = task.legacy_key ? legacyRoom[task.legacy_key] : false
            })
          }
          setRoomChecked(initialChecked)
        }
      } catch {}

      // Grades
      try {
        const existingGrades = await api.getSubjectGradesForDate(childId, date)
        setGrades(existingGrades.map(g => ({ id: g.id, subject: g.subject, subject_id: g.subject_id, grade: g.grade, note: g.note || '' })))
      } catch { setGrades([]) }

      // Exercises
      try {
        const homeExercises = await flexibleApi.getHomeExercises(childId, date)
        setExercises(homeExercises.map(ex => ({
          exercise_type_id: ex.exercise_type_id,
          exercise_name: ex.exercise_type?.name || '',
          quantity: ex.quantity,
          unit: ex.exercise_type?.unit || t('dailyModal.unit')
        })))
      } catch { setExercises([]) }

      try {
        const sport = await api.getHomeSportForDate(childId, date)
        if (sport) setSportNote(sport.note || '')
      } catch {}

      // Sections
      try {
        const sectionsData = await getSectionsForDate(childId, date)
        setSections(sectionsData)
        const notes: { [key: string]: { progress: string; feedback: string; coachRating: number | null } } = {}
        sectionsData.forEach(section => {
          if (section.visit) {
            notes[section.id] = { progress: section.visit.progress_note || '', feedback: section.visit.trainer_feedback || '', coachRating: null }
          }
        })
        setSectionNotes(notes)
      } catch { setSections([]) }

      // Reading log
      try {
        const readingData = await getReadingLog(childId, date)
        if (readingData) {
          setBookTitle(readingData.book_title)
          setPagesRead(readingData.pages_read)
          setMinutesRead(readingData.minutes_read)
          setBookFinished(readingData.book_finished)
          setReadingNote(readingData.note || '')
        }
      } catch {}

      // Extra activities — pre-filtered by date/dayType/days_of_week
      try {
        const localDayType = getDayType(date, isSickLocal, periods, childId, t).type
        const [activitiesData, logsData] = await Promise.all([
          getActivitiesForDay(childId, date, localDayType),
          getActivityLogs(childId, date),
        ])
        setActivities(activitiesData)
        const doneMap: Record<string, boolean> = {}
        const noteMap: Record<string, string> = {}
        const pagesMap: Record<string, number> = {}
        const durationMap: Record<string, number> = {}
        const ratingMap: Record<string, number> = {}
        const bookmarkMap: Record<string, number> = {}
        logsData.forEach(l => {
          doneMap[l.activity_id] = l.done
          noteMap[l.activity_id] = l.note || ''
          if (l.quantity_done != null) pagesMap[l.activity_id] = l.quantity_done
          if (l.duration_minutes != null) durationMap[l.activity_id] = l.duration_minutes
          if (l.rating != null) ratingMap[l.activity_id] = l.rating
          if (l.bookmark_page != null) bookmarkMap[l.activity_id] = l.bookmark_page
        })
        setActivityDone(doneMap)
        setActivityNote(noteMap)
        setActivityPages(pagesMap)
        setActivityDuration(durationMap)
        setActivityRating(ratingMap)
        setActivityBookmark(bookmarkMap)
      } catch {}

    } catch (err) {
      console.error('[DailyModal] Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setGrades([])
    setShowSchedulePanel(false)
    setScheduleGrades({})
    setShowQuickAdd(false)
    setQuickAddSubject('')
    setQuickAddGrade(5)
    setRoomTasks([]); setRoomChecked({})
    setGoodBehavior(true); setDiaryNotDone(false); setDayNote('')
    setExercises([]); setSportNote('')
    setSections([]); setSectionNotes({})
    setIsSick(false); setHomeHelp(false); setHomeHelpNote(''); setHomeworkDone(false)
    setBookTitle(''); setPagesRead(0); setMinutesRead(0); setBookFinished(false); setReadingNote('')
    setActivities([]); setActivityDone({}); setActivityNote({})
    setActivityPages({}); setActivityDuration({}); setActivityRating({}); setActivityBookmark({})
    setStatus(''); setError(false)
  }

  // ─── Grade handlers ────────────────────────────────────────────────────────

  function updateGradeInline(index: number, newGrade: number) {
    const updated = [...grades]; updated[index].grade = newGrade; setGrades(updated)
  }
  function updateNoteInline(index: number, newNote: string) {
    const updated = [...grades]; updated[index].note = newNote; setGrades(updated)
  }
  function removeGrade(index: number) { setGrades(grades.filter((_, i) => i !== index)) }

  function handleQuickAddGrade() {
    if (!quickAddSubject) return
    const subject = subjects.find(s => s.id === quickAddSubject)
    if (!subject) return
    setGrades([...grades, { subject: subject.name, subject_id: subject.id, grade: quickAddGrade, note: '' }])
    setQuickAddSubject(''); setQuickAddGrade(5); setShowQuickAdd(false)
  }

  function openSchedulePanel() {
    if (scheduleForToday.length === 0) { alert(t('dailyModal.noSchedule')); return }
    const initialGrades: { [key: string]: number } = {}
    scheduleForToday.forEach(lesson => { initialGrades[lesson.subject.id] = 5 })
    setScheduleGrades(initialGrades); setShowSchedulePanel(true)
  }

  function addFromSchedule() {
    const newGrades: SubjectGrade[] = scheduleForToday.map(lesson => ({
      subject: lesson.subject.name, subject_id: lesson.subject.id,
      grade: scheduleGrades[lesson.subject.id] || 5, note: ''
    }))
    setGrades([...grades, ...newGrades]); setShowSchedulePanel(false); setScheduleGrades({})
  }

  // ─── Exercise / Section handlers ──────────────────────────────────────────

  function toggleExercise(exerciseTypeId: string) {
    const exists = exercises.find(e => e.exercise_type_id === exerciseTypeId)
    if (exists) {
      setExercises(exercises.filter(e => e.exercise_type_id !== exerciseTypeId))
    } else {
      const exerciseType = exerciseTypes.find(et => et.id === exerciseTypeId)
      if (exerciseType) {
        setExercises([...exercises, { exercise_type_id: exerciseType.id, exercise_name: exerciseType.name, quantity: null, unit: exerciseType.unit }])
      }
    }
  }

  function updateQuantity(exerciseTypeId: string, quantity: number | null) {
    setExercises(exercises.map(e => e.exercise_type_id === exerciseTypeId ? { ...e, quantity } : e))
  }

  function toggleSectionAttended(sectionId: string) {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        if (section.visit) {
          return { ...section, visit: { ...section.visit, attended: !section.visit.attended } }
        } else {
          return { ...section, visit: { id: '', section_id: sectionId, date, attended: true, progress_note: null, trainer_feedback: null, created_at: '' } as SectionVisit }
        }
      }
      return section
    }))
  }

  function updateSectionNote(sectionId: string, field: 'progress' | 'feedback', value: string) {
    setSectionNotes(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], [field]: value } }))
  }
  function updateSectionRating(sectionId: string, rating: number | null) {
    setSectionNotes(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], coachRating: rating } }))
  }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    try {
      setSaving(true); setStatus(t('dailyModal.saving')); setError(false)

      const dayType = dayTypeInfo.type
      const isSickDay = dayType === 'sick'

      // Dual-write (CONTEXT decision 3): every rendered task gets a room_checks
      // row; tasks with a legacy_key ALSO drive the matching days.room_* column
      // so the room_score trigger/room_ok/analytics/wallboard keep working.
      // All 5 legacy keys are set explicitly (default false) — a legacy-mapped
      // task not currently rendered (e.g. deactivated) writes false rather than
      // letting saveDay's fallback-merge resurrect a stale prior value.
      const legacyDone: Record<RoomLegacyKey, boolean> = {
        bed: false, floor: false, desk: false, closet: false, trash: false,
      }
      roomTasks.forEach(task => {
        if (task.legacy_key) legacyDone[task.legacy_key] = roomChecked[task.id] ?? false
      })

      const saveDay = api.saveDay({
        childId, date,
        roomBed: legacyDone.bed,
        roomFloor: legacyDone.floor,
        roomDesk: legacyDone.desk,
        roomCloset: legacyDone.closet,
        roomTrash: legacyDone.trash,
        // On sick days, don't penalize room/behavior
        goodBehavior: isSickDay ? true : goodBehavior,
        diaryNotDone,
        noteChild: dayNote,
        isSick,
        homeHelp,
        homeHelpNote,
        homeworkDone,
      })

      const saveGrades = Promise.all(
        grades.map(grade => api.saveSubjectGrade({ childId, date, subject: grade.subject, subjectId: grade.subject_id || undefined, grade: grade.grade, note: grade.note }))
      )

      const saveExercises = Promise.all(
        exercises.map(exercise => flexibleApi.saveHomeExercise(childId, date, exercise.exercise_type_id, exercise.quantity, sportNote))
      )

      const saveSections = Promise.all(
        sections.filter(s => s.visit).map(section => {
          const notes = sectionNotes[section.id] || { progress: '', feedback: '', coachRating: null }
          return markSectionVisit(section.id, date, section.visit!.attended, notes.progress || undefined, notes.feedback || undefined, notes.coachRating)
        })
      )

      // Save reading log for any day type when a book title is provided
      const nonSchool = isNonSchoolDay(dayType) || isSickDay
      const saveReading = bookTitle.trim()
        ? saveReadingLog({ child_id: childId, date, book_title: bookTitle, pages_read: pagesRead, minutes_read: minutesRead, book_finished: bookFinished, note: readingNote })
        : Promise.resolve()

      // Save activity logs — activities already pre-filtered by getActivitiesForDay
      const saveActivities = activities.length > 0
        ? saveActivityLogs(childId, date, activities.map(a => ({
            activityId: a.id,
            done: activityDone[a.id] ?? false,
            note: activityNote[a.id] || undefined,
            quantityDone: activityPages[a.id] ?? undefined,
            durationMinutes: activityDuration[a.id] ?? undefined,
            rating: activityRating[a.id] ?? undefined,
            bookmarkPage: activityBookmark[a.id] ?? undefined,
          })))
        : Promise.resolve()

      // Dual-write (a): room_checks — one row per rendered task, done/not-done.
      const saveRoom = roomTasks.length > 0
        ? saveRoomChecks(childId, date, roomTasks.map(task => ({
            taskId: task.id,
            done: roomChecked[task.id] ?? false,
          })))
        : Promise.resolve()

      await Promise.all([saveDay, saveGrades, saveExercises, saveSections, saveReading, saveActivities, saveRoom])

      // Credit all coin awards server-side (idempotent). The server recomputes
      // amounts from the saved rows — grades, room, behavior, sport, activities,
      // book, streak bonus (REQ-COIN-002..008) — so no coins are granted from
      // the client. It also updates the streak counts server-side (admin
      // client) and returns streakEvents — no browser streak write remains.
      try {
        const res = await fetch('/api/wallet/award', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId, date }),
        })
        if (!res.ok) {
          console.warn('[DailyModal] award failed:', res.status)
        } else {
          track('day_saved', { role: 'parent' })
          const { streakEvents } = await res.json().catch(() => ({ streakEvents: undefined }))
          // Fire-and-forget: don't block save completion on push delivery
          import('@/app/actions/push-streaks').then(({ notifyStreakEvents }) => {
            notifyStreakEvents(childId, '', streakEvents ?? { broken: [], records: [] }).catch(() => {})
          })
        }
      } catch (e) {
        console.warn('[DailyModal] award request failed:', e)
      }

      const badges = await checkAndAwardBadges(childId, date)
      if (badges.length > 0) { triggerConfetti(); setStatus(t('dailyModal.savedBadge')) }
      else { setStatus(t('dailyModal.saved')) }

      if (onSave) onSave()
      setTimeout(() => { onClose() }, 1500)

    } catch (err) {
      const msg = err instanceof Error ? err.message
        : (err as any)?.message ?? (err as any)?.error_description ?? JSON.stringify(err)
      console.error('Save error:', err)
      setStatus(`❌ ${String(msg).slice(0, 150)}`); setError(true)
    } finally {
      setSaving(false)
    }
  }

  // ─── Coins preview (footer) ───────────────────────────────────────────────

  const readingCoins = calcReadingCoins(pagesRead, minutesRead, bookFinished)
  const activityCoins = activities
    .filter(a => activityDone[a.id])
    .reduce((sum, a) => sum + a.coins, 0)
  const helpCoins = calcHomeHelpCoins(homeHelp)
  const homeworkCoins = homeworkDone ? 5 : 0
  // Preview only — the server (/api/wallet/award) recomputes from room_checks
  // with the same threshold rule: max(1, ceil(0.6 * activeTaskCount)) → 3/5 for defaults.
  const roomScore = Object.values(roomChecked).filter(Boolean).length
  const roomTaskCount = roomTasks.length
  const roomOk = roomTaskCount > 0 && roomScore >= Math.max(1, Math.ceil(0.6 * roomTaskCount))
  const roomCoins = roomOk ? 3 : 0
  const behaviorCoins = (dayTypeInfo.type === 'sick' || goodBehavior) ? 5 : 0

  const GRADE_COINS: Record<number, number> = { 5: 5, 4: 3, 3: -3, 2: -5, 1: -10 }
  const gradeCoins = grades.reduce((sum, g) => sum + (GRADE_COINS[g.grade] ?? 0), 0)

  const dayType = dayTypeInfo.type
  const nonSchool = isNonSchoolDay(dayType) || dayType === 'sick'
  const styles = DAY_TYPE_STYLES[dayType] || DAY_TYPE_STYLES.school

  const totalCoins = nonSchool
    ? readingCoins + activityCoins + helpCoins + homeworkCoins + roomCoins + behaviorCoins
    : gradeCoins + roomCoins + behaviorCoins

  if (!isOpen) return null

  const formattedDate = new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })

  return (
    <div className="premium-modal-overlay" onClick={onClose}>
      <div className="premium-modal scroll-modal" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="premium-modal-header" style={{ borderBottom: `1px solid ${styles.border}` }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div className="premium-modal-title">{t('dailyModal.title')}</div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 800,
                background: styles.badge, color: dayType === 'school' || dayType === 'weekend' ? '#fff' : '#000',
              }}>
                {dayTypeInfo.emoji} {dayTypeInfo.label}
              </span>
            </div>
            <div className="premium-modal-subtitle">{formattedDate}</div>
          </div>
          <button className="premium-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="premium-loading">
            <div className="premium-spinner"></div>
            <div className="premium-loading-text">{t('dailyModal.loading')}</div>
          </div>
        ) : (
          <div className="scroll-modal-body">

            {/* ── Sick Day Banner ─────────────────────────────── */}
            {dayType === 'sick' && (
              <div className="scroll-section" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '12px', margin: '0 0 4px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>🤒</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#F43F5E' }}>{t('dailyModal.sickDay')}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(238,238,255,0.55)', marginTop: '2px' }}>
                      {t('dailyModal.sickDayNote')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ЧТЕНИЕ (all day types) ──────────── */}
            {(
              <div className="scroll-section">
                <div className="scroll-section-header" style={{ borderBottom: `1px solid ${styles.border}` }}>
                  <span className="scroll-section-icon">📚</span>
                  <span className="scroll-section-title">{t('dailyModal.reading')}</span>
                  {readingCoins > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', padding: '2px 8px', borderRadius: '20px' }}>
                      +{readingCoins}💰
                    </span>
                  )}
                </div>

                <div style={{ padding: '12px 0 0' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <div className="premium-label">{t('dailyModal.book')}</div>
                    <input
                      className="premium-input"
                      type="text"
                      placeholder={t('dailyModal.bookPlaceholder')}
                      value={bookTitle}
                      onChange={e => setBookTitle(e.target.value)}
                      style={{ fontSize: '14px', padding: '10px 12px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <div className="premium-label">{t('dailyModal.pages')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface,#0D0D1E)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                        <button
                          onClick={() => setPagesRead(Math.max(0, pagesRead - 5))}
                          style={{ width: 42, height: 44, background: 'rgba(255,255,255,0.04)', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}
                        >−</button>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 900 }}>{pagesRead}</div>
                          <div style={{ fontSize: '9px', color: 'rgba(238,238,255,0.4)', fontWeight: 700 }}>{t('dailyModal.pagesUnit')}</div>
                        </div>
                        <button
                          onClick={() => setPagesRead(pagesRead + 5)}
                          style={{ width: 42, height: 44, background: 'rgba(255,255,255,0.04)', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}
                        >+</button>
                      </div>
                    </div>
                    <div>
                      <div className="premium-label">{t('dailyModal.minutes')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface,#0D0D1E)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                        <button
                          onClick={() => setMinutesRead(Math.max(0, minutesRead - 5))}
                          style={{ width: 42, height: 44, background: 'rgba(255,255,255,0.04)', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}
                        >−</button>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 900 }}>{minutesRead}</div>
                          <div style={{ fontSize: '9px', color: 'rgba(238,238,255,0.4)', fontWeight: 700 }}>{t('dailyModal.minutesUnit')}</div>
                        </div>
                        <button
                          onClick={() => setMinutesRead(Math.min(120, minutesRead + 5))}
                          style={{ width: 42, height: 44, background: 'rgba(255,255,255,0.04)', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}
                        >+</button>
                      </div>
                    </div>
                  </div>

                  {/* Coin hint */}
                  {(pagesRead > 0 || minutesRead > 0) && (
                    <div style={{ padding: '8px 12px', background: styles.bg, border: `1px solid ${styles.border}`, borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: styles.text, marginBottom: '10px' }}>
                      🪙 {readingCoinHint(pagesRead, minutesRead, bookFinished)}
                    </div>
                  )}

                  {/* Book finished */}
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: '10px', cursor: 'pointer', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>{t('dailyModal.bookFinished')}</span>
                    <input type="checkbox" checked={bookFinished} onChange={e => setBookFinished(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#10B981' }} />
                  </label>

                  <textarea className="premium-textarea" placeholder={t('dailyModal.readingNote')} value={readingNote} onChange={e => setReadingNote(e.target.value)} rows={2} />
                </div>
              </div>
            )}

            {/* ── ДОП. ЗАНЯТИЯ (catalog-based, pre-filtered by getActivitiesForDay) ── */}
            {activities.length > 0 && (
              <div className="scroll-section">
                <div className="scroll-section-header" style={{ borderBottom: `1px solid ${styles.border}` }}>
                  <span className="scroll-section-icon">📋</span>
                  <span className="scroll-section-title">{t('dailyModal.extraActivities')}</span>
                  {activityCoins > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', padding: '2px 8px', borderRadius: '20px' }}>
                      +{activityCoins}💰
                    </span>
                  )}
                </div>
                <div style={{ padding: '12px 0 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activities.map(a => {
                    const done = activityDone[a.id] ?? false
                    const trackType = a.tracking_type || 'checkbox'
                    return (
                      <div
                        key={a.id}
                        style={{
                          padding: '10px 14px',
                          background: done ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.03)',
                          border: `1.5px solid ${done ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: '10px',
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={e => setActivityDone(prev => ({ ...prev, [a.id]: e.target.checked }))}
                            style={{ width: '18px', height: '18px', accentColor: '#10B981', flexShrink: 0 }}
                          />
                          <span style={{ fontSize: '18px', flexShrink: 0 }}>{a.emoji}</span>
                          <span style={{ flex: 1, fontSize: '13px', fontWeight: 800, color: done ? '#fff' : 'rgba(238,238,255,0.7)' }}>
                            {a.name}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 900, color: '#10B981', flexShrink: 0 }}>
                            +{a.coins}💰
                          </span>
                        </label>

                        {/* Tracking-type-specific inputs, shown when checked */}
                        {done && trackType === 'pages' && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 100px' }}>
                              <span style={{ fontSize: '11px', color: 'rgba(238,238,255,0.45)', whiteSpace: 'nowrap' }}>📄 стр.</span>
                              <input
                                className="premium-input"
                                type="number"
                                min={0}
                                placeholder="0"
                                value={activityPages[a.id] ?? ''}
                                onChange={e => setActivityPages(prev => ({ ...prev, [a.id]: parseInt(e.target.value) || 0 }))}
                                style={{ fontSize: '13px', padding: '6px 8px', width: '70px' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 100px' }}>
                              <span style={{ fontSize: '11px', color: 'rgba(238,238,255,0.45)', whiteSpace: 'nowrap' }}>⏱ мин.</span>
                              <input
                                className="premium-input"
                                type="number"
                                min={0}
                                placeholder="0"
                                value={activityDuration[a.id] ?? ''}
                                onChange={e => setActivityDuration(prev => ({ ...prev, [a.id]: parseInt(e.target.value) || 0 }))}
                                style={{ fontSize: '13px', padding: '6px 8px', width: '70px' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1 1 120px' }}>
                              <span style={{ fontSize: '11px', color: 'rgba(238,238,255,0.45)', whiteSpace: 'nowrap' }}>🔖 закл.</span>
                              <input
                                className="premium-input"
                                type="number"
                                min={0}
                                placeholder="0"
                                value={activityBookmark[a.id] ?? ''}
                                onChange={e => setActivityBookmark(prev => ({ ...prev, [a.id]: parseInt(e.target.value) || 0 }))}
                                style={{ fontSize: '13px', padding: '6px 8px', width: '70px' }}
                              />
                            </div>
                          </div>
                        )}

                        {done && trackType === 'duration' && (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'rgba(238,238,255,0.45)' }}>⏱ минут</span>
                            <input
                              className="premium-input"
                              type="number"
                              min={0}
                              placeholder="0"
                              value={activityDuration[a.id] ?? ''}
                              onChange={e => setActivityDuration(prev => ({ ...prev, [a.id]: parseInt(e.target.value) || 0 }))}
                              style={{ fontSize: '13px', padding: '6px 8px', width: '80px' }}
                            />
                          </div>
                        )}

                        {done && trackType === 'rating' && (
                          <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={() => setActivityRating(prev => ({ ...prev, [a.id]: star }))}
                                style={{
                                  flex: 1, padding: '6px', fontSize: '16px', borderRadius: '8px', border: '1px solid',
                                  borderColor: (activityRating[a.id] ?? 0) >= star ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.08)',
                                  background: (activityRating[a.id] ?? 0) >= star ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.03)',
                                  cursor: 'pointer',
                                }}
                              >
                                ⭐
                              </button>
                            ))}
                          </div>
                        )}

                        {done && (
                          <input
                            className="premium-input"
                            type="text"
                            placeholder={t('dailyModal.activityNotePlaceholder')}
                            value={activityNote[a.id] || ''}
                            onChange={e => setActivityNote(prev => ({ ...prev, [a.id]: e.target.value }))}
                            style={{ marginTop: '8px', fontSize: '13px', padding: '8px 10px' }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── ПОМОЩЬ ПО ДОМУ (vacation + weekend) ────────── */}
            {(isNonSchoolDay(dayType)) && (
              <div className="scroll-section">
                <div className="scroll-section-header" style={{ borderBottom: `1px solid ${styles.border}` }}>
                  <span className="scroll-section-icon">🏠</span>
                  <span className="scroll-section-title">{t('dailyModal.homeHelp')}</span>
                  {homeHelp && (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', padding: '2px 8px', borderRadius: '20px' }}>
                      +3💰
                    </span>
                  )}
                </div>
                <div style={{ padding: '12px 0 0' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    {[
                      { val: true, label: t('dailyModal.homeHelpDone'), green: true },
                      { val: false, label: t('dailyModal.homeHelpNotDone'), green: false },
                    ].map(opt => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setHomeHelp(opt.val)}
                        style={{
                          flex: 1, padding: '12px', fontSize: '13px', fontWeight: 900,
                          borderRadius: '10px', border: '1.5px solid', cursor: 'pointer',
                          borderColor: homeHelp === opt.val
                            ? (opt.green ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.35)')
                            : 'rgba(255,255,255,0.1)',
                          background: homeHelp === opt.val
                            ? (opt.green ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.1)')
                            : 'rgba(255,255,255,0.03)',
                          color: homeHelp === opt.val
                            ? (opt.green ? '#10B981' : '#F43F5E')
                            : 'rgba(238,238,255,0.5)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {homeHelp && (
                    <input
                      className="premium-input"
                      type="text"
                      placeholder={t('dailyModal.homeHelpNotePlaceholder')}
                      value={homeHelpNote}
                      onChange={e => setHomeHelpNote(e.target.value)}
                      style={{ fontSize: '14px', padding: '10px 12px' }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* ── ДОМАШНЕЕ ЗАДАНИЕ (weekend only) ─────────────── */}
            {dayType === 'weekend' && (
              <div className="scroll-section">
                <div className="scroll-section-header" style={{ borderBottom: `1px solid ${styles.border}` }}>
                  <span className="scroll-section-icon">📝</span>
                  <span className="scroll-section-title">{t('dailyModal.homework')}</span>
                  {homeworkDone && (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', padding: '2px 8px', borderRadius: '20px' }}>
                      +5💰
                    </span>
                  )}
                </div>
                <div style={{ padding: '12px 0 0' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { val: true, label: t('dailyModal.homeworkDone'), green: true },
                      { val: false, label: t('dailyModal.homeworkNotDone'), green: false },
                    ].map(opt => (
                      <button
                        key={String(opt.val)}
                        onClick={() => setHomeworkDone(opt.val)}
                        style={{
                          flex: 1, padding: '12px', fontSize: '13px', fontWeight: 900,
                          borderRadius: '10px', border: '1.5px solid', cursor: 'pointer',
                          borderColor: homeworkDone === opt.val
                            ? (opt.green ? 'rgba(16,185,129,0.4)' : 'rgba(244,63,94,0.35)')
                            : 'rgba(255,255,255,0.1)',
                          background: homeworkDone === opt.val
                            ? (opt.green ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.1)')
                            : 'rgba(255,255,255,0.03)',
                          color: homeworkDone === opt.val
                            ? (opt.green ? '#10B981' : '#F43F5E')
                            : 'rgba(238,238,255,0.5)',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── УЧЁБА (school days only) ─────────────────────── */}
            {!nonSchool && (
              <div className="scroll-section">
                <div className="scroll-section-header">
                  <span className="scroll-section-icon">📚</span>
                  <span className="scroll-section-title">{t('dailyModal.study')}</span>
                  {gradeCoins !== 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: gradeCoins >= 0 ? '#10B981' : '#F43F5E', background: gradeCoins >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.1)', border: `1px solid ${gradeCoins >= 0 ? 'rgba(16,185,129,0.22)' : 'rgba(244,63,94,0.25)'}`, padding: '2px 8px', borderRadius: '20px' }}>
                      {gradeCoins >= 0 ? '+' : ''}{gradeCoins}💰
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {scheduleForToday.length > 0 && !showSchedulePanel && (
                    <button className="premium-btn-gradient" onClick={openSchedulePanel} style={{ flex: 1 }}>
                      {t('dailyModal.scheduleBtn', { count: scheduleForToday.length })}
                    </button>
                  )}
                  {!showQuickAdd && (
                    <button className="premium-btn-primary" onClick={() => setShowQuickAdd(true)} style={{ flex: scheduleForToday.length === 0 ? 1 : undefined }}>
                      {t('dailyModal.addSubjectBtn')}
                    </button>
                  )}
                </div>

                {showSchedulePanel && (
                  <div className="schedule-panel">
                    <div className="schedule-panel-header">
                      <div className="schedule-panel-title">{t('dailyModal.schedulePanelTitle')}</div>
                      <button className="schedule-panel-close" onClick={() => setShowSchedulePanel(false)}>✕</button>
                    </div>
                    <div className="schedule-panel-content">
                      {scheduleForToday.map((lesson, idx) => (
                        <div key={idx} className="schedule-item">
                          <div className="schedule-item-name">{lesson.subject.name}</div>
                          <div className="schedule-item-grades">
                            {[5, 4, 3, 2].map(grade => (
                              <button key={grade}
                                className={`grade-quick-btn ${scheduleGrades[lesson.subject.id] === grade ? 'active' : ''}`}
                                onClick={() => setScheduleGrades({ ...scheduleGrades, [lesson.subject.id]: grade })}
                                style={{ background: scheduleGrades[lesson.subject.id] === grade ? getGradeColor(grade) : undefined }}
                              >{grade}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="schedule-panel-footer">
                      <button className="premium-btn-secondary" onClick={() => setShowSchedulePanel(false)}>{t('dailyModal.schedulePanelCancel')}</button>
                      <button className="premium-btn-gradient" onClick={addFromSchedule}>{t('dailyModal.schedulePanelAdd')}</button>
                    </div>
                  </div>
                )}

                {showQuickAdd && (
                  <div className="quick-add-panel">
                    <div className="quick-add-header">
                      <div className="quick-add-title">{t('dailyModal.quickAddTitle')}</div>
                      <button className="quick-add-close" onClick={() => setShowQuickAdd(false)}>✕</button>
                    </div>
                    <div className="quick-add-content">
                      <select className="premium-select" value={quickAddSubject} onChange={(e) => setQuickAddSubject(e.target.value)}>
                        <option value="">{t('dailyModal.subjectPlaceholder')}</option>
                        {subjects.filter(s => !grades.find(g => g.subject_id === s.id)).map(subject => (
                          <option key={subject.id} value={subject.id}>{subject.name}</option>
                        ))}
                      </select>
                      <div className="quick-add-grades">
                        {[5, 4, 3, 2].map(grade => (
                          <button key={grade}
                            className={`grade-quick-btn ${quickAddGrade === grade ? 'active' : ''}`}
                            onClick={() => setQuickAddGrade(grade)}
                            style={{ background: quickAddGrade === grade ? getGradeColor(grade) : undefined }}
                          >{grade}</button>
                        ))}
                      </div>
                      <button className="premium-btn-gradient" onClick={handleQuickAddGrade} disabled={!quickAddSubject} style={{ width: '100%' }}>
                        {t('dailyModal.addSubjectConfirm')}
                      </button>
                    </div>
                  </div>
                )}

                {grades.length > 0 && (
                  <div className="premium-grades-list">
                    {grades.map((g, idx) => (
                      <div key={idx} className="editable-grade-card">
                        <div className="grade-card-main">
                          <div className="grade-card-subject">{g.subject}</div>
                          <div className="grade-card-controls">
                            <div className="grade-card-grades">
                              {[5, 4, 3, 2].map(grade => (
                                <button key={grade}
                                  className={`grade-edit-btn ${g.grade === grade ? 'active' : ''}`}
                                  onClick={() => updateGradeInline(idx, grade)}
                                  style={{ background: g.grade === grade ? getGradeColor(grade) : undefined }}
                                >{grade}</button>
                              ))}
                            </div>
                            <button className="grade-card-delete" onClick={() => removeGrade(idx)}>🗑️</button>
                          </div>
                        </div>
                        <input type="text" className="grade-card-note" placeholder={t('dailyModal.gradeCommentPlaceholder')} value={g.note} onChange={(e) => updateNoteInline(idx, e.target.value)} />
                      </div>
                    ))}
                  </div>
                )}

                {grades.length === 0 && !showQuickAdd && !showSchedulePanel && (
                  <div className="premium-empty" style={{ padding: '16px' }}>
                    <div className="premium-empty-text" style={{ fontSize: '14px' }}>{t('dailyModal.noGrades')}</div>
                  </div>
                )}
              </div>
            )}

            {/* ── КОМНАТА ──────────────────────────────────────── */}
            <div className="scroll-section">
              <div className="scroll-section-header">
                <span className="scroll-section-icon">🏠</span>
                <span className="scroll-section-title">{t('dailyModal.room')}</span>
                <span className={`scroll-section-badge ${dayType === 'sick' ? 'ok' : roomOk ? 'ok' : 'warn'}`}>
                  {dayType === 'sick' ? '🤒' : `${roomScore}/${roomTaskCount}`}
                </span>
              </div>
              {dayType === 'sick' ? (
                <div style={{ padding: '8px 0', fontSize: '12px', color: 'rgba(238,238,255,0.45)' }}>
                  {t('dailyModal.sickGraceNote')}
                </div>
              ) : (
                <div className="premium-checklist">
                  {roomTasks.map(task => (
                    <label key={task.id} className="premium-checkbox">
                      <input
                        type="checkbox"
                        checked={roomChecked[task.id] ?? false}
                        onChange={(e) => setRoomChecked(prev => ({ ...prev, [task.id]: e.target.checked }))}
                      />
                      <span className="premium-checkbox-icon">{task.icon ?? '🏠'}</span>
                      <span className="premium-checkbox-label">{task.name}</span>
                      <span className="premium-checkbox-check">✓</span>
                    </label>
                  ))}
                </div>
              )}
              {/* Proof photo — shown only when present (proof is optional) */}
              {roomProofUrl && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(238,238,255,0.08)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={roomProofUrl}
                    alt="Room photo"
                    className="w-20 h-20 rounded-xl object-cover cursor-pointer"
                    style={{ border: '2px solid rgba(238,238,255,0.15)' }}
                    onClick={() => setLightboxProofUrl(roomProofUrl)}
                  />
                </div>
              )}
            </div>

            {/* ── ДЕНЬ / ПОВЕДЕНИЕ ─────────────────────────────── */}
            <div className="scroll-section">
              <div className="scroll-section-header">
                <span className="scroll-section-icon">📝</span>
                <span className="scroll-section-title">{t('dailyModal.day')}</span>
              </div>
              <div className="premium-checklist">
                <label className="premium-checkbox">
                  <input
                    type="checkbox"
                    checked={dayType === 'sick' ? true : goodBehavior}
                    disabled={dayType === 'sick'}
                    onChange={(e) => setGoodBehavior(e.target.checked)}
                  />
                  <span className="premium-checkbox-icon">✅</span>
                  <span className="premium-checkbox-label">
                    {t('dailyModal.goodBehaviorLabel')}
                    {dayType === 'sick' && <span style={{ color: 'rgba(238,238,255,0.4)', fontSize: '12px', marginLeft: '6px' }}>{t('dailyModal.goodBehaviorAuto')}</span>}
                  </span>
                  <span className="premium-checkbox-check">✓</span>
                </label>
                {!nonSchool && (
                  <label className="premium-checkbox">
                    <input type="checkbox" checked={diaryNotDone} onChange={(e) => setDiaryNotDone(e.target.checked)} />
                    <span className="premium-checkbox-icon">⚠️</span>
                    <span className="premium-checkbox-label">{t('dailyModal.diaryNotDone')}</span>
                    <span className="premium-checkbox-check">✓</span>
                  </label>
                )}
              </div>
              <textarea className="premium-textarea" style={{ marginTop: '12px' }} placeholder={t('dailyModal.dayNotePlaceholder')} value={dayNote} onChange={(e) => setDayNote(e.target.value)} rows={3} />
            </div>

            {/* ── СПОРТ ────────────────────────────────────────── */}
            <div className="scroll-section">
              <div className="scroll-section-header">
                <span className="scroll-section-icon">💪</span>
                <span className="scroll-section-title">{t('dailyModal.sport')}</span>
              </div>
              {exerciseTypes.length === 0 ? (
                <div className="premium-empty" style={{ padding: '16px' }}>
                  <div className="premium-empty-text" style={{ fontSize: '14px' }}>{t('dailyModal.noExercises')}</div>
                </div>
              ) : (
                <>
                  <div className="premium-exercises-grid">
                    {exerciseTypes.map(exerciseType => {
                      const exercise = exercises.find(e => e.exercise_type_id === exerciseType.id)
                      const isChecked = !!exercise
                      return (
                        <div key={exerciseType.id} className={`premium-exercise-card ${isChecked ? 'active' : ''}`}>
                          <label className="premium-exercise-header" onClick={(e) => { if (e.target instanceof HTMLInputElement) return; toggleExercise(exerciseType.id) }}>
                            <input type="checkbox" checked={isChecked} onChange={() => toggleExercise(exerciseType.id)} onClick={(e) => e.stopPropagation()} />
                            <span className="premium-exercise-icon">💪</span>
                            <span className="premium-exercise-name">{exerciseType.name}</span>
                          </label>
                          {isChecked && (
                            <div className="premium-exercise-input">
                              <input type="number" placeholder="0" value={exercise?.quantity || ''} onChange={(e) => updateQuantity(exerciseType.id, e.target.value ? parseInt(e.target.value) : null)} min="0" />
                              <span className="premium-exercise-unit">{exerciseType.unit}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <textarea className="premium-textarea" style={{ marginTop: '12px' }} placeholder={t('dailyModal.sportNotePlaceholder')} value={sportNote} onChange={(e) => setSportNote(e.target.value)} rows={2} />
                </>
              )}
            </div>

            {/* ── СЕКЦИИ ───────────────────────────────────────── */}
            {sections.length > 0 && (
              <div className="scroll-section">
                <div className="scroll-section-header">
                  <span className="scroll-section-icon">🏊</span>
                  <span className="scroll-section-title">{t('dailyModal.sections')}</span>
                </div>
                <div className="premium-exercises-grid">
                  {sections.map(section => {
                    const isAttended = section.visit?.attended || false
                    const notes = sectionNotes[section.id] || { progress: '', feedback: '', coachRating: null }
                    return (
                      <div key={section.id} className={`premium-exercise-card ${isAttended ? 'active' : ''}`}>
                        <label className="premium-exercise-header" onClick={(e) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return; toggleSectionAttended(section.id) }}>
                          <input type="checkbox" checked={isAttended} onChange={() => toggleSectionAttended(section.id)} onClick={(e) => e.stopPropagation()} />
                          <span className="premium-exercise-icon">🏊</span>
                          <div className="premium-exercise-name">
                            <div>{section.name}</div>
                            {section.trainer && <div style={{ fontSize: '13px', color: 'var(--gray-600)', fontWeight: 400 }}>{t('dailyModal.trainerLabel', { name: section.trainer })}</div>}
                          </div>
                        </label>
                        {isAttended && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                            <input type="text" className="premium-input" placeholder={t('dailyModal.progressPlaceholder')} value={notes.progress} onChange={(e) => updateSectionNote(section.id, 'progress', e.target.value)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '14px', padding: '10px 12px' }} />
                            <input type="text" className="premium-input" placeholder={t('dailyModal.feedbackPlaceholder')} value={notes.feedback} onChange={(e) => updateSectionNote(section.id, 'feedback', e.target.value)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '14px', padding: '10px 12px' }} />
                            {/* Coach rating (numeric 1-5) */}
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                              <span style={{ fontSize: '13px', color: 'var(--gray-600)' }}>{t('dailyModal.coachRatingLabel')}</span>
                              {[1, 2, 3, 4, 5].map(r => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); updateSectionRating(section.id, notes.coachRating === r ? null : r) }}
                                  style={{
                                    width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                    fontSize: '13px', fontWeight: 600,
                                    background: notes.coachRating === r ? (r >= 4 ? '#22c55e' : r === 3 ? '#f59e0b' : '#ef4444') : 'var(--gray-200)',
                                    color: notes.coachRating === r ? '#fff' : 'var(--gray-700)',
                                  }}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── FOOTER ───────────────────────────────────────── */}
            <div className="premium-modal-footer" style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid var(--line)', marginTop: '16px' }}>
              {/* Coin breakdown */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
                {nonSchool ? (
                  <>
                    {readingCoins > 0 && <span style={chipStyle('#10B981')}>📚 +{readingCoins}💰</span>}
                    {activityCoins > 0 && <span style={chipStyle('#F59E0B')}>📋 +{activityCoins}💰</span>}
                    {homeHelp && <span style={chipStyle('#10B981')}>🏠 +{helpCoins}💰</span>}
                    {roomCoins > 0 && <span style={chipStyle('#10B981')}>🛏️ +{roomCoins}💰</span>}
                    {behaviorCoins > 0 && <span style={chipStyle('#10B981')}>⭐ +{behaviorCoins}💰</span>}
                  </>
                ) : (
                  <>
                    {gradeCoins !== 0 && <span style={chipStyle(gradeCoins >= 0 ? '#10B981' : '#F43F5E')}>📚 {gradeCoins >= 0 ? '+' : ''}{gradeCoins}💰</span>}
                    {roomCoins > 0 && <span style={chipStyle('#10B981')}>🏠 +{roomCoins}💰</span>}
                    {behaviorCoins > 0 && <span style={chipStyle('#10B981')}>⭐ +{behaviorCoins}💰</span>}
                  </>
                )}
              </div>
              {status && <div className={`premium-status ${error ? 'error' : 'success'}`}>{status}</div>}
              <div className="premium-footer-actions">
                <button className="premium-btn-secondary" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
                <button className="premium-btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? `⏳ ${t('dailyModal.saving')}` : `💾 ${t('dailyModal.save')} · ${totalCoins >= 0 ? '+' : ''}${totalCoins}💰`}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
      {lightboxProofUrl && (
        <PhotoLightbox url={lightboxProofUrl} onClose={() => setLightboxProofUrl(null)} />
      )}
    </div>
  )
}

function chipStyle(color: string): React.CSSProperties {
  return {
    fontSize: '11px', fontWeight: 800,
    padding: '3px 9px', borderRadius: '20px',
    background: `${color}18`,
    border: `1px solid ${color}35`,
    color,
  }
}
