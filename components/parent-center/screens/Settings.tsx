'use client'

import { useState, useEffect } from 'react'
import { T } from '../tokens'
import { Card, Btn, Pill, Field, Toggle, Tabs, Icon } from '../ui'
import type { ParentChild, ToastState } from '../types'
import { getWalletSettings, updateWalletSettings } from '@/lib/wallet-api'
import type { WalletSettings } from '@/lib/wallet-api'

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
function FamilyTab({ allChildren, notify }: { allChildren: ParentChild[]; notify: (msg: string, tone?: string) => void }) {
  const [copied, setCopied] = useState(false)
  const code = 'FAMILY'

  const copy = async () => {
    await navigator.clipboard?.writeText(code).catch(() => {})
    setCopied(true)
    notify('Invite code copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Invite code</div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderRadius: T.rM,
          background: T.bg1, border: `1px dashed ${T.indigo}55`, marginBottom: 10,
        }}>
          <span style={{
            fontFamily: T.fMono, fontSize: 24, fontWeight: 700, color: T.cyan,
            letterSpacing: '0.3em', flex: 1, textAlign: 'center',
          }}>{code}</span>
          <Btn variant={copied ? 'success' : 'primary'} size="md" icon={copied ? 'check' : 'copy'} onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </Btn>
        </div>
        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>
          Child opens <span style={{ fontFamily: T.fMono, color: T.textDim }}>/onboarding/join</span> and enters this code to connect to your family.
        </div>
      </Card>

      <Card pad={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Members</div>
          <Btn variant="ghost" size="sm" icon="plus" onClick={() => window.location.href = '/register'}>Add child</Btn>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: `linear-gradient(135deg, ${T.indigo}, ${T.cyan})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>👤</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>Parent <span style={{ fontSize: 12, color: T.muted, fontWeight: 400 }}>(you)</span></div>
            </div>
            <Pill tone="indigo">PARENT</Pill>
          </div>
          {allChildren.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${T.cardBorder}` }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', fontSize: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `${c.accent}22`, border: `1px solid ${c.accent}44`,
              }}>{c.avatar}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{c.age} years · LVL {c.level}</div>
              </div>
              <Pill>CHILD</Pill>
            </div>
          ))}
        </div>
      </Card>

      <Card pad={16}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, color: T.text, fontWeight: 600 }}>Parent PIN</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Required to open this control center</div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => window.location.href = '/parent/settings'}>Manage</Btn>
        </div>
      </Card>
    </div>
  )
}

