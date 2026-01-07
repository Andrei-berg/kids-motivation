'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { flexibleApi, Subject, ExerciseType } from '@/lib/flexible-api'
import { updateStreaks } from '@/lib/streaks'
import { checkAndAwardBadges } from '@/lib/badges'
import { getGradeColor } from '@/utils/helpers'
import { triggerConfetti } from '@/utils/confetti'

type Tab = 'study' | 'room' | 'day' | 'sport'

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
  const [tab, setTab] = useState<Tab>('study')
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
  const [showSchedulePanel, setShowSchedulePanel] = useState(false)
  const [scheduleGrades, setScheduleGrades] = useState<{[key: string]: number}>({})
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddSubject, setQuickAddSubject] = useState('')
  const [quickAddGrade, setQuickAddGrade] = useState(5)

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
      
      try { subjectsData = await flexibleApi.getActiveSubjects(childId) } catch (err) { subjectsData = [] }
      try { exerciseTypesData = await flexibleApi.getExerciseTypes() } catch (err) { exerciseTypesData = [] }
      
      setSubjects(subjectsData)
      setExerciseTypes(exerciseTypesData)
      
      const d = new Date(date)
      const dayOfWeek = d.getDay()
      const actualDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek
      
      if (actualDayOfWeek >= 1 && actualDayOfWeek <= 5) {
        try {
          const schedule = await flexibleApi.getScheduleForDay(childId, actualDayOfWeek)
          setScheduleForToday(schedule)
        } catch (err) { setScheduleForToday([]) }
      } else { setScheduleForToday([]) }

      try {
        const existingGrades = await api.getSubjectGradesForDate(childId, date)
        setGrades(existingGrades.map(g => ({ id: g.id, subject: g.subject, subject_id: g.subject_id, grade: g.grade, note: g.note || '' })))
      } catch (err) { setGrades([]) }

      try {
        const homeExercises = await flexibleApi.getHomeExercises(childId, date)
        setExercises(homeExercises.map(ex => ({ exercise_type_id: ex.exercise_type_id, exercise_name: ex.exercise_type?.name || '', quantity: ex.quantity, unit: ex.exercise_type?.unit || 'раз' })))
      } catch (err) { setExercises([]) }

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
      } catch (err) {}

      try {
        const sport = await api.getHomeSportForDate(childId, date)
        if (sport) { setSportNote(sport.note || '') }
      } catch (err) {}

    } catch (err) {
      console.error('[DailyModal] Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setTab('study')
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
    setStatus('')
    setError(false)
  }

  function openSchedulePanel() {
    if (scheduleForToday.length === 0) {
      alert('На этот день нет расписания')
      return
    }
    
    // Инициализируем все оценки как 5
    const initialGrades: {[key: string]: number} = {}
    scheduleForToday.forEach(lesson => {
      initialGrades[lesson.subject.id] = 5
    })
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

  function quickAddGrade() {
    if (!quickAddSubject) return
    
    const subject = subjects.find(s => s.id === quickAddSubject)
    if (!subject) return
    
    setGrades([...grades, {
      subject: subject.name,
      subject_id: subject.id,
      grade: quickAddGrade,
      note: ''
    }])
    
    setQuickAddSubject('')
    setQuickAddGrade(5)
    setShowQuickAdd(false)
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

  function autoFillFromSchedule() {
    if (scheduleForToday.length === 0) { alert('На этот день нет расписания'); return }
    const newGrades: SubjectGrade[] = scheduleForToday.map(lesson => ({ subject: lesson.subject.name, subject_id: lesson.subject.id, grade: 5, note: '' }))
    setGrades(newGrades)
  }

  async function handleSave() {
    try {
      setSaving(true); setStatus('Сохранение...'); setError(false)

      await api.saveDay({ childId, date, roomBed, roomFloor, roomDesk, roomCloset, roomTrash, goodBehavior, diaryNotDone, noteChild: dayNote })

      for (const grade of grades) {
        await api.saveSubjectGrade({ childId, date, subject: grade.subject, subjectId: grade.subject_id || undefined, grade: grade.grade, note: grade.note })
      }

      for (const exercise of exercises) {
        await flexibleApi.saveHomeExercise(childId, date, exercise.exercise_type_id, exercise.quantity, sportNote)
      }

      await updateStreaks(childId, date)
      
      const badges = await checkAndAwardBadges(childId, date)
      if (badges.length > 0) { triggerConfetti(); setStatus(`🎉 Готово! Получен бейдж!`) } 
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
      <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
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
          <>
            <div className="premium-tabs">
              <button className={`premium-tab ${tab === 'study' ? 'active' : ''}`} onClick={() => setTab('study')}>
                <span className="premium-tab-icon">📚</span><span>Учёба</span>
              </button>
              <button className={`premium-tab ${tab === 'room' ? 'active' : ''}`} onClick={() => setTab('room')}>
                <span className="premium-tab-icon">🏠</span><span>Комната</span>
              </button>
              <button className={`premium-tab ${tab === 'day' ? 'active' : ''}`} onClick={() => setTab('day')}>
                <span className="premium-tab-icon">📝</span><span>День</span>
              </button>
              <button className={`premium-tab ${tab === 'sport' ? 'active' : ''}`} onClick={() => setTab('sport')}>
                <span className="premium-tab-icon">💪</span><span>Спорт</span>
              </button>
            </div>

            <div className="premium-modal-content">
              {tab === 'study' && (
                <div className="premium-tab-content">
                  {/* Кнопки действий */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    {scheduleForToday.length > 0 && !showSchedulePanel && (
                      <button className="premium-btn-gradient" onClick={openSchedulePanel} style={{ flex: 1 }}>
                        <span>📅</span>
                        <span>Подставить из расписания ({scheduleForToday.length})</span>
                      </button>
                    )}
                    {!showQuickAdd && (
                      <button 
                        className="premium-btn-primary" 
                        onClick={() => setShowQuickAdd(true)}
                        style={{ flex: scheduleForToday.length === 0 ? 1 : undefined }}
                      >
                        <span>+ Добавить предмет</span>
                      </button>
                    )}
                  </div>

                  {/* ПАНЕЛЬ ПОДСТАНОВКИ ИЗ РАСПИСАНИЯ */}
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
                                <button
                                  key={grade}
                                  className={`grade-quick-btn ${scheduleGrades[lesson.subject.id] === grade ? 'active' : ''}`}
                                  onClick={() => setScheduleGrades({...scheduleGrades, [lesson.subject.id]: grade})}
                                  style={{ background: scheduleGrades[lesson.subject.id] === grade ? getGradeColor(grade) : undefined }}
                                >
                                  {grade}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="schedule-panel-footer">
                        <button className="premium-btn-secondary" onClick={() => setShowSchedulePanel(false)}>
                          Отмена
                        </button>
                        <button className="premium-btn-gradient" onClick={addFromSchedule}>
                          ✓ Добавить все
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ПАНЕЛЬ БЫСТРОГО ДОБАВЛЕНИЯ */}
                  {showQuickAdd && (
                    <div className="quick-add-panel">
                      <div className="quick-add-header">
                        <div className="quick-add-title">+ Добавить предмет</div>
                        <button className="quick-add-close" onClick={() => setShowQuickAdd(false)}>✕</button>
                      </div>
                      <div className="quick-add-content">
                        <select 
                          className="premium-select" 
                          value={quickAddSubject}
                          onChange={(e) => setQuickAddSubject(e.target.value)}
                        >
                          <option value="">Выберите предмет</option>
                          {subjects.filter(s => !grades.find(g => g.subject_id === s.id)).map(subject => (
                            <option key={subject.id} value={subject.id}>{subject.name}</option>
                          ))}
                        </select>
                        <div className="quick-add-grades">
                          {[5, 4, 3, 2].map(grade => (
                            <button
                              key={grade}
                              className={`grade-quick-btn ${quickAddGrade === grade ? 'active' : ''}`}
                              onClick={() => setQuickAddGrade(grade)}
                              style={{ background: quickAddGrade === grade ? getGradeColor(grade) : undefined }}
                            >
                              {grade}
                            </button>
                          ))}
                        </div>
                        <button 
                          className="premium-btn-gradient" 
                          onClick={quickAddGrade}
                          disabled={!quickAddSubject}
                          style={{ width: '100%' }}
                        >
                          ✓ Добавить
                        </button>
                      </div>
                    </div>
                  )}

                  {/* СПИСОК ОЦЕНОК - РЕДАКТИРУЕМЫЕ КАРТОЧКИ */}
                  {grades.length > 0 && (
                    <div className="premium-grades-list">
                      {grades.map((g, idx) => (
                        <div key={idx} className="editable-grade-card">
                          <div className="grade-card-main">
                            <div className="grade-card-subject">{g.subject}</div>
                            <div className="grade-card-controls">
                              <div className="grade-card-grades">
                                {[5, 4, 3, 2].map(grade => (
                                  <button
                                    key={grade}
                                    className={`grade-edit-btn ${g.grade === grade ? 'active' : ''}`}
                                    onClick={() => updateGradeInline(idx, grade)}
                                    style={{ background: g.grade === grade ? getGradeColor(grade) : undefined }}
                                  >
                                    {grade}
                                  </button>
                                ))}
                              </div>
                              <button className="grade-card-delete" onClick={() => removeGrade(idx)}>
                                🗑️
                              </button>
                            </div>
                          </div>
                          <input
                            type="text"
                            className="grade-card-note"
                            placeholder="Добавить комментарий..."
                            value={g.note}
                            onChange={(e) => updateNoteInline(idx, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ПУСТОЕ СОСТОЯНИЕ */}
                  {subjects.length === 0 && (
                    <div className="premium-empty">
                      <div className="premium-empty-icon">📚</div>
                      <div className="premium-empty-text">Нет предметов</div>
                      <div className="premium-empty-hint">Добавьте предметы в Settings → Предметы</div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'room' && (
                <div className="premium-tab-content">
                  <div className="premium-room-score">
                    <div className="premium-room-score-number" style={{ color: roomOk ? '#10b981' : '#94a3b8' }}>{roomScore} / 5</div>
                    <div className="premium-room-score-label">{roomOk ? '✅ Комната OK' : '⚠️ Нужно минимум 3'}</div>
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
                        <input type="checkbox" checked={item.value} onChange={(e) => item.setter(e.target.checked)}/>
                        <span className="premium-checkbox-icon">{item.icon}</span>
                        <span className="premium-checkbox-label">{item.label}</span>
                        <span className="premium-checkbox-check">✓</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'day' && (
                <div className="premium-tab-content">
                  <div className="premium-checklist">
                    <label className="premium-checkbox">
                      <input type="checkbox" checked={goodBehavior} onChange={(e) => setGoodBehavior(e.target.checked)}/>
                      <span className="premium-checkbox-icon">✅</span>
                      <span className="premium-checkbox-label">Хорошо вёл себя</span>
                      <span className="premium-checkbox-check">✓</span>
                    </label>
                    <label className="premium-checkbox">
                      <input type="checkbox" checked={diaryNotDone} onChange={(e) => setDiaryNotDone(e.target.checked)}/>
                      <span className="premium-checkbox-icon">⚠️</span>
                      <span className="premium-checkbox-label">Не заполнил дневник</span>
                      <span className="premium-checkbox-check">✓</span>
                    </label>
                  </div>
                  <div className="premium-section">
                    <div className="premium-section-title">Заметки о дне</div>
                    <textarea className="premium-textarea" placeholder="Что интересного было сегодня?" value={dayNote} onChange={(e) => setDayNote(e.target.value)} rows={4}/>
                  </div>
                </div>
              )}

              {tab === 'sport' && (
                <div className="premium-tab-content">
                  <div className="premium-exercises-grid">
                    {exerciseTypes.map(exerciseType => {
                      const exercise = exercises.find(e => e.exercise_type_id === exerciseType.id)
                      const isChecked = !!exercise
                      return (
                        <div key={exerciseType.id} className={`premium-exercise-card ${isChecked ? 'active' : ''}`}>
                          <label className="premium-exercise-header">
                            <input type="checkbox" checked={isChecked} onChange={() => toggleExercise(exerciseType.id)}/>
                            <span className="premium-exercise-name">{exerciseType.name}</span>
                          </label>
                          {isChecked && (
                            <div className="premium-exercise-input">
                              <input type="number" placeholder="0" value={exercise?.quantity || ''} onChange={(e) => updateQuantity(exerciseType.id, e.target.value ? parseInt(e.target.value) : null)} min="0"/>
                              <span className="premium-exercise-unit">{exerciseType.unit}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {exerciseTypes.length === 0 && (
                    <div className="premium-empty">
                      <div className="premium-empty-icon">💪</div>
                      <div className="premium-empty-text">Нет упражнений</div>
                      <div className="premium-empty-hint">Добавьте упражнения в Settings → Упражнения</div>
                    </div>
                  )}

                  {exerciseTypes.length > 0 && (
                    <div className="premium-section" style={{ marginTop: '24px' }}>
                      <div className="premium-section-title">Заметки о спорте</div>
                      <textarea className="premium-textarea" placeholder="Комментарий" value={sportNote} onChange={(e) => setSportNote(e.target.value)} rows={3}/>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="premium-modal-footer">
              {status && <div className={`premium-status ${error ? 'error' : 'success'}`}>{status}</div>}
              <div className="premium-footer-actions">
                <button className="premium-btn-secondary" onClick={onClose} disabled={saving}>Отмена</button>
                <button className="premium-btn-save" onClick={handleSave} disabled={saving}>{saving ? '⏳ Сохранение...' : '💾 Сохранить день'}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
