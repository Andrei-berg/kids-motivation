'use client'
import { useState, useCallback, useRef, useEffect } from 'react'

// Row-anchored viewport position (Phase 09.3 / D-08 / D-11). Exported so
// callers can type a ref without re-declaring the shape.
export interface FlyupAnchor {
  left: number
  top: number
}

interface FlyupInstance {
  id: number
  amount: number
  x: number // % from left (randomized 30-70%) — used when unanchored
  anchor?: FlyupAnchor
}

// Reduced-motion double-guard idiom (mirrors components/design/atoms.tsx Tick):
// returns false when window/matchMedia is unavailable, otherwise the live
// media-query match result below.
function reducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useCoinAnimation() {
  const [flyups, setFlyups] = useState<FlyupInstance[]>([])
  const counter = useRef(0)

  const trigger = useCallback((amount: number, anchor?: FlyupAnchor | null) => {
    if (amount === 0) return
    const id = ++counter.current
    const x = 30 + Math.random() * 40
    setFlyups(prev => [...prev, { id, amount, x, ...(anchor ? { anchor } : {}) }])
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
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    setReduced(reducedMotion())
  }, [])

  if (flyups.length === 0) return null

  const unanchored = flyups.filter(f => !f.anchor)
  const anchored = flyups.filter(f => f.anchor)

  const classFor = (f: FlyupInstance) =>
    'coin-flyup-number' + (f.amount < 0 ? ' loss' : '') + (reduced ? ' static' : '')

  return (
    <>
      {unanchored.length > 0 && (
        <div className="coin-flyup-container" aria-hidden="true">
          {unanchored.map(f => (
            <span
              key={f.id}
              className={classFor(f)}
              style={{ left: `${f.x}%` }}
            >
              {f.amount > 0 ? `+${f.amount}` : f.amount} 💰
            </span>
          ))}
        </div>
      )}
      {anchored.length > 0 && (
        <div className="coin-flyup-anchored" aria-hidden="true">
          {anchored.map(f => (
            <span
              key={f.id}
              className={classFor(f)}
              style={{ left: f.anchor!.left, top: f.anchor!.top, position: 'absolute' }}
            >
              {f.amount > 0 ? `+${f.amount}` : f.amount} 💰
            </span>
          ))}
        </div>
      )}
    </>
  )
}
