'use client'

import { useState, useEffect } from 'react'
import { 
  getExpenses, 
  getExpenseCategories, 
  getExpenseStats,
  deleteExpense,
  Expense,
  ExpenseCategory,
  ExpenseStats
} from '@/lib/expenses-api'
import NavBar from '@/components/NavBar'
import ExpenseModal from '@/components/ExpenseModal'
import ExpenseCharts from '@/components/ExpenseCharts'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [stats, setStats] = useState<ExpenseStats | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Фильтры
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth())
  
  // Модалка
  const [showAddModal, setShowAddModal] = useState(false)
  
  // Роль (для демо - всегда родитель)
  const isParent = true

  useEffect(() => {
    loadData()
  }, [selectedChild, selectedCategory, selectedMonth])

  async function loadData() {
    try {
      setLoading(true)
      
      const [startDate, endDate] = getMonthRange(selectedMonth)
      
      const filters = {
        childId: selectedChild !== 'all' ? selectedChild : undefined,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        startDate,
        endDate
      }
      
      const [expensesData, categoriesData, statsData] = await Promise.all([
        getExpenses(filters),
        getExpenseCategories(),
        getExpenseStats(filters)
      ])
      
      setExpenses(expensesData)
      setCategories(categoriesData)
      setStats(statsData)
    } catch (err) {
      console.error('Error loading expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  function getCurrentMonth() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  function getMonthRange(month: string): [string, string] {
    const [year, mon] = month.split('-')
    const startDate = `${year}-${mon}-01`
    const lastDay = new Date(Number(year), Number(mon), 0).getDate()
    const endDate = `${year}-${mon}-${lastDay}`
    return [startDate, endDate]
  }

  function formatAmount(amount: number) {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  function getChildName(childId: string) {
    return childId === 'adam' ? 'Адам' : childId === 'alim' ? 'Алим' : childId
  }

  async function handleDelete(expenseId: string) {
    if (!confirm('Удалить этот расход?')) return
    
    try {
      await deleteExpense(expenseId)
      await loadData()
    } catch (err) {
      console.error('Error deleting expense:', err)
      alert('Ошибка удаления')
    }
  }

  return (
    <div className="app">
      <NavBar />
      
      <main className="main-content">
        <div className="expenses-page">
          {/* Header */}
          <div className="expenses-header">
            <div>
              <h1 className="expenses-title">💰 Расходы</h1>
              <p className="expenses-subtitle">Инвестиции в развитие детей</p>
            </div>
            {isParent && (
              <button 
                className="btn-add-expense"
                onClick={() => setShowAddModal(true)}
              >
                + Добавить расход
              </button>
            )}
          </div>

          {/* Фильтры */}
          <div className="expenses-filters">
            <select 
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="filter-select"
            >
              <option value="all">Все дети</option>
              <option value="adam">Адам</option>
              <option value="alim">Алим</option>
            </select>

            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              <option value="all">Все категории</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>

            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="filter-select"
            />
          </div>

          {loading ? (
            <div className="expenses-loading">Загрузка...</div>
          ) : (
            <>
              {/* Статистика */}
              {stats && (
                <div className="expenses-stats">
                  <div className="stats-total">
                    <div className="stats-total-label">Всего за месяц</div>
                    <div className="stats-total-amount">{formatAmount(stats.total)}</div>
                  </div>

                  {stats.byCategory.length > 0 && (
                    <div className="stats-section">
                      <h3 className="stats-section-title">По категориям</h3>
                      <div className="stats-list">
                        {stats.byCategory.map(item => (
                          <div key={item.categoryId} className="stats-item">
                            <div className="stats-item-info">
                              <span className="stats-item-icon">{item.icon}</span>
                              <span className="stats-item-name">{item.categoryName}</span>
                            </div>
                            <div className="stats-item-amount">
                              {formatAmount(item.amount)}
                              <span className="stats-item-percent">({item.percentage.toFixed(0)}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stats.byChild.length > 1 && (
                    <div className="stats-section">
                      <h3 className="stats-section-title">По детям</h3>
                      <div className="stats-list">
                        {stats.byChild.map(item => (
                          <div key={item.childId} className="stats-item">
                            <div className="stats-item-info">
                              <span className="stats-item-name">{getChildName(item.childId)}</span>
                            </div>
                            <div className="stats-item-amount">
                              {formatAmount(item.amount)}
                              <span className="stats-item-percent">({item.percentage.toFixed(0)}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Графики */}
              {stats && stats.total > 0 && (
                <ExpenseCharts stats={stats} getChildName={getChildName} />
              )}

              {/* История расходов */}
              <div className="expenses-list">
                <h2 className="expenses-list-title">История расходов</h2>
                
                {expenses.length === 0 ? (
                  <div className="expenses-empty">
                    <div className="expenses-empty-icon">💰</div>
                    <div className="expenses-empty-text">Нет расходов</div>
                    <div className="expenses-empty-hint">
                      {isParent ? 'Добавьте первый расход' : 'Расходы появятся когда родители их добавят'}
                    </div>
                  </div>
                ) : (
                  <div className="expenses-items">
                    {expenses.map(expense => (
                      <div key={expense.id} className="expense-card">
                        <div className="expense-card-icon">
                          {expense.category?.icon || '💰'}
                        </div>
                        <div className="expense-card-main">
                          <div className="expense-card-header">
                            <div className="expense-card-title">{expense.title}</div>
                            {isParent && (
                              <button 
                                className="expense-card-delete"
                                onClick={() => handleDelete(expense.id)}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                          <div className="expense-card-info">
                            <span className="expense-card-amount">{formatAmount(Number(expense.amount))}</span>
                            <span className="expense-card-dot">•</span>
                            <span className="expense-card-child">{getChildName(expense.child_id)}</span>
                            <span className="expense-card-dot">•</span>
                            <span className="expense-card-date">{formatDate(expense.date)}</span>
                          </div>
                          {expense.note && (
                            <div className="expense-card-note">{expense.note}</div>
                          )}
                          {expense.is_recurring && (
                            <div className="expense-card-recurring">
                              🔁 {expense.recurring_period === 'weekly' ? 'Еженедельно' : 'Ежемесячно'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Модалка добавления */}
      <ExpenseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        categories={categories}
        onSuccess={loadData}
      />
    </div>
  )
}
