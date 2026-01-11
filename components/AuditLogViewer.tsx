'use client'

/**
 * ============================================================================
 * AUDIT LOG VIEWER - ИСТОРИЯ ФИНАНСОВЫХ ОПЕРАЦИЙ
 * ============================================================================
 * 
 * НАЗНАЧЕНИЕ:
 * Показать ребёнку (и родителю) ВСЕ финансовые операции
 * 
 * ФИЛОСОФИЯ:
 * - Полная прозрачность (ребёнок видит ВСЁ!)
 * - Понимание откуда деньги (осознанность)
 * - Контроль для родителя (видит попытки обмана)
 * - Обучение честности (всё логируется!)
 * 
 * ЧТО ПОКАЗЫВАЕТ:
 * 1. Все заработанные монеты (оценки, спорт, комната, etc)
 * 2. Все траты (покупки, обмены, переводы)
 * 3. Кто выполнил операцию (ребёнок, родитель, система)
 * 4. Баланс до/после
 * 5. Подозрительные операции (⚠️ флаг)
 * 
 * ПРИМЕР ЛОГА:
 * Сегодня 14:30 - Система: Math 5 → +5 💰 (было 240, стало 245)
 * Сегодня 10:15 - Родитель: Russian 4→5 → +3 💰 (исправление)
 * Вчера 15:45 ⚠️ - Адам попытался изменить +100 💰 → ОТКЛОНЕНО
 * 
 * ШТРАФЫ ЗА ОБМАН:
 * 1. Первая попытка: -100 💰
 * 2. Вторая: -200 💰
 * 3. Третья: аккаунт заморожен 7 дней
 * ============================================================================
 */

import { useEffect, useState } from 'react'
import { getAuditLog } from '@/lib/wallet-api'
import type { AuditLog } from '@/lib/wallet-api'

interface AuditLogViewerProps {
  childId: string
  limit?: number
  showFilters?: boolean
}

