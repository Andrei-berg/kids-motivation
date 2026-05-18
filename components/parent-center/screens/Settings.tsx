'use client'

import { useState, useEffect } from 'react'
import { T } from '../tokens'
import { Card, Btn, Pill, Icon, Tabs } from '../ui'
import type { ParentChild } from '../types'
import { getWalletSettings, updateWalletSettings } from '@/lib/wallet-api'
import type { WalletSettings } from '@/lib/wallet-api'
import { useLanguage, SUPPORTED_LANGUAGES, useT } from '@/lib/i18n'
import { insertAuditEvent } from '@/lib/repositories/audit.repo'
import { useAppStore } from '@/lib/store'

// ───── Child selector ─────
function ChildSelector({ children, value, onChange }: {
  children: ParentChild[]; value: string; onChange: (id: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: 4, background: T.bg1, borderRadius: T.rPill, border: `1px solid ${T.cardBorder}`, marginBottom: 14 }}>
      {children.map(c => (
        <button key={c.id} onClick={() => onChange(c.id)} style={{
          flex: 1, height: 32, borderRadius: T.rPill,
          background: value === c.id ? T.cardHi : 'transparent',
          border: 'none', color: value === c.id ? T.text : T.muted,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          fontFamily: T.fBody, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .15s',
        }}>
          <span style={{ fontSize: 14 }}>{c.avatar}</span>
          {c.name}
        </button>
      ))}
    </div>
  )
}

// ───── Family tab ─────
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
              flex: 1, height: 40, borderRadius: T.rM,
              background: active ? T.indigoSoft : T.bg1,
              border: `1px solid ${active ? 'rgba(108,92,231,0.4)' : T.cardBorder}`,
              color: active ? T.text : T.muted,
              fontFamily: T.fBody, fontSize: 14, fontWeight: active ? 700 : 500,
              cursor: 'pointer', transition: 'all .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function FamilyTab({ allChildren, notify }: { allChildren: ParentChild[]; notify: (msg: string, tone?: string) => void }) {
  const [copied, setCopied] = useState(false)
  const t = useT()
  const code = 'FAMILY'

  const copy = async () => {
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
          <span style={{
            fontFamily: T.fMono, fontSize: 24, fontWeight: 700, color: T.cyan,
            letterSpacing: '0.3em', flex: 1, textAlign: 'center',
          }}>{code}</span>
          <Btn variant={copied ? 'success' : 'primary'} size="md" icon={copied ? 'check' : 'copy'} onClick={copy}>
            {copied ? t('parentCenter.settings.family.copied') : t('parentCenter.settings.family.copy')}
          </Btn>
        </div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
          {t('parentCenter.settings.family.inviteHint')} <span style={{ fontFamily: T.fMono, color: T.textDim }}>/onboarding/join</span> {t('parentCenter.settings.family.inviteHint2')}
        </div>
      </Card>

      <Card pad={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t('parentCenter.settings.family.members')}
          </div>
          <Btn variant="ghost" size="sm" icon="plus" onClick={() => window.location.href = '/register'}>
            {t('parentCenter.settings.family.addChild')}
          </Btn>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: `linear-gradient(135deg, ${T.indigo}, ${T.cyan})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>
                Parent <span style={{ fontSize: 12, color: T.muted, fontWeight: 400 }}>{t('parentCenter.settings.family.you')}</span>
              </div>
            </div>
            <Pill tone="indigo">{t('parentCenter.settings.family.roleParent')}</Pill>
          </div>
          {allChildren.map((c) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${T.cardBorder}` }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', fontSize: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${c.accent}22`, border: `1px solid ${c.accent}44`,
              }}>{c.avatar}</div>
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

      <Card pad={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{t('parentCenter.settings.family.parentPin')}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{t('parentCenter.settings.family.parentPinDesc')}</div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => window.location.href = '/parent/settings'}>
            {t('parentCenter.settings.family.manage')}
          </Btn>
        </div>
      </Card>
    </div>
  )
}

