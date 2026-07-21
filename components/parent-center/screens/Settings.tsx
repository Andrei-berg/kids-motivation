'use client'

import { useState, useEffect } from 'react'
import { T } from '../tokens'
import { Card, Btn, Pill, Icon, Tabs } from '../ui'
import type { ParentChild, Route } from '../types'
import { createClient } from '@/lib/supabase/client'
import AuthHelpModal from '@/components/AuthHelpModal'
import { getWalletSettings } from '@/lib/wallet-api'
import { setChildPin } from '@/lib/onboarding-api'
import { updateWalletSettingsApi } from '@/lib/wallet-client'
import type { WalletSettings } from '@/lib/wallet-api'
import { useLanguage, SUPPORTED_LANGUAGES, useT } from '@/lib/i18n'
import { insertAuditEvent } from '@/lib/repositories/audit.repo'
import { useAppStore } from '@/lib/store'
import { repairAchievements } from '@/app/actions/repair-achievements'
import PeriodsManager from '@/components/settings/PeriodsManager'
import SectionsManager from '@/components/settings/SectionsManager'
import SubjectsManager from '@/components/settings/SubjectsManager'
import ActivitiesManager from '@/components/settings/ActivitiesManager'
import RoomTasksManager from '@/components/settings/RoomTasksManager'
import DayBlocksManager from '@/components/settings/DayBlocksManager'
import CalendarSettingsManager from '@/components/settings/CalendarSettingsManager'
import CalendarGrid from '@/components/settings/CalendarGrid'
import type { PeriodOpenRequest } from '@/components/settings/PeriodsManager'

// ───── Language card ─────
function LanguageCard() {
  const { language, setLanguage } = useLanguage()
  const t = useT()
  return (
    <Card pad={16}>
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {t('parentCenter.settings.family.language')}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {SUPPORTED_LANGUAGES.map(lang => {
          const active = language === lang.code
          return (
            <button key={lang.code} onClick={() => setLanguage(lang.code)} style={{
              flex: 1, height: 44, borderRadius: T.rM,
              background: active ? T.indigoSoft : T.bg1,
              border: `2px solid ${active ? 'rgba(108,92,231,0.5)' : T.cardBorder}`,
              color: active ? T.text : T.muted,
              fontFamily: T.fBody, fontSize: 14, fontWeight: active ? 700 : 500,
              cursor: 'pointer', transition: 'all .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: active ? `0 0 20px ${T.indigo}22` : 'none',
            }}>
              <span style={{ fontSize: 20 }}>{lang.flag}</span>
              <span>{lang.label}</span>
              {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.indigoHi }}/>}
            </button>
          )
        })}
      </div>
    </Card>
  )
}

