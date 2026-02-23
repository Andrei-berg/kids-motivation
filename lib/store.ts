import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStore {
  childId: 'adam' | 'alim'
  setChildId: (id: 'adam' | 'alim') => void
}

export const useAppStore = create<AppStore>()(persist(
  (set) => ({
    childId: 'adam',
    setChildId: (id) => set({ childId: id })
  }),
  { name: 'v5_child' }
))
