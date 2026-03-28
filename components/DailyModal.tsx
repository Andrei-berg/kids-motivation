'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { flexibleApi, Subject, ExerciseType } from '@/lib/flexible-api'
import { getSectionsForDate, markSectionVisit, Section, SectionVisit } from '@/lib/expenses-api'
import { updateStreaks } from '@/lib/streaks'
import { checkAndAwardBadges } from '@/lib/badges'
import { getGradeColor } from '@/utils/helpers'
import { triggerConfetti } from '@/utils/confetti'
import { useAppStore } from '@/lib/store'
import {
  getVacationPeriods,
  getReadingLog,
  saveReadingLog,
  getExtraLessons,
  saveExtraLessons,
  VacationPeriod,
  ExtraLesson,
} from '@/lib/vacation-api'
import {
  getDayType,
  DayTypeInfo,
  isNonSchoolDay,
  calcReadingCoins,
  calcExtraLessonsCoins,
  calcHomeHelpCoins,
  readingCoinHint,
} from '@/lib/day-type'

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

interface LessonEntry {
  id?: string
  lesson_type: 'subject' | 'course'
  name: string
  done: boolean
  note: string
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
  const { familyId } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(false)

  // Day type
  const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([])
  const [dayTypeInfo, setDayTypeInfo] = useState<DayTypeInfo>({ type: 'school', label: 'Учебный', emoji: '📚' })
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

  // КОМНАТА
  const [roomBed, setRoomBed] = useState(false)
  const [roomFloor, setRoomFloor] = useState(false)
  const [roomDesk, setRoomDesk] = useState(false)
  const [roomCloset, setRoomCloset] = useState(false)
  const [roomTrash, setRoomTrash] = useState(false)

  // ДЕНЬ
  const [goodBehavior, setGoodBehavior] = useState(true)
  const [diaryNotDone, setDiaryNotDone] = useState(false)
  const [dayNote, setDayNote] = useState('')

  // СПОРТ
  const [exercises, setExercises] = useState<ExerciseEntry[]>([])
  const [sportNote, setSportNote] = useState('')

  // СЕКЦИИ
  const [sections, setSections] = useState<(Section & { visit?: SectionVisit })[]>([])
  const [sectionNotes, setSectionNotes] = useState<{ [key: string]: { progress: string; feedback: string } }>({})

  // ЧТЕНИЕ (vacation + weekend)
  const [bookTitle, setBookTitle] = useState('')
  const [pagesRead, setPagesRead] = useState(0)
  const [minutesRead, setMinutesRead] = useState(0)
  const [bookFinished, setBookFinished] = useState(false)
  const [readingNote, setReadingNote] = useState('')

