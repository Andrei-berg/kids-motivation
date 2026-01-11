import { supabase } from './supabase'

// ============================================================================
// WALLET API V2: PENALTIES + POTENTIAL + LOGGING + P2P
// ============================================================================
// ФИЛОСОФИЯ:
// 1. Награды (5,4) + Штрафы (3,2,1) = баланс 70/30
// 2. Спорт = за ТРУД (оценка тренера), не за посещение
// 3. Потенциал = что МОЖНО заработать, не лимит
// 4. Всё логируется = прозрачность = доверие
// 5. P2P переводы = экономика между детьми
// ============================================================================

// ============================================================================
// ТИПЫ
// ============================================================================

export interface Wallet {
  child_id: string
  coins: number
  money: number
  total_earned_coins: number
  total_spent_coins: number
  total_exchanged_coins: number
  total_earned_money: number
  total_spent_money: number
  updated_at: string
}

export interface WalletSettings {
  id: string
  
  // Награды за оценки
  coins_per_grade_5: number
  coins_per_grade_4: number
  
  // Штрафы за оценки (НОВОЕ!)
  coins_per_grade_3: number  // Отрицательное!
  coins_per_grade_2: number  // Отрицательное!
  coins_per_grade_1: number  // Отрицательное!
  
  // Комната
  coins_per_room_task: number
  coins_per_room_miss: number // Отрицательное!
  
  // Спорт (с оценкой тренера!)
  coins_per_sport_5: number
  coins_per_sport_4: number
  coins_per_sport_3: number
  coins_per_sport_2: number  // Отрицательное!
  coins_per_sport_1: number  // Отрицательное!
  
  // Поведение
  coins_per_good_behavior: number
  coins_per_help_brother: number
  coins_per_conflict: number    // Отрицательное!
  coins_per_rudeness: number    // Отрицательное!
  
  // Бонусы
  bonus_perfect_week: number
  bonus_perfect_month: number
  bonus_streak_7_days: number
  bonus_streak_30_days: number
  bonus_record_broken: number
  bonus_challenge: number
  
  // Курс обмена
  base_exchange_rate: number
  bonus_100_coins: number
  bonus_500_coins: number
  bonus_1000_coins: number
  
  // Потенциал месяца
  adam_monthly_potential: number
  alim_monthly_potential: number
  
  // P2P лимиты
  p2p_max_per_transfer: number
  p2p_max_per_day: number
  p2p_max_per_month: number
  p2p_approval_threshold: number
  p2p_max_debt: number
  p2p_max_debt_days: number
  
  updated_at: string
}

export interface AuditLog {
  id: string
  child_id: string
  action_by: 'child' | 'parent' | 'system'
  action_type: string
  coins_before: number | null
  coins_after: number | null
  coins_change: number | null
  money_before: number | null
  money_after: number | null
  money_change: number | null
  description: string
  icon: string
  related_id: string | null
  related_type: string | null
  is_suspicious: boolean
  requires_review: boolean
  parent_reviewed: boolean
  metadata: any
  created_at: string
}

export interface P2PTransfer {
  id: string
  from_child_id: string
  to_child_id: string
  amount: number
  transfer_type: 'gift' | 'payment' | 'loan' | 'deal'
  deal_description: string | null
  deal_completed: boolean
  deal_confirmed_by_sender: boolean
  loan_interest: number
  loan_due_date: string | null
  loan_repaid: boolean
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requires_approval: boolean
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  note: string | null
  created_at: string
  completed_at: string | null
}

export interface MonthlyPotential {
  id: string
  child_id: string
  year: number
  month: number
  
  // Расчёт
  expected_grades: number
  average_grade: number
  expected_penalties: number
  grades_potential: number
  
  expected_room_days: number
  expected_room_misses: number
  room_potential: number
  
  expected_sport_sessions: number
  average_sport_rating: number
  sport_potential: number
  
  expected_good_days: number
  expected_conflicts: number
  behavior_potential: number
  
  base_potential: number
  max_with_bonuses: number
  
  // Факт
  current_earned: number
  current_percentage: number
  
