'use client'

// Avatar chooser — a bottom sheet with two tabs: a curated emoji grid (+ bg
// swatch) and an SVG character builder. Saves via the server action
// (app/kid/actions/avatar.ts) because `children` is not child-writable via RLS.

import { useState } from 'react'
import { useT } from '@/lib/i18n'
import { K } from '@/components/kid/design/kidTheme'
import { Avatar, KMButton, HAIR_SHAPES } from '@/components/kid/design/atoms'
import { updateChildAvatar } from '@/app/kid/actions/avatar'
import { resolveAvatar, type ChildAvatarFields, type AvatarConfig } from '@/lib/kid/avatar'

const EMOJIS = [
  '🙂', '😄', '😎', '🤩', '🥳', '😇', '🤓', '🦸', '🦹', '🧑‍🚀', '🧙', '🧛',
  '🐶', '🐱', '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🐵', '🦉', '🦄', '🐢',
  '🐙', '🦕', '🦖', '🐝', '🦋', '🐬', '🐳', '🦈',
  '🚀', '🛸', '🪐', '⭐', '🌟', '☄️', '🔥', '⚡',
  '⚽', '🏀', '🏈', '🎾', '🏐', '🥇', '🎯', '🏆', '🛹', '🥋', '🚴', '🏄',
  '🎸', '🎮', '🎨', '📚', '🍕', '🍦', '🍩', '🍪',
]

const BG_SWATCHES = [K.skySoft, K.grapeSoft, K.mintSoft, K.mangoSoft, K.berrySoft, '#E8EDF5', '#F1E8D6', '#E4F0E0']

const SKINS = ['#F7D9BE', '#F5C9A1', '#E8B084', '#C68642', '#8D5524', '#5C3A21']
const HAIR_COLORS = ['#2B1810', '#5A3825', '#A65E2E', '#D6A461', '#8A8F98', '#6C5CE7']
const SHIRTS = [K.sky, K.grape, K.mint, K.mango, K.berry, K.mintDeep, K.skyDeep, K.ink]
const ACCESSORIES: Array<{ key: string; label: string }> = [
  { key: 'none', label: '—' },
  { key: 'glasses', label: '👓' },
  { key: 'cap', label: '🧢' },
  { key: 'headphones', label: '🎧' },
  { key: 'bow', label: '🎀' },
]

interface AvatarPickerProps {
  child: (ChildAvatarFields & { id?: string }) | null
  onClose: () => void
  onSaved?: () => void
}