  // ДОП. УРОКИ (vacation)
  const [lessons, setLessons] = useState<LessonEntry[]>([])
  const [lessonTab, setLessonTab] = useState<'subject' | 'course'>('subject')
  const [lessonSubject, setLessonSubject] = useState('')
  const [lessonCourseName, setLessonCourseName] = useState('')

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
    setDayTypeInfo(getDayType(date, isSick, vacationPeriods, childId))
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
      try {
        const dayData = await api.getDay(childId, date)
        if (dayData) {
          setRoomBed(dayData.room_bed)
          setRoomFloor(dayData.room_floor)
          setRoomDesk(dayData.room_desk)
          setRoomCloset(dayData.room_closet)
          setRoomTrash(dayData.room_trash)
          setGoodBehavior(dayData.good_behavior)
          setDiaryNotDone(dayData.diary_not_done)
          setDayNote(dayData.note_child || '')
          setIsSick(dayData.is_sick ?? false)
          setHomeHelp(dayData.home_help ?? false)
          setHomeHelpNote(dayData.home_help_note || '')
          setHomeworkDone(dayData.homework_done ?? false)
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
          unit: ex.exercise_type?.unit || 'раз'
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
        const notes: { [key: string]: { progress: string; feedback: string } } = {}
        sectionsData.forEach(section => {
          if (section.visit) {
            notes[section.id] = { progress: section.visit.progress_note || '', feedback: section.visit.trainer_feedback || '' }
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

      // Extra lessons
      try {
        const lessonsData = await getExtraLessons(childId, date)
        setLessons(lessonsData.map(l => ({
          id: l.id,
          lesson_type: l.lesson_type,
          name: l.name,
          done: l.done,
          note: l.note || '',
        })))
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
    setRoomBed(false); setRoomFloor(false); setRoomDesk(false); setRoomCloset(false); setRoomTrash(false)
    setGoodBehavior(true); setDiaryNotDone(false); setDayNote('')
    setExercises([]); setSportNote('')
    setSections([]); setSectionNotes({})
    setIsSick(false); setHomeHelp(false); setHomeHelpNote(''); setHomeworkDone(false)
    setBookTitle(''); setPagesRead(0); setMinutesRead(0); setBookFinished(false); setReadingNote('')
    setLessons([]); setLessonTab('subject'); setLessonSubject(''); setLessonCourseName('')
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
    if (scheduleForToday.length === 0) { alert('На этот день нет расписания'); return }
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

  // ─── Lesson handlers ───────────────────────────────────────────────────────

  function addLesson() {
    const name = lessonTab === 'subject' ? lessonSubject : lessonCourseName
    if (!name.trim()) return
    setLessons([...lessons, { lesson_type: lessonTab, name: name.trim(), done: true, note: '' }])
    setLessonSubject(''); setLessonCourseName('')
  }

  function removeLesson(idx: number) { setLessons(lessons.filter((_, i) => i !== idx)) }

  // ─── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    try {
      setSaving(true); setStatus('Сохранение...'); setError(false)

      const dayType = dayTypeInfo.type
      const isSickDay = dayType === 'sick'

      const saveDay = api.saveDay({
        childId, date, roomBed, roomFloor, roomDesk, roomCloset, roomTrash,
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
          const notes = sectionNotes[section.id] || { progress: '', feedback: '' }
          return markSectionVisit(section.id, date, section.visit!.attended, notes.progress || undefined, notes.feedback || undefined)
        })
      )

      // Save reading log and extra lessons for non-school days
      const nonSchool = isNonSchoolDay(dayType) || isSickDay
      const saveReading = nonSchool && bookTitle.trim()
        ? saveReadingLog({ child_id: childId, date, book_title: bookTitle, pages_read: pagesRead, minutes_read: minutesRead, book_finished: bookFinished, note: readingNote })
        : Promise.resolve()

      const saveLessons = dayType === 'vacation'
        ? saveExtraLessons(childId, date, lessons.map(l => ({ child_id: childId, date, lesson_type: l.lesson_type, name: l.name, done: l.done, note: l.note })))
        : Promise.resolve()

      await Promise.all([saveDay, saveGrades, saveExercises, saveSections, saveReading, saveLessons])

      await updateStreaks(childId, date)
      const badges = await checkAndAwardBadges(childId, date)
      if (badges.length > 0) { triggerConfetti(); setStatus('🎉 Готово! Получен бейдж!') }
      else { setStatus('✅ Сохранено!') }

      if (onSave) onSave()
      setTimeout(() => { onClose() }, 1500)

    } catch (err) {
      console.error('Save error:', err)
      setStatus('❌ Ошибка сохранения'); setError(true)
    } finally {
      setSaving(false)
    }
  }

  // ─── Coins preview (footer) ───────────────────────────────────────────────

  const readingCoins = calcReadingCoins(pagesRead, minutesRead, bookFinished)
  const lessonCoins = calcExtraLessonsCoins(lessons.filter(l => l.done).length)
  const helpCoins = calcHomeHelpCoins(homeHelp)
  const homeworkCoins = homeworkDone ? 5 : 0
  const roomScore = [roomBed, roomFloor, roomDesk, roomCloset, roomTrash].filter(Boolean).length
  const roomOk = roomScore >= 3
  const roomCoins = roomOk ? 3 : 0
  const behaviorCoins = (dayTypeInfo.type === 'sick' || goodBehavior) ? 5 : 0

  const GRADE_COINS: Record<number, number> = { 5: 5, 4: 3, 3: -3, 2: -5, 1: -10 }
  const gradeCoins = grades.reduce((sum, g) => sum + (GRADE_COINS[g.grade] ?? 0), 0)

  const dayType = dayTypeInfo.type
  const nonSchool = isNonSchoolDay(dayType) || dayType === 'sick'
  const styles = DAY_TYPE_STYLES[dayType] || DAY_TYPE_STYLES.school

  const totalCoins = nonSchool
    ? readingCoins + lessonCoins + helpCoins + homeworkCoins + roomCoins + behaviorCoins
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
              <div className="premium-modal-title">Заполнить день</div>
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
            <div className="premium-loading-text">Загрузка...</div>
          </div>
        ) : (
          <div className="scroll-modal-body">

            {/* ── Sick Day Banner ─────────────────────────────── */}
            {dayType === 'sick' && (
              <div className="scroll-section" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '12px', margin: '0 0 4px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>🤒</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#F43F5E' }}>День болезни</div>
                    <div style={{ fontSize: '12px', color: 'rgba(238,238,255,0.55)', marginTop: '2px' }}>
                      Комната и поведение — грейс-период, штрафов нет. Лёгкое чтение — засчитывается.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ЧТЕНИЕ (vacation + weekend + sick) ──────────── */}
            {(nonSchool) && (
              <div className="scroll-section">
                <div className="scroll-section-header" style={{ borderBottom: `1px solid ${styles.border}` }}>
                  <span className="scroll-section-icon">📚</span>
                  <span className="scroll-section-title">Чтение</span>
                  {readingCoins > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', padding: '2px 8px', borderRadius: '20px' }}>
                      +{readingCoins}💰
                    </span>
                  )}
                </div>

                <div style={{ padding: '12px 0 0' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <div className="premium-label">Книга</div>
                    <input
                      className="premium-input"
                      type="text"
                      placeholder="Название книги..."
                      value={bookTitle}
                      onChange={e => setBookTitle(e.target.value)}
                      style={{ fontSize: '14px', padding: '10px 12px' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <div className="premium-label">Страниц</div>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface,#0D0D1E)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                        <button
                          onClick={() => setPagesRead(Math.max(0, pagesRead - 5))}
                          style={{ width: 42, height: 44, background: 'rgba(255,255,255,0.04)', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}
                        >−</button>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 900 }}>{pagesRead}</div>
                          <div style={{ fontSize: '9px', color: 'rgba(238,238,255,0.4)', fontWeight: 700 }}>СТРАНИЦ</div>
                        </div>
                        <button
                          onClick={() => setPagesRead(pagesRead + 5)}
                          style={{ width: 42, height: 44, background: 'rgba(255,255,255,0.04)', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}
                        >+</button>
                      </div>
                    </div>
                    <div>
                      <div className="premium-label">Минут</div>
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface,#0D0D1E)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                        <button
                          onClick={() => setMinutesRead(Math.max(0, minutesRead - 5))}
                          style={{ width: 42, height: 44, background: 'rgba(255,255,255,0.04)', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer' }}
                        >−</button>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '18px', fontWeight: 900 }}>{minutesRead}</div>
                          <div style={{ fontSize: '9px', color: 'rgba(238,238,255,0.4)', fontWeight: 700 }}>МИНУТ</div>
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
                    <span style={{ fontSize: '13px', fontWeight: 700 }}>🎉 Книга дочитана! <span style={{ color: '#10B981' }}>+10💰</span></span>
                    <input type="checkbox" checked={bookFinished} onChange={e => setBookFinished(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#10B981' }} />
                  </label>

                  <textarea className="premium-textarea" placeholder="Что запомнилось?" value={readingNote} onChange={e => setReadingNote(e.target.value)} rows={2} />
                </div>
              </div>
            )}

            {/* ── ДОП. УРОКИ (vacation only) ──────────────────── */}
            {dayType === 'vacation' && (
              <div className="scroll-section">
                <div className="scroll-section-header" style={{ borderBottom: `1px solid ${styles.border}` }}>
                  <span className="scroll-section-icon">📖</span>
                  <span className="scroll-section-title">Доп. уроки</span>
                  {lessonCoins > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', padding: '2px 8px', borderRadius: '20px' }}>
                      +{lessonCoins}💰
                    </span>
                  )}
                </div>

                <div style={{ padding: '12px 0 0' }}>
                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    {(['subject', 'course'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setLessonTab(tab)}
                        style={{
                          flex: 1, padding: '8px', fontSize: '12px', fontWeight: 800,
                          borderRadius: '10px', border: '1px solid',
                          cursor: 'pointer',
                          borderColor: lessonTab === tab ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)',
                          background: lessonTab === tab ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)',
                          color: lessonTab === tab ? '#F59E0B' : 'rgba(238,238,255,0.5)',
                        }}
                      >
                        {tab === 'subject' ? '📝 Повторение' : '💻 Курс / репетитор'}
                      </button>
                    ))}
                  </div>

                  {lessonTab === 'subject' ? (
                    <div style={{ marginBottom: '12px' }}>
                      <div className="premium-label">Предмет</div>
                      <select
                        className="premium-select"
                        value={lessonSubject}
                        onChange={e => setLessonSubject(e.target.value)}
                      >
                        <option value="">Выберите предмет</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                        {['Математика', 'Русский', 'Английский', 'Физика', 'История', 'Биология'].filter(n => !subjects.find(s => s.name === n)).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '12px' }}>
                      <div className="premium-label">Название курса или репетитора</div>
                      <input
                        className="premium-input"
                        type="text"
                        placeholder="Английский онлайн, Skysmart..."
                        value={lessonCourseName}
                        onChange={e => setLessonCourseName(e.target.value)}
                        style={{ fontSize: '14px', padding: '10px 12px' }}
                      />
                    </div>
                  )}

                  <button
                    className="premium-btn-gradient"
                    onClick={addLesson}
                    style={{ width: '100%', marginBottom: '12px' }}
                    disabled={lessonTab === 'subject' ? !lessonSubject : !lessonCourseName.trim()}
                  >
                    ✓ Добавить урок (+3💰)
                  </button>

                  {/* Lesson entries */}
                  {lessons.map((lesson, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px' }}>✅</span>
                      <span style={{ flex: 1, fontSize: '13px', fontWeight: 700 }}>
                        {lesson.lesson_type === 'subject' ? '📝' : '💻'} {lesson.name}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: '#10B981' }}>+3💰</span>
                      <button
                        onClick={() => removeLesson(idx)}
                        style={{ background: 'none', border: 'none', color: 'rgba(238,238,255,0.3)', fontSize: '14px', cursor: 'pointer', padding: '4px' }}
                      >✕</button>
                    </div>
                  ))}

                  {lessons.length === 0 && (
                    <div className="premium-empty" style={{ padding: '12px' }}>
                      <div className="premium-empty-text" style={{ fontSize: '13px' }}>Добавьте выполненные уроки</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ПОМОЩЬ ПО ДОМУ (vacation + weekend) ────────── */}
            {(isNonSchoolDay(dayType)) && (
              <div className="scroll-section">
                <div className="scroll-section-header" style={{ borderBottom: `1px solid ${styles.border}` }}>
                  <span className="scroll-section-icon">🏠</span>
                  <span className="scroll-section-title">Помощь по дому</span>
                  {homeHelp && (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', padding: '2px 8px', borderRadius: '20px' }}>
                      +3💰
                    </span>
                  )}
                </div>
                <div style={{ padding: '12px 0 0' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    {[
                      { val: true, label: '✅ Помог', green: true },
                      { val: false, label: '❌ Не помог', green: false },
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
                      placeholder="Что сделал? (помыл посуду, убрался...)"
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
                  <span className="scroll-section-title">Домашнее задание</span>
                  {homeworkDone && (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#10B981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)', padding: '2px 8px', borderRadius: '20px' }}>
                      +5💰
                    </span>
                  )}
                </div>
                <div style={{ padding: '12px 0 0' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[
                      { val: true, label: '✅ Сделал', green: true },
                      { val: false, label: '❌ Не сделал', green: false },
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
                  <span className="scroll-section-title">Учёба</span>
                  {gradeCoins !== 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 800, color: gradeCoins >= 0 ? '#10B981' : '#F43F5E', background: gradeCoins >= 0 ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.1)', border: `1px solid ${gradeCoins >= 0 ? 'rgba(16,185,129,0.22)' : 'rgba(244,63,94,0.25)'}`, padding: '2px 8px', borderRadius: '20px' }}>
                      {gradeCoins >= 0 ? '+' : ''}{gradeCoins}💰
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {scheduleForToday.length > 0 && !showSchedulePanel && (
                    <button className="premium-btn-gradient" onClick={openSchedulePanel} style={{ flex: 1 }}>
                      📅 Расписание ({scheduleForToday.length})
                    </button>
                  )}
                  {!showQuickAdd && (
                    <button className="premium-btn-primary" onClick={() => setShowQuickAdd(true)} style={{ flex: scheduleForToday.length === 0 ? 1 : undefined }}>
                      + Предмет
                    </button>
                  )}
                </div>

                {showSchedulePanel && (
                  <div className="schedule-panel">
                    <div className="schedule-panel-header">
                      <div className="schedule-panel-title">📅 Выберите оценки</div>
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
                      <button className="premium-btn-secondary" onClick={() => setShowSchedulePanel(false)}>Отмена</button>
                      <button className="premium-btn-gradient" onClick={addFromSchedule}>✓ Добавить все</button>
                    </div>
                  </div>
                )}

                {showQuickAdd && (
                  <div className="quick-add-panel">
                    <div className="quick-add-header">
                      <div className="quick-add-title">+ Добавить предмет</div>
                      <button className="quick-add-close" onClick={() => setShowQuickAdd(false)}>✕</button>
                    </div>
                    <div className="quick-add-content">
                      <select className="premium-select" value={quickAddSubject} onChange={(e) => setQuickAddSubject(e.target.value)}>
                        <option value="">Выберите предмет</option>
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
                        ✓ Добавить
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
                        <input type="text" className="grade-card-note" placeholder="Комментарий..." value={g.note} onChange={(e) => updateNoteInline(idx, e.target.value)} />
                      </div>
                    ))}
                  </div>
                )}

                {grades.length === 0 && !showQuickAdd && !showSchedulePanel && (
                  <div className="premium-empty" style={{ padding: '16px' }}>
                    <div className="premium-empty-text" style={{ fontSize: '14px' }}>Нет оценок</div>
                  </div>
                )}
              </div>
            )}

            {/* ── КОМНАТА ──────────────────────────────────────── */}
            <div className="scroll-section">
              <div className="scroll-section-header">
                <span className="scroll-section-icon">🏠</span>
                <span className="scroll-section-title">Комната</span>
                <span className={`scroll-section-badge ${dayType === 'sick' ? 'ok' : roomOk ? 'ok' : 'warn'}`}>
                  {dayType === 'sick' ? '🤒' : `${roomScore}/5`}
                </span>
              </div>
              {dayType === 'sick' ? (
                <div style={{ padding: '8px 0', fontSize: '12px', color: 'rgba(238,238,255,0.45)' }}>
                  Грейс-период — комната не учитывается в болезнь
                </div>
              ) : (
                <div className="premium-checklist">
                  {[
                    { key: 'bed', label: 'Застелил кровать', icon: '🛏️', value: roomBed, setter: setRoomBed },
                    { key: 'floor', label: 'Подмёл пол', icon: '🧹', value: roomFloor, setter: setRoomFloor },
                    { key: 'desk', label: 'Убрал стол', icon: '🪑', value: roomDesk, setter: setRoomDesk },
                    { key: 'closet', label: 'Разложил одежду', icon: '👕', value: roomCloset, setter: setRoomCloset },
                    { key: 'trash', label: 'Вынес мусор', icon: '🗑️', value: roomTrash, setter: setRoomTrash }
                  ].map(item => (
                    <label key={item.key} className="premium-checkbox">
                      <input type="checkbox" checked={item.value} onChange={(e) => item.setter(e.target.checked)} />
                      <span className="premium-checkbox-icon">{item.icon}</span>
                      <span className="premium-checkbox-label">{item.label}</span>
                      <span className="premium-checkbox-check">✓</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* ── ДЕНЬ / ПОВЕДЕНИЕ ─────────────────────────────── */}
            <div className="scroll-section">
              <div className="scroll-section-header">
                <span className="scroll-section-icon">📝</span>
                <span className="scroll-section-title">День</span>
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
                    Хорошо вёл себя
                    {dayType === 'sick' && <span style={{ color: 'rgba(238,238,255,0.4)', fontSize: '12px', marginLeft: '6px' }}>авто ✓</span>}
                  </span>
                  <span className="premium-checkbox-check">✓</span>
                </label>
                {!nonSchool && (
                  <label className="premium-checkbox">
                    <input type="checkbox" checked={diaryNotDone} onChange={(e) => setDiaryNotDone(e.target.checked)} />
                    <span className="premium-checkbox-icon">⚠️</span>
                    <span className="premium-checkbox-label">Не заполнил дневник</span>
                    <span className="premium-checkbox-check">✓</span>
                  </label>
                )}
              </div>
              <textarea className="premium-textarea" style={{ marginTop: '12px' }} placeholder="Заметка о дне..." value={dayNote} onChange={(e) => setDayNote(e.target.value)} rows={3} />
            </div>

            {/* ── СПОРТ ────────────────────────────────────────── */}
            <div className="scroll-section">
              <div className="scroll-section-header">
                <span className="scroll-section-icon">💪</span>
                <span className="scroll-section-title">Спорт</span>
              </div>
              {exerciseTypes.length === 0 ? (
                <div className="premium-empty" style={{ padding: '16px' }}>
                  <div className="premium-empty-text" style={{ fontSize: '14px' }}>Нет упражнений — добавьте в Settings</div>
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
                  <textarea className="premium-textarea" style={{ marginTop: '12px' }} placeholder="Заметка о спорте..." value={sportNote} onChange={(e) => setSportNote(e.target.value)} rows={2} />
                </>
              )}
            </div>

            {/* ── СЕКЦИИ ───────────────────────────────────────── */}
            {sections.length > 0 && (
              <div className="scroll-section">
                <div className="scroll-section-header">
                  <span className="scroll-section-icon">🏊</span>
                  <span className="scroll-section-title">Секции</span>
                </div>
                <div className="premium-exercises-grid">
                  {sections.map(section => {
                    const isAttended = section.visit?.attended || false
                    const notes = sectionNotes[section.id] || { progress: '', feedback: '' }
                    return (
                      <div key={section.id} className={`premium-exercise-card ${isAttended ? 'active' : ''}`}>
                        <label className="premium-exercise-header" onClick={(e) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return; toggleSectionAttended(section.id) }}>
                          <input type="checkbox" checked={isAttended} onChange={() => toggleSectionAttended(section.id)} onClick={(e) => e.stopPropagation()} />
                          <span className="premium-exercise-icon">🏊</span>
                          <div className="premium-exercise-name">
                            <div>{section.name}</div>
                            {section.trainer && <div style={{ fontSize: '13px', color: 'var(--gray-600)', fontWeight: 400 }}>Тренер: {section.trainer}</div>}
                          </div>
                        </label>
                        {isAttended && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                            <input type="text" className="premium-input" placeholder="Прогресс" value={notes.progress} onChange={(e) => updateSectionNote(section.id, 'progress', e.target.value)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '14px', padding: '10px 12px' }} />
                            <input type="text" className="premium-input" placeholder="Отзыв тренера" value={notes.feedback} onChange={(e) => updateSectionNote(section.id, 'feedback', e.target.value)} onClick={(e) => e.stopPropagation()} style={{ fontSize: '14px', padding: '10px 12px' }} />
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
                    {lessonCoins > 0 && dayType === 'vacation' && <span style={chipStyle('#F59E0B')}>📖 +{lessonCoins}💰</span>}
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
                <button className="premium-btn-secondary" onClick={onClose} disabled={saving}>Отмена</button>
                <button className="premium-btn-save" onClick={handleSave} disabled={saving}>
                  {saving ? '⏳ Сохранение...' : `💾 Сохранить · ${totalCoins >= 0 ? '+' : ''}${totalCoins}💰`}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
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