// ───── Coins rules tab ─────
function CoinsRulesTab({ notify }: { notify: (msg: string, tone?: string) => void }) {
  const [settings, setSettings] = useState<WalletSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getWalletSettings().then(s => s && setSettings(s)).catch(() => {})
  }, [])

  if (!settings) {
    return <div style={{ color: T.muted, padding: 20, textAlign: 'center' }}>Loading...</div>
  }

  const up = (k: keyof WalletSettings, v: string) => setSettings(s => s ? { ...s, [k]: Number(v) || 0 } : s)

  const save = async () => {
    setSaving(true)
    try {
      await updateWalletSettings(settings)
      notify('Rules saved')
    } catch {
      notify('Failed to save', 'danger')
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
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>School grades</div>
        <RuleRow icon="🏆" label="Grade 5 — excellent" value={settings.coins_per_grade_5} rkey="coins_per_grade_5"/>
        <RuleRow icon="👍" label="Grade 4 — good" value={settings.coins_per_grade_4} rkey="coins_per_grade_4"/>
        <RuleRow icon="📉" label="Grade 3 — penalty" value={settings.coins_per_grade_3} rkey="coins_per_grade_3"/>
        <RuleRow icon="⚠️" label="Grade 2 — penalty" value={settings.coins_per_grade_2} rkey="coins_per_grade_2"/>
        <RuleRow icon="🚫" label="Grade 1 — penalty" value={settings.coins_per_grade_1} rkey="coins_per_grade_1"/>
      </Card>

      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Chores & behavior</div>
        <RuleRow icon="🧹" label="Room cleaned" value={settings.coins_per_room_task} rkey="coins_per_room_task"/>
        <RuleRow icon="⭐" label="Good behavior" value={settings.coins_per_good_behavior} rkey="coins_per_good_behavior"/>
        <RuleRow icon="🏃" label="Exercise" value={settings.coins_per_exercise} rkey="coins_per_exercise"/>
      </Card>

      <Card pad={16} style={{ background: `linear-gradient(135deg, ${T.cyanSoft}, ${T.card})` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Pill tone="cyan">TRAINER</Pill>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Coach grades</div>
        </div>
        <RuleRow icon="🥇" label="Coach grade 5" value={settings.coins_per_coach_5} rkey="coins_per_coach_5"/>
        <RuleRow icon="🥈" label="Coach grade 4" value={settings.coins_per_coach_4} rkey="coins_per_coach_4"/>
        <RuleRow icon="🥉" label="Coach grade 3" value={settings.coins_per_coach_3} rkey="coins_per_coach_3"/>
      </Card>

      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Real money exchange</div>
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
        {saving ? 'Saving...' : 'Save rules'}
      </Btn>
    </div>
  )
}

// ───── Child tab ─────
function ChildTab({ allChildren, notify }: { allChildren: ParentChild[]; notify: (msg: string, tone?: string) => void }) {
  const [who, setWho] = useState(allChildren[0]?.id ?? '')
  const child = allChildren.find(c => c.id === who)
  const [selectedMode, setSelectedMode] = useState<number>(child?.mode ?? 1)

  useEffect(() => { if (child) setSelectedMode(child.mode) }, [child?.id])

  const modeDefs = [
    { id: 1, label: 'Basic', desc: 'Mood + extracurricular' },
    { id: 2, label: 'Standard', desc: 'Room cleaning + mood + extracurricular' },
    { id: 3, label: 'Full', desc: 'Room + mood + sports + extracurricular' },
  ]

  return (
    <div>
      {allChildren.length > 1 && <ChildSelector children={allChildren} value={who} onChange={setWho}/>}

      <Card pad={16}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Independence mode</div>
        <div style={{ fontSize: 11, color: T.faint, marginBottom: 12 }}>What {child?.name} can fill in themselves</div>
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
            notify('Mode saved (manage fully in Settings)')
          }}>Save</Btn>
        </div>
      </Card>

      <Card pad={16} style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Child login PIN</div>
        <div style={{ padding: 10, background: T.indigoSoft, borderRadius: T.r, border: `1px solid rgba(108,92,231,0.2)`, fontSize: 11, color: T.textDim, lineHeight: 1.5 }}>
          💡 Manage child PINs in the full <Btn variant="ghost" size="sm" onClick={() => window.location.href = '/parent/settings'} style={{ marginLeft: 4 }}>Settings →</Btn>
        </div>
      </Card>
    </div>
  )
}

// ───── Quick links tab ─────
function QuickLinksTab() {
  const links = [
    { icon: '📚', label: 'Manage subjects', href: '/parent/settings' },
    { icon: '🏃', label: 'Manage sections / activities', href: '/parent/settings' },
    { icon: '🌴', label: 'Vacation periods', href: '/parent/settings' },
    { icon: '📋', label: 'Full audit log', href: '/audit' },
    { icon: '💰', label: 'Wallets & transactions', href: '/parent/wallets' },
    { icon: '🛒', label: 'Reward shop', href: '/parent/shop' },
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

// ───── Settings root ─────
export default function SettingsScreen({ allChildren, notify }: {
  allChildren: ParentChild[]
  notify: (msg: string, tone?: string) => void
}) {
  const [tab, setTab] = useState('family')
  const tabs = [
    { id: 'family', label: 'Family', icon: '📁' },
    { id: 'coins', label: 'Coins Rules', icon: '🪙' },
    { id: 'child', label: 'Child', icon: '👤' },
    { id: 'more', label: 'More', icon: '🔗' },
  ]

  const content: Record<string, JSX.Element> = {
    family: <FamilyTab allChildren={allChildren} notify={notify}/>,
    coins: <CoinsRulesTab notify={notify}/>,
    child: <ChildTab allChildren={allChildren} notify={notify}/>,
    more: <QuickLinksTab/>,
  }

  return (
    <div style={{ padding: '20px 0 24px' }}>
      <div style={{ padding: '0 16px 16px' }}>
        <h1 style={{ margin: 0, fontFamily: T.fHead, fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>Settings</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: T.muted }}>Configure the motivation system</p>
      </div>
      <div style={{ padding: '0 16px 16px', position: 'sticky', top: 0, background: `linear-gradient(to bottom, ${T.bg0} 80%, transparent)`, zIndex: 10 }}>
        <Tabs value={tab} onChange={setTab} tabs={tabs} scroll/>
      </div>
      <div style={{ padding: '0 16px' }}>{content[tab]}</div>
    </div>
  )
}
