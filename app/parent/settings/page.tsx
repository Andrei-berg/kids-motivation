'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n'
import PeriodsManager from '@/components/settings/PeriodsManager'
import SectionsManager from '@/components/settings/SectionsManager'
import SubjectsManager from '@/components/settings/SubjectsManager'
import ActivitiesManager from '@/components/settings/ActivitiesManager'
import { useFamilyMembers } from '@/lib/hooks/useFamilyMembers'

const TABS = [
  { id: 'vacations', icon: '🌴', labelKey: 'parentCenter.settings.more.vacations' },
  { id: 'sections',  icon: '🏃', labelKey: 'parentCenter.settings.more.sections'  },
  { id: 'subjects',  icon: '📚', labelKey: 'parentCenter.settings.more.subjects'  },
  { id: 'activities',icon: '🎯', labelKey: 'settings.tabs.activities'             },
] as const

type TabId = typeof TABS[number]['id']

export default function ParentSettingsPage() {
  const t = useT()
  const router = useRouter()
  const [tab, setTab] = useState<TabId>('vacations')
  const { members } = useFamilyMembers()
  const children = members.filter(m => m.role === 'child').map(m => ({ id: m.id, name: m.display_name }))

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0f13', color: '#e8e8f0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 16px 0',
        position: 'sticky', top: 0, zIndex: 20,
        background: 'linear-gradient(to bottom, #0f0f13 80%, transparent)',
      }}>
        <button
          onClick={() => router.push('/parent-center')}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#e8e8f0', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
          {t('parentCenter.settings.title')}
        </h1>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 6, padding: '14px 16px 0',
        overflowX: 'auto', position: 'sticky', top: 52, zIndex: 10,
        background: 'linear-gradient(to bottom, #0f0f13 80%, transparent)',
      }}>
        {TABS.map(({ id, icon, labelKey }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flexShrink: 0,
                height: 32, padding: '0 12px', borderRadius: 999,
                background: active ? 'rgba(108,92,231,0.25)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${active ? 'rgba(108,92,231,0.5)' : 'rgba(255,255,255,0.08)'}`,
                color: active ? '#c4baff' : '#888899',
                fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: 'pointer', transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span>{icon}</span>
              <span>{t(labelKey as any)}</span>
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {tab === 'vacations'  && <PeriodsManager />}
        {tab === 'sections'   && <SectionsManager />}
        {tab === 'subjects'   && <SubjectsManager children={children} />}
        {tab === 'activities' && <ActivitiesManager />}
      </div>
    </div>
  )
}
