'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { flexibleApi, Subject, ExerciseType } from '@/lib/flexible-api'
import { updateStreaks } from '@/lib/streaks'
import { checkAndAwardBadges } from '@/lib/badges'
import { normalizeDate, getGradeColor } from '@/utils/helpers'
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
      
      // Загрузить справочники
      const [subjectsData, exerciseTypesData] = await Promise.all([
        flexibleApi.getActiveSubjects(childId),
        flexibleApi.getExerciseTypes()
      ])
      setSubjects(subjectsData)
      setExerciseTypes(exerciseTypesData)
      
      // День недели для расписания
      const d = new Date(date)
      const dayOfWeek = d.getDay()
      const actualDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek
      
      // Расписание (пн-пт)
      if (actualDayOfWeek >= 1 && actualDayOfWeek <= 5) {
        const schedule = await flexibleApi.getScheduleForDay(childId, actualDayOfWeek)
        setScheduleForToday(schedule)
      } else {
        setScheduleForToday([])
      }

      // Существующие оценки
      const existingGrades = await api.getSubjectGradesForDate(childId, date)
      setGrades(existingGrades.map(g => ({
        id: g.id,
        subject: g.subject,
        subject_id: g.subject_id,
        grade: g.grade,
        note: g.note || ''
      })))

      // Существующие упражнения
      const homeExercises = await flexibleApi.getHomeExercises(childId, date)
      setExercises(homeExercises.map(ex => ({
        exercise_type_id: ex.exercise_type_id,
        exercise_name: ex.exercise_type?.name || '',
        quantity: ex.quantity,
        unit: ex.exercise_type?.unit || 'раз'
      })))

      // День
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

      // Спорт (заметка)
      const sport = await api.getHomeSportForDate(childId, date)
      if (sport) {
        setSportNote(sport.note || '')
      }

    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setTab('study')
    setGrades([])
    setSelectedSubject('')
    setGradeSelected(5)
    setNoteInput('')
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

  function addGrade() {
    if (!selectedSubject) {
      alert('Выберите предмет')
      return
    }
    
    const subject = subjects.find(s => s.id === selectedSubject)
    if (!subject) return
    
    setGrades([...grades, {
      subject: subject.name,
      subject_id: subject.id,
      grade: gradeSelected,
      note: noteInput
    }])
    
    setNoteInput('')
    setGradeSelected(5)
  }

  function removeGrade(index: number) {
    setGrades(grades.filter((_, i) => i !== index))
  }

  function toggleExercise(exerciseTypeId: string) {
    const exists = exercises.find(e => e.exercise_type_id === exerciseTypeId)
    
    if (exists) {
      setExercises(exercises.filter(e => e.exercise_type_id !== exerciseTypeId))
    } else {
      const exerciseType = exerciseTypes.find(et => et.id === exerciseTypeId)
      if (exerciseType) {
        setExercises([...exercises, {
          exercise_type_id: exerciseType.id,
          exercise_name: exerciseType.name,
          quantity: null,
          unit: exerciseType.unit
        }])
      }
    }
  }

  function updateQuantity(exerciseTypeId: string, quantity: number | null) {
    setExercises(exercises.map(e => 
      e.exercise_type_id === exerciseTypeId ? { ...e, quantity } : e
    ))
  }

  function autoFillFromSchedule() {
    if (scheduleForToday.length === 0) {
      alert('На этот день нет расписания')
      return
    }
    
    const newGrades: SubjectGrade[] = scheduleForToday.map(lesson => ({
      subject: lesson.subject.name,
      subject_id: lesson.subject.id,
      grade: 5,
      note: ''
    }))
    
    setGrades(newGrades)
  }

  async function handleSave() {
    try {
      setLoading(true)
      setStatus('Сохранение...')
      setError(false)

      // День
      await api.saveDay({
        childId,
        date,
        roomBed,
        roomFloor,
        roomDesk,
        roomCloset,
        roomTrash,
        goodBehavior,
        diaryNotDone,
        noteChild: dayNote
      })

      // Оценки
      for (const grade of grades) {
        await api.saveSubjectGrade({
          childId,
          date,
          subject: grade.subject,
          subjectId: grade.subject_id,
          grade: grade.grade,
          note: grade.note
        })
      }

      // Упражнения
      for (const exercise of exercises) {
        await flexibleApi.saveHomeExercise(
          childId,
          date,
          exercise.exercise_type_id,
          exercise.quantity,
          sportNote
        )
      }

      // Стрики
      await updateStreaks(childId, date)
      
      // Бейджи
      const badges = await checkAndAwardBadges(childId, date)
      if (badges.length > 0) {
        triggerConfetti()
        setStatus(`Готово! ✅ Получен бейдж! 🏆`)
      } else {
        setStatus('Готово! ✅')
      }
      
      if (onSave) onSave()
      
      setTimeout(() => {
        onClose()
      }, 1000)

    } catch (err) {
      console.error('Save error:', err)
      setStatus('Ошибка сохранения ❌')
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const roomScore = [roomBed, roomFloor, roomDesk, roomCloset, roomTrash].filter(Boolean).length
  const roomOk = roomScore >= 3

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content daily-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modalH">
          <div className="h">Заполнить день: {new Date(date).toLocaleDateString('ru-RU')}</div>
          <button className="close" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--gray-200)', padding: '0 20px' }}>
          <button className={tab === 'study' ? 'btn-pill active' : 'btn-pill'} onClick={() => setTab('study')}>
            📚 Учёба
          </button>
          <button className={tab === 'room' ? 'btn-pill active' : 'btn-pill'} onClick={() => setTab('room')}>
            🏠 Комната
          </button>
          <button className={tab === 'day' ? 'btn-pill active' : 'btn-pill'} onClick={() => setTab('day')}>
            📝 День
          </button>
          <button className={tab === 'sport' ? 'btn-pill active' : 'btn-pill'} onClick={() => setTab('sport')}>
            💪 Спорт
          </button>
        </div>

        <div className="modalB">
          {tab === 'study' && (
            <div>
              <div className="h2">Оценки за день</div>
              
              {scheduleForToday.length > 0 && grades.length === 0 && (
                <div style={{ marginTop: '12px' }}>
                  <button className="btn primary" onClick={autoFillFromSchedule}>
                    📅 Подставить из расписания ({scheduleForToday.length} {scheduleForToday.length === 1 ? 'урок' : 'уроков'})
                  </button>
                </div>
              )}

              {grades.length > 0 && (
                <div style={{ marginTop: '16px', display: 'grid', gap: '8px' }}>
                  {grades.map((g, idx) => (
                    <div key={idx} className="card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{g.subject}</div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span style={{ fontSize: '24px', fontWeight: 700, color: getGradeColor(g.grade) }}>
                            {g.grade}
                          </span>
                          {g.note && <span className="tip">{g.note}</span>}
                        </div>
                      </div>
                      <button className="btn" onClick={() => removeGrade(idx)}>🗑️</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <div className="h3">Добавить оценку</div>
                <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
                  <select 
                    className="input"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="">Выберите предмет</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[5, 4, 3, 2].map(grade => (
                      <button
                        key={grade}
                        className={gradeSelected === grade ? 'btn primary' : 'btn'}
                        onClick={() => setGradeSelected(grade)}
                        style={{ flex: 1, fontSize: '18px', fontWeight: 700 }}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    className="input"
                    placeholder="Комментарий (опционально)"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                  />

                  <button className="btn primary" onClick={addGrade}>
                    + Добавить оценку
                  </button>
                </div>
              </div>

              {subjects.length === 0 && (
                <div className="tip" style={{ marginTop: '16px' }}>
                  Нет предметов. Добавьте предметы в Settings → Предметы
                </div>
              )}
            </div>
          )}

          {tab === 'room' && (
            <div>
              <div className="h2">Комната</div>
              <div className="tip" style={{ marginTop: '8px' }}>Отметь что сделал (минимум 3 из 5)</div>
              
              <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
                {[
                  { key: 'bed', label: '🛏️ Застелил кровать', value: roomBed, setter: setRoomBed },
                  { key: 'floor', label: '🧹 Подмёл пол', value: roomFloor, setter: setRoomFloor },
                  { key: 'desk', label: '🪑 Убрал стол', value: roomDesk, setter: setRoomDesk },
                  { key: 'closet', label: '👕 Разложил одежду', value: roomCloset, setter: setRoomCloset },
                  { key: 'trash', label: '🗑️ Вынес мусор', value: roomTrash, setter: setRoomTrash }
                ].map(item => (
                  <label key={item.key} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={item.value}
                      onChange={(e) => item.setter(e.target.checked)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div className="card" style={{ marginTop: '16px', textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '32px', fontWeight: 800, color: roomOk ? 'var(--emerald-600)' : 'var(--gray-400)' }}>
                  {roomScore} / 5
                </div>
                <div className="tip" style={{ marginTop: '4px' }}>
                  {roomOk ? '✅ Комната OK' : '⚠️ Нужно минимум 3'}
                </div>
              </div>
            </div>
          )}

          {tab === 'day' && (
            <div>
              <div className="h2">Поведение и дневник</div>
              
              <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={goodBehavior}
                    onChange={(e) => setGoodBehavior(e.target.checked)}
                  />
                  <span>✅ Хорошо вёл себя</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={diaryNotDone}
                    onChange={(e) => setDiaryNotDone(e.target.checked)}
                  />
                  <span>⚠️ Не заполнил дневник</span>
                </label>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div className="lab">Заметки о дне</div>
                <textarea
                  className="input"
                  placeholder="Что интересного было сегодня?"
                  value={dayNote}
                  onChange={(e) => setDayNote(e.target.value)}
                  rows={4}
                  style={{ marginTop: '8px' }}
                />
              </div>
            </div>
          )}

          {tab === 'sport' && (
            <div>
              <div className="h2">Домашний спорт</div>
              <div className="tip" style={{ marginTop: '8px' }}>Отметь что делал и укажи количество</div>
              
              <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
                {exerciseTypes.map(exerciseType => {
                  const exercise = exercises.find(e => e.exercise_type_id === exerciseType.id)
                  const isChecked = !!exercise
                  
                  return (
                    <div key={exerciseType.id} className="card" style={{ padding: '12px' }}>
                      <label className="checkbox-label" style={{ marginBottom: '8px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleExercise(exerciseType.id)}
                        />
                        <span style={{ fontWeight: 600 }}>{exerciseType.name}</span>
                      </label>
                      
                      {isChecked && (
                        <div style={{ marginLeft: '28px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="number"
                            className="input"
                            placeholder="Количество"
                            value={exercise?.quantity || ''}
                            onChange={(e) => updateQuantity(exerciseType.id, e.target.value ? parseInt(e.target.value) : null)}
                            min="0"
                            style={{ width: '100px' }}
                          />
                          <span className="tip">{exerciseType.unit}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {exerciseTypes.length === 0 && (
                <div className="tip" style={{ marginTop: '16px' }}>
                  Нет упражнений. Добавьте упражнения в Settings → Упражнения
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <div className="lab">Заметки о спорте</div>
                <textarea
                  className="input"
                  placeholder="Комментарий"
                  value={sportNote}
                  onChange={(e) => setSportNote(e.target.value)}
                  rows={3}
                  style={{ marginTop: '8px' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="modalF">
          {status && (
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 600,
              color: error ? 'var(--red-600)' : 'var(--emerald-600)'
            }}>
              {status}
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn" onClick={onClose} disabled={loading}>
              Отмена
            </button>
            <button className="btn primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить день'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
