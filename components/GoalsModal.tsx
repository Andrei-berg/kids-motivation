'use client'

import { useState, useEffect } from 'react'
import { useT } from '@/lib/i18n'
import { api, Goal } from '@/lib/api'
import { formatMoney, calculatePercentage, verifyPin } from '@/utils/helpers'
import { triggerGoalConfetti } from '@/utils/confetti'

interface GoalsModalProps {
  isOpen: boolean
  onClose: () => void
  childId: string
}

export default function GoalsModal({ isOpen, onClose, childId }: GoalsModalProps) {
  const t = useT()
  const [loading, setLoading] = useState(false)
  const [goals, setGoals] = useState<{ active: Goal | null; all: Goal[]; archived: Goal[] }>({
    active: null,
    all: [],
    archived: []
  })
  
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState(10000)

  useEffect(() => {
    if (isOpen) {
      loadGoals()
    }
  }, [isOpen, childId])

  useEffect(() => {
    // Показать confetti если цель достигнута
    if (goals.active && calculatePercentage(goals.active.current, goals.active.target) >= 100) {
      setTimeout(() => triggerGoalConfetti(), 500)
    }
  }, [goals.active])

  async function loadGoals() {
    setLoading(true)
    try {
      const data = await api.getGoals(childId)
      setGoals(data)
    } catch (err) {
      console.error('Error loading goals:', err)
    } finally {
      setLoading(false)
    }
  }

  function requestAuth(callback: () => void) {
    setShowPinPrompt(true)
    // Store callback for after auth
    ;(window as any).__goalCallback = callback
  }

  function checkPin() {
    const hash = process.env.NEXT_PUBLIC_PARENT_PIN_HASH || 'MTIzNA=='
    if (verifyPin(pinInput, hash)) { // NOSONAR
      setIsAuthenticated(true)
      setShowPinPrompt(false)
      setPinError('')
      setPinInput('')
      
      // Execute stored callback
      const callback = (window as any).__goalCallback
      if (callback) {
        callback()
        ;(window as any).__goalCallback = null
      }
    } else {
      setPinError(t('kidLogin.wrongPin'))
    }
  }

  async function createGoal() {
    if (!newGoalTitle.trim()) {
      alert(t('goals.name') + ' ' + t('common.error'))
      return
    }

    try {
      await api.createGoal({
        childId,
        title: newGoalTitle.trim(),
        target: newGoalTarget
      })

      setShowCreateForm(false)
      setNewGoalTitle('')
      setNewGoalTarget(10000)

      await loadGoals()
    } catch (err) {
      alert(t('common.error'))
    }
  }

  async function setActive(goalId: string) {
    try {
      await api.setActiveGoal(childId, goalId)
      await loadGoals()
    } catch (err) {
      alert(t('common.error'))
    }
  }

  async function archiveGoal(goalId: string) {
    try {
      await api.archiveGoal(goalId, childId)
      await loadGoals()
    } catch (err) {
      alert(t('common.error'))
    }
  }

  if (!isOpen) return null

  const activeGoal = goals.active
  const progress = activeGoal ? calculatePercentage(activeGoal.current, activeGoal.target) : 0
  const remaining = activeGoal ? activeGoal.target - activeGoal.current : 0

  // PIN Prompt
  if (showPinPrompt) {
    return (
      <div className="backdrop show">
        <div className="modal" style={{ maxWidth: '400px' }}>
          <div className="modalH">
            <div className="h">{t('goalsModal.pinTitle')}</div>
            <button className="pill" onClick={() => {
              setShowPinPrompt(false)
              setPinInput('')
              setPinError('')
            }}>✕</button>
          </div>

          <div>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && checkPin()}
              placeholder={t('goalsModal.pinPlaceholder')}
              style={{ width: '100%', fontSize: '18px', textAlign: 'center', padding: '12px' }}
              autoFocus
            />
            {pinError && <div className="status err" style={{ marginTop: '8px' }}>{pinError}</div>}
          </div>

          <div className="row" style={{ gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
            <button className="btn ghost" onClick={() => setShowPinPrompt(false)}>{t('goals.cancel')}</button>
            <button className="btn primary" onClick={checkPin}>{t('goalsModal.pinCheck')}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="backdrop show">
      <div className="modal big">
        <div className="modalH">
          <div>
            <div className="h">{t('goals.title')}</div>
            <div className="muted">{t('goalsModal.savingsLabel')}</div>
          </div>
          <div className="row" style={{ gap: '8px' }}>
            <button
              className="btn primary"
              onClick={() => {
                if (!isAuthenticated) {
                  requestAuth(() => setShowCreateForm(true))
                } else {
                  setShowCreateForm(true)
                }
              }}
            >
              {t('goalsModal.newGoalBtn')}
            </button>
            <button className="pill" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="card" style={{ marginBottom: '16px', background: 'var(--emerald-50)' }}>
            <div className="h" style={{ marginBottom: '12px' }}>{t('goalsModal.newGoalTitle')}</div>

            <div style={{ marginBottom: '12px' }}>
              <div className="muted" style={{ marginBottom: '6px' }}>{t('goals.name')}</div>
              <input
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder={t('goalsModal.namePlaceholder')}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div className="muted" style={{ marginBottom: '6px' }}>{t('goalsModal.targetLabel')}</div>
              <input
                type="number"
                value={newGoalTarget}
                onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                style={{ width: '200px' }}
                min="100"
                step="100"
              />
            </div>

            <div className="row" style={{ gap: '8px' }}>
              <button className="btn primary" onClick={createGoal}>{t('goalsModal.createBtn')}</button>
              <button className="btn ghost" onClick={() => setShowCreateForm(false)}>{t('goals.cancel')}</button>
            </div>
          </div>
        )}

        {/* Active Goal */}
        {activeGoal && (
          <div className="card" style={{ marginBottom: '16px', boxShadow: 'var(--shadow-lg)' }}>
            <div className="cardH">
              <div className="h">{t('goalsModal.activeGoalTitle')}</div>
              <div className="muted">{progress}%</div>
            </div>

            {/* Main KPI */}
            <div className="kpi" style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)' }}>
              <div className="lab">{activeGoal.title}</div>
              <div className="val" style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                {formatMoney(activeGoal.current)} / {formatMoney(activeGoal.target)}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="progress" style={{ marginTop: '16px', height: '16px' }}>
              <div
                className="fill"
                style={{
                  width: `${progress}%`,
                  background: 'var(--gradient-goal)'
                }}
              />
            </div>

            {/* Stats */}
            <div className="grid3" style={{ marginTop: '16px' }}>
              <div className="mini">
                <div className="lab">{t('goalsModal.remainingLabel')}</div>
                <div className="val">{formatMoney(remaining)}</div>
              </div>
              <div className="mini">
                <div className="lab">{t('goalsModal.progressLabel')}</div>
                <div className="val">{progress}%</div>
              </div>
              <div className="mini">
                <div className="lab">{t('goalsModal.statusLabel')}</div>
                <div className="val">
                  {progress < 25 && t('goalsModal.statusStart')}
                  {progress >= 25 && progress < 50 && t('goalsModal.statusGrowing')}
                  {progress >= 50 && progress < 75 && t('goalsModal.statusHalf')}
                  {progress >= 75 && progress < 100 && t('goalsModal.statusAlmost')}
                  {progress >= 100 && t('goalsModal.statusDone')}
                </div>
              </div>
            </div>

            {/* Milestones */}
            <div style={{ marginTop: '16px' }}>
              <div className="h" style={{ marginBottom: '8px' }}>{t('goalsModal.milestonesTitle')}</div>
              <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                <div className={`badge ${progress >= 25 ? 'gold' : ''}`}>
                  25% {progress >= 25 ? '✅' : '⏳'}
                </div>
                <div className={`badge ${progress >= 50 ? 'gold' : ''}`}>
                  50% {progress >= 50 ? '✅' : '⏳'}
                </div>
                <div className={`badge ${progress >= 75 ? 'gold' : ''}`}>
                  75% {progress >= 75 ? '✅' : '⏳'}
                </div>
                <div className={`badge ${progress >= 100 ? 'gold' : ''}`}>
                  100% {progress >= 100 ? '🎉' : '⏳'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Goals */}
        {goals.all.filter(g => !g.active).length > 0 && (
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="cardH">
              <div className="h">{t('goalsModal.allGoalsTitle')}</div>
              <div className="muted">{t('goalsModal.countLabel', { count: goals.all.filter(g => !g.active).length })}</div>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {goals.all.filter(g => !g.active).map(goal => {
                const pct = calculatePercentage(goal.current, goal.target)
                return (
                  <div key={goal.id} className="mini">
                    <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div className="h">{goal.title}</div>
                      <div className="row" style={{ gap: '6px' }}>
                        <button
                          className="pill"
                          onClick={() => {
                            if (!isAuthenticated) {
                              requestAuth(() => setActive(goal.id))
                            } else {
                              setActive(goal.id)
                            }
                          }}
                        >
                          {t('goalsModal.activateBtn')}
                        </button>
                        <button
                          className="pill"
                          onClick={() => {
                            if (!isAuthenticated) {
                              requestAuth(() => archiveGoal(goal.id))
                            } else {
                              archiveGoal(goal.id)
                            }
                          }}
                        >
                          {t('goalsModal.archiveBtn')}
                        </button>
                      </div>
                    </div>
                    <div className="muted">{formatMoney(goal.current)} / {formatMoney(goal.target)} ({pct}%)</div>
                    <div className="progress" style={{ marginTop: '6px', height: '8px' }}>
                      <div className="fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Archived */}
        {goals.archived.length > 0 && (
          <div className="card" style={{ opacity: 0.7 }}>
            <div className="cardH">
              <div className="h">{t('goalsModal.archivedTitle')}</div>
              <div className="muted">{t('goalsModal.archivedCount', { count: goals.archived.length })}</div>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {goals.archived.map(goal => (
                <div key={goal.id} className="mini">
                  <div className="h">{goal.title}</div>
                  <div className="muted">
                    {formatMoney(goal.current)} / {formatMoney(goal.target)}
                    {goal.completed && t('goalsModal.achievedLabel')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center" style={{ padding: '40px' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        )}
      </div>
    </div>
  )
}
