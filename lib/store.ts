import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStore {
  // Multi-tenant fields (Phase 1.4+)
  familyId: string | null
  setFamilyId: (id: string | null) => void
  activeMemberId: string | null     // family_members.id of the selected child
  setActiveMemberId: (id: string | null) => void
}

export const useAppStore = create<AppStore>()(persist(
  (set) => ({
    familyId: null,
    setFamilyId: (id) => set({ familyId: id }),
    activeMemberId: null,
    setActiveMemberId: (id) => set({ activeMemberId: id }),
  }),
  { name: 'v5_child' }
))
