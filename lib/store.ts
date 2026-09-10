import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStore {
  // Multi-tenant fields (Phase 1.4+)
  familyId: string | null
  setFamilyId: (id: string | null) => void
  activeMemberId: string | null     // family_members.id of the selected child
  setActiveMemberId: (id: string | null) => void
  // Localization (Phase 4.3)
  language: string
  setLanguage: (lang: string) => void
  // Parent Center view mode — 'classic' screens vs the family Feed. Per-device
  // preference; the Feed is only actually reachable when the family has it
  // enabled (wallet_settings.feed_enabled).
  pcView: 'classic' | 'feed'
  setPcView: (v: 'classic' | 'feed') => void
  // Per-parent: land the Parent Center directly in the Feed on open.
  pcFeedDefault: boolean
  setPcFeedDefault: (v: boolean) => void
}

export const useAppStore = create<AppStore>()(persist(
  (set) => ({
    familyId: null,
    setFamilyId: (id) => set({ familyId: id }),
    activeMemberId: null,
    setActiveMemberId: (id) => set({ activeMemberId: id }),
    language: 'ru',
    setLanguage: (lang) => set({ language: lang }),
    pcView: 'classic',
    setPcView: (v) => set({ pcView: v }),
    pcFeedDefault: false,
    setPcFeedDefault: (v) => set({ pcFeedDefault: v }),
  }),
  { name: 'v5_child' }
))