export default function AuditLogViewer({ 
  childId, 
  limit = 50,
  showFilters = true 
}: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  
  // Фильтры
  const [filterType, setFilterType] = useState<string>('all')
  const [filterActionBy, setFilterActionBy] = useState<string>('all')
  const [showSuspicious, setShowSuspicious] = useState(false)

  useEffect(() => {
    loadLogs()
  }, [childId, limit])

  useEffect(() => {
    applyFilters()
  }, [logs, filterType, filterActionBy, showSuspicious])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const data = await getAuditLog(childId, limit)
      setLogs(data)
    } catch (error) {
      console.error('Error loading audit log:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...logs]

    // Фильтр по типу
    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.action_type === filterType)
    }

    // Фильтр по исполнителю
    if (filterActionBy !== 'all') {
      filtered = filtered.filter(log => log.action_by === filterActionBy)
    }

    // Только подозрительные
    if (showSuspicious) {
      filtered = filtered.filter(log => log.is_suspicious || log.requires_review)
    }

    setFilteredLogs(filtered)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Только что'
    if (diffMins < 60) return `${diffMins} мин назад`
    if (diffHours < 24) return `${diffHours} ч назад`
    if (diffDays === 0) return 'Сегодня ' + date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Вчера ' + date.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleString('ru', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getActionLabel = (actionBy: string) => {
    switch (actionBy) {
      case 'system': return '🤖 Система'
      case 'parent': return '👨‍👩‍👦 Родитель'
      case 'child': return '👦 ' + (childId === 'adam' ? 'Адам' : 'Алим')
      default: return actionBy
    }
  }

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case 'earn_coins': return 'Заработал'
      case 'spend_coins': return 'Потратил'
      case 'exchange': return 'Обменял'
      case 'p2p_transfer': return 'Перевод'
      case 'admin_edit': return 'Изменение'
      case 'attempt_cheat': return '⚠️ ПОПЫТКА ОБМАНА'
      default: return actionType
    }
  }

  if (loading) {
    return (
      <div className="audit-log-viewer loading">
        <div className="spinner">⏳</div>
        <p>Загрузка истории...</p>
      </div>
    )
  }

  return (
    <div className="audit-log-viewer">
      {/* Заголовок */}
      <div className="log-header">
        <h3>📜 История операций</h3>
        <p className="log-subtitle">
          Полная прозрачность! Все операции логируются.
        </p>
      </div>

      {/* Фильтры */}
      {showFilters && (
        <div className="log-filters">
          <div className="filter-group">
            <label>Тип:</label>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">Все</option>
              <option value="earn_coins">Заработал</option>
              <option value="spend_coins">Потратил</option>
              <option value="exchange">Обмен</option>
              <option value="p2p_transfer">Переводы</option>
              <option value="admin_edit">Изменения</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Кто:</label>
            <select 
              value={filterActionBy}
              onChange={(e) => setFilterActionBy(e.target.value)}
              className="filter-select"
            >
              <option value="all">Все</option>
              <option value="system">Система</option>
              <option value="parent">Родитель</option>
              <option value="child">Ребёнок</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showSuspicious}
                onChange={(e) => setShowSuspicious(e.target.checked)}
              />
              Только подозрительные
            </label>
          </div>
        </div>
      )}

      {/* Счётчик */}
      <div className="log-count">
        Показано: {filteredLogs.length} из {logs.length} операций
      </div>

      {/* Список операций */}
      <div className="log-list">
        {filteredLogs.length === 0 ? (
          <div className="log-empty">
            <p>📭 Нет операций по выбранным фильтрам</p>
          </div>
        ) : (
          filteredLogs.map(log => (
            <div 
              key={log.id} 
              className={`log-item ${log.is_suspicious ? 'suspicious' : ''} ${log.requires_review ? 'requires-review' : ''} ${(log.coins_change || 0) < 0 ? 'penalty' : 'reward'}`}
            >
              {/* Иконка и время */}
              <div className="log-icon-time">
                <span className="log-icon">{log.icon}</span>
                <span className="log-time">{formatDate(log.created_at)}</span>
              </div>

              {/* Основная информация */}
              <div className="log-main">
                <div className="log-action">
                  <span className="log-action-by">{getActionLabel(log.action_by)}</span>
                  <span className="log-action-type">{getActionTypeLabel(log.action_type)}</span>
                </div>
                <div className="log-description">{log.description}</div>
              </div>

              {/* Изменения */}
              <div className="log-changes">
                {log.coins_change !== null && log.coins_change !== 0 && (
                  <div className={`change-badge ${log.coins_change > 0 ? 'positive' : 'negative'}`}>
                    {log.coins_change > 0 ? '+' : ''}{log.coins_change} 💰
                  </div>
                )}
                {log.money_change !== null && log.money_change !== 0 && (
                  <div className={`change-badge ${log.money_change > 0 ? 'positive' : 'negative'}`}>
                    {log.money_change > 0 ? '+' : ''}{log.money_change}₽
                  </div>
                )}
              </div>

              {/* Баланс до/после */}
              <div className="log-balance">
                <div className="balance-before">
                  Было: {log.coins_before ?? '—'} 💰
                </div>
                <div className="balance-arrow">→</div>
                <div className="balance-after">
                  Стало: {log.coins_after ?? '—'} 💰
                </div>
              </div>

              {/* Флаги безопасности */}
              {(log.is_suspicious || log.requires_review) && (
                <div className="log-flags">
                  {log.is_suspicious && (
                    <div className="flag suspicious">
                      ⚠️ Подозрительная активность
                    </div>
                  )}
                  {log.requires_review && (
                    <div className="flag requires-review">
                      👀 Требует проверки родителем
                    </div>
                  )}
                  {log.parent_reviewed && (
                    <div className="flag reviewed">
                      ✅ Проверено родителем
                    </div>
                  )}
                </div>
              )}

              {/* Метаданные (для отладки) */}
              {log.metadata && (
                <details className="log-metadata">
                  <summary>Подробности</summary>
                  <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>

      {/* Кнопка загрузить ещё */}
      {logs.length >= limit && (
        <div className="log-load-more">
          <button 
            className="button secondary"
            onClick={() => loadLogs()}
          >
            Загрузить ещё
          </button>
        </div>
      )}

      {/* Напоминание о честности */}
      <div className="honesty-reminder">
        <h4>💡 Помни о честности!</h4>
        <p>
          Все операции логируются. Попытки обмана:
        </p>
        <ul>
          <li>1-я попытка: Предупреждение + -100 💰</li>
          <li>2-я попытка: -200 💰 + звонок родителям</li>
          <li>3-я попытка: Аккаунт заморожен на 7 дней</li>
          <li>Серьёзное мошенничество: Баланс сброшен в 0</li>
        </ul>
        <p className="reminder-highlight">
          <strong>Честность = лучшая политика! 🙌</strong>
        </p>
      </div>
    </div>
  )
}
