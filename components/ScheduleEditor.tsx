'use client'

import { useState, useEffect } from 'react'
import { flexibleApi, Subject, ScheduleLesson } from '@/lib/flexible-api'
import { useT } from '@/lib/i18n'

interface ScheduleEditorProps {
  childId: string
}

// Day names are computed inside the component using t() — see useDays() below

const MAX_LESSONS = 8

export default function ScheduleEditor({ childId }: ScheduleEditorProps) {
  const t = useT()
  const DAYS = [
    { num: 1, name: t('settings.scheduleEditor.monday') },
    { num: 2, name: t('settings.scheduleEditor.tuesday') },
    { num: 3, name: t('settings.scheduleEditor.wednesday') },
    { num: 4, name: t('settings.scheduleEditor.thursday') },
    { num: 5, name: t('settings.scheduleEditor.friday') },
  ]
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
        alert(t('settings.scheduleEditor.duplicateLesson'))
      } else {
        alert(t('settings.scheduleEditor.addError'))
      }
    }
  }

  async function updateLesson(id: string, subjectId: string) {
    try {
      await flexibleApi.updateScheduleLesson(id, subjectId)
      await loadData()
    } catch (err) {
      alert(t('settings.scheduleEditor.updateError'))
    }
  }

  async function deleteLesson(id: string) {
    try {
      await flexibleApi.deleteScheduleLesson(id)
      await loadData()
    } catch (err) {
      alert(t('settings.scheduleEditor.deleteError'))
    }
  }

  async function clearAllSchedule() {
    if (!confirm(t('settings.scheduleEditor.clearConfirm'))) return

    try {
      await flexibleApi.clearSchedule(childId)
      await loadData()
    } catch (err) {
      alert(t('settings.scheduleEditor.clearError'))
    }
  }

  if (loading) {
    return <div>{t('common.loading')}</div>
  }

  if (subjects.length === 0) {
    return (
      <div className="tip">
        {t('settings.scheduleEditor.noSubjects')}
      </div>
    )
  }

  const dayLessons = getLessonsForDay(selectedDay)

  return (
    <div>
      <div className="h2">{t('settings.scheduleEditor.scheduleTitle')}</div>
      
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
            {DAYS.find(d => d.num === selectedDay)?.name} ({dayLessons.length === 1 ? t('settings.scheduleEditor.lessonCount', { count: dayLessons.length }) : t('settings.scheduleEditor.lessonsCount', { count: dayLessons.length })})
          </div>
          {schedule.length > 0 && (
            <button className="btn" onClick={clearAllSchedule}>
              {t('settings.scheduleEditor.clearAll')}
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
              + {t('settings.scheduleEditor.addLesson')}
            </button>
          </div>
        )}

        {dayLessons.length === 0 && (
          <div className="tip" style={{ marginTop: '16px' }}>
            {t('settings.scheduleEditor.noLessons')}
          </div>
        )}
      </div>

      {/* Сводка по неделе */}
      <div style={{ marginTop: '32px' }}>
        <div className="h3" style={{ marginBottom: '12px' }}>{t('settings.scheduleEditor.weeklySummary')}</div>
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
                  {lessons.length === 0 ? t('settings.scheduleEditor.noLessonsShort') : lessons.length === 1 ? t('settings.scheduleEditor.lessonCount', { count: lessons.length }) : t('settings.scheduleEditor.lessonsCount', { count: lessons.length })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