export default function AvatarPicker({ child, onClose, onSaved }: AvatarPickerProps) {
  const t = useT()
  const current = resolveAvatar(child)
  const startTab: 'emoji' | 'character' = child?.avatar_kind === 'character' ? 'character' : 'emoji'
  const [tab, setTab] = useState<'emoji' | 'character'>(startTab)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [emoji, setEmoji] = useState(current.emoji || '🙂')
  const [bg, setBg] = useState(current.bg || K.skySoft)

  const [skin, setSkin] = useState<string>(current.skin || SKINS[1])
  const [hair, setHair] = useState<string>(current.hair || 'short')
  const [hairColor, setHairColor] = useState<string>(current.hairColor || HAIR_COLORS[0])
  const [shirt, setShirt] = useState<string>(current.shirt || K.sky)
  const [accessory, setAccessory] = useState<string>(current.accessory || 'none')

  const previewProps =
    tab === 'emoji'
      ? { emoji, bg }
      : { skin, hair, hairColor, shirt, accessory: accessory as never }

  async function handleSave() {
    if (!child?.id || saving) return
    setSaving(true)
    setError(null)
    try {
      const config: AvatarConfig =
        tab === 'emoji' ? { emoji, bg } : { skin, hair, hairColor, shirt, accessory: accessory as never }
      await updateChildAvatar(child.id, tab, config)
      onSaved?.()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('kidProfile.avatarSaveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(33,49,74,0.5)', zIndex: 260,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: K.card,
          borderTopLeftRadius: 26, borderTopRightRadius: 26,
          padding: '18px 18px 28px', maxHeight: '90vh', overflowY: 'auto',
          animation: 'slideUp 0.28s cubic-bezier(.2,.9,.3,1.1)',
        }}
      >
        <div style={{ width: 40, height: 4, background: K.line, borderRadius: 999, margin: '0 auto 14px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <Avatar size={72} {...previewProps} />
          <div>
            <div style={{ fontFamily: K.fDisp, fontSize: 18, fontWeight: 800, color: K.ink }}>
              {t('kidProfile.pickAvatar')}
            </div>
            <div style={{ fontFamily: K.fBody, fontSize: 13, color: K.ink3, fontWeight: 600 }}>
              {t('kidProfile.pickAvatarHint')}
            </div>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['emoji', 'character'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              style={{
                flex: 1, height: 40, borderRadius: 12, cursor: 'pointer',
                border: `1.5px solid ${tab === k ? K.sky : K.line}`,
                background: tab === k ? K.skySoft : '#fff',
                fontFamily: K.fDisp, fontSize: 14, fontWeight: 800,
                color: tab === k ? K.skyDeep : K.ink2,
              }}
            >
              {k === 'emoji' ? t('kidProfile.tabEmoji') : t('kidProfile.tabCharacter')}
            </button>
          ))}
        </div>

        {tab === 'emoji' ? (
          <>
            <Row label={t('kidProfile.background')}>
              {BG_SWATCHES.map((c) => (
                <Swatch key={c} color={c} on={bg === c} onClick={() => setBg(c)} />
              ))}
            </Row>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginTop: 12,
            }}>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  style={{
                    aspectRatio: '1', borderRadius: 12, cursor: 'pointer', fontSize: 22,
                    border: `2px solid ${emoji === e ? K.sky : 'transparent'}`,
                    background: emoji === e ? K.skySoft : K.lineSoft,
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <Row label={t('kidProfile.skin')}>
              {SKINS.map((c) => <Swatch key={c} color={c} on={skin === c} onClick={() => setSkin(c)} />)}
            </Row>
            <Row label={t('kidProfile.hair')}>
              {HAIR_SHAPES.map((h) => (
                <Chip key={h} on={hair === h} onClick={() => setHair(h)}>{t(`kidProfile.hairShape.${h}`)}</Chip>
              ))}
            </Row>
            <Row label={t('kidProfile.hairColor')}>
              {HAIR_COLORS.map((c) => <Swatch key={c} color={c} on={hairColor === c} onClick={() => setHairColor(c)} />)}
            </Row>
            <Row label={t('kidProfile.shirt')}>
              {SHIRTS.map((c) => <Swatch key={c} color={c} on={shirt === c} onClick={() => setShirt(c)} />)}
            </Row>
            <Row label={t('kidProfile.accessory')}>
              {ACCESSORIES.map((a) => (
                <Chip key={a.key} on={accessory === a.key} onClick={() => setAccessory(a.key)}>{a.label}</Chip>
              ))}
            </Row>
          </>
        )}

        {error && (
          <div style={{ marginTop: 12, fontFamily: K.fBody, fontSize: 13, color: K.danger, fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, height: 52, borderRadius: 16, cursor: 'pointer',
              border: `1.5px solid ${K.line}`, background: '#fff', color: K.ink2,
              fontFamily: K.fDisp, fontSize: 15, fontWeight: 800,
            }}
          >
            {t('common.cancel')}
          </button>
          <KMButton tone="coral" size="md" onClick={handleSave} disabled={saving} full style={{ flex: 2 }}>
            {saving ? t('kidProfile.saving') : t('kidProfile.save')}
          </KMButton>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontFamily: K.fBody, fontSize: 12, fontWeight: 700, color: K.ink3, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function Swatch({ color, on, onClick }: { color: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', background: color,
        border: `3px solid ${on ? K.sky : 'rgba(0,0,0,0.08)'}`,
      }}
    />
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        minWidth: 40, height: 34, padding: '0 12px', borderRadius: 999, cursor: 'pointer',
        border: `1.5px solid ${on ? K.sky : K.line}`,
        background: on ? K.skySoft : '#fff',
        fontFamily: K.fBody, fontSize: 13, fontWeight: 700, color: on ? K.skyDeep : K.ink2,
      }}
    >
      {children}
    </button>
  )
}
