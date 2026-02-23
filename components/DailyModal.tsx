'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { flexibleApi, Subject, ExerciseType } from '@/lib/flexible-api'
import { getSectionsForDate, markSectionVisit, Section, SectionVisit } from '@/lib/expenses-api'
import { updateStreaks } from '@/lib/streaks'
import { checkAndAwardBadges } from '@/lib/badges'
import { getGradeColor } from '@/utils/helpers'
import { triggerConfetti } from '@/utils/confetti'

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

export default function DailyModal({ isOpen, onClose, childId, date, onSave }: DailyModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState(false)

  // Справочники
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([])
  const [scheduleForToday, setScheduleForToday] = useState<any[]>([])

  // УЧЁБА
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

  useEffect(() => {
    if (isOpen) {
      loadData()
    } else {
      resetForm()
    }
  }, [isOpen, date, childId])

  async function loadData() {
    try {
      setLoading(true)

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

      try {
        const existingGrades = await api.getSubjectGradesForDate(childId, date)
        setGrades(existingGrades.map(g => ({ id: g.id, subject: g.subject, subject_id: g.subject_id, grade: g.grade, note: g.note || '' })))
      } catch { setGrades([]) }

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
        }
      } catch {}

      try {
        const sport = await api.getHomeSportForDate(childId, date)
        if (sport) setSportNote(sport.note || '')
      } catch {}

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
    setRoomBed(false)
    setRoomFloor(false)
    setRoomDesk(false)
    setRoomCloset(false)
    setRoomTrash(false)
    setGoodBehavior(true)
    setDiaryNotDone(false)
    setDayNote('')
    setExercises([])
    setSportNote('')
    setSections([])
    setSectionNotes({})
    setStatus('')
    setError(false)
  }

  function updateGradeInline(index: number, newGrade: number) {
    const updated = [...grades]
    updated[index].grade = newGrade
    setGrades(updated)
  }

  function updateNoteInline(index: number, newNote: string) {
    const updated = [...grades]
    updated[index].note = newNote
    setGrades(updated)
  }

  function removeGrade(index: number) {
    setGrades(grades.filter((_, i) => i !== index))
  }

  function handleQuickAddGrade() {
    if (!quickAddSubject) return
    const subject = subjects.find(s => s.id === quickAddSubject)
    if (!subject) return
    setGrades([...grades, { subject: subject.name, subject_id: subject.id, grade: quickAddGrade, note: '' }])
    setQuickAddSubject('')
    setQuickAddGrade(5)
    setShowQuickAdd(false)
  }

  function openSchedulePanel() {
    if (scheduleForToday.length === 0) { alert('На этот день нет расписания'); return }
    const initialGrades: { [key: string]: number } = {}
    scheduleForToday.forEach(lesson => { initialGrades[lesson.subject.id] = 5 })
    setScheduleGrades(initialGrades)
    setShowSchedulePanel(true)
  }

  function addFromSchedule() {
    const newGrades: SubjectGrade[] = scheduleForToday.map(lesson => ({
      subject: lesson.subject.name,
      subject_id: lesson.subject.id,
      grade: scheduleGrades[lesson.subject.id] || 5,
      note: ''
    }))
    setGrades([...grades, ...newGrades])
    setShowSchedulePanel(false)
    setScheduleGrades({})
  }

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

  async function handleSave() {
    try {
      setSaving(true); setStatus('Сохранение...'); setError(false)

      // Batch: save day + grades + exercises + sections in parallel where possible
      const saveDay = api.saveDay({ childId, date, roomBed, roomFloor, roomDesk, roomCloset, roomTrash, goodBehavior, diaryNotDone, noteChild: dayNote })

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

      await Promise.all([saveDay, saveGrades, saveExercises, saveSections])

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

  if (!isOpen) return null

  const roomScore = [roomBed, roomFloor, roomDesk, roomCloset, roomTrash].filter(Boolean).length
  const roomOk = roomScore >= 3
  const formattedDate = new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })

  return (
    <div className="premium-modal-overlay" onClick={onClose}>
      <div className="premium-modal scroll-modal" onClick={(e) => e.stopPropagation()}>
        <div className="premium-modal-header">
          <div>
            <div className="premium-modal-title">Заполнить день</div>
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

            {/* ── 1. УЧЁБА ─────────────────────────────────────── */}
            <div className="scroll-section">
              <div className="scroll-section-header">
                <span className="scroll-section-icon">📚</span>
                <span className="scroll-section-title">Учёба</span>
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

            {/* ── 2. КОМНАТА ────────────────────────────────────── */}
            <div className="scroll-section">
              <div className="scroll-section-header">
                <span className="scroll-section-icon">🏠</span>
                <span className="scroll-section-title">Комната</span>
                <span className={`scroll-section-badge ${roomOk ? 'ok' : 'warn'}`}>{roomScore}/5</span>
              </div>
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
            </div>

            {/* ── 3. ДЕНЬ ───────────────────────────────────────── */}
            <div className="scroll-section">
              <div className="scroll-section-header">
                <span className="scroll-section-icon">📝</span>
                <span className="scroll-section-title">День</span>
              </div>
              <div className="premium-checklist">
                <label className="premium-checkbox">
                  <input type="checkbox" checked={goodBehavior} onChange={(e) => setGoodBehavior(e.target.checked)} />
                  <span className="premium-checkbox-icon">✅</span>
                  <span className="premium-checkbox-label">Хорошо вёл себя</span>
                  <span className="premium-checkbox-check">✓</span>
                </label>
                <label className="premium-checkbox">
                  <input type="checkbox" checked={diaryNotDone} onChange={(e) => setDiaryNotDone(e.target.checked)} />
                  <span className="premium-checkbox-icon">⚠️</span>
                  <span className="premium-checkbox-label">Не заполнил дневник</span>
                  <span className="premium-checkbox-check">✓</span>
                </label>
              </div>
              <textarea className="premium-textarea" style={{ marginTop: '12px' }} placeholder="Заметка о дне..." value={dayNote} onChange={(e) => setDayNote(e.target.value)} rows={3} />
            </div>

            {/* ── 4. СПОРТ ──────────────────────────────────────── */}
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

            {/* ── 5. СЕКЦИИ ─────────────────────────────────────── */}
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

            {/* ── FOOTER ────────────────────────────────────────── */}
            <div className="premium-modal-footer" style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid var(--line)', marginTop: '16px' }}>
              {status && <div className={`premium-status ${error ? 'error' : 'success'}`}>{status}</div>}
              <div className="premium-footer-actions">
                <button className="premium-btn-secondary" onClick={onClose} disabled={saving}>Отмена</button>
                <button className="premium-btn-save" onClick={handleSave} disabled={saving}>{saving ? '⏳ Сохранение...' : '💾 Сохранить день'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
