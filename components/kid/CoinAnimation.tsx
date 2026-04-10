'use client'
import { useState, useCallback, useRef } from 'react'

interface FlyupInstance {
  id: number
  amount: number
  x: number // % from left (randomized 30-70%)
}

export function useCoinAnimation() {
  const [flyups, setFlyups] = useState<FlyupInstance[]>([])
  const counter = useRef(0)

  const trigger = useCallback((amount: number) => {
    if (amount === 0) return
    const id = ++counter.current
    const x = 30 + Math.random() * 40
    setFlyups(prev => [...prev, { id, amount, x }])
    setTimeout(() => {
      setFlyups(prev => prev.filter(f => f.id !== id))
    }, 1200)
  }, [])

  return { flyups, trigger }
}

interface CoinFlyupProps {
  flyups: FlyupInstance[]
}

export function CoinFlyup({ flyups }: CoinFlyupProps) {
  if (flyups.length === 0) return null
  return (
    <div className="coin-flyup-container" aria-hidden="true">
      {flyups.map(f => (
        <span
          key={f.id}
          className="coin-flyup-number"
          style={{ left: `${f.x}%` }}
        >
          {f.amount > 0 ? `+${f.amount}` : f.amount} 💰
        </span>
      ))}
    </div>
  )
}
