'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import { api } from '@/lib/api'
import { 
  normalizeDate, 
  getWeekRange, 
  formatWeekRange, 
  addDays, 
  formatMoney,
  verifyPin
} from '@/utils/helpers'

export default function WeeklyReview() {
  const [childId, setChildId] = useState('adam')
  const [weekStart, setWeekStart] = useState(normalizeDate(new Date()))
  const [loading, setLoading] = useState(false)
  
  // Auth
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  // Data
  const [weekData, setWeekData] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  
  // Form
  const [all5Mode, setAll5Mode] = useState(false)
  const [extraBonus, setExtraBonus] = useState(0)
  const [penaltiesManual, setPenaltiesManual] = useState(0)
  const [noteParent, setNoteParent] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('v4_selected_kid')
    if (saved) setChildId(saved)
  }, [])

  useEffect(() => {
    if (childId) {
      loadData()
    }
  }, [childId, weekStart])

  async function loadData() {
    try {
      setLoading(true)
      
      const [data, sett] = await Promise.all([
        api.getWeekData(childId, weekStart),
        api.getSettings()
      ])
      
      setWeekData(data)
      setSettings(sett)
      
      // Если неделя уже закрыта, загрузить данные
      if (data.weekRecord) {
        setAll5Mode(data.weekRecord.all5_mode)
        setExtraBonus(data.weekRecord.extra_bonus)
        setPenaltiesManual(data.weekRecord.penalties_manual)
        setNoteParent(data.weekRecord.note_parent || '')
      }
    } catch (err) {
      console.error('Error loading weekly:', err)
    } finally {
      setLoading(false)
    }
  }

  function checkPin() {
    const hash = process.env.NEXT_PUBLIC_PARENT_PIN_HASH || 'MTIzNA=='
    if (verifyPin(pinInput, hash)) {
      setIsAuthenticated(true)
      setShowPinPrompt(false)
      setPinError('')
      setPinInput('')
    } else {
      setPinError('Неверный PIN')
    }
  }

  // Расчёты
  function calculateWeek() {
    if (!weekData || !settings) return null
    
    const week = getWeekRange(weekStart)
    
    // Базовая сумма
    const base = settings.baseWeekly || 500
    
    // Оценки
    const grades = weekData.grades
    const count5 = grades.filter((g: any) => g.grade === 5).length
    const count4 = grades.filter((g: any) => g.grade === 4).length
    const count3 = grades.filter((g: any) => g.grade === 3).length
    const count2 = grades.filter((g: any) => g.grade === 2).length
    
    let studyTotal = 0
    if (all5Mode && count5 > 0 && count4 === 0 && count3 === 0 && count2 === 0) {
      studyTotal = settings.bonusAll5 || 500
    } else {
      studyTotal = 
        (count5 * (settings.per5 || 50)) +
        (count4 * (settings.per4 || 10)) +
        (count3 * (settings.pen3 || -50)) +
        (count2 * (settings.pen2 || -100))
    }
    
    // Комната
    const roomDays = weekData.days.filter((d: any) => d.room_ok).length
    let roomBonus = 0
    if (roomDays === 7) roomBonus = settings.room7of7 || 100
    else if (roomDays >= 5) roomBonus = settings.room5of7 || 50
    
    // Спорт
    const sportDays = weekData.sports.filter((s: any) => 
      s.running || s.exercises || s.outdoor_games || s.stretching
    ).length
    const sportBonus = sportDays >= 3 ? (settings.sportBonusWeek || 150) : 0
    
    // Дневник
    const diaryMissed = weekData.days.filter((d: any) => d.diary_not_done).length
    const diaryPenalty = diaryMissed * (settings.diaryPenalty || -50)
    
    // Стрики (упрощенно)
    const streakBonuses = 0 // TODO: calculate streaks
    
    // Итого
    const total = base + studyTotal + roomBonus + sportBonus + streakBonuses + extraBonus + diaryPenalty + penaltiesManual
    
    return {
      base,
      studyTotal,
      roomBonus,
      sportBonus,
      streakBonuses,
      diaryPenalty,
      total,
      grades: { count5, count4, count3, count2 },
      roomDays,
      sportDays,
      diaryMissed
    }
  }

  async function finalizeWeek() {
    if (!isAuthenticated) {
      setShowPinPrompt(true)
      return
    }
    
    const calc = calculateWeek()
    if (!calc) return
    
    try {
      setLoading(true)
      
      await api.finalizeWeek({
        childId,
        weekStart,
        all5Mode,
        extraBonus,
        penaltiesManual,
        noteParent,
        breakdown: {
          base: calc.base,
          studyTotal: calc.studyTotal,
          roomBonus: calc.roomBonus,
          sportBonus: calc.sportBonus,
          streakBonuses: calc.streakBonuses,
          total: calc.total
        }
      })
      
      alert('Неделя закрыта! ✅')
      await loadData()
    } catch (err) {
      alert('Ошибка закрытия недели')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !weekData) {
    return (
      <>
        <NavBar />
        <div className="wrap">
          <div className="card text-center" style={{ padding: '60px' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        </div>
      </>
    )
  }

  const calc = calculateWeek()
  const week = getWeekRange(weekStart)
  const isFinalized = weekData?.weekRecord?.finalized || false

  // PIN Prompt
  if (showPinPrompt) {
    return (
      <div className="backdrop show">
        <div className="modal" style={{ maxWidth: '400px' }}>
          <div className="modalH">
            <div className="h">🔐 Родительский PIN</div>
            <button className="pill" onClick={() => setShowPinPrompt(false)}>✕</button>
          </div>

          <input
            type="password"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && checkPin()}
            placeholder="Введи PIN"
            style={{ width: '100%', fontSize: '18px', textAlign: 'center', padding: '12px' }}
            autoFocus
          />
          {pinError && <div className="status err" style={{ marginTop: '8px' }}>{pinError}</div>}

          <div className="row" style={{ gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={() => setShowPinPrompt(false)}>Отмена</button>
            <button className="btn primary" onClick={checkPin}>Проверить</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <NavBar />
      <div className="wrap">
        {/* Header */}
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div>
              <div className="h1">👨 Weekly Review</div>
              <div className="muted">{formatWeekRange(week.start, week.end)}</div>
            </div>
            <div className="row" style={{ gap: '8px' }}>
              <button className="btn ghost" onClick={() => setWeekStart(addDays(weekStart, -7))}>
                ← Пред
              </button>
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px' }}
              />
              <button className="btn ghost" onClick={() => setWeekStart(addDays(weekStart, 7))}>
                След →
              </button>
            </div>
          </div>
        </div>

        {isFinalized && (
          <div className="card" style={{ marginTop: '16px', background: 'var(--emerald-50)' }}>
            <div className="h">✅ Неделя закрыта</div>
            <div className="muted">Финализирована {new Date(weekData.weekRecord.finalized_at).toLocaleString()}</div>
          </div>
        )}

        {/* Stats */}
        <div className="grid3" style={{ marginTop: '16px' }}>
          <div className="card">
            <div className="h">📚 Оценки</div>
            <div className="row" style={{ gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
              <div className="badge" style={{ background: '#10b981', color: '#fff' }}>
                5️⃣ {calc?.grades.count5 || 0}
              </div>
              <div className="badge" style={{ background: '#3b82f6', color: '#fff' }}>
                4️⃣ {calc?.grades.count4 || 0}
              </div>
              <div className="badge" style={{ background: '#f59e0b', color: '#fff' }}>
                3️⃣ {calc?.grades.count3 || 0}
              </div>
              <div className="badge" style={{ background: '#ef4444', color: '#fff' }}>
                2️⃣ {calc?.grades.count2 || 0}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="h">🧹 Комната</div>
            <div className="val" style={{ marginTop: '8px' }}>
              {calc?.roomDays || 0} / 7 дней
            </div>
          </div>

          <div className="card">
            <div className="h">💪 Спорт</div>
            <div className="val" style={{ marginTop: '8px' }}>
              {calc?.sportDays || 0} занятий
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="card" style={{ marginTop: '16px' }}>
          <div className="cardH">
            <div className="h">💰 Breakdown расчёта</div>
            <div className="muted">подробно</div>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            <div className="mini">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="lab">Базовая сумма</div>
                <div className="val">{formatMoney(calc?.base || 0)}</div>
              </div>
            </div>

            <div className="mini">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="lab">
                  Учёба {all5Mode && '(режим "Все пятёрки")'}
                </div>
                <div className="val" style={{ color: calc && calc.studyTotal >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {calc && calc.studyTotal >= 0 ? '+' : ''}{formatMoney(calc?.studyTotal || 0)}
                </div>
              </div>
            </div>

            <div className="mini">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="lab">Бонус за комнату</div>
                <div className="val" style={{ color: 'var(--success)' }}>
                  +{formatMoney(calc?.roomBonus || 0)}
                </div>
              </div>
            </div>

            <div className="mini">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="lab">Бонус за спорт</div>
                <div className="val" style={{ color: 'var(--success)' }}>
                  +{formatMoney(calc?.sportBonus || 0)}
                </div>
              </div>
            </div>

            <div className="mini">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="lab">Штраф за дневник</div>
                <div className="val" style={{ color: 'var(--danger)' }}>
                  {formatMoney(calc?.diaryPenalty || 0)}
                </div>
              </div>
            </div>

            <div className="mini">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="lab">Доп. бонус (родитель)</div>
                <div className="val" style={{ color: 'var(--success)' }}>
                  +{formatMoney(extraBonus)}
                </div>
              </div>
            </div>

            <div className="mini">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div className="lab">Штраф (родитель)</div>
                <div className="val" style={{ color: 'var(--danger)' }}>
                  {formatMoney(penaltiesManual)}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '2px solid var(--primary)', paddingTop: '12px', marginTop: '8px' }}>
              <div className="kpi" style={{ background: 'var(--emerald-50)' }}>
                <div className="lab">ИТОГО</div>
                <div className="val">{formatMoney(calc?.total || 0)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Parent Controls */}
        {!isFinalized && (
          <div className="card" style={{ marginTop: '16px', background: 'var(--amber-50)' }}>
            <div className="cardH">
              <div className="h">👨 Родительские настройки</div>
              <div className="muted">требуется PIN</div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <label className="pill" style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={all5Mode} 
                  onChange={(e) => {
                    if (!isAuthenticated) {
                      setShowPinPrompt(true)
                    } else {
                      setAll5Mode(e.target.checked)
                    }
                  }} 
                />
                ⭐ Режим "Все пятёрки" (+{formatMoney(settings?.bonusAll5 || 500)})
              </label>

              <div>
                <div className="muted" style={{ marginBottom: '6px' }}>Доп. бонус (₽)</div>
                <input
                  type="number"
                  value={extraBonus}
                  onChange={(e) => {
                    if (!isAuthenticated) {
                      setShowPinPrompt(true)
                    } else {
                      setExtraBonus(Number(e.target.value))
                    }
                  }}
                  style={{ width: '200px' }}
                  min="0"
                  step="50"
                />
              </div>

              <div>
                <div className="muted" style={{ marginBottom: '6px' }}>Штраф (₽, отрицательное число)</div>
                <input
                  type="number"
                  value={penaltiesManual}
                  onChange={(e) => {
                    if (!isAuthenticated) {
                      setShowPinPrompt(true)
                    } else {
                      setPenaltiesManual(Number(e.target.value))
                    }
                  }}
                  style={{ width: '200px' }}
                  max="0"
                  step="-50"
                />
              </div>

              <div>
                <div className="muted" style={{ marginBottom: '6px' }}>Заметка родителя</div>
                <textarea
                  value={noteParent}
                  onChange={(e) => {
                    if (!isAuthenticated) {
                      setShowPinPrompt(true)
                    } else {
                      setNoteParent(e.target.value)
                    }
                  }}
                  placeholder="Комментарий о неделе..."
                  rows={3}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <button 
              className="btn primary" 
              style={{ marginTop: '16px', width: '100%' }}
              onClick={finalizeWeek}
              disabled={loading}
            >
              {loading ? 'Сохраняю...' : '✅ Финализировать неделю'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