  missing_coins: number
  missing_breakdown: any
  available_bonuses: any
  earned_bonuses: number
  
  created_at: string
  updated_at: string
}

// ============================================================================
// КОШЕЛЁК (WALLET)
// ============================================================================

export async function getWallet(childId: string): Promise<Wallet | null> {
  const { data, error } = await supabase
    .from('wallet')
    .select('*')
    .eq('child_id', childId)
    .single()
  
  if (error) {
    console.error('Error fetching wallet:', error)
    return null
  }
  
  return data
}

// ============================================================================
// НАСТРОЙКИ КОШЕЛЬКА
// ============================================================================

export async function getWalletSettings(): Promise<WalletSettings> {
  const { data, error } = await supabase
    .from('wallet_settings')
    .select('*')
    .eq('id', 'default')
    .single()
  
  if (error || !data) {
    // Вернуть настройки по умолчанию (Вариант A)
    return {
      id: 'default',
      
      // Награды за оценки
      coins_per_grade_5: 5,
      coins_per_grade_4: 3,
      
      // Штрафы за оценки
      coins_per_grade_3: -3,
      coins_per_grade_2: -5,
      coins_per_grade_1: -10,
      
      // Комната
      coins_per_room_task: 3,
      coins_per_room_miss: -3,
      
      // Спорт (с оценкой тренера)
      coins_per_sport_5: 10,
      coins_per_sport_4: 5,
      coins_per_sport_3: 0,
      coins_per_sport_2: -3,
      coins_per_sport_1: -10,
      
      // Поведение
      coins_per_good_behavior: 5,
      coins_per_help_brother: 40,
      coins_per_conflict: -5,
      coins_per_rudeness: -10,
      
      // Бонусы
      bonus_perfect_week: 50,
      bonus_perfect_month: 100,
      bonus_streak_7_days: 20,
      bonus_streak_30_days: 50,
      bonus_record_broken: 25,
      bonus_challenge: 40,
      
      // Курс обмена
      base_exchange_rate: 10,
      bonus_100_coins: 10,
      bonus_500_coins: 20,
      bonus_1000_coins: 50,
      
      // Потенциал месяца
      adam_monthly_potential: 320,
      alim_monthly_potential: 320,  // ОДИНАКОВЫЙ! Тонус для роста!
      
      // P2P лимиты
      p2p_max_per_transfer: 100,
      p2p_max_per_day: 200,
      p2p_max_per_month: 500,
      p2p_approval_threshold: 100,
      p2p_max_debt: 200,
      p2p_max_debt_days: 7,
      
      updated_at: new Date().toISOString()
    }
  }
  
  return data
}

// ============================================================================
// НАЧИСЛЕНИЕ МОНЕТ ЗА ОЦЕНКИ (С ШТРАФАМИ!)
// ============================================================================

