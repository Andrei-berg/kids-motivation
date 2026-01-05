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
  const [selectedSubject, setSelectedSubject] = useState('')
  const [gradeSelected, setGradeSelected] = useState(5)
  const [noteInput, setNoteInput] = useState('')

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
    setTab('study'); setGrades([]); setSelectedSubject(''); setGradeSelected(5); setNoteInput('')
    setRoomBed(false); setRoomFloor(false); setRoomDesk(false); setRoomCloset(false); setRoomTrash(false)
    setGoodBehavior(true); setDiaryNotDone(false); setDayNote(''); setExercises([]); setSportNote('')
    setStatus(''); setError(false)
  }

  function addGrade() {
    if (!selectedSubject) { alert('Выберите предмет'); return }
    const subject = subjects.find(s => s.id === selectedSubject)
    if (!subject) return
    setGrades([...grades, { subject: subject.name, subject_id: subject.id, grade: gradeSelected, note: noteInput }])
    setNoteInput(''); setGradeSelected(5)
  }

  function removeGrade(index: number) { setGrades(grades.filter((_, i) => i !== index)) }

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
                  {scheduleForToday.length > 0 && grades.length === 0 && (
                    <button className="premium-btn-gradient" onClick={autoFillFromSchedule}>
                      <span>📅</span><span>Подставить из расписания ({scheduleForToday.length})</span>
                    </button>
                  )}

                  {grades.length > 0 && (
                    <div className="premium-grades-list">
                      {grades.map((g, idx) => (
                        <div key={idx} className="premium-grade-card">
                          <div className="premium-grade-content">
                            <div className="premium-grade-subject">{g.subject}</div>
                            <div className="premium-grade-info">
                              <span className="premium-grade-badge" style={{ background: getGradeColor(g.grade) }}>{g.grade}</span>
                              {g.note && <span className="premium-grade-note">{g.note}</span>}
                            </div>
                          </div>
                          <button className="premium-delete-btn" onClick={() => removeGrade(idx)}>🗑️</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="premium-section">
                    <div className="premium-section-title">Добавить оценку</div>
                    <select className="premium-select" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                      <option value="">Выберите предмет</option>
                      {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                    </select>

                    <div className="premium-grade-buttons">
                      {[5, 4, 3, 2].map(grade => (
                        <button key={grade} className={`premium-grade-btn ${gradeSelected === grade ? 'active' : ''}`} onClick={() => setGradeSelected(grade)} style={{ background: gradeSelected === grade ? getGradeColor(grade) : undefined }}>{grade}</button>
                      ))}
                    </div>

                    <input type="text" className="premium-input" placeholder="Комментарий (опционально)" value={noteInput} onChange={(e) => setNoteInput(e.target.value)}/>
                    <button className="premium-btn-primary" onClick={addGrade}>+ Добавить оценку</button>
                  </div>

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
