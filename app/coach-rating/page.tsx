'use client'

import { useState, useEffect } from 'react'
import NavBar from '@/components/NavBar'
import CoachRatingModal from '@/components/CoachRatingModal'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'

export default function CoachRatingPage() {
  const { activeMemberId } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [sections, setSections] = useState<any[]>([])


  useEffect(() => {
    loadSections()
  }, [activeMemberId])

  async function loadSections() {
    try {
      setLoading(true)
      // Загрузить секции из API (если есть)
      // Пока используем хардкод
      setSections([
        { id: 'football', name: 'Футбол', icon: '⚽', color: '#10b981' },
        { id: 'karate', name: 'Карате', icon: '🥋', color: '#f59e0b' },
        { id: 'swimming', name: 'Плавание', icon: '🏊', color: '#3b82f6' },
        { id: 'chess', name: 'Шахматы', icon: '♟️', color: '#8b5cf6' },
      ])
    } catch (err) {
      console.error('Error loading sections:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <NavBar />
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <div className="page-header" style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '40px',
            fontWeight: 900,
            margin: 0,
            marginBottom: '8px'
          }}>
            💪 Оценка тренера
          </h1>
          <p style={{
            color: 'var(--gray-600)',
            fontSize: '16px',
            marginBottom: '24px'
          }}>
            Оцени как ребёнок работал на тренировке
          </p>
        </div>

        {/* Философия */}
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '2px solid #fbbf24',
          marginBottom: '24px'
        }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            marginBottom: '12px',
            color: '#92400e'
          }}>
            💡 Философия оценки
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>Спорт = для здоровья</strong> (первично)
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Награда = только за ТРУД</strong> (вторично)
            </li>
            <li>
              Оценка тренера = <strong>объективный показатель</strong> старания
            </li>
          </ul>
        </div>

        {/* Таблица оценок */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 700, 
            marginBottom: '16px'
          }}>
            📊 Таблица оценок
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { rating: 5, label: 'Отлично! Пахал!', reward: '+10💰', color: '#10b981' },
              { rating: 4, label: 'Хорошо, старался', reward: '+5💰', color: '#3b82f6' },
              { rating: 3, label: 'Средне, так себе', reward: '0💰', color: '#f59e0b' },
              { rating: 2, label: 'Ленился', reward: '-3💰', color: '#ef4444' },
              { rating: 1, label: 'Хулиганил, мешал другим', reward: '-10💰', color: '#991b1b' },
            ].map(item => (
              <div 
                key={item.rating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  background: `${item.color}15`,
                  border: `2px solid ${item.color}`,
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: item.color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 900
                  }}>
                    {item.rating}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--gray-900)' }}>
                    {item.label}
                  </div>
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 900,
                  color: item.color
                }}>
                  {item.reward}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Кнопка оценить */}
        <button
          className="btn primary"
          style={{
            width: '100%',
            padding: '20px',
            fontSize: '18px',
            fontWeight: 700
          }}
          onClick={() => setShowModal(true)}
        >
          ⭐ Оценить тренировку
        </button>
      </div>

      {/* Модалка */}
      {showModal && (
        <CoachRatingModal
          childId={activeMemberId ?? ''}
          sections={sections}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            alert('Оценка сохранена! 🎉')
          }}
        />
      )}
    </>
  )
}
