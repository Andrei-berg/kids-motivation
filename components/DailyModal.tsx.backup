'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { updateStreaks } from '@/lib/streaks'
import { checkAndAwardBadges } from '@/lib/badges'
import { normalizeDate, getGradeColor, getGradeEmoji } from '@/utils/helpers'
import { triggerConfetti } from '@/utils/confetti'

type Tab = 'study' | 'room' | 'day' | 'sport'

interface SubjectGrade {
  subject: string
  grade: number
  note: string
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

  // УЧЁБА
  const [subjects, setSubjects] = useState<SubjectGrade[]>([])
  const [subjectInput, setSubjectInput] = useState('')
  const [gradeSelected, setGradeSelected] = useState(4)
  const [noteInput, setNoteInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

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
  const [sportRunning, setSportRunning] = useState(false)
  const [sportExercises, setSportExercises] = useState(false)
  const [sportOutdoor, setSportOutdoor] = useState(false)
  const [sportStretching, setSportStretching] = useState(false)
  const [sportMinutes, setSportMinutes] = useState(0)
  const [sportNote, setSportNote] = useState('')

  // Загрузка данных при открытии
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, date, childId])

  async function loadData() {
    try {
      // Загрузить оценки за день
      const grades = await api.getSubjectGradesForDate(childId, date)
      setSubjects(grades.map(g => ({
        subject: g.subject,
        grade: g.grade,
        note: g.note || ''
      })))

      // Загрузить спорт
      const sport = await api.getHomeSportForDate(childId, date)
      if (sport) {
        setSportRunning(sport.running)
        setSportExercises(sport.exercises)
        setSportOutdoor(sport.outdoor_games)
        setSportStretching(sport.stretching)
        setSportMinutes(sport.total_minutes)
        setSportNote(sport.note || '')
      }
    } catch (err) {
      console.error('Error loading data:', err)
    }
  }

  // Автокомплит предметов
  async function handleSubjectInput(value: string) {
    setSubjectInput(value)
    if (value.length > 1) {
      const sugg = await api.getSubjectSuggestions(childId, value)
      setSuggestions(sugg)
    }
  }

  // Добавить предмет
  function addSubject() {
    if (!subjectInput.trim()) {
      alert('Введи предмет')
      return
    }

    setSubjects([...subjects, {
      subject: subjectInput.trim(),
      grade: gradeSelected,
      note: noteInput.trim()
    }])

    setSubjectInput('')
    setNoteInput('')
  }

  // Удалить предмет
  function removeSubject(index: number) {
    setSubjects(subjects.filter((_, i) => i !== index))
  }

  // RoomScore
  const roomScore = [roomBed, roomFloor, roomDesk, roomCloset, roomTrash].filter(Boolean).length
  const roomOk = roomScore >= 3

  // Сохранить
  async function save(closeAfter: boolean) {
    try {
      setLoading(true)
      setStatus('Сохраняю...')
      setError(false)

      // 1. Сохранить оценки
      for (const subj of subjects) {
        await api.addSubjectGrade({
          childId,
          date,
          subject: subj.subject,
          grade: subj.grade,
          note: subj.note
        })
      }

      // 2. Сохранить день
      await api.saveDay({
        childId,
        date,
        roomData: {
          bed: roomBed,
          floor: roomFloor,
          desk: roomDesk,
          closet: roomCloset,
          trash: roomTrash
        },
        goodBehavior,
        diaryNotDone,
        noteParent: dayNote
      })

      // 3. Сохранить спорт
      const hasAnySport = sportRunning || sportExercises || sportOutdoor || sportStretching
      if (hasAnySport || sportMinutes > 0) {
        await api.saveHomeSport({
          childId,
          date,
          running: sportRunning,
          exercises: sportExercises,
          outdoorGames: sportOutdoor,
          stretching: sportStretching,
          totalMinutes: sportMinutes,
          note: sportNote
        })
      }

      setStatus('Готово! ✅')
      
      // Обновить стрики
      await updateStreaks(childId, date)
      
      // Проверить бейджи
      const badges = await checkAndAwardBadges(childId, date)
      if (badges.length > 0) {
        triggerConfetti()
        setStatus(`Готово! ✅ Получен бейдж! 🏆`)
      }
      
      if (onSave) onSave()
      
      if (closeAfter) {
        setTimeout(() => onClose(), 500)
      }
    } catch (err: any) {
      setStatus('Ошибка: ' + err.message)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="backdrop show">
      <div className="modal big">
        {/* Header */}
        <div className="modalH">
          <div>
            <div className="h">➕ Daily — ввод дня</div>
            <div className="muted">Ребёнок: {childId} • Дата: {date}</div>
          </div>
          <button className="pill" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="row" style={{ gap: '8px', marginBottom: '16px' }}>
          <button 
            className={`pill ${tab === 'study' ? 'active' : ''}`}
            onClick={() => setTab('study')}
          >
            📚 Учёба
          </button>
          <button 
            className={`pill ${tab === 'room' ? 'active' : ''}`}
            onClick={() => setTab('room')}
          >
            🧹 Комната
          </button>
          <button 
            className={`pill ${tab === 'day' ? 'active' : ''}`}
            onClick={() => setTab('day')}
          >
            😊 День
          </button>
          <button 
            className={`pill ${tab === 'sport' ? 'active' : ''}`}
            onClick={() => setTab('sport')}
          >
            💪 Спорт
          </button>
        </div>

        {/* УЧЁБА */}
        {tab === 'study' && (
          <div className="fade-in">
            <div className="card">
              <div className="cardH">
                <div className="h">📚 Предметы за день</div>
                <div className="muted">добавляй по одному</div>
              </div>

              {/* Форма добавления */}
              <div className="row" style={{ gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ minWidth: '280px' }}>
                  <div className="muted" style={{ fontSize: '13px', marginBottom: '6px' }}>Предмет</div>
                  <input
                    list="subjects-list"
                    value={subjectInput}
                    onChange={(e) => handleSubjectInput(e.target.value)}
                    placeholder="Например: математика"
                    style={{ width: '320px' }}
                  />
                  <datalist id="subjects-list">
                    {suggestions.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

                <div>
                  <div className="muted" style={{ fontSize: '13px', marginBottom: '6px' }}>Оценка</div>
                  <div className="row" style={{ gap: '8px' }}>
                    {[2, 3, 4, 5].map(g => (
                      <button
                        key={g}
                        className={`pill ${gradeSelected === g ? 'active' : ''}`}
                        onClick={() => setGradeSelected(g)}
                        style={{ 
                          borderColor: gradeSelected === g ? getGradeColor(g) : undefined,
                          background: gradeSelected === g ? getGradeColor(g) : undefined,
                          color: gradeSelected === g ? '#fff' : undefined
                        }}
                      >
                        {g} {getGradeEmoji(g)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ minWidth: '280px' }}>
                  <div className="muted" style={{ fontSize: '13px', marginBottom: '6px' }}>Комментарий (опционально)</div>
                  <input
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="коротко"
                    style={{ width: '320px' }}
                  />
                </div>

                <button className="btn primary" onClick={addSubject}>
                  ➕ Добавить
                </button>
              </div>

              {/* Список предметов */}
              {subjects.length > 0 && (
                <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
                  {subjects.map((s, i) => (
                    <div key={i} className="mini">
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <div className="h" style={{ color: getGradeColor(s.grade) }}>
                          📚 {s.subject} — {s.grade} {getGradeEmoji(s.grade)}
                        </div>
                        <button className="pill" onClick={() => removeSubject(i)}>
                          Удалить
                        </button>
                      </div>
                      {s.note && <div className="tip">{s.note}</div>}
                    </div>
                  ))}
                </div>
              )}

              {subjects.length === 0 && (
                <div className="tip" style={{ marginTop: '12px' }}>
                  Добавь хотя бы один предмет
                </div>
              )}
            </div>
          </div>
        )}

        {/* КОМНАТА */}
        {tab === 'room' && (
          <div className="fade-in">
            <div className="card">
              <div className="cardH">
                <div className="h">🧹 Чеклист комнаты</div>
                <div className="muted">3 из 5 = день засчитан</div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={roomBed} onChange={(e) => setRoomBed(e.target.checked)} />
                  🛏️ Кровать заправлена
                </label>
                <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={roomFloor} onChange={(e) => setRoomFloor(e.target.checked)} />
                  👕 Вещи/пол убраны
                </label>
                <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={roomDesk} onChange={(e) => setRoomDesk(e.target.checked)} />
                  📚 Стол чистый
                </label>
                <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={roomCloset} onChange={(e) => setRoomCloset(e.target.checked)} />
                  🚪 Шкаф/полки ок
                </label>
                <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={roomTrash} onChange={(e) => setRoomTrash(e.target.checked)} />
                  🗑️ Мусор вынесен
                </label>
              </div>

              {/* Progress */}
              <div style={{ marginTop: '16px' }}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div className="muted">RoomScore: {roomScore} / 5</div>
                  <div className="muted">{roomOk ? '✅ Засчитано' : '❌ Не засчитано'}</div>
                </div>
                <div className="progress">
                  <div 
                    className="fill" 
                    style={{ 
                      width: `${(roomScore / 5) * 100}%`,
                      background: roomOk ? 'var(--gradient-success)' : 'var(--warning)'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ДЕНЬ */}
        {tab === 'day' && (
          <div className="fade-in">
            <div className="card">
              <div className="cardH">
                <div className="h">😊 День</div>
                <div className="muted">без давления</div>
              </div>

              <div className="row" style={{ gap: '14px', flexWrap: 'wrap' }}>
                <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={goodBehavior} onChange={(e) => setGoodBehavior(e.target.checked)} />
                  😊 Хорошее поведение
                </label>

                <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={diaryNotDone} onChange={(e) => setDiaryNotDone(e.target.checked)} />
                  📓 Дневник не заполнен
                </label>
              </div>

              <div style={{ marginTop: '12px' }}>
                <div className="h">Заметка (опционально)</div>
                <input
                  type="text"
                  value={dayNote}
                  onChange={(e) => setDayNote(e.target.value)}
                  placeholder="Коротко (например: сделал турник / помог дома)"
                  style={{ width: 'min(900px, 95%)' }}
                />
              </div>

              <div className="tip" style={{ marginTop: '12px' }}>
                Ошибки не обнуляют прогресс. Главное — вернуться.
              </div>
            </div>
          </div>
        )}

        {/* СПОРТ */}
        {tab === 'sport' && (
          <div className="fade-in">
            <div className="card">
              <div className="cardH">
                <div className="h">💪 Домашний спорт</div>
                <div className="muted">отметь что делал</div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sportRunning} onChange={(e) => setSportRunning(e.target.checked)} />
                  🏃 Пробежка
                </label>
                <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sportExercises} onChange={(e) => setSportExercises(e.target.checked)} />
                  🏋️ Упражнения
                </label>
                <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sportOutdoor} onChange={(e) => setSportOutdoor(e.target.checked)} />
                  ⚽ Игры на улице
                </label>
                <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={sportStretching} onChange={(e) => setSportStretching(e.target.checked)} />
                  🧘 Растяжка
                </label>
              </div>

              <div style={{ marginTop: '16px' }}>
                <div className="h">Сколько минут?</div>
                <input
                  type="number"
                  value={sportMinutes}
                  onChange={(e) => setSportMinutes(Number(e.target.value))}
                  placeholder="30"
                  style={{ width: '120px' }}
                  min="0"
                />
              </div>

              <div style={{ marginTop: '12px' }}>
                <div className="h">Заметка (опционально)</div>
                <input
                  type="text"
                  value={sportNote}
                  onChange={(e) => setSportNote(e.target.value)}
                  placeholder="Что делал?"
                  style={{ width: 'min(600px, 95%)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        {status && (
          <div className={`status ${error ? 'err' : 'success'}`} style={{ marginTop: '16px' }}>
            {status}
          </div>
        )}

        {/* Footer */}
        <div className="row" style={{ gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose} disabled={loading}>
            Отмена
          </button>
          <button className="btn ghost" onClick={() => save(false)} disabled={loading}>
            Сохранить
          </button>
          <button className="btn primary" onClick={() => save(true)} disabled={loading}>
            Сохранить и закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
