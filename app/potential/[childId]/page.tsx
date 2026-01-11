'use client'

/**
 * ============================================================================
 * POTENTIAL DETAILS PAGE - ДЕТАЛЬНЫЙ ЭКРАН ПОТЕНЦИАЛА
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * Показать детальную разбивку потенциала месяца по категориям
 * 
 * ЧТО ПОКАЗЫВАЕТ:
 * 1. Потенциал по каждой категории (оценки, комната, спорт, поведение)
 * 2. Что заработано vs что упущено
 * 3. Конкретные примеры (какие оценки, сколько дней комнаты, etc)
 * 4. Рекомендации что улучшить
 * 5. Прогресс-бары по каждой категории
 * 
 * ПСИХОЛОГИЯ:
 * - Детализация помогает понять где проблемы
 * - "Ага, я упускаю в основном на физике!" → фокус
 * - Визуализация прогресса по категориям
 * - Конкретные действия для улучшения
 * 
 * ПРИМЕР:
 * ОЦЕНКИ: 175 / 209 💰 (84%)
 * ├─ ✅ Оценка 5: 18 раз × 5 💰 = 90 💰
 * ├─ ✅ Оценка 4: 22 раза × 3 💰 = 66 💰
 * ├─ ⚠️ Оценка 3: 3 раза × -3 💰 = -9 💰
 * ├─ ❌ Оценка 2: 1 раз × -5 💰 = -5 💰
 * └─ Упускаешь: 16 оценок не получено → -32 💰
 * 
 * 💡 Подтяни физику! 3 тройки по ней.
 * ============================================================================
 */

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getMonthlyPotential, getWallet, getAuditLog } from '@/lib/wallet-api'
import type { MonthlyPotential, Wallet, AuditLog } from '@/lib/wallet-api'

