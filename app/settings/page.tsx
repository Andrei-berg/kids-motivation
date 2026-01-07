'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import ScheduleEditor from '@/components/ScheduleEditor'
import { flexibleApi, Subject, ExerciseType } from '@/lib/flexible-api'
import { 
  getAllExpenseCategories, 
  addExpenseCategory, 
  toggleCategoryActive, 
  deleteExpenseCategory,
  ExpenseCategory 
} from '@/lib/expenses-api'
import { verifyPin } from '@/utils/helpers'

type Tab = 'subjects' | 'schedule' | 'exercises' | 'categories'

export default function Settings() {
  const [childId, setChildId] = useState('adam')
  const [activeTab, setActiveTab] = useState<Tab>('subjects')
  const [loading, setLoading] = useState(true)
  
  // PIN
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [pinInput, setPinInput] = useState('')
  
  // Subjects
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [archivedSubjects, setArchivedSubjects] = useState<Subject[]>([])
  const [newSubjectName, setNewSubjectName] = useState('')
  
  // Exercises
  const [exercises, setExercises] = useState<ExerciseType[]>([])
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseUnit, setNewExerciseUnit] = useState('раз')
  
  // Categories
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryIcon, setNewCategoryIcon] = useState('💰')
  
  useEffect(() => {
    const saved = localStorage.getItem('v4_selected_kid')
    if (saved) setChildId(saved)
  }, [])
  
  useEffect(() => {
    if (childId && activeTab === 'subjects') {
      loadSubjects()
    } else if (activeTab === 'exercises') {
      loadExercises()
    } else if (activeTab === 'categories') {
      loadCategories()
    }
  }, [childId, activeTab])
  
  async function loadSubjects() {
    try {
      setLoading(true)
      const active = await flexibleApi.getActiveSubjects(childId)
      const all = await flexibleApi.getSubjects(childId, true)
      const archived = all.filter(s => s.archived)
      
      setSubjects(active)
      setArchivedSubjects(archived)
    } catch (err) {
      console.error('Error loading subjects:', err)
    } finally {
      setLoading(false)
    }
  }
  
  async function loadExercises() {
    try {
      setLoading(true)
      const data = await flexibleApi.getExerciseTypes()
      setExercises(data)
    } catch (err) {
      console.error('Error loading exercises:', err)
    } finally {
      setLoading(false)
    }
  }
  
  async function loadCategories() {
    try {
      setLoading(true)
      const data = await getAllExpenseCategories()
      setCategories(data)
    } catch (err) {
      console.error('Error loading categories:', err)
    } finally {
      setLoading(false)
    }
  }
  
  async function handleAddCategory() {
    if (!newCategoryName.trim()) return
    
    try {
      await addExpenseCategory(newCategoryName.trim(), newCategoryIcon)
      setNewCategoryName('')
      setNewCategoryIcon('💰')
      await loadCategories()
    } catch (err) {
      alert('Ошибка добавления категории')
    }
  }
  
  async function handleToggleCategoryActive(id: string, isActive: boolean) {
    try {
      await toggleCategoryActive(id, !isActive)
      await loadCategories()
    } catch (err) {
      alert('Ошибка изменения категории')
    }
  }
  
  async function handleDeleteCategory(id: string) {
    if (!isAuthenticated) {
      setShowPinPrompt(true)
      return
    }
    
    if (!confirm('Удалить категорию? Это можно сделать только если нет расходов с этой категорией.')) return
    
    try {
      await deleteExpenseCategory(id)
      await loadCategories()
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления категории')
    }
  }
  
  async function handleAddSubject() {
    if (!newSubjectName.trim()) return
    
    try {
      await flexibleApi.createSubject(childId, newSubjectName.trim())
      setNewSubjectName('')
      await loadSubjects()
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        alert('Этот предмет уже существует!')
      } else {
        alert('Ошибка добавления предмета')
      }
    }
  }
  
  async function handleToggleActive(id: string, active: boolean) {
    try {
      await flexibleApi.toggleSubjectActive(id, !active)
      await loadSubjects()
    } catch (err) {
      alert('Ошибка изменения предмета')
    }
  }
  
  async function handleArchiveSubject(id: string) {
    if (!isAuthenticated) {
      setShowPinPrompt(true)
      return
    }
    
    if (!confirm('Архивировать предмет? Он будет скрыт из списка.')) return
    
    try {
      await flexibleApi.archiveSubject(id)
      await loadSubjects()
    } catch (err) {
      alert('Ошибка архивирования')
    }
  }
  
  async function handleAddExercise() {
    if (!newExerciseName.trim()) return
    
    try {
      await flexibleApi.createExerciseType(newExerciseName.trim(), true, newExerciseUnit)
      setNewExerciseName('')
      setNewExerciseUnit('раз')
      await loadExercises()
    } catch (err: any) {
      if (err.message?.includes('duplicate')) {
        alert('Это упражнение уже существует!')
      } else {
        alert('Ошибка добавления упражнения')
      }
    }
  }
  
  async function handleDeleteExercise(id: string) {
    if (!isAuthenticated) {
      setShowPinPrompt(true)
      return
    }
    
    if (!confirm('Удалить упражнение? Все данные по нему тоже удалятся!')) return
    
    try {
      await flexibleApi.deleteExerciseType(id)
      await loadExercises()
    } catch (err) {
      alert('Ошибка удаления')
    }
  }
  
  async function handlePinSubmit() {
    const hash = process.env.NEXT_PUBLIC_PARENT_PIN_HASH || 'MTIzNA=='
    if (verifyPin(pinInput, hash)) {
      setIsAuthenticated(true)
      setShowPinPrompt(false)
      setPinInput('')
    } else {
      alert('Неверный PIN')
      setPinInput('')
    }
  }

  return (
    <>
      <NavBar />
      <div className="wrap">
        <div className="card">
          <div className="h1">⚙️ Настройки</div>
          <div className="muted">Гибкая настройка системы</div>
        </div>

        {/* Tabs */}
        <div className="card" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--gray-200)', paddingBottom: '12px' }}>
            <button
              className={activeTab === 'subjects' ? 'btn-pill active' : 'btn-pill'}
              onClick={() => setActiveTab('subjects')}
            >
              📚 Предметы
            </button>
            <button
              className={activeTab === 'schedule' ? 'btn-pill active' : 'btn-pill'}
              onClick={() => setActiveTab('schedule')}
            >
              📅 Расписание
            </button>
            <button
              className={activeTab === 'exercises' ? 'btn-pill active' : 'btn-pill'}
              onClick={() => setActiveTab('exercises')}
            >
              💪 Упражнения
            </button>
            <button
              className={activeTab === 'categories' ? 'btn-pill active' : 'btn-pill'}
              onClick={() => setActiveTab('categories')}
            >
              💰 Категории расходов
            </button>
          </div>

          {/* ПРЕДМЕТЫ */}
          {activeTab === 'subjects' && (
            <div style={{ marginTop: '16px' }}>
              <div className="h2">Предметы для {childId === 'adam' ? 'Адама' : 'Алима'}</div>
              
              {/* Добавить предмет */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Название предмета"
                  className="input"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                  style={{ flex: 1 }}
                />
                <button className="btn primary" onClick={handleAddSubject}>
                  + Добавить
                </button>
              </div>

              {/* Активные предметы */}
              <div style={{ marginTop: '24px' }}>
                <div className="h3" style={{ marginBottom: '12px' }}>Активные предметы</div>
                {subjects.length === 0 && (
                  <div className="tip">Нет предметов. Добавьте первый!</div>
                )}
                <div style={{ display: 'grid', gap: '8px' }}>
                  {subjects.map(subject => (
                    <div
                      key={subject.id}
                      className="card"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        opacity: subject.active ? 1 : 0.5
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{subject.name}</div>
                        {!subject.active && (
                          <div className="tip" style={{ marginTop: '4px' }}>Отключен</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn"
                          onClick={() => handleToggleActive(subject.id, subject.active)}
                        >
                          {subject.active ? '🔒 Отключить' : '✅ Включить'}
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleArchiveSubject(subject.id)}
                        >
                          📦 Архив
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Архивированные */}
              {archivedSubjects.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <div className="h3" style={{ marginBottom: '12px' }}>📦 Архив</div>
                  <div style={{ display: 'grid', gap: '8px', opacity: 0.6 }}>
                    {archivedSubjects.map(subject => (
                      <div
                        key={subject.id}
                        className="card"
                        style={{ padding: '12px 16px' }}
                      >
                        <div>{subject.name}</div>
                        <div className="tip" style={{ marginTop: '4px' }}>
                          Архивирован {subject.archived_at && new Date(subject.archived_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* РАСПИСАНИЕ */}
          {activeTab === 'schedule' && (
            <div style={{ marginTop: '16px' }}>
              <ScheduleEditor childId={childId} />
            </div>
          )}

          {/* УПРАЖНЕНИЯ */}
          {activeTab === 'exercises' && (
            <div style={{ marginTop: '16px' }}>
              <div className="h2">Домашние упражнения</div>
              
              {/* Добавить упражнение */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Название упражнения"
                  className="input"
                  value={newExerciseName}
                  onChange={(e) => setNewExerciseName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExercise()}
                  style={{ flex: 1 }}
                />
                <select
                  className="input"
                  value={newExerciseUnit}
                  onChange={(e) => setNewExerciseUnit(e.target.value)}
                  style={{ width: '120px' }}
                >
                  <option value="раз">раз</option>
                  <option value="мин">мин</option>
                  <option value="сек">сек</option>
                  <option value="км">км</option>
                </select>
                <button className="btn primary" onClick={handleAddExercise}>
                  + Добавить
                </button>
              </div>

              {/* Список упражнений */}
              <div style={{ marginTop: '24px' }}>
                <div className="h3" style={{ marginBottom: '12px' }}>Доступные упражнения</div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {exercises.map(exercise => (
                    <div
                      key={exercise.id}
                      className="card"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{exercise.name}</div>
                        <div className="tip" style={{ marginTop: '4px' }}>
                          Единица: {exercise.unit}
                        </div>
                      </div>
                      <button
                        className="btn"
                        onClick={() => handleDeleteExercise(exercise.id)}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* КАТЕГОРИИ РАСХОДОВ */}
          {activeTab === 'categories' && (
            <div style={{ marginTop: '16px' }}>
              <div className="h2">Категории расходов</div>
              
              {/* Добавить категорию */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <select
                  className="input"
                  value={newCategoryIcon}
                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                  style={{ width: '80px' }}
                >
                  <option value="💰">💰</option>
                  <option value="🎓">🎓</option>
                  <option value="🏃">🏃</option>
                  <option value="🎨">🎨</option>
                  <option value="👕">👕</option>
                  <option value="🏥">🏥</option>
                  <option value="🎮">🎮</option>
                  <option value="🎒">🎒</option>
                  <option value="📚">📚</option>
                  <option value="💔">💔</option>
                  <option value="🍎">🍎</option>
                  <option value="🚗">🚗</option>
                  <option value="🎸">🎸</option>
                  <option value="⚽">⚽</option>
                </select>
                <input
                  type="text"
                  placeholder="Название категории"
                  className="input"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  style={{ flex: 1 }}
                />
                <button className="btn primary" onClick={handleAddCategory}>
                  + Добавить
                </button>
              </div>

              {/* Список категорий */}
              <div style={{ marginTop: '24px' }}>
                <div className="h3" style={{ marginBottom: '12px' }}>Все категории</div>
                <div className="tip" style={{ marginBottom: '12px' }}>
                  Отключённые категории не показываются при добавлении расхода.
                  Нельзя удалить категорию, если есть расходы с ней.
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {categories.map(category => (
                    <div
                      key={category.id}
                      className="card"
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        opacity: category.is_active ? 1 : 0.5
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>{category.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>{category.name}</div>
                          {category.is_default && (
                            <div className="tip" style={{ marginTop: '4px' }}>
                              Предустановленная
                            </div>
                          )}
                          {!category.is_active && (
                            <div className="tip" style={{ marginTop: '4px', color: '#ef4444' }}>
                              Отключена
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn"
                          onClick={() => handleToggleCategoryActive(category.id, category.is_active)}
                        >
                          {category.is_active ? '⚪ Отключить' : '🟢 Включить'}
                        </button>
                        {!category.is_default && (
                          <button
                            className="btn"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            🗑️ Удалить
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PIN Prompt */}
      {showPinPrompt && (
        <div className="modal-overlay" onClick={() => setShowPinPrompt(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modalH">
              <div className="h">🔐 Введите PIN</div>
              <button className="close" onClick={() => setShowPinPrompt(false)}>×</button>
            </div>
            <div className="modalB">
              <input
                type="password"
                className="input"
                placeholder="PIN код"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                autoFocus
              />
              <button className="btn primary" onClick={handlePinSubmit} style={{ marginTop: '12px' }}>
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
