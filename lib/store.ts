import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStore {
  // Legacy fields — used by existing pages (dashboard, wallet, analytics, etc.)
  // Phase 1.4 will migrate these to UUIDs. Do NOT remove until Phase 1.4.
  childId: 'adam' | 'alim'
  setChildId: (id: 'adam' | 'alim') => void

  // Phase 1.3+ multi-tenant fields
  familyId: string | null
  setFamilyId: (id: string | null) => void
  activeMemberId: string | null     // family_members.id of the selected child
  setActiveMemberId: (id: string | null) => void
}

export const useAppStore = create<AppStore>()(persist(
  (set) => ({
    // Legacy
    childId: 'adam',
    setChildId: (id) => set({ childId: id }),

    // Multi-tenant
    familyId: null,
    setFamilyId: (id) => set({ familyId: id }),
    activeMemberId: null,
    setActiveMemberId: (id) => set({ activeMemberId: id }),
  }),
  { name: 'v5_child' }
))