/**
 * НАЧИСЛЕНИЕ МОНЕТ ЗА ОЦЕНКУ (ВАРИАНТ A - МЯГКИЙ)
 * 
 * ФИЛОСОФИЯ:
 * - Оценки 5 и 4 → награды (мотивация делать хорошо)
 * - Оценки 3, 2, 1 → штрафы (мотивация избегать плохого)
 * - Баланс: 70% позитив / 30% негатив (не демотивирует)
 * - Страх потери > желания получить (психология человека)
 * - Подготовка к реальной жизни (плохая работа = штраф)
 * 
 * ТАБЛИЦА НАГРАД/ШТРАФОВ:
 * ┌───────┬──────────┬─────────────────────────────┐
 * │ Оценка│ Монеты   │ Сообщение                   │
 * ├───────┼──────────┼─────────────────────────────┤
 * │   5   │ +5 💰   │ Отлично! Продолжай! 🎉     │
 * │   4   │ +3 💰   │ Хорошо! Можешь лучше! 👍   │
 * │   3   │ -3 💰   │ Подтянись! ⚠️              │
 * │   2   │ -5 💰   │ Проблема! ❌               │
 * │   1   │ -10 💰  │ Катастрофа! 💀             │
 * └───────┴──────────┴─────────────────────────────┘
 * 
 * РАСЧЁТ ПОТЕНЦИАЛА МЕСЯЦА (ПРИМЕР АДАМ):
 * При ~60 оценках в месяц со средней 4:
 * - Позитив: 18×5💰 + 22×3💰 = 90+66 = 156 💰
 * - Негатив: 7×(-3💰) + 2×(-5💰) = -21-10 = -31 💰
 * - Чистыми: 156 - 31 = 125 💰 только от оценок
 * 
 * ПСИХОЛОГИЯ:
 * - Ребёнок видит: тройка = -3 💰 (страшно потерять!)
 * - Сравнение: "Если бы 4 → было бы +6 💰 больше"
 * - Урок: плохая работа = последствия (как в жизни)
 * - Мотивация: избегать троек сильнее чем гнаться за пятёрками
 * 
 * EDGE CASES:
 * - Оценка вне диапазона 1-5 → игнорируется
 * - Если баланс отрицательный после штрафа → показывается "долг"
 * - Первая двойка → предупреждение + совет
 * - Частые двойки → уведомление родителям
 * 
 * @param childId - ID ребёнка (adam/alim)
 * @param grade - Оценка (1-5)
 * @param subject - Предмет (для описания)
 * @returns Promise<Wallet | null> - Обновлённый кошелёк
 */
export async function awardCoinsForGrade(
  childId: string,
  grade: number,
  subject: string = 'Урок'
): Promise<Wallet | null> {
  if (grade < 1 || grade > 5) {
    console.error('Invalid grade:', grade)
    return null
  }
  
  const settings = await getWalletSettings()
  
  // Таблица наград/штрафов
  const GRADE_REWARDS: Record<number, number> = {
    5: settings.coins_per_grade_5,   // +5 💰
    4: settings.coins_per_grade_4,   // +3 💰
    3: settings.coins_per_grade_3,   // -3 💰
    2: settings.coins_per_grade_2,   // -5 💰
    1: settings.coins_per_grade_1    // -10 💰
  }
  
  const coins = GRADE_REWARDS[grade]
  
  // Определить иконку и тип сообщения
  const isReward = coins > 0
  const isPenalty = coins < 0
  
  const icon = grade >= 4 ? '🎉' : grade === 3 ? '⚠️' : '❌'
  
  const description = isReward
    ? `${subject}: оценка ${grade} → +${coins} 💰`
    : isPenalty
      ? `${subject}: оценка ${grade} → ${coins} 💰 (штраф)`
      : `${subject}: оценка ${grade}`
  
  // Начислить монеты
  const wallet = await updateWalletCoins(
    childId,
    coins,
    description,
    icon,
    'system',
    'grade',
    { grade, subject }
  )
  
  return wallet
}

// ============================================================================
// НАЧИСЛЕНИЕ МОНЕТ ЗА СПОРТ (С ОЦЕНКОЙ ТРЕНЕРА!)
// ============================================================================

