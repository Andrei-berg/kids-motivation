'use client'

import { useState, useEffect } from 'react'
import { flexibleApi, Subject, ScheduleLesson } from '@/lib/flexible-api'

interface ScheduleEditorProps {
  childId: string
}

const DAYS = [
  { num: 1, name: 'Понедельник' },
  { num: 2, name: 'Вторник' },
  { num: 3, name: 'Среда' },
  { num: 4, name: 'Четверг' },
  { num: 5, name: 'Пятница' }
]

const MAX_LESSONS = 8

export default function ScheduleEditor({ childId }: ScheduleEditorProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [schedule, setSchedule] = useState<ScheduleLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(1)

  useEffect(() => {
    loadData()
  }, [childId])

  async function loadData() {
    try {
      setLoading(true)
      const [subjectsData, scheduleData] = await Promise.all([
        flexibleApi.getActiveSubjects(childId),
        flexibleApi.getSchedule(childId)
      ])
      setSubjects(subjectsData)
      setSchedule(scheduleData)
    } catch (err) {
      console.error('Error loading schedule:', err)
    } finally {
      setLoading(false)
    }
  }

  function getLessonsForDay(day: number) {
    return schedule
      .filter(s => s.day_of_week === day)
      .sort((a, b) => a.lesson_number - b.lesson_number)
  }

  async function addLesson(day: number, lessonNumber: number, subjectId: string) {
    try {
      await flexibleApi.addScheduleLesson(childId, day, lessonNumber, subjectId)
      await loadData()
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        alert('Урок на этой позиции уже существует!')
      } else {
        alert('Ошибка добавления урока')
      }
    }
  }

  async function updateLesson(id: string, subjectId: string) {
    try {
      await flexibleApi.updateScheduleLesson(id, subjectId)
      await loadData()
    } catch (err) {
      alert('Ошибка обновления урока')
    }
  }

  async function deleteLesson(id: string) {
    try {
      await flexibleApi.deleteScheduleLesson(id)
      await loadData()
    } catch (err) {
      alert('Ошибка удаления урока')
    }
  }

  async function clearAllSchedule() {
    if (!confirm('Удалить всё расписание? Это действие нельзя отменить!')) return
    
    try {
      await flexibleApi.clearSchedule(childId)
      await loadData()
    } catch (err) {
      alert('Ошибка очистки расписания')
    }
  }

  if (loading) {
    return <div>Загрузка...</div>
  }

  if (subjects.length === 0) {
    return (
      <div className="tip">
        Сначала добавьте предметы во вкладке "Предметы"
      </div>
    )
  }

  const dayLessons = getLessonsForDay(selectedDay)

  return (
    <div>
      <div className="h2">Расписание уроков</div>
      
      {/* День недели */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {DAYS.map(day => (
          <button
            key={day.num}
            className={selectedDay === day.num ? 'btn primary' : 'btn'}
            onClick={() => setSelectedDay(day.num)}
          >
            {day.name}
          </button>
        ))}
      </div>

      {/* Уроки */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="h3">
            {DAYS.find(d => d.num === selectedDay)?.name} ({dayLessons.length} {dayLessons.length === 1 ? 'урок' : 'уроков'})
          </div>
          {schedule.length > 0 && (
            <button className="btn" onClick={clearAllSchedule}>
              🗑️ Очистить всё
            </button>
          )}
        </div>

        {/* Список уроков */}
        <div style={{ display: 'grid', gap: '8px' }}>
          {dayLessons.map(lesson => (
            <div
              key={lesson.id}
              className="card"
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px'
              }}
            >
              <div style={{ 
                minWidth: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'var(--blue-100)',
                color: 'var(--blue-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700
              }}>
                {lesson.lesson_number}
              </div>
              
              <select
                className="input"
                value={lesson.subject_id}
                onChange={(e) => updateLesson(lesson.id, e.target.value)}
                style={{ flex: 1 }}
              >
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>

              <button
                className="btn"
                onClick={() => deleteLesson(lesson.id)}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {/* Добавить урок */}
        {dayLessons.length < MAX_LESSONS && (
          <div style={{ marginTop: '16px' }}>
            <button
              className="btn primary"
              onClick={() => {
                const nextLessonNumber = dayLessons.length > 0 
                  ? Math.max(...dayLessons.map(l => l.lesson_number)) + 1
                  : 1
                if (subjects.length > 0) {
                  addLesson(selectedDay, nextLessonNumber, subjects[0].id)
                }
              }}
            >
              + Добавить урок
            </button>
          </div>
        )}

        {dayLessons.length === 0 && (
          <div className="tip" style={{ marginTop: '16px' }}>
            Нет уроков на этот день. Нажмите "Добавить урок" чтобы создать расписание.
          </div>
        )}
      </div>

      {/* Сводка по неделе */}
      <div style={{ marginTop: '32px' }}>
        <div className="h3" style={{ marginBottom: '12px' }}>Сводка по неделе</div>
        <div style={{ display: 'grid', gap: '8px' }}>
          {DAYS.map(day => {
            const lessons = getLessonsForDay(day.num)
            return (
              <div
                key={day.num}
                className="card"
                style={{ 
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ fontWeight: 600 }}>{day.name}</div>
                <div className="tip">
                  {lessons.length === 0 ? 'Нет уроков' : `${lessons.length} ${lessons.length === 1 ? 'урок' : 'уроков'}`}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