export default function PotentialDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const childId = params?.childId as string || 'adam'
  
  const [potential, setPotential] = useState<MonthlyPotential | null>(null)
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [recentLog, setRecentLog] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [childId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [pot, wal, log] = await Promise.all([
        getMonthlyPotential(childId),
        getWallet(childId),
        getAuditLog(childId, 50)
      ])
      setPotential(pot)
      setWallet(wal)
      setRecentLog(log)
    } catch (error) {
      console.error('Error loading potential details:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="potential-details-page loading">
        <div className="spinner">⏳</div>
        <p>Загрузка детальной статистики...</p>
      </div>
    )
  }

  if (!potential || !wallet) {
    return (
      <div className="potential-details-page error">
        <p>❌ Ошибка загрузки данных</p>
        <button onClick={() => router.back()}>← Назад</button>
      </div>
    )
  }

  // Расчёты
  const currentCoins = wallet.coins
  const basePotential = potential.base_potential
  const percentage = Math.round((currentCoins / basePotential) * 100)
  
  // Анализ по категориям
  const categories = [
    {
      name: 'Оценки',
      icon: '📚',
      potential: potential.grades_potential,
      earned: 0, // Рассчитать из лога
      color: 'blue'
    },
    {
      name: 'Комната',
      icon: '🏠',
      potential: potential.room_potential,
      earned: 0,
      color: 'green'
    },
    {
      name: 'Спорт',
      icon: '💪',
      potential: potential.sport_potential,
      earned: 0,
      color: 'orange'
    },
    {
      name: 'Поведение',
      icon: '😊',
      potential: potential.behavior_potential,
      earned: 0,
      color: 'purple'
    }
  ]

  // Рассчитать заработано по категориям из audit log
  recentLog.forEach(entry => {
    if (entry.related_type === 'grade') {
      categories[0].earned += entry.coins_change || 0
    } else if (entry.related_type === 'room') {
      categories[1].earned += entry.coins_change || 0
    } else if (entry.related_type === 'sport') {
      categories[2].earned += entry.coins_change || 0
    } else if (entry.related_type === 'behavior') {
      categories[3].earned += entry.coins_change || 0
    }
  })

  return (
    <div className="potential-details-page">
      {/* Заголовок */}
      <div className="page-header">
        <button className="back-button" onClick={() => router.back()}>
          ← Назад
        </button>
        <h1>📊 МОЙ ПОТЕНЦИАЛ - ЯНВАРЬ 2026</h1>
        <div className="child-badge">{childId === 'adam' ? 'АДАМ' : 'АЛИМ'}</div>
      </div>

      {/* Общий прогресс */}
      <div className="overall-progress">
        <div className="progress-header">
          <h2>Общий прогресс</h2>
          <div className="progress-percentage">{percentage}%</div>
        </div>
        
        <div className="progress-bar large">
          <div 
            className={`progress-fill ${percentage >= 90 ? 'excellent' : percentage >= 70 ? 'good' : 'medium'}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        
        <div className="progress-stats">
          <div className="stat">
            <span className="stat-label">Заработано:</span>
            <span className="stat-value">{currentCoins} 💰</span>
          </div>
          <div className="stat">
            <span className="stat-label">Потенциал:</span>
            <span className="stat-value">{basePotential} 💰</span>
          </div>
          <div className="stat">
            <span className="stat-label">Упускаешь:</span>
            <span className="stat-value error">{basePotential - currentCoins} 💰</span>
          </div>
        </div>
      </div>

      {/* Разбивка по категориям */}
      <div className="categories-breakdown">
        <h2>📋 Детали по категориям</h2>
        
        {categories.map(category => {
          const catPercentage = category.potential > 0 
            ? Math.round((category.earned / category.potential) * 100)
            : 0
          const missing = Math.max(0, category.potential - category.earned)
          
          return (
            <div key={category.name} className={`category-card ${category.color}`}>
              {/* Заголовок категории */}
              <div className="category-header">
                <div className="category-title">
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-name">{category.name}</span>
                </div>
                <div className="category-stats">
                  <span className="earned">{category.earned} 💰</span>
                  <span className="separator">/</span>
                  <span className="potential">{category.potential} 💰</span>
                  <span className="percentage">({catPercentage}%)</span>
                </div>
              </div>

              {/* Прогресс-бар */}
              <div className="category-progress">
                <div 
                  className={`progress-fill ${catPercentage >= 90 ? 'excellent' : catPercentage >= 70 ? 'good' : 'medium'}`}
                  style={{ width: `${Math.min(catPercentage, 100)}%` }}
                />
              </div>

              {/* Детали */}
              <div className="category-details">
                {category.name === 'Оценки' && childId === 'adam' && (
                  <div className="details-content">
                    <p className="details-text">
                      Ожидается: ~60 оценок в месяц
                    </p>
                    <p className="details-text">
                      Средняя оценка: 4.0
                    </p>
                    {missing > 0 && (
                      <p className="details-warning">
                        ⚠️ Упускаешь ~{missing} 💰
                        <br />
                        Возможные причины:
                        <br />
                        • Пропущено несколько оценок
                        <br />
                        • Есть тройки/двойки (штрафы)
                      </p>
                    )}
                    <p className="details-tip">
                      💡 Подтяни слабые предметы! Избегай троек.
                    </p>
                  </div>
                )}

                {category.name === 'Комната' && (
                  <div className="details-content">
                    <p className="details-text">
                      План: {childId === 'adam' ? '15' : '25'} дней уборки
                    </p>
                    {missing > 0 && (
                      <p className="details-warning">
                        ⚠️ Упускаешь ~{missing} 💰
                        <br />
                        • Несколько дней не убрал
                        <br />
                        • Штрафы за пропуски
                      </p>
                    )}
                    <p className="details-tip">
                      💡 Убирай комнату вечером! Поставь напоминание.
                    </p>
                  </div>
                )}

                {category.name === 'Спорт' && (
                  <div className="details-content">
                    <p className="details-text">
                      План: {childId === 'adam' ? '10' : '15'} тренировок
                    </p>
                    <p className="details-text">
                      Средняя оценка тренера: 4-5
                    </p>
                    {missing > 0 && (
                      <p className="details-warning">
                        ⚠️ Упускаешь ~{missing} 💰
                        <br />
                        • Пропущено несколько тренировок
                        <br />
                        • Низкие оценки тренера (ленился?)
                      </p>
                    )}
                    <p className="details-tip">
                      💡 ПАХАЙ на тренировках! Тренер видит старание.
                    </p>
                  </div>
                )}

                {category.name === 'Поведение' && (
                  <div className="details-content">
                    <p className="details-text">
                      Ожидается: {childId === 'adam' ? '~8' : '~30'} дней хорошего поведения
                    </p>
                    {missing > 0 && (
                      <p className="details-warning">
                        ⚠️ Упускаешь ~{missing} 💰
                        <br />
                        • Конфликты с братом (-5 💰 каждый)
                        <br />
                        • Грубость (-10 💰)
                      </p>
                    )}
                    <p className="details-tip">
                      💡 Не конфликтуй! Помогай брату (+40 💰).
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Бонусы */}
      <div className="bonuses-section">
        <h2>🎁 Доступные бонусы (сверх потенциала!)</h2>
        <div className="bonuses-grid">
          <div className="bonus-card">
            <div className="bonus-icon">🔥</div>
            <div className="bonus-title">Идеальная неделя</div>
            <div className="bonus-amount">+50 💰</div>
            <div className="bonus-description">Все оценки 5 с пн-пт</div>
          </div>
          <div className="bonus-card">
            <div className="bonus-icon">🏆</div>
            <div className="bonus-title">Идеальный месяц</div>
            <div className="bonus-amount">+100 💰</div>
            <div className="bonus-description">Весь месяц пятёрки</div>
          </div>
          <div className="bonus-card">
            <div className="bonus-icon">⚡</div>
            <div className="bonus-title">Стрик 7 дней</div>
            <div className="bonus-amount">+20 💰</div>
            <div className="bonus-description">7 дней подряд пятёрки</div>
          </div>
          <div className="bonus-card">
            <div className="bonus-icon">💪</div>
            <div className="bonus-title">Стрик 30 дней</div>
            <div className="bonus-amount">+50 💰</div>
            <div className="bonus-description">Месяц подряд отлично</div>
          </div>
          <div className="bonus-card">
            <div className="bonus-icon">🎯</div>
            <div className="bonus-title">Побил рекорд</div>
            <div className="bonus-amount">+25 💰</div>
            <div className="bonus-description">Лучше прошлого месяца</div>
          </div>
          <div className="bonus-card">
            <div className="bonus-icon">🎁</div>
            <div className="bonus-title">Челлендж</div>
            <div className="bonus-amount">+40 💰</div>
            <div className="bonus-description">Выполнил задание</div>
          </div>
        </div>
      </div>

      {/* Прогноз */}
      <div className="forecast-section">
        <h2>📊 Прогноз на конец месяца</h2>
        <div className="forecast-scenarios">
          <div className="scenario">
            <div className="scenario-label">Если продолжишь так же:</div>
            <div className="scenario-value">{currentCoins} 💰</div>
            <div className="scenario-note">Текущий темп</div>
          </div>
          <div className="scenario highlight">
            <div className="scenario-label">Если достигнешь потенциала:</div>
            <div className="scenario-value">{basePotential} 💰</div>
            <div className="scenario-note">100% потенциала</div>
          </div>
          <div className="scenario gold">
            <div className="scenario-label">Если получишь все бонусы:</div>
            <div className="scenario-value">{potential.max_with_bonuses} 💰</div>
            <div className="scenario-note">Максимум! 🚀</div>
          </div>
        </div>
      </div>

      {/* Кнопка назад */}
      <div className="page-footer">
        <button className="back-button large" onClick={() => router.back()}>
          ← Вернуться на главную
        </button>
      </div>
    </div>
  )
}