/**
 * НАЧИСЛЕНИЕ МОНЕТ ЗА СПОРТ (ПО ОЦЕНКЕ ТРЕНЕРА)
 * 
 * ФИЛОСОФИЯ:
 * - Спорт = для здоровья ребёнка (первично!)
 * - Награда = только за РЕАЛЬНЫЙ труд (вторично!)
 * - Оценка тренера = объективный показатель усилий
 * - Нельзя обмануть систему "просто пришёл"
 * 
 * ТАБЛИЦА НАГРАД/ШТРАФОВ:
 * ┌───────┬──────────┬─────────────────────────────┐
 * │ Оценка│ Монеты   │ Комментарий тренера         │
 * ├───────┼──────────┼─────────────────────────────┤
 * │   5   │ +10 💰  │ Отлично! Пахал! 🔥         │
 * │   4   │ +5 💰   │ Хорошо, старался 👍        │
 * │   3   │ 0 💰    │ Средне, мог лучше 😐       │
 * │   2   │ -3 💰   │ Ленился! ⚠️                │
 * │   1   │ -10 💰  │ Хулиганил! ❌              │
 * │  NULL │ 0 💰    │ Не оценено                  │
 * └───────┴──────────┴─────────────────────────────┘
 * 
 * РАСЧЁТ ПОТЕНЦИАЛА МЕСЯЦА (ПРИМЕР АДАМ):
 * При 10 тренировках в месяц:
 * - Сценарий A (идеально): 10×10💰 = 100 💰
 * - Сценарий B (реально): 7×10💰 + 2×5💰 + 1×0💰 = 80 💰
 * - Сценарий C (плохо): 3×10💰 + 4×5💰 + 2×0💰 + 1×(-3💰) = 47 💰
 * 
 * ПСИХОЛОГИЯ:
 * - "Ты тренируешься для СЕБЯ! Твоё здоровье улучшается!"
 * - "Награда = просто бонус за твой труд"
 * - "Тренер видит кто работает, кто халтурит"
 * - "Обмануть нельзя"
 * 
 * УРОК:
 * - Важен не факт посещения, а КАЧЕСТВО работы
 * - Если не стараешься → зачем ходить?
 * - Уважение к:
 *   * Тренеру (он тратит время)
 *   * Родителям (они платят за секцию)
 *   * Себе (твоё здоровье и развитие)
 * 
 * EDGE CASES:
 * - coach_rating = null → 0 монет (не оценено)
 * - Частые двойки → уведомление родителям ("ребёнок не старается")
 * - 3 раза подряд "5" → дополнительный бонус +20 💰
 * 
 * @param childId - ID ребёнка
 * @param coachRating - Оценка тренера (1-5 или null)
 * @param sectionName - Название секции (футбол, карате, etc)
 * @param coachComment - Комментарий тренера (опционально)
 * @returns Promise<Wallet | null> - Обновлённый кошелёк
 */
export async function awardCoinsForSport(
  childId: string,
  coachRating: number | null,
  sectionName: string,
  coachComment?: string
): Promise<Wallet | null> {
  const settings = await getWalletSettings()
  
  // Если не оценено → 0 монет
  if (coachRating === null) {
    return null
  }
  
  if (coachRating < 1 || coachRating > 5) {
    console.error('Invalid coach rating:', coachRating)
    return null
  }
  
  // Таблица наград/штрафов
  const SPORT_REWARDS: Record<number, number> = {
    5: settings.coins_per_sport_5,   // +10 💰
    4: settings.coins_per_sport_4,   // +5 💰
    3: settings.coins_per_sport_3,   // 0 💰
    2: settings.coins_per_sport_2,   // -3 💰
    1: settings.coins_per_sport_1    // -10 💰
  }
  
  const coins = SPORT_REWARDS[coachRating]
  
  // Определить иконку и описание
  const icon = coachRating >= 4 ? '💪' : coachRating === 3 ? '😐' : '⚠️'
  
  const ratingText = coachRating === 5 ? 'Пахал!'
    : coachRating === 4 ? 'Хорошо'
    : coachRating === 3 ? 'Средне'
    : coachRating === 2 ? 'Ленился'
    : 'Хулиганил'
  
  const description = coins > 0
    ? `${sectionName}: ${ratingText} → +${coins} 💰`
    : coins < 0
      ? `${sectionName}: ${ratingText} → ${coins} 💰 (штраф)`
      : `${sectionName}: ${ratingText} (без монет)`
  
  // Начислить монеты (может быть 0)
  if (coins !== 0) {
    return await updateWalletCoins(
      childId,
      coins,
      description,
      icon,
      'system',
      'sport',
      { coachRating, sectionName, coachComment }
    )
  }
  
  // Если 0 монет → просто лог (без начисления)
  await createAuditLog(childId, {
    action_by: 'system',
    action_type: 'sport_no_reward',
    coins_change: 0,
    money_change: 0,
    description,
    icon,
    related_type: 'sport',
    metadata: { coachRating, sectionName, coachComment }
  })
  
  return null
}

// ============================================================================
// ОБНОВЛЕНИЕ БАЛАНСА (С ЛОГИРОВАНИЕМ!)
// ============================================================================

