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
      
      let subjectsData: Subject[] = []
      let exerciseTypesData: ExerciseType[] = []
      
      try {
        subjectsData = await flexibleApi.getActiveSubjects(childId)
      } catch (err) {
        console.error('[DailyModal] Error loading subjects:', err)
        subjectsData = []
      }
      
      try {
        exerciseTypesData = await flexibleApi.getExerciseTypes()
      } catch (err) {
        console.error('[DailyModal] Error loading exercise types:', err)
        exerciseTypesData = []
      }
      
      setSubjects(subjectsData)
      setExerciseTypes(exerciseTypesData)
      
      const d = new Date(date)
      const dayOfWeek = d.getDay()
      const actualDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek
      
      if (actualDayOfWeek >= 1 && actualDayOfWeek <= 5) {
        try {
          const schedule = await flexibleApi.getScheduleForDay(childId, actualDayOfWeek)
          setScheduleForToday(schedule)
        } catch (err) {
          console.error('[DailyModal] Error loading schedule:', err)
          setScheduleForToday([])
        }
      } else {
        setScheduleForToday([])
      }

      try {
        const existingGrades = await api.getSubjectGradesForDate(childId, date)
        setGrades(existingGrades.map(g => ({
          id: g.id,
          subject: g.subject,
          subject_id: g.subject_id,
          grade: g.grade,
          note: g.note || ''
        })))
      } catch (err) {
        console.error('[DailyModal] Error loading grades:', err)
        setGrades([])
      }

      try {
        const homeExercises = await flexibleApi.getHomeExercises(childId, date)
        setExercises(homeExercises.map(ex => ({
          exercise_type_id: ex.exercise_type_id,
          exercise_name: ex.exercise_type?.name || '',
          quantity: ex.quantity,
          unit: ex.exercise_type?.unit || 'раз'
        })))
      } catch (err) {
        console.error('[DailyModal] Error loading home exercises:', err)
        setExercises([])
      }

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
      } catch (err) {
        console.error('[DailyModal] Error loading day:', err)
      }

      try {
        const sport = await api.getHomeSportForDate(childId, date)
        if (sport) {
          setSportNote(sport.note || '')
        }
      } catch (err) {
        console.error('[DailyModal] Error loading sport note:', err)
      }

    } catch (err) {
      console.error('[DailyModal] Fatal error loading data:', err)
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

      for (const grade of grades) {
        await api.saveSubjectGrade({
          childId,
          date,
          subject: grade.subject,
          subjectId: grade.subject_id || undefined,
          grade: grade.grade,
          note: grade.note
        })
      }

      for (const exercise of exercises) {
        await flexibleApi.saveHomeExercise(
          childId,
          date,
          exercise.exercise_type_id,
          exercise.quantity,
          sportNote
        )
      }

      await updateStreaks(childId, date)
      
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

  const getGradeStyles = (grade: number) => {
    const styles = {
      5: { bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', emoji: '🌟' },
      4: { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', emoji: '👍' },
      3: { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', emoji: '⚠️' },
      2: { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', emoji: '❌' }
    }
    return styles[grade as keyof typeof styles] || styles[4]
  }

  return (
    <div 
      className="premium-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="premium-modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: 'min(800px, 100%)',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease-out',
          border: '1px solid rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>
                📅 Заполнить день
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>
                {new Date(date).toLocaleDateString('ru-RU', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
            <button 
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                fontWeight: 300
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
                e.currentTarget.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ 
            padding: '60px 32px', 
            textAlign: 'center',
            background: 'linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)'
          }}>
            <div style={{ 
              fontSize: '64px', 
              marginBottom: '24px',
              animation: 'bounce 1s infinite'
            }}>
              ⏳
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 700,
              color: '#111827',
              marginBottom: '8px'
            }}>
              Загрузка данных...
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Подготавливаем всё самое важное
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              padding: '16px 32px',
              borderBottom: '2px solid #f3f4f6',
              background: '#fff'
            }}>
              {[
                { key: 'study', label: '📚 Учёба', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
                { key: 'room', label: '🏠 Комната', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
                { key: 'day', label: '📝 День', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
                { key: 'sport', label: '💪 Спорт', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' }
              ].map(({ key, label, gradient }) => (
                <button
                  key={key}
                  onClick={() => setTab(key as Tab)}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    border: 'none',
                    borderRadius: '12px',
                    background: tab === key ? gradient : '#f9fafb',
                    color: tab === key ? '#fff' : '#6b7280',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: tab === key ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                    transform: tab === key ? 'translateY(-2px)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (tab !== key) {
                      e.currentTarget.style.background = '#f3f4f6'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tab !== key) {
                      e.currentTarget.style.background = '#f9fafb'
                      e.currentTarget.style.transform = 'none'
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '32px',
              background: 'linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%)'
            }}>
              {/* УЧЁБА */}
              {tab === 'study' && (
                <div>
                  {scheduleForToday.length > 0 && grades.length === 0 && (
                    <button
                      onClick={autoFillFromSchedule}
                      style={{
                        width: '100%',
                        padding: '18px 24px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        border: 'none',
                        borderRadius: '16px',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>📅</span>
                      <span>Подставить из расписания ({scheduleForToday.length} {scheduleForToday.length === 1 ? 'урок' : 'уроков'})</span>
                    </button>
                  )}

                  {/* Список оценок */}
                  {grades.length > 0 && (
                    <div style={{ marginBottom: '32px' }}>
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: 700, 
                        color: '#111827',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span>📊</span>
                        <span>Сегодняшние оценки ({grades.length})</span>
                      </div>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        {grades.map((g, idx) => {
                          const gradeStyle = getGradeStyles(g.grade)
                          return (
                            <div
                              key={idx}
                              style={{
                                background: '#fff',
                                borderRadius: '16px',
                                padding: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                border: '2px solid #f3f4f6',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)'
                                e.currentTarget.style.transform = 'translateY(-2px)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)'
                                e.currentTarget.style.transform = 'none'
                              }}
                            >
                              <div
                                style={{
                                  width: '64px',
                                  height: '64px',
                                  borderRadius: '16px',
                                  background: gradeStyle.bg,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '32px',
                                  fontWeight: 800,
                                  color: gradeStyle.color,
                                  flexShrink: 0,
                                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                }}
                              >
                                {g.grade}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ 
                                  fontSize: '17px', 
                                  fontWeight: 700,
                                  color: '#111827',
                                  marginBottom: '4px'
                                }}>
                                  {g.subject}
                                </div>
                                {g.note && (
                                  <div style={{ 
                                    fontSize: '14px', 
                                    color: '#6b7280',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    💬 {g.note}
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removeGrade(idx)}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '12px',
                                  border: 'none',
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  fontSize: '20px',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  transition: 'all 0.2s',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#fecaca'
                                  e.currentTarget.style.transform = 'scale(1.05)'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#fee2e2'
                                  e.currentTarget.style.transform = 'scale(1)'
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Добавить оценку */}
                  <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    padding: '28px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #f3f4f6'
                  }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 700, 
                      color: '#111827',
                      marginBottom: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>➕</span>
                      <span>Добавить оценку</span>
                    </div>

                    <div style={{ display: 'grid', gap: '16px' }}>
                      <select
                        className="premium-select"
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          fontSize: '16px',
                          fontWeight: 600,
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          background: '#f9fafb',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                      >
                        <option value="">Выберите предмет...</option>
                        {subjects.map(subject => (
                          <option key={subject.id} value={subject.id}>
                            {subject.name}
                          </option>
                        ))}
                      </select>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {[5, 4, 3, 2].map(grade => {
                          const gradeStyle = getGradeStyles(grade)
                          return (
                            <button
                              key={grade}
                              onClick={() => setGradeSelected(grade)}
                              style={{
                                padding: '20px',
                                border: gradeSelected === grade ? '3px solid #6366f1' : '2px solid #e5e7eb',
                                borderRadius: '16px',
                                background: gradeSelected === grade ? gradeStyle.bg : '#fff',
                                color: gradeSelected === grade ? '#fff' : '#111827',
                                fontSize: '28px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: gradeSelected === grade ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                                transform: gradeSelected === grade ? 'scale(1.05)' : 'scale(1)'
                              }}
                              onMouseEnter={(e) => {
                                if (gradeSelected !== grade) {
                                  e.currentTarget.style.transform = 'scale(1.05)'
                                  e.currentTarget.style.borderColor = '#d1d5db'
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (gradeSelected !== grade) {
                                  e.currentTarget.style.transform = 'scale(1)'
                                  e.currentTarget.style.borderColor = '#e5e7eb'
                                }
                              }}
                            >
                              {grade}
                            </button>
                          )
                        })}
                      </div>

                      <input
                        type="text"
                        placeholder="Комментарий (необязательно)"
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addGrade()}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          fontSize: '16px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '12px',
                          background: '#f9fafb',
                          transition: 'all 0.2s',
                          outline: 'none'
                        }}
                      />

                      <button
                        onClick={addGrade}
                        disabled={!selectedSubject}
                        style={{
                          width: '100%',
                          padding: '18px',
                          background: selectedSubject ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e5e7eb',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '16px',
                          fontWeight: 700,
                          cursor: selectedSubject ? 'pointer' : 'not-allowed',
                          transition: 'all 0.2s',
                          boxShadow: selectedSubject ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedSubject) {
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedSubject) {
                            e.currentTarget.style.transform = 'none'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)'
                          }
                        }}
                      >
                        ➕ Добавить оценку
                      </button>
                    </div>

                    {subjects.length === 0 && (
                      <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        background: '#fef3c7',
                        border: '2px solid #fbbf24',
                        borderRadius: '12px',
                        color: '#92400e',
                        fontSize: '14px',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        ⚠️ Нет предметов. Добавьте в Settings → Предметы
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* КОМНАТА */}
              {tab === 'room' && (
                <div>
                  <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    padding: '28px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #f3f4f6',
                    marginBottom: '24px'
                  }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 700, 
                      color: '#111827',
                      marginBottom: '8px'
                    }}>
                      Уборка комнаты
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                      Отметь что сделал сегодня (минимум 3 из 5 для бонуса)
                    </div>

                    <div style={{ display: 'grid', gap: '12px' }}>
                      {[
                        { key: 'bed', label: 'Застелил кровать', emoji: '🛏️', value: roomBed, setter: setRoomBed },
                        { key: 'floor', label: 'Подмёл пол', emoji: '🧹', value: roomFloor, setter: setRoomFloor },
                        { key: 'desk', label: 'Убрал стол', emoji: '🪑', value: roomDesk, setter: setRoomDesk },
                        { key: 'closet', label: 'Разложил одежду', emoji: '👕', value: roomCloset, setter: setRoomCloset },
                        { key: 'trash', label: 'Вынес мусор', emoji: '🗑️', value: roomTrash, setter: setRoomTrash }
                      ].map(item => (
                        <label
                          key={item.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '18px 20px',
                            background: item.value ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f9fafb',
                            border: '2px solid' + (item.value ? '#10b981' : '#e5e7eb'),
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!item.value) {
                              e.currentTarget.style.background = '#f3f4f6'
                              e.currentTarget.style.borderColor = '#d1d5db'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!item.value) {
                              e.currentTarget.style.background = '#f9fafb'
                              e.currentTarget.style.borderColor = '#e5e7eb'
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={item.value}
                            onChange={(e) => item.setter(e.target.checked)}
                            style={{ display: 'none' }}
                          />
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: item.value ? '#fff' : '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 800,
                            color: item.value ? '#10b981' : '#9ca3af',
                            transition: 'all 0.2s'
                          }}>
                            {item.value ? '✓' : ''}
                          </div>
                          <div style={{ fontSize: '28px' }}>{item.emoji}</div>
                          <div style={{ 
                            flex: 1, 
                            fontSize: '16px', 
                            fontWeight: 600,
                            color: item.value ? '#fff' : '#111827'
                          }}>
                            {item.label}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Progress */}
                  <div style={{
                    background: roomOk 
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                      : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    borderRadius: '20px',
                    padding: '32px',
                    textAlign: 'center',
                    color: '#fff',
                    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)'
                  }}>
                    <div style={{ fontSize: '64px', fontWeight: 800, marginBottom: '8px' }}>
                      {roomScore} / 5
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, opacity: 0.95 }}>
                      {roomOk ? '🎉 Отличная работа!' : '💪 Ещё немного!'}
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.85, marginTop: '4px' }}>
                      {roomOk ? 'Комната чистая, получишь бонус!' : `Нужно ещё ${3 - roomScore} для бонуса`}
                    </div>
                  </div>
                </div>
              )}

              {/* ДЕНЬ */}
              {tab === 'day' && (
                <div>
                  <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    padding: '28px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #f3f4f6',
                    marginBottom: '24px'
                  }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 700, 
                      color: '#111827',
                      marginBottom: '20px'
                    }}>
                      Поведение и дневник
                    </div>

                    <div style={{ display: 'grid', gap: '12px' }}>
                      {[
                        { label: 'Хорошо вёл себя сегодня', emoji: '😊', value: goodBehavior, setter: setGoodBehavior, color: '#10b981' },
                        { label: 'Не заполнил дневник', emoji: '📓', value: diaryNotDone, setter: setDiaryNotDone, color: '#ef4444' }
                      ].map((item, idx) => (
                        <label
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '18px 20px',
                            background: item.value ? `${item.color}15` : '#f9fafb',
                            border: `2px solid ${item.value ? item.color : '#e5e7eb'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={item.value}
                            onChange={(e) => item.setter(e.target.checked)}
                            style={{ display: 'none' }}
                          />
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: item.value ? item.color : '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 800,
                            color: '#fff',
                            transition: 'all 0.2s'
                          }}>
                            {item.value ? '✓' : ''}
                          </div>
                          <div style={{ fontSize: '28px' }}>{item.emoji}</div>
                          <div style={{ 
                            flex: 1, 
                            fontSize: '16px', 
                            fontWeight: 600,
                            color: '#111827'
                          }}>
                            {item.label}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    padding: '28px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #f3f4f6'
                  }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 700, 
                      color: '#111827',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>✍️</span>
                      <span>Как прошёл день?</span>
                    </div>
                    <textarea
                      placeholder="Расскажи что интересного было сегодня..."
                      value={dayNote}
                      onChange={(e) => setDayNote(e.target.value)}
                      rows={6}
                      style={{
                        width: '100%',
                        padding: '16px 20px',
                        fontSize: '16px',
                        lineHeight: '1.6',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        background: '#f9fafb',
                        resize: 'vertical',
                        outline: 'none',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* СПОРТ */}
              {tab === 'sport' && (
                <div>
                  <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    padding: '28px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #f3f4f6',
                    marginBottom: '24px'
                  }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 700, 
                      color: '#111827',
                      marginBottom: '8px'
                    }}>
                      Домашний спорт
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                      Отметь что делал и укажи количество
                    </div>

                    <div style={{ display: 'grid', gap: '12px' }}>
                      {exerciseTypes.map(exerciseType => {
                        const exercise = exercises.find(e => e.exercise_type_id === exerciseType.id)
                        const isChecked = !!exercise

                        return (
                          <div
                            key={exerciseType.id}
                            style={{
                              background: isChecked ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#f9fafb',
                              border: `2px solid ${isChecked ? '#f59e0b' : '#e5e7eb'}`,
                              borderRadius: '12px',
                              padding: '18px 20px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <label
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                cursor: 'pointer',
                                userSelect: 'none',
                                marginBottom: isChecked ? '16px' : 0
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleExercise(exerciseType.id)}
                                style={{ display: 'none' }}
                              />
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '8px',
                                background: isChecked ? '#fff' : '#e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: 800,
                                color: isChecked ? '#f59e0b' : '#9ca3af',
                                transition: 'all 0.2s'
                              }}>
                                {isChecked ? '✓' : ''}
                              </div>
                              <div style={{ 
                                flex: 1, 
                                fontSize: '16px', 
                                fontWeight: 600,
                                color: isChecked ? '#fff' : '#111827'
                              }}>
                                {exerciseType.name}
                              </div>
                            </label>

                            {isChecked && (
                              <div style={{ 
                                display: 'flex', 
                                gap: '12px', 
                                alignItems: 'center',
                                paddingLeft: '44px'
                              }}>
                                <input
                                  type="number"
                                  placeholder="0"
                                  value={exercise?.quantity || ''}
                                  onChange={(e) => updateQuantity(exerciseType.id, e.target.value ? parseInt(e.target.value) : null)}
                                  min="0"
                                  style={{
                                    width: '120px',
                                    padding: '12px 16px',
                                    fontSize: '18px',
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    border: '2px solid rgba(255, 255, 255, 0.5)',
                                    borderRadius: '10px',
                                    background: 'rgba(255, 255, 255, 0.9)',
                                    color: '#111827',
                                    outline: 'none'
                                  }}
                                />
                                <span style={{ 
                                  fontSize: '16px', 
                                  fontWeight: 600,
                                  color: '#fff'
                                }}>
                                  {exerciseType.unit}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {exerciseTypes.length === 0 && (
                      <div style={{
                        padding: '16px',
                        background: '#fef3c7',
                        border: '2px solid #fbbf24',
                        borderRadius: '12px',
                        color: '#92400e',
                        fontSize: '14px',
                        fontWeight: 600,
                        textAlign: 'center'
                      }}>
                        ⚠️ Нет упражнений. Добавьте в Settings → Упражнения
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    padding: '28px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    border: '2px solid #f3f4f6'
                  }}>
                    <div style={{ 
                      fontSize: '18px', 
                      fontWeight: 700, 
                      color: '#111827',
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>📝</span>
                      <span>Комментарий</span>
                    </div>
                    <textarea
                      placeholder="Как себя чувствуешь после тренировки?"
                      value={sportNote}
                      onChange={(e) => setSportNote(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '16px 20px',
                        fontSize: '16px',
                        lineHeight: '1.6',
                        border: '2px solid #e5e7eb',
                        borderRadius: '12px',
                        background: '#f9fafb',
                        resize: 'vertical',
                        outline: 'none',
                        transition: 'all 0.2s',
                        fontFamily: 'inherit'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              borderTop: '2px solid #f3f4f6',
              padding: '24px 32px',
              background: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px'
            }}>
              {status && (
                <div style={{
                  flex: 1,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: error ? '#dc2626' : '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {status}
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
                <button
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    padding: '14px 32px',
                    fontSize: '16px',
                    fontWeight: 700,
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    background: '#fff',
                    color: '#6b7280',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: loading ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = '#f9fafb'
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = '#fff'
                      e.currentTarget.style.borderColor = '#e5e7eb'
                    }
                  }}
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  style={{
                    padding: '14px 40px',
                    fontSize: '16px',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '12px',
                    background: loading 
                      ? '#d1d5db' 
                      : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: loading ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)'
                    }
                  }}
                >
                  {loading ? '💾 Сохранение...' : '✅ Сохранить день'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
