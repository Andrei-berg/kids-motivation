'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/lib/i18n'
import { api } from '@/lib/api'
import { flexibleApi, Subject } from '@/lib/flexible-api'
import { getWeekRange, getDatesInRange, formatDate, getDayName, normalizeDate, addDays } from '@/utils/helpers'

interface BulkModalProps {
  isOpen: boolean
  onClose: () => void
  childId: string
}

interface SubjectRow {
  subject: string
  grades: { [date: string]: number }
}

export default function BulkModal({ isOpen, onClose, childId }: BulkModalProps) {
  const t = useT()
  const [weekStart, setWeekStart] = useState(normalizeDate(new Date()))
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
  const [newSubject, setNewSubject] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  // Получить рабочие дни недели (пн-пт)
  const week = getWeekRange(weekStart)
  const weekDays = getDatesInRange(week.start, addDays(week.start, 4)) // пн-пт

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, weekStart, childId])

  async function loadData() {
    setLoading(true)
    try {
      // Загрузить доступные предметы из Settings
      const activeSubjects = await flexibleApi.getActiveSubjects(childId)
      setAvailableSubjects(activeSubjects)
      
      // Загрузить все оценки за неделю
      const data = await api.getWeekData(childId, weekStart)
      
      // Сгруппировать по предметам
      const subjectsMap: { [subject: string]: { [date: string]: number } } = {}
      
      data.grades.forEach(g => {
        if (!subjectsMap[g.subject]) {
          subjectsMap[g.subject] = {}
        }
        subjectsMap[g.subject][g.date] = g.grade
      })
      
      // Преобразовать в массив
      const subjectsList = Object.keys(subjectsMap).map(subject => ({
        subject,
        grades: subjectsMap[subject]
      }))
      
      setSubjects(subjectsList)
    } catch (err) {
      console.error('Error loading bulk data:', err)
    } finally {
      setLoading(false)
    }
  }

  function addSubject() {
    if (!newSubject) return

    // Проверить что предмет ещё не добавлен
    if (subjects.find(s => s.subject === newSubject)) {
      alert(t('bulkModalExtra.duplicateAlert'))
      return
    }
    
    setSubjects([...subjects, {
      subject: newSubject,
      grades: {}
    }])
    setNewSubject('')
  }

  function removeSubject(index: number) {
    setSubjects(subjects.filter((_, i) => i !== index))
  }

  function updateGrade(subjectIndex: number, date: string, grade: number) {
    const newSubjects = [...subjects]
    if (grade >= 2 && grade <= 5) {
      newSubjects[subjectIndex].grades[date] = grade
    } else {
      delete newSubjects[subjectIndex].grades[date]
    }
    setSubjects(newSubjects)
  }

  async function save() {
    try {
      setLoading(true)
      setStatus(t('bulkModalExtra.savingStatus'))

      // Сохранить все оценки
      for (const subject of subjects) {
        for (const [date, grade] of Object.entries(subject.grades)) {
          await api.addSubjectGrade({
            childId,
            date,
            subject: subject.subject,
            grade
          })
        }
      }

      setStatus(t('bulkModalExtra.doneStatus'))
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: any) {
      setStatus(t('bulkModalExtra.errorStatus', { msg: err.message }))
    } finally {
      setLoading(false)
    }
  }

  function fillAll(subjectIndex: number, grade: number) {
    const newSubjects = [...subjects]
    weekDays.forEach(date => {
      newSubjects[subjectIndex].grades[date] = grade
    })
    setSubjects(newSubjects)
  }

  if (!isOpen) return null

  return (
    <div className="backdrop show">
      <div className="modal big">
        <div className="modalH">
          <div>
            <div className="h">{t('bulkModalExtra.heading')}</div>
            <div className="muted">{t('bulkModalExtra.subtitle')}</div>
          </div>
          <button className="pill" onClick={onClose}>✕</button>
        </div>

        {/* Week Picker */}
        <div className="card" style={{ marginBottom: '16px' }}>
          <div className="row" style={{ gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="h">{t('bulkModalExtra.weekLabel')}</div>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              style={{ padding: '8px 12px' }}
            />
            <div className="muted">
              {t('bulkModalExtra.weekRange', { from: formatDate(weekStart), to: formatDate(addDays(weekStart, 4)) })}
            </div>
            <button
              className="btn ghost"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              {t('bulkModalExtra.prevBtn')}
            </button>
            <button
              className="btn ghost"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              {t('bulkModalExtra.nextBtn')}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={{ width: '200px' }}>{t('bulkModalExtra.subjectCol')}</th>
                {weekDays.map(date => (
                  <th key={date} style={{ textAlign: 'center', minWidth: '80px' }}>
                    {getDayName(date, true)}
                    <br/>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {formatDate(date)}
                    </span>
                  </th>
                ))}
                <th style={{ width: '140px' }}>{t('bulkModalExtra.actionsCol')}</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((subject, subIndex) => (
                <tr key={subIndex}>
                  <td>
                    <strong>{subject.subject}</strong>
                  </td>
                  {weekDays.map(date => {
                    const grade = subject.grades[date]
                    return (
                      <td key={date} style={{ textAlign: 'center' }}>
                        <input
                          type="number"
                          value={grade || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            updateGrade(subIndex, date, val ? Number(val) : 0)
                          }}
                          min="2"
                          max="5"
                          placeholder="—"
                          style={{
                            width: '50px',
                            textAlign: 'center',
                            padding: '6px',
                            border: `2px solid ${grade ? (
                              grade === 5 ? '#10b981' :
                              grade === 4 ? '#3b82f6' :
                              grade === 3 ? '#f59e0b' : '#ef4444'
                            ) : 'var(--line)'}`
                          }}
                        />
                      </td>
                    )
                  })}
                  <td>
                    <div className="row" style={{ gap: '4px', justifyContent: 'center' }}>
                      <button
                        className="pill"
                        onClick={() => fillAll(subIndex, 5)}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        5️⃣
                      </button>
                      <button
                        className="pill"
                        onClick={() => fillAll(subIndex, 4)}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        4️⃣
                      </button>
                      <button
                        className="pill"
                        onClick={() => removeSubject(subIndex)}
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Subject */}
          <div className="row" style={{ gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
            <select
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              style={{ flex: 1, maxWidth: '300px', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--line)' }}
            >
              <option value="">{t('bulkModalExtra.addSubjectPlaceholder')}</option>
              {availableSubjects
                .filter(subj => !subjects.find(s => s.subject === subj.name))
                .map(subj => (
                  <option key={subj.id} value={subj.name}>{subj.name}</option>
                ))
              }
            </select>
            <button className="btn primary" onClick={addSubject} disabled={!newSubject}>
              {t('bulkModalExtra.addSubjectBtn')}
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="card" style={{ marginTop: '16px', background: 'var(--blue-50)' }}>
          <div className="h" style={{ marginBottom: '8px' }}>{t('bulkModalExtra.tipsTitle')}</div>
          <ul style={{ paddingLeft: '20px' }}>
            <li>{t('bulkModalExtra.tip1')}</li>
            <li>{t('bulkModalExtra.tip2')}</li>
            <li>{t('bulkModalExtra.tip3')}</li>
            <li>{t('bulkModalExtra.tip4')}</li>
          </ul>
        </div>

        {/* Status */}
        {status && (
          <div className="status success" style={{ marginTop: '16px' }}>
            {status}
          </div>
        )}

        {/* Footer */}
        <div className="row" style={{ gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose} disabled={loading}>
            {t('bulkModal.cancel')}
          </button>
          <button className="btn primary" onClick={save} disabled={loading}>
            {loading ? t('bulkModalExtra.savingBtn') : t('bulkModalExtra.saveAllBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