// ───── Family tab ─────
function FamilyTab({ allChildren, notify, familyId }: { allChildren: ParentChild[]; notify: (msg: string, tone?: string) => void; familyId: string | null }) {
  const [copied, setCopied] = useState(false)
  const [code, setCode] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const t = useT()

  useEffect(() => {
    if (!familyId) return
    let cancelled = false
    createClient()
      .from('families')
      .select('invite_code')
      .eq('id', familyId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setCode(data.invite_code)
      })
    return () => { cancelled = true }
  }, [familyId])

  const copy = async () => {
    if (!code) return
    await navigator.clipboard?.writeText(code).catch(() => {})
    setCopied(true)
    notify(t('parentCenter.settings.family.inviteCopied'))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <LanguageCard />

      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          {t('parentCenter.settings.family.inviteCode')}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: T.rM,
          background: T.bg1, border: `1px dashed ${T.indigo}55`, marginBottom: 10,
        }}>
          <span style={{ fontFamily: T.fMono, fontSize: 24, fontWeight: 700, color: T.cyan, letterSpacing: '0.3em', flex: 1, textAlign: 'center' }}>{code || '······'}</span>
          <Btn variant={copied ? 'success' : 'primary'} size="md" icon={copied ? 'check' : 'copy'} onClick={copy} disabled={!code}>
            {copied ? t('parentCenter.settings.family.copied') : t('parentCenter.settings.family.copy')}
          </Btn>
        </div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
          {t('parentCenter.settings.family.inviteHint')}{' '}
          <span style={{ fontFamily: T.fMono, color: T.textDim }}>/onboarding/join</span>{' '}
          {t('parentCenter.settings.family.inviteHint2')}
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          style={{ background: 'none', border: 'none', color: T.indigoHi, fontSize: 12, textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: 8 }}
        >
          {t('authHelp.trigger')}
        </button>
      </Card>
      <AuthHelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      <Card pad={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t('parentCenter.settings.family.members')}
          </div>
          <Btn variant="ghost" size="sm" icon="plus" onClick={() => window.open('/register', '_blank')}>
            {t('parentCenter.settings.family.addChild')}
          </Btn>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${T.indigo}, ${T.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>
                Parent <span style={{ fontSize: 12, color: T.muted, fontWeight: 400 }}>{t('parentCenter.settings.family.you')}</span>
              </div>
            </div>
            <Pill tone="indigo">{t('parentCenter.settings.family.roleParent')}</Pill>
          </div>
          {allChildren.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${T.cardBorder}` }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${c.accent}22`, border: `1px solid ${c.accent}44` }}>{c.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {t('parentCenter.settings.family.yearsLvl').replace('{age}', String(c.age)).replace('{level}', String(c.level))}
                </div>
              </div>
              <Pill>{t('parentCenter.settings.family.roleChild')}</Pill>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ───── Coin rules tab ─────
function CoinsRulesTab({ notify }: { notify: (msg: string, tone?: string) => void }) {
  const { familyId } = useAppStore()
  const t = useT()
  const [settings, setSettings] = useState<WalletSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getWalletSettings().then(s => s && setSettings(s)).catch(() => {})
  }, [])

  if (!settings) return <div style={{ color: T.muted, padding: 20, textAlign: 'center' }}>{t('common.loading')}</div>

  const up = (k: keyof WalletSettings, v: string) => setSettings(s => s ? { ...s, [k]: Number(v) || 0 } : s)

  const save = async () => {
    setSaving(true)
    try {
      await updateWalletSettingsApi(settings)
      notify(t('parentCenter.settings.coinsRules.saved'))
      void insertAuditEvent({
        family_id: familyId ?? '', child_id: null,
        action_type: 'settings_change',
        description: 'Settings updated: coin reward rules',
        coins_delta: null, actor_user_id: null,
        metadata: { tab: 'coins' },
      })
    } catch {
      notify(t('parentCenter.settings.coinsRules.saveFailed'), 'danger')
    } finally { setSaving(false) }
  }

  const RuleRow = ({ icon, label, value, rkey }: { icon: string; label: string; value: number; rkey: keyof WalletSettings }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: `1px solid ${T.cardBorder}` }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, color: T.text, fontWeight: 500 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 0 10px', height: 32, background: T.bg1, border: `1px solid ${T.cardBorder}`, borderRadius: T.rM }}>
        <input type="number" value={value} onChange={e => up(rkey, e.target.value)} style={{
          width: 46, background: 'transparent', border: 'none', outline: 'none',
          color: value > 0 ? T.success : value < 0 ? T.danger : T.text,
          fontFamily: T.fMono, fontSize: 14, fontWeight: 700, textAlign: 'right',
        }}/>
        <span style={{ fontSize: 13 }}>🪙</span>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          {t('parentCenter.settings.coinsRules.schoolGrades')}
        </div>
        <RuleRow icon="🏆" label={t('settings.coinRules.grade5')} value={settings.coins_per_grade_5} rkey="coins_per_grade_5"/>
        <RuleRow icon="👍" label={t('settings.coinRules.grade4')} value={settings.coins_per_grade_4} rkey="coins_per_grade_4"/>
        <RuleRow icon="📉" label={t('settings.coinRules.grade3')} value={settings.coins_per_grade_3} rkey="coins_per_grade_3"/>
        <RuleRow icon="⚠️" label={t('settings.coinRules.grade2')} value={settings.coins_per_grade_2} rkey="coins_per_grade_2"/>
        <RuleRow icon="🚫" label={t('settings.coinRules.grade1')} value={settings.coins_per_grade_1} rkey="coins_per_grade_1"/>
      </Card>
      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          {t('parentCenter.settings.coinsRules.chores')}
        </div>
        <RuleRow icon="🧹" label={t('settings.coinRules.roomCleaned')} value={settings.coins_per_room_task} rkey="coins_per_room_task"/>
        <RuleRow icon="⭐" label={t('settings.coinRules.goodBehavior')} value={settings.coins_per_good_behavior} rkey="coins_per_good_behavior"/>
        <RuleRow icon="🏃" label={t('settings.coinRules.exercise')} value={settings.coins_per_exercise} rkey="coins_per_exercise"/>
      </Card>
      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          {t('parentCenter.settings.coinsRules.streaks')}
        </div>
        <RuleRow icon="📅" label={t('settings.coinRules.streakRoomDays')} value={settings.streak_room_days} rkey="streak_room_days"/>
        <RuleRow icon="🔥" label={t('settings.coinRules.streakRoomBonus')} value={settings.streak_room_bonus} rkey="streak_room_bonus"/>
        <RuleRow icon="📅" label={t('settings.coinRules.streakStudyDays')} value={settings.streak_study_days} rkey="streak_study_days"/>
        <RuleRow icon="🔥" label={t('settings.coinRules.streakStudyBonus')} value={settings.streak_study_bonus} rkey="streak_study_bonus"/>
        <RuleRow icon="📅" label={t('settings.coinRules.streakSportDays')} value={settings.streak_sport_days} rkey="streak_sport_days"/>
        <RuleRow icon="🔥" label={t('settings.coinRules.streakSportBonus')} value={settings.streak_sport_bonus} rkey="streak_sport_bonus"/>
      </Card>
      <Card pad={16} style={{ background: `linear-gradient(135deg, ${T.cyanSoft}, ${T.card})` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Pill tone="cyan">{t('parentCenter.settings.coinsRules.trainer')}</Pill>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t('parentCenter.settings.coinsRules.coachGrades')}
          </div>
        </div>
        <RuleRow icon="🥇" label={t('settings.coinRules.coachGrade5')} value={settings.coins_per_coach_5} rkey="coins_per_coach_5"/>
        <RuleRow icon="🥈" label={t('settings.coinRules.coachGrade4')} value={settings.coins_per_coach_4} rkey="coins_per_coach_4"/>
        <RuleRow icon="🥉" label={t('settings.coinRules.coachGrade3')} value={settings.coins_per_coach_3} rkey="coins_per_coach_3"/>
      </Card>
      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          {t('parentCenter.settings.coinsRules.exchange')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, padding: 14, background: T.bg1, border: `1px solid ${T.cardBorder}`, borderRadius: T.rM, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <input type="number" value={settings.base_exchange_rate} onChange={e => up('base_exchange_rate', e.target.value)}
              style={{ width: 50, background: 'transparent', border: 'none', outline: 'none', color: T.cyan, fontFamily: T.fMono, fontSize: 22, fontWeight: 700, textAlign: 'right' }}/>
            <span style={{ fontSize: 18 }}>🪙</span>
            <span style={{ fontFamily: T.fMono, fontSize: 16, color: T.muted }}>=</span>
            <span style={{ fontFamily: T.fMono, fontSize: 22, fontWeight: 700, color: T.text }}>1₽</span>
          </div>
        </div>
      </Card>
      <Btn variant="primary" size="lg" onClick={save} disabled={saving} full>
        {saving ? t('parentCenter.settings.coinsRules.saving') : t('parentCenter.settings.coinsRules.saveBtn')}
      </Btn>
    </div>
  )
}

