'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getChildren } from '@/lib/repositories/children.repo'
import DailyModal from '@/components/DailyModal'

interface Child {
  id: string
  name: string
  emoji: string
  active: boolean
}

function DailyPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlChildId = searchParams.get('childId')

  const [children, setChildren] = useState<Child[]>([])
  const [loadingChildren, setLoadingChildren] = useState(true)
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [saveKey, setSaveKey] = useState(0)

  useEffect(() => {
    async function loadChildren() {
      try {
        const data = await getChildren()
        setChildren(data)

        if (data.length > 0) {
          const matched = urlChildId ? data.find(c => c.id === urlChildId) : null
          setSelectedChildId(matched ? matched.id : data[0].id)
        }
      } catch (err) {
        console.error('Failed to load children:', err)
      } finally {
        setLoadingChildren(false)
      }
    }
    loadChildren()
  }, [urlChildId])

  const handleDateChange = useCallback((delta: number) => {
    setSelectedDate(prev => {
      const d = new Date(prev)
      d.setDate(d.getDate() + delta)
      return d.toISOString().slice(0, 10)
    })
  }, [])

  const handleSave = useCallback(() => {
    const child = children.find(c => c.id === selectedChildId)
    const name = child ? child.name : 'ребёнка'
    setSuccessMessage(`Данные сохранены для ${name}`)
    setSaveKey(k => k + 1)
    setTimeout(() => setSuccessMessage(''), 3000)
  }, [children, selectedChildId])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
        {/* Page header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-white">Ежедневный ввод</h1>
          <p className="text-sm text-gray-400">Оцените день для каждого ребёнка</p>
        </div>

        {/* Success banner */}
        {successMessage && (
          <div
            style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '10px',
              padding: '10px 16px',
              marginBottom: '16px',
              color: '#4ade80',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {successMessage}
          </div>
        )}

        {/* Child selector tabs */}
        <div className="flex gap-2 mb-4">
          {loadingChildren ? (
            <>
              <div className="animate-pulse bg-gray-800 rounded-full h-8 w-24" />
              <div className="animate-pulse bg-gray-800 rounded-full h-8 w-24" />
              <div className="animate-pulse bg-gray-800 rounded-full h-8 w-24" />
            </>
          ) : (
            children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChildId(child.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedChildId === child.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {child.emoji} {child.name}
              </button>
            ))
          )}
        </div>

        {/* Date selector */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => handleDateChange(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            aria-label="Предыдущий день"
          >
            ‹
          </button>
          <span className="text-sm font-medium text-gray-200 flex-1 text-center">
            {formatDate(selectedDate)}
          </span>
          <button
            onClick={() => handleDateChange(1)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            aria-label="Следующий день"
          >
            ›
          </button>
        </div>

        {/* DailyModal embedded (always open, not an overlay) */}
        {selectedChildId && (
          <div className="overflow-hidden">
            <DailyModal
              key={`${selectedChildId}-${selectedDate}-${saveKey}`}
              isOpen={true}
              onClose={() => router.push('/parent/dashboard')}
              childId={selectedChildId}
              date={selectedDate}
              onSave={handleSave}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ParentDailyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    }>
      <DailyPageContent />
    </Suspense>
  )
}
