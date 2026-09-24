// Client fetch wrappers for /api/expenses/* (see lib/wallet-client.ts pattern).
import type { SpendSection, SpendExpense, SpendPriceChange } from './summary'

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(error || `HTTP ${res.status}`)
  }
  return res.json()
}

export interface ChildSpendData {
  sections: SpendSection[]
  expenses: SpendExpense[]
  priceChanges: SpendPriceChange[]
}

export const fetchChildSpend = (childId: string) =>
  call<ChildSpendData>(`/api/expenses/child-summary?childId=${encodeURIComponent(childId)}`)

export const changeSectionPrice = (sectionId: string, cost: number, effectiveFrom?: string) =>
  call('/api/expenses/section-price', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sectionId, cost, effectiveFrom }),
  })

export const addHandout = (childId: string, amount: number, title?: string) =>
  call('/api/expenses/handout', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childId, amount, title }),
  })