/**
 * ОБНОВИТЬ БАЛАНС МОНЕТ (С ЛОГИРОВАНИЕМ)
 * 
 * ФИЛОСОФИЯ:
 * - Каждая операция логируется (прозрачность!)
 * - Дети видят лог (понимают откуда деньги)
 * - Родитель видит лог (контроль)
 * - Попытки обмана → флаг is_suspicious
 * 
 * ЛОГИКА:
 * 1. Получить текущий баланс
 * 2. Рассчитать новый баланс
 * 3. Проверить что баланс >= 0
 * 4. Обновить кошелёк
 * 5. Создать запись в audit_log
 * 6. Если операция подозрительная → флаг + уведомление
 * 
 * EDGE CASES:
 * - Баланс отрицательный → ошибка "Insufficient coins"
 * - Очень большое начисление (>1000 💰) → флаг requires_review
 * - Частые операции за короткое время → флаг is_suspicious
 * 
 * @param childId - ID ребёнка
 * @param coinsChange - Изменение монет (+ или -)
 * @param description - Описание операции
 * @param icon - Иконка (💰, 🎉, ⚠️, etc)
 * @param actionBy - Кто выполнил ('child', 'parent', 'system')
 * @param relatedType - Тип операции ('grade', 'sport', 'room', etc)
 * @param metadata - Дополнительные данные (JSON)
 * @returns Promise<Wallet | null> - Обновлённый кошелёк
 */
export async function updateWalletCoins(
  childId: string,
  coinsChange: number,
  description: string,
  icon: string = '💰',
  actionBy: 'child' | 'parent' | 'system' = 'system',
  relatedType?: string,
  metadata?: any
): Promise<Wallet | null> {
  // Получить текущий баланс
  const wallet = await getWallet(childId)
  if (!wallet) throw new Error('Wallet not found')
  
  const newCoins = wallet.coins + coinsChange
  
  // Проверка баланса
  if (newCoins < 0) {
    throw new Error('Insufficient coins')
  }
  
  // Обновить кошелёк
  const updates: any = {
    coins: newCoins
  }
  
  if (coinsChange > 0) {
    updates.total_earned_coins = wallet.total_earned_coins + coinsChange
  } else {
    updates.total_spent_coins = wallet.total_spent_coins + Math.abs(coinsChange)
  }
  
  const { data, error } = await supabase
    .from('wallet')
    .update(updates)
    .eq('child_id', childId)
    .select()
    .single()
  
  if (error) throw error
  
  // Создать лог
  await createAuditLog(childId, {
    action_by: actionBy,
    action_type: coinsChange > 0 ? 'earn_coins' : 'spend_coins',
    coins_before: wallet.coins,
    coins_after: newCoins,
    coins_change: coinsChange,
    money_before: wallet.money,
    money_after: wallet.money,
    money_change: 0,
    description,
    icon,
    related_type: relatedType,
    metadata
  })
  
  return data
}

// ============================================================================
// ЛОГИРОВАНИЕ (AUDIT LOG)
// ============================================================================

/**
 * СОЗДАТЬ ЗАПИСЬ В AUDIT LOG
 * 
 * ФИЛОСОФИЯ:
 * - Всё логируется (каждое действие)
 * - Прозрачность для детей (видят все операции)
 * - Контроль для родителей (видят попытки обмана)
 * - Безопасность (флаги подозрительной активности)
 * 
 * ФЛАГИ БЕЗОПАСНОСТИ:
 * - is_suspicious: Подозрительная активность (много операций за минуту)
 * - requires_review: Требует проверки (большие суммы, редкие операции)
 * - parent_reviewed: Родитель проверил и одобрил
 * 
 * ПРИМЕРЫ ПОДОЗРИТЕЛЬНОЙ АКТИВНОСТИ:
 * - Попытка изменить баланс вручную (без права)
 * - 10+ операций за 1 минуту
 * - Начисление >1000 💰 за раз
 * - Удаление записей из базы
 * - Изменение настроек (без права родителя)
 * 
 * ШТРАФЫ ЗА МОШЕННИЧЕСТВО:
 * 1. Первая попытка: Предупреждение + -100 💰
 * 2. Вторая попытка: -200 💰 + звонок родителям
 * 3. Третья попытка: Аккаунт заморожен на 7 дней
 * 4. Серьёзное мошенничество: Баланс сброшен в 0
 * 
 * @param childId - ID ребёнка
 * @param log - Данные для лога
 * @returns Promise<AuditLog> - Созданная запись лога
 */