// ───── Coins rules tab ─────
function CoinsRulesTab({ notify }: { notify: (msg: string, tone?: string) => void }) {
  const { familyId } = useAppStore()
  const t = useT()
  const [settings, setSettings] = useState<WalletSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getWalletSettings().then(s => s && setSettings(s)).catch(() => {})
  }, [])

  if (!settings) {
    return <div style={{ color: T.muted, padding: 20, textAlign: 'center' }}>{t('common.loading')}</div>
  }

  const up = (k: keyof WalletSettings, v: string) => setSettings(s => s ? { ...s, [k]: Number(v) || 0 } : s)

  const save = async () => {
    setSaving(true)
    try {
      await updateWalletSettings(settings)
      notify(t('parentCenter.settings.coinsRules.saved'))
      void insertAuditEvent({
        family_id: familyId ?? '',
        child_id: null,
        action_type: 'settings_change',
        description: 'Settings updated: coin reward rules',
        coins_delta: null,
        actor_user_id: null,
        metadata: { tab: 'coins', field: 'wallet_settings' },
      })
    } catch {
      notify(t('parentCenter.settings.coinsRules.saveFailed'), 'danger')
    } finally {
      setSaving(false)
    }
  }

  const RuleRow = ({ icon, label, value, rkey }: { icon: string; label: string; value: number; rkey: keyof WalletSettings }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: `1px solid ${T.cardBorder}` }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, color: T.text, fontWeight: 500 }}>{label}</span>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 0 10px', height: 32,
        background: T.bg1, border: `1px solid ${T.cardBorder}`, borderRadius: T.rM,
      }}>
        <input type="number" value={value} onChange={e => up(rkey, e.target.value)}
          style={{
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
          <div style={{
            flex: 1, padding: 14, background: T.bg1, border: `1px solid ${T.cardBorder}`, borderRadius: T.rM,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <input type="number" value={settings.base_exchange_rate} onChange={e => up('base_exchange_rate', e.target.value)}
              style={{ width: 50, background: 'transparent', border: 'none', outline: 'none', color: T.cyan, fontFamily: T.fMono, fontSize: 22, fontWeight: 700, textAlign: 'right' }}/>
            <span style={{ fontSize: 18 }}>🪙</span>
            <span style={{ fontFamily: T.fMono, fontSize: 16, color: T.muted }}>=</span>
            <span style={{ fontFamily: T.fMono, fontSize: 22, fontWeight: 700, color: T.text }}>$1</span>
          </div>
        </div>
      </Card>

      <Btn variant="primary" size="lg" onClick={save} disabled={saving} full>
        {saving ? t('parentCenter.settings.coinsRules.saving') : t('parentCenter.settings.coinsRules.saveBtn')}
      </Btn>
    </div>
  )
}

// ───── Child tab ─────
function ChildTab({ allChildren, notify }: { allChildren: ParentChild[]; notify: (msg: string, tone?: string) => void }) {
  const [who, setWho] = useState(allChildren[0]?.id ?? '')
  const child = allChildren.find(c => c.id === who)
  const [selectedMode, setSelectedMode] = useState<number>(child?.mode ?? 1)
  const t = useT()

  useEffect(() => { if (child) setSelectedMode(child.mode) }, [child?.id])

  const modeDefs = [
    { id: 1, label: t('parentCenter.settings.child.mode1Label'), desc: t('parentCenter.settings.child.mode1Desc') },
    { id: 2, label: t('parentCenter.settings.child.mode2Label'), desc: t('parentCenter.settings.child.mode2Desc') },
    { id: 3, label: t('parentCenter.settings.child.mode3Label'), desc: t('parentCenter.settings.child.mode3Desc') },
  ]

  return (
    <div>
      {allChildren.length > 1 && <ChildSelector children={allChildren} value={who} onChange={setWho}/>}

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
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: `2px solid ${active ? T.indigo : T.muted}`,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {active && <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.indigo, display: 'block' }}/>}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: T.text, fontWeight: 600 }}>Mode {m.id} · {m.label}</div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{m.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <Btn variant="primary" size="md" onClick={() => {
            notify(t('parentCenter.settings.child.modeSaved'))
          }}>{t('common.save')}</Btn>
        </div>
      </Card>

      <Card pad={16} style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          {t('parentCenter.settings.child.childPin')}
        </div>
        <div style={{ padding: 10, background: T.indigoSoft, borderRadius: T.r, border: `1px solid rgba(108,92,231,0.2)`, fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
          💡 {t('parentCenter.settings.child.childPinManage')} <Btn variant="ghost" size="sm" onClick={() => window.location.href = '/parent/settings'} style={{ marginLeft: 4 }}>Settings →</Btn>
        </div>
      </Card>
    </div>
  )
}

// ───── Quick links tab ─────
function QuickLinksTab() {
  const t = useT()
  const links = [
    { icon: '📚', label: t('parentCenter.settings.more.subjects'), href: '/parent/settings' },
    { icon: '🏃', label: t('parentCenter.settings.more.sections'), href: '/parent/settings' },
    { icon: '🌴', label: t('parentCenter.settings.more.vacations'), href: '/parent/settings' },
    { icon: '📋', label: t('parentCenter.settings.more.audit'), href: '/audit' },
    { icon: '💰', label: t('parentCenter.settings.more.wallets'), href: '/parent/wallets' },
    { icon: '🛒', label: t('parentCenter.settings.more.shop'), href: '/parent/shop' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {links.map(l => (
        <Card key={l.label} pad={14} hover onClick={() => { window.location.href = l.href }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: T.r, background: T.bg1,
              border: `1px solid ${T.cardBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>{l.icon}</div>
            <div style={{ flex: 1, fontSize: 14, color: T.text, fontWeight: 600 }}>{l.label}</div>
            <Icon name="chevR" size={16} color={T.muted}/>
          </div>
        </Card>
      ))}
    </div>
  )
}

// ───── Account tab ─────
function AccountTab({ notify, familyId }: { notify: (msg: string, tone?: string) => void; familyId: string | null }) {
  const t = useT()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dataSummary, setDataSummary] = useState<{ children: number; transactions: number; grades: number } | null>(null)
  const CONFIRM_WORD = 'DELETE'

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch('/api/family-summary')
        if (res.ok) {
          const data = await res.json()
          setDataSummary(data)
        }
      } catch {
        // Summary is best-effort — silently ignore errors
      }
    }
    fetchSummary()
  }, [])

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/export')
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'family-export.zip'
      a.click()
      URL.revokeObjectURL(url)
      notify(t('account.exportSuccess'))
      void insertAuditEvent({
        family_id: familyId ?? '',
        child_id: null,
        action_type: 'data_export',
        description: 'Family data exported as ZIP',
        coins_delta: null,
        actor_user_id: null,
        metadata: {},
      })
    } catch {
      notify(t('account.exportError'), 'danger')
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteAccount() {
    if (confirmText !== CONFIRM_WORD) return
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', { method: 'DELETE' })
      if (!res.ok) throw new Error('Deletion failed')
      window.location.href = '/'
    } catch {
      notify(t('account.deleteError'), 'danger')
      setDeleting(false)
    }
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{t('account.exportTitle')}</div>
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 10 }}>{t('account.exportSub')}</div>
        <p style={{ fontSize: 13, color: T.muted, margin: '0 0 12px' }}>{t('account.exportDesc')}</p>
        <Btn variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? t('account.exporting') : t('account.exportBtn')}
        </Btn>
      </Card>

      <div style={{ border: `1.5px solid ${T.danger}`, borderRadius: T.rL, padding: 16, marginTop: 8 }}>
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

        <div style={{ marginBottom: 12, padding: '8px 12px', background: T.card, borderRadius: T.r, border: `1px solid ${T.cardBorder}` }}>
          <span style={{ fontSize: 13, color: T.muted }}>{t('account.downloadFirst')} </span>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{ background: 'none', border: 'none', color: T.indigo, fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            {t('account.downloadFirstLink')} →
          </button>
        </div>

        <p style={{ fontSize: 12, color: T.muted, margin: '0 0 8px' }}>
          {t('account.typeToConfirm', { word: CONFIRM_WORD })}
        </p>
        <input
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder={CONFIRM_WORD}
          style={{ width: '100%', background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: T.r, color: T.text, padding: '8px 12px', fontFamily: T.fMono, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
        />
        <Btn
          variant="danger"
          onClick={handleDeleteAccount}
          disabled={confirmText !== CONFIRM_WORD || deleting}
          full
        >
          {deleting ? t('account.deleting') : t('account.deleteBtn')}
        </Btn>
      </div>
    </div>
  )
}

// ───── Settings root ─────
export default function SettingsScreen({ allChildren, notify }: {
  allChildren: ParentChild[]
  notify: (msg: string, tone?: string) => void
}) {
  const [tab, setTab] = useState('family')
  const { familyId } = useAppStore()
  const t = useT()
  const tabs = [
    { id: 'family', label: t('parentCenter.settings.tabs.family'), icon: '📁' },
    { id: 'coins', label: t('parentCenter.settings.tabs.coinsRules'), icon: '🪙' },
    { id: 'child', label: t('parentCenter.settings.tabs.child'), icon: '👤' },
    { id: 'more', label: t('parentCenter.settings.tabs.more'), icon: '🔗' },
    { id: 'account', label: t('account.tabLabel'), icon: '🔐' },
  ]

  const content: Record<string, JSX.Element> = {
    family: <FamilyTab allChildren={allChildren} notify={notify}/>,
    coins: <CoinsRulesTab notify={notify}/>,
    child: <ChildTab allChildren={allChildren} notify={notify}/>,
    more: <QuickLinksTab/>,
    account: <AccountTab notify={notify} familyId={familyId}/>,
  }

  return (
    <div style={{ padding: '20px 0 24px' }}>
      <div style={{ padding: '0 16px 16px' }}>
        <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>
          {t('parentCenter.settings.title')}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>{t('parentCenter.settings.subtitle')}</p>
      </div>
      <div style={{ padding: '0 16px 16px', position: 'sticky', top: 0, background: `linear-gradient(to bottom, ${T.bg0} 80%, transparent)`, zIndex: 10 }}>
        <Tabs value={tab} onChange={setTab} tabs={tabs} scroll/>
      </div>
      <div style={{ padding: '0 16px' }}>{content[tab]}</div>
    </div>
  )
}
