'use client'

/**
 * ============================================================================
 * POTENTIAL WIDGET - ВИДЖЕТ ПОТЕНЦИАЛА МЕСЯЦА
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * Показать ребёнку его прогресс к потенциалу месяца
 * 
 * ЧТО ПОКАЗЫВАЕТ:
 * 1. Текущий баланс vs потенциал (прогресс-бар)
 * 2. Процент использования потенциала
 * 3. Что упускает ребёнок (детализация)
 * 4. Доступные бонусы (мотивация)
 * 5. Прогноз на конец месяца
 * 
 * ПСИХОЛОГИЯ:
 * - НЕ ограничение ("достиг лимита, стоп")
 * - А ПОТЕНЦИАЛ ("ты используешь 82%, можешь лучше!")
 * - Мотивация стремиться к 100%
 * - Показывает что теряет (осознанность)
 * - Вдохновляет бонусами (можно больше!)
 * 
 * ПРИМЕР:
 * Адам заработал 245 💰 из 320 💰 (77%)
 * - Упускает 75 💰 (детализация)
 * - Доступны бонусы: +70 💰
 * - Может заработать: 245 + 75 + 70 = 390 💰!
 * ============================================================================
 */

import { useEffect, useState } from 'react'
import { getMonthlyPotential, getWallet } from '@/lib/wallet-api'
import type { MonthlyPotential, Wallet } from '@/lib/wallet-api'

interface PotentialWidgetProps {
  childId: string
  displayName?: string
  onDetailsClick?: () => void
}

export default function PotentialWidget({ childId, displayName, onDetailsClick }: PotentialWidgetProps) {
  const [potential, setPotential] = useState<MonthlyPotential | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [childId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [pot, wal] = await Promise.all([
        getMonthlyPotential(childId),
        getWallet(childId)
      ])
      setPotential(pot)
      setWallet(wal)
    } catch (error) {
      console.error('Error loading potential:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="potential-widget loading">
        <div className="spinner">⏳</div>
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!potential || !wallet) {
    return (
      <div className="potential-widget error">
        <p>❌ Ошибка загрузки данных</p>
      </div>
    )
  }

  // Расчёты
  const currentCoins = wallet.coins
  const basePotential = potential.base_potential
  const maxWithBonuses = potential.max_with_bonuses
  
  const percentage = Math.round((currentCoins / basePotential) * 100)
  const missing = Math.max(0, basePotential - currentCoins)
  
  // Определить цвет прогресс-бара
  const getProgressColor = (pct: number) => {
    if (pct >= 100) return 'gold'
    if (pct >= 90) return 'excellent'
    if (pct >= 70) return 'good'
    if (pct >= 50) return 'medium'
    return 'low'
  }
  
  const progressColor = getProgressColor(percentage)
  
  // Сообщение мотивации
  const getMessage = (pct: number) => {
    if (pct >= 100) return "🔥 ТЫ ПРЕВЫСИЛ ПОТЕНЦИАЛ! НЕВЕРОЯТНО!"
    if (pct >= 90) return "🎉 Почти максимум! Отличная работа!"
    if (pct >= 70) return "👍 Хороший прогресс! Можешь ещё лучше!"
    if (pct >= 50) return "💪 Неплохо! Подтянись до 90%+"
    return "⚠️ Используешь только " + pct + "%! Давай активнее!"
  }

  return (
    <div className="potential-widget">
      {/* Заголовок */}
      <div className="potential-header">
        <h3>💰 ПОТЕНЦИАЛ МЕСЯЦА</h3>
        <div className="child-name">{(displayName ?? childId).toUpperCase()}</div>
      </div>

      {/* Баланс */}
      <div className="balance-section">
        <div className="balance-row">
          <span className="label">Баланс:</span>
          <span className="value">{wallet.coins} 💰</span>
        </div>
        <div className="balance-row">
          <span className="label">Деньги:</span>
          <span className="value">{wallet.money}₽</span>
        </div>
      </div>

      {/* Прогресс к потенциалу */}
      <div className="potential-progress">
        <div className="progress-label">
          <span>Прогресс к потенциалу</span>
          <span className="percentage">{percentage}%</span>
        </div>
        
        <div className="progress-bar">
          <div 
            className={`progress-fill ${progressColor}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          >
            {percentage >= 10 && (
              <span className="progress-text">{currentCoins} 💰</span>
            )}
          </div>
        </div>
        
        <div className="progress-info">
          <span>{currentCoins} / {basePotential} 💰</span>
        </div>
      </div>

      {/* Сообщение мотивации */}
      <div className={`motivation-message ${progressColor}`}>
        <p>{getMessage(percentage)}</p>
      </div>

      {/* Что упускаешь */}
      {missing > 0 && (
        <div className="missing-section">
          <div className="missing-header">
            <span>📉 Упускаешь:</span>
            <span className="missing-amount">{missing} 💰</span>
          </div>
          <button 
            className="details-button"
            onClick={onDetailsClick}
          >
            Что можно улучшить? →
          </button>
        </div>
      )}

      {/* Доступные бонусы */}
      {potential.available_bonuses && (
        <div className="bonuses-section">
          <h4>🎁 ДОСТУПНЫЕ БОНУСЫ</h4>
          <div className="bonuses-list">
            {Object.entries(potential.available_bonuses).map(([key, bonus]: any) => (
              <div key={key} className="bonus-item">
                <span className="bonus-icon">{bonus.icon}</span>
                <span className="bonus-title">{bonus.title}</span>
                <span className="bonus-amount">+{bonus.amount} 💰</span>
                {bonus.progress && (
                  <div className="bonus-progress">
                    {bonus.progress.current}/{bonus.progress.target}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Прогноз */}
      <div className="forecast-section">
        <h4>📊 ПРОГНОЗ</h4>
        <div className="forecast-scenarios">
          <div className="scenario">
            <span className="scenario-label">Если достигнешь потенциала:</span>
            <span className="scenario-value">{basePotential} 💰</span>
          </div>
          {missing > 0 && (
            <div className="scenario">
              <span className="scenario-label">С учётом упущенного:</span>
              <span className="scenario-value">{currentCoins + missing} 💰</span>
            </div>
          )}
          <div className="scenario highlight">
            <span className="scenario-label">Максимум с бонусами:</span>
            <span className="scenario-value">{maxWithBonuses} 💰 🚀</span>
          </div>
        </div>
      </div>

      {/* Кнопка детали */}
      <button 
        className="view-details-button"
        onClick={onDetailsClick}
      >
        📊 Подробная статистика
      </button>
    </div>
  )
}