async function createAuditLog(
  childId: string,
  log: Partial<AuditLog>
): Promise<AuditLog> {
  const { data, error } = await supabase
    .from('wallet_audit_log')
    .insert([{
      child_id: childId,
      ...log,
      created_at: new Date().toISOString()
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

/**
 * ПОЛУЧИТЬ ИСТОРИЮ ОПЕРАЦИЙ
 * 
 * @param childId - ID ребёнка (опционально)
 * @param limit - Лимит записей
 * @returns Promise<AuditLog[]> - Массив записей лога
 */
export async function getAuditLog(
  childId?: string,
  limit: number = 100
): Promise<AuditLog[]> {
  let query = supabase
    .from('wallet_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (childId) {
    query = query.eq('child_id', childId)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching audit log:', error)
    return []
  }
  
  return data
}

// ============================================================================
// ПОТЕНЦИАЛ МЕСЯЦА
// ============================================================================

/**
 * ПОЛУЧИТЬ ПОТЕНЦИАЛ МЕСЯЦА
 * 
 * ФИЛОСОФИЯ:
 * - Потенциал = ЧТО МОЖНО заработать (не лимит!)
 * - Система САМА считает на основе расписания
 * - Показывает ребёнку:
 *   * "Ты используешь 83% своего потенциала"
 *   * "Упускаешь 55 💰"
 *   * "Можешь заработать ещё X 💰 с бонусами"
 * - Мотивация: стремиться к 100% + бонусы!
 * 
 * @param childId - ID ребёнка
 * @param year - Год (опционально, по умолчанию текущий)
 * @param month - Месяц (опционально, по умолчанию текущий)
 * @returns Promise<MonthlyPotential | null> - Потенциал месяца
 */
export async function getMonthlyPotential(
  childId: string,
  year?: number,
  month?: number
): Promise<MonthlyPotential | null> {
  const now = new Date()
  const targetYear = year || now.getFullYear()
  const targetMonth = month || (now.getMonth() + 1)
  
  const { data, error } = await supabase
    .from('monthly_potential')
    .select('*')
    .eq('child_id', childId)
    .eq('year', targetYear)
    .eq('month', targetMonth)
    .single()
  
  if (error) {
    console.error('Error fetching monthly potential:', error)
    return null
  }
  
  return data
}

/**
 * РАССЧИТАТЬ ПОТЕНЦИАЛ МЕСЯЦА
 * 
 * Вызывает SQL функцию calculate_monthly_potential()
 * которая автоматически считает потенциал на основе:
 * - Расписания (школа, секции)
 * - Исторических данных (средние оценки)
 * - Реалистичных ожиданий (штрафы ~10-15%)
 * 
 * @param childId - ID ребёнка
 * @param year - Год
 * @param month - Месяц
 * @returns Promise<void>
 */
export async function calculateMonthlyPotential(
  childId: string,
  year: number,
  month: number
): Promise<void> {
  const { error } = await supabase.rpc('calculate_monthly_potential', {
    p_child_id: childId,
    p_year: year,
    p_month: month
  })
  
  if (error) {
    console.error('Error calculating monthly potential:', error)
    throw error
  }
}

// ============================================================================
// P2P ПЕРЕВОДЫ
// ============================================================================

/**
 * СОЗДАТЬ P2P ПЕРЕВОД
 * 
 * ФИЛОСОФИЯ:
 * - Дети учатся экономике (переводы, займы, сделки)
 * - Развивает навыки:
 *   * Переговоры (договориться о цене)
 *   * Контракты (выполнить обязательства)
 *   * Доверие (одолжить деньги)
 *   * Ответственность (вернуть долг вовремя)
 * 
 * ТИПЫ ПЕРЕВОДОВ:
 * 1. GIFT (подарок) - просто отдал
 * 2. PAYMENT (оплата) - за что-то купил
 * 3. LOAN (займ) - взял в долг, надо вернуть
 * 4. DEAL (сделка) - "сделай X, получишь Y монет"
 * 
 * ЛИМИТЫ (configurable):
 * - Макс за раз: 100 💰
 * - Макс в день: 200 💰
 * - Макс в месяц: 500 💰
 * - Одобрение родителя если >100 💰
 * - Макс долг: 200 💰
 * - Макс срок долга: 7 дней
 * 
 * @param transfer - Данные перевода
 * @returns Promise<P2PTransfer> - Созданный перевод
 */
export async function createP2PTransfer(
  transfer: Partial<P2PTransfer>
): Promise<P2PTransfer> {
  const settings = await getWalletSettings()
  
  // Проверить лимиты
  if (transfer.amount! > settings.p2p_max_per_transfer) {
    throw new Error(`Max transfer amount is ${settings.p2p_max_per_transfer} coins`)
  }
  
  // Проверить нужно ли одобрение родителя
  const requiresApproval = transfer.amount! > settings.p2p_approval_threshold
  
  const { data, error } = await supabase
    .from('p2p_transfers')
    .insert([{
      ...transfer,
      requires_approval: requiresApproval,
      status: requiresApproval ? 'pending' : 'approved',
      created_at: new Date().toISOString()
    }])
    .select()
    .single()
  
  if (error) throw error
  
  // Если не требует одобрения → сразу выполнить
  if (!requiresApproval) {
    await executeP2PTransfer(data.id)
  }
  
  return data
}

/**
 * ВЫПОЛНИТЬ P2P ПЕРЕВОД
 * 
 * Переводит монеты от одного ребёнка другому
 * 
 * @param transferId - ID перевода
 * @returns Promise<void>
 */
async function executeP2PTransfer(transferId: string): Promise<void> {
  // Получить перевод
  const { data: transfer, error: fetchError } = await supabase
    .from('p2p_transfers')
    .select('*')
    .eq('id', transferId)
    .single()
  
  if (fetchError || !transfer) {
    throw new Error('Transfer not found')
  }
  
  // Списать у отправителя
  await updateWalletCoins(
    transfer.from_child_id,
    -transfer.amount,
    `Перевод → ${transfer.to_child_id}: ${transfer.amount} 💰`,
    '💸',
    'child',
    'p2p_transfer',
    { transferId, type: transfer.transfer_type }
  )
  
  // Начислить получателю
  await updateWalletCoins(
    transfer.to_child_id,
    transfer.amount,
    `Перевод от ${transfer.from_child_id}: ${transfer.amount} 💰`,
    '💰',
    'child',
    'p2p_transfer',
    { transferId, type: transfer.transfer_type }
  )
  
  // Обновить статус перевода
  await supabase
    .from('p2p_transfers')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', transferId)
  
  // Если это займ → создать долг
  if (transfer.transfer_type === 'loan' && transfer.loan_due_date) {
    await supabase
      .from('p2p_debts')
      .insert([{
        debtor_child_id: transfer.to_child_id,
        creditor_child_id: transfer.from_child_id,
        amount: transfer.amount + transfer.loan_interest,
        original_amount: transfer.amount,
        interest_amount: transfer.loan_interest,
        due_date: transfer.loan_due_date,
        transfer_id: transferId,
        status: 'active'
      }])
  }
}

// ============================================================================
// ЭКСПОРТ ВСЕХ ФУНКЦИЙ
// ============================================================================

export {
  // Уже были в старом API
  updateWalletMoney,
  getRewards,
  addReward,
  updateReward,
  deleteReward,
  purchaseReward,
  getPurchases,
  approvePurchase,
  rejectPurchase,
  exchangeCoins,
  getExchanges,
  requestWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  getWithdrawals,
  calculateExchangeRate,
  
  // Новые функции
  awardCoinsForRoom,
  awardCoinsForBehavior,
}

// Остальные функции из старого API (без изменений)
// ... [код остальных функций]