// ───── Child login PIN card ─────
function PinCard({ child, notify }: { child: ParentChild; notify: (msg: string, tone?: string) => void }) {
  const t = useT()
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (pin.length < 4 || pin.length > 6) { notify(t('parentCenter.settings.child.pinTooShort'), 'error'); return }
    setSaving(true)
    try {
      await setChildPin(child.id, pin)
      setPin('')
      notify(t('parentCenter.settings.child.pinSaved', { name: child.name }))
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card pad={16}>
      <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {t('parentCenter.settings.child.childPin')}
      </div>
      <div style={{ padding: 12, background: T.indigoSoft, borderRadius: T.r, border: `1px solid rgba(108,92,231,0.2)`, fontSize: 13, color: T.textDim, lineHeight: 1.5, marginBottom: 10 }}>
        {t('parentCenter.settings.child.pinHint', { name: child.name })}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="off"
          placeholder={t('parentCenter.settings.child.pinPlaceholder')}
          style={{
            flex: 1, height: 40, padding: '0 14px', borderRadius: T.r,
            background: T.bg1, border: `1px solid ${T.cardBorder}`, color: T.text,
            fontFamily: T.fBody, fontSize: 16, letterSpacing: '0.3em', textAlign: 'center',
          }}
        />
        <Btn variant="primary" size="md" onClick={() => save()} disabled={saving || pin.length < 4 || pin.length > 6}>
          {saving ? t('common.loading') : t('parentCenter.settings.child.pinSaveBtn')}
        </Btn>
      </div>
    </Card>
  )
}

// ───── Children tab ─────
function ChildrenTab({ allChildren, notify }: { allChildren: ParentChild[]; notify: (msg: string, tone?: string) => void }) {
  const [who, setWho] = useState(allChildren[0]?.id ?? '')
  const child = allChildren.find(c => c.id === who)
  const [selectedMode, setSelectedMode] = useState<number>(child?.mode ?? 1)
  const t = useT()

  useEffect(() => { if (child) setSelectedMode(child.mode) }, [child?.id])

  const modeDefs = [
    { id: 1, icon: '🔒', label: t('parentCenter.settings.child.mode1Label'), desc: t('parentCenter.settings.child.mode1Desc') },
    { id: 2, icon: '🔓', label: t('parentCenter.settings.child.mode2Label'), desc: t('parentCenter.settings.child.mode2Desc') },
    { id: 3, icon: '🔑', label: t('parentCenter.settings.child.mode3Label'), desc: t('parentCenter.settings.child.mode3Desc') },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {allChildren.length > 1 && (
        <div style={{ display: 'flex', gap: 6, padding: 4, background: T.bg1, borderRadius: T.rPill, border: `1px solid ${T.cardBorder}` }}>
          {allChildren.map(c => (
            <button key={c.id} onClick={() => setWho(c.id)} style={{
              flex: 1, height: 32, borderRadius: T.rPill,
              background: who === c.id ? T.cardHi : 'transparent',
              border: 'none', color: who === c.id ? T.text : T.muted,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              fontFamily: T.fBody, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
            }}>
              <span style={{ fontSize: 14 }}>{c.avatar}</span>{c.name}
            </button>
          ))}
        </div>
      )}

      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
          {t('parentCenter.settings.child.independenceMode')}
        </div>
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 12 }}>
          {t('parentCenter.settings.child.independenceModeDesc').replace('{name}', child?.name ?? '')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {modeDefs.map(m => {
            const active = selectedMode === m.id
            return (
              <button key={m.id} onClick={() => setSelectedMode(m.id)} style={{
                textAlign: 'left', padding: 14,
                background: active ? T.indigoSoft : T.bg1,
                border: `1px solid ${active ? 'rgba(108,92,231,0.4)' : T.cardBorder}`,
                borderRadius: T.rM, display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', transition: 'all .15s',
              }}>
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Mode {m.id} · {m.label}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{m.desc}</div>
                </div>
                {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.indigo, flexShrink: 0 }}/>}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <Btn variant="primary" size="md" onClick={() => notify(t('parentCenter.settings.child.modeSaved'))}>
            {t('common.save')}
          </Btn>
        </div>
      </Card>

      {child && <PinCard child={child} notify={notify}/>}
    </div>
  )
}

// ───── Collapsed accordion (D-05: Year Calendar's settings form + vacation
// list demote below the CalendarGrid hero — a simple T-token disclosure
// toggle, default collapsed) ─────
function AccordionSection({ title, icon, children, open: openProp, onOpenChange }: {
  title: string; icon?: string; children: React.ReactNode
  // WR-04 fix: optionally controlled, so ScheduleTab can auto-expand the
  // vacations accordion when a calendar cell tap opens PeriodsManager's
  // form inside it. Uncontrolled (internal state) when omitted — unchanged
  // default behavior for every other AccordionSection consumer.
  open?: boolean; onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = (next: boolean | ((o: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? (next as (o: boolean) => boolean)(open) : next
    onOpenChange ? onOpenChange(resolved) : setInternalOpen(resolved)
  }
  return (
    <div style={{ border: `1px solid ${T.cardBorder}`, borderRadius: T.rL, marginBottom: 12, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: T.card, border: 'none', cursor: 'pointer',
          color: T.text, fontFamily: T.fBody, fontSize: 13, fontWeight: 700,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
          {title}
        </span>
        <Icon name={open ? 'chevD' : 'chevR'} size={16} color={T.muted} />
      </button>
      {open && (
        <div style={{ padding: 14, background: T.bg2, borderTop: `1px solid ${T.cardBorder}` }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ───── Schedule tab (subjects, sections, vacations, activities) ─────
function ScheduleTab({ allChildren }: { allChildren: ParentChild[] }) {
  const t = useT()
  const scheduleChildren = allChildren.map(c => ({ id: c.id, name: c.name }))
  const SUB_TABS = [
    { id: 'subjects',   icon: '📚', label: t('parentCenter.settings.more.subjects') },
    { id: 'sections',   icon: '🏃', label: t('parentCenter.settings.more.sections') },
    { id: 'calendar',   icon: '📅', label: t('settings.tabs.calendar') },
    { id: 'vacations',  icon: '🌴', label: t('parentCenter.settings.more.vacations') },
    { id: 'activities', icon: '🎯', label: t('settings.tabs.activities') },
    { id: 'room',       icon: '🏠', label: t('settings.tabs.room') },
    { id: 'blocks',     icon: '🧩', label: t('settings.tabs.blocks') },
  ] as const
  type SubTab = typeof SUB_TABS[number]['id']
  const [sub, setSub] = useState<SubTab>('subjects')

  // WR-04 fix: D-05's locked "tap cell to add/edit vacation period"
  // contract — CalendarGrid reports the tapped date (+ covering period, if
  // any) here; PeriodsManager consumes it to open its add/edit form, and
  // the vacations AccordionSection auto-expands so the form is visible.
  const [calendarCellRequest, setCalendarCellRequest] = useState<PeriodOpenRequest>(null)
  const [vacationsAccordionOpen, setVacationsAccordionOpen] = useState(false)

  return (
    <div>
      {/* Sub-tab pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 14, scrollbarWidth: 'none' as any }}>
        {SUB_TABS.map(({ id, icon, label }) => {
          const active = sub === id
          return (
            <button key={id} onClick={() => setSub(id)} style={{
              flexShrink: 0, height: 32, padding: '0 12px', borderRadius: T.rPill,
              background: active ? T.indigoSoft : T.bg1,
              border: `1px solid ${active ? 'rgba(108,92,231,0.5)' : T.cardBorder}`,
              color: active ? T.indigoHi : T.muted,
              fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span>{icon}</span><span>{label}</span>
            </button>
          )
        })}
      </div>

      {sub === 'subjects'   && <SubjectsManager children={scheduleChildren}/>}
      {sub === 'sections'   && <SectionsManager/>}
      {sub === 'calendar'   && (
        <div>
          <Card pad={16} style={{ marginBottom: 16 }}>
            <CalendarGrid
              onCellClick={(dateStr, period) => {
                setCalendarCellRequest({ dateStr, period })
                setVacationsAccordionOpen(true)
              }}
            />
          </Card>
          <AccordionSection title={t('settings.calendarSettingsManager.title')} icon="📅">
            <CalendarSettingsManager/>
          </AccordionSection>
          <AccordionSection
            title={t('settings.periodsManager.title')} icon="🌴"
            open={vacationsAccordionOpen} onOpenChange={setVacationsAccordionOpen}
          >
            <PeriodsManager
              openRequest={calendarCellRequest}
              onOpenRequestHandled={() => setCalendarCellRequest(null)}
            />
          </AccordionSection>
        </div>
      )}
      {sub === 'vacations'  && <PeriodsManager/>}
      {sub === 'activities' && <ActivitiesManager/>}
      {sub === 'room'       && <RoomTasksManager/>}
      {sub === 'blocks'     && <DayBlocksManager/>}
    </div>
  )
}

// ───── Account tab ─────
function AccountTab({ notify, familyId }: { notify: (msg: string, tone?: string) => void; familyId: string | null }) {
  const t = useT()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [repairLog, setRepairLog] = useState<string[] | null>(null)
  const [dataSummary, setDataSummary] = useState<{ children: number; transactions: number; grades: number } | null>(null)
  const CONFIRM_WORD = 'DELETE'

  useEffect(() => {
    fetch('/api/family-summary').then(r => r.ok ? r.json() : null).then(d => d && setDataSummary(d)).catch(() => {})
  }, [])

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'family-export.zip'; a.click()
      URL.revokeObjectURL(url)
      notify(t('account.exportSuccess'))
    } catch { notify(t('account.exportError'), 'danger') } finally { setExporting(false) }
  }

  async function handleDeleteAccount() {
    if (confirmText !== CONFIRM_WORD) return
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      window.location.href = '/'
    } catch {
      notify(t('account.deleteError'), 'danger')
      setDeleting(false)
    }
  }

  async function handleRepairAchievements() {
    setRepairing(true)
    setRepairLog(null)
    try {
      const results = await repairAchievements()
      const lines = results.flatMap(r => {
        if (r.error) return [`${r.name}: ошибка — ${r.error}`]
        if (r.badgesAwarded.length === 0) return [`${r.name}: новых значков нет`]
        return r.badgesAwarded.map(k => `${r.name}: выдан значок «${k}» (+${r.xpAfter - r.xpBefore} XP)`)
      })
      setRepairLog(lines)
      const total = results.reduce((s, r) => s + r.badgesAwarded.length, 0)
      notify(total > 0 ? `Выдано значков: ${total}` : 'Все значки уже на месте')
    } catch (e) {
      notify('Ошибка пересчёта', 'danger')
    } finally {
      setRepairing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
          Пересчёт достижений
        </div>
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 10 }}>
          Ретроактивно выдаёт все значки которые были заработаны но не сохранились из-за технической ошибки
        </div>
        <Btn variant="outline" onClick={handleRepairAchievements} disabled={repairing} full>
          {repairing ? 'Пересчитываю...' : '🔧 Пересчитать достижения'}
        </Btn>
        {repairLog && (
          <div style={{ marginTop: 10, background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: T.r, padding: '8px 12px' }}>
            {repairLog.map((line, i) => (
              <div key={i} style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{line}</div>
            ))}
          </div>
        )}
      </Card>

      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{t('account.exportTitle')}</div>
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 10 }}>{t('account.exportSub')}</div>
        <p style={{ fontSize: 13, color: T.muted, margin: '0 0 12px' }}>{t('account.exportDesc')}</p>
        <Btn variant="outline" onClick={handleExport} disabled={exporting} full>
          {exporting ? t('account.exporting') : t('account.exportBtn')}
        </Btn>
      </Card>

      <div style={{ border: `1.5px solid ${T.danger}`, borderRadius: T.rL, padding: 16 }}>
        <p style={{ margin: '0 0 8px', fontFamily: T.fHead, fontSize: 14, fontWeight: 700, color: T.danger }}>{t('account.dangerZone')}</p>
        <p style={{ fontSize: 13, color: T.textDim, margin: '0 0 12px' }}>{t('account.deleteDesc')}</p>
        {dataSummary && (
          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: T.r, padding: '10px 12px', marginBottom: 12, fontSize: 13, color: T.muted }}>
            <p style={{ margin: '0 0 4px', fontWeight: 600, color: T.textDim }}>{t('account.deleteSummaryTitle')}</p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>{t('account.deleteSummaryChildren', { count: String(dataSummary.children) })}</li>
              <li>{t('account.deleteSummaryTransactions', { count: String(dataSummary.transactions) })}</li>
              <li>{t('account.deleteSummaryGrades', { count: String(dataSummary.grades) })}</li>
            </ul>
          </div>
        )}
        <p style={{ fontSize: 12, color: T.muted, margin: '0 0 8px' }}>{t('account.typeToConfirm', { word: CONFIRM_WORD })}</p>
        <input
          value={confirmText} onChange={e => setConfirmText(e.target.value)}
          placeholder={CONFIRM_WORD}
          style={{ width: '100%', background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: T.r, color: T.text, padding: '8px 12px', fontFamily: T.fMono, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
        />
        <Btn variant="danger" onClick={handleDeleteAccount} disabled={confirmText !== CONFIRM_WORD || deleting} full>
          {deleting ? t('account.deleting') : t('account.deleteBtn')}
        </Btn>
      </div>
    </div>
  )
}

// ───── Settings root ─────
export default function SettingsScreen({ allChildren, notify, onNavigate }: {
  allChildren: ParentChild[]
  notify: (msg: string, tone?: string) => void
  onNavigate: (route: Route) => void
}) {
  const [tab, setTab] = useState('family')
  const { familyId } = useAppStore()
  const t = useT()

  const tabs = [
    { id: 'family',   label: t('parentCenter.settings.tabs.family'),     icon: '👨‍👩‍👧' },
    { id: 'coins',    label: t('parentCenter.settings.tabs.coinsRules'),  icon: '🪙' },
    { id: 'children', label: t('settings.tabs.children'),                 icon: '👦' },
    { id: 'schedule', label: t('settings.tabs.schedule'),                 icon: '📅' },
    { id: 'account',  label: t('account.tabLabel'),                       icon: '🔐' },
  ]

  const content: Record<string, JSX.Element> = {
    family:   <FamilyTab allChildren={allChildren} notify={notify} familyId={familyId}/>,
    coins:    <CoinsRulesTab notify={notify}/>,
    children: <ChildrenTab allChildren={allChildren} notify={notify}/>,
    schedule: <ScheduleTab allChildren={allChildren}/>,
    account:  <AccountTab notify={notify} familyId={familyId}/>,
  }

  return (
    <div style={{ padding: '20px 0 24px' }}>
      <div style={{ padding: '0 16px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>
            {t('parentCenter.settings.title')}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>{t('parentCenter.settings.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginTop: 4 }}>
          <button
            onClick={() => onNavigate('audit')}
            style={{
              height: 32, padding: '0 12px', borderRadius: T.rPill,
              background: T.cardHi, border: `1px solid ${T.cardBorder}`,
              color: T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: T.fBody,
            }}
          >
            <span>📋</span><span>{t('settings.auditBtn')}</span>
          </button>
          <button
            onClick={() => onNavigate('wallets')}
            style={{
              height: 32, padding: '0 12px', borderRadius: T.rPill,
              background: T.cardHi, border: `1px solid ${T.cardBorder}`,
              color: T.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: T.fBody,
            }}
          >
            <span>💰</span><span>{t('settings.walletsBtn')}</span>
          </button>
        </div>
      </div>

      <div style={{ padding: '0 16px 16px', position: 'sticky', top: 0, background: `linear-gradient(to bottom, ${T.bg0} 80%, transparent)`, zIndex: 10 }}>
        <Tabs value={tab} onChange={setTab} tabs={tabs} scroll/>
      </div>

      <div style={{ padding: '0 16px' }}>
        {content[tab]}
      </div>
    </div>
  )
}
