'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import {
  getBehaviorTags,
  addBehaviorTag,
  updateBehaviorTag,
  setBehaviorTagActive,
  reorderBehaviorTags,
  deleteBehaviorTag,
} from '@/lib/repositories/behavior.repo'
import type { BehaviorTag } from '@/lib/models/behavior.types'
import { useT } from '@/lib/i18n'
import { T } from '@/components/parent-center/tokens'
import { Amount } from '@/components/design/atoms'

const EMOJIS = ['⭐', '🙌', '📖', '🧹', '😡', '🤬', '🥊', '🧸', '🎯', '💤', '📵', '✨']

export default function BehaviorTagsManager() {
  const t = useT()
  const { familyId } = useAppStore()

  const [tags, setTags] = useState<BehaviorTag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [icon, setIcon] = useState(EMOJIS[0])
  const [price, setPrice] = useState('')
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [editPrice, setEditPrice] = useState('')

  useEffect(() => {
    if (familyId) load()
  }, [familyId])

  async function load() {
    if (!familyId) return
    setLoading(true)
    try {
      const data = await getBehaviorTags(familyId, { activeOnly: false })
      setTags(data.slice().sort((a, b) => a.sort_order - b.sort_order))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!familyId || !name.trim()) return
    const trimmedPrice = price.trim()
    const priceValue = trimmedPrice === '' ? 0 : Number(trimmedPrice)
    if (!Number.isFinite(priceValue)) {
      setError(t('settings.behaviorTags.invalidPrice'))
      return
    }
    setAdding(true)
    setError('')
    try {
      await addBehaviorTag({
        familyId,
        name: name.trim(),
        icon,
        price: priceValue,
        sortOrder: tags.length,
      })
      setName('')
      setIcon(EMOJIS[0])
      setPrice('')
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  function startEdit(tag: BehaviorTag) {
    setEditingId(tag.id)
    setEditName(tag.name)
    setError('')
  }

  async function saveEdit(tag: BehaviorTag) {
    const trimmed = editName.trim()
    setEditingId(null)
    if (!trimmed || trimmed === tag.name) return
    try {
      await updateBehaviorTag(tag.id, { name: trimmed })
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function startEditPrice(tag: BehaviorTag) {
    setEditingPriceId(tag.id)
    setEditPrice(String(tag.price))
    setError('')
  }

  async function savePriceEdit(tag: BehaviorTag) {
    const trimmed = editPrice.trim()
    setEditingPriceId(null)
    if (trimmed === '') return
    const nextPrice = Number(trimmed)
    if (!Number.isFinite(nextPrice)) {
      setError(t('settings.behaviorTags.invalidPrice'))
      return
    }
    if (nextPrice === tag.price) return
    try {
      await updateBehaviorTag(tag.id, { price: nextPrice })
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function toggleActive(tag: BehaviorTag) {
    try {
      await setBehaviorTagActive(tag.id, !tag.is_active)
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= tags.length) return
    const next = tags.slice()
    const tmp = next[index]
    next[index] = next[target]
    next[target] = tmp
    setTags(next)
    try {
      await reorderBehaviorTags(next.map(tg => tg.id))
      await load()
    } catch (e: any) {
      setError(e.message)
      await load()
    }
  }

  async function handleDelete(tag: BehaviorTag) {
    if (tag.legacy_key !== null) return
    if (!confirm(t('settings.behaviorTags.deleteConfirm', { tagName: tag.name }))) return
    try {
      await deleteBehaviorTag(tag.id)
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          🏷️ {t('settings.behaviorTags.title')}
        </div>
        <div style={{ fontSize: 13, color: T.textDim }}>
          {t('settings.behaviorTags.subtitle')}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', background: T.dangerSoft, border: `1px solid ${T.danger}55`, borderRadius: 8, color: T.danger, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Add form */}
      <div style={{ background: T.indigoSoft, border: `1px solid ${T.cardBorderHi}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setIcon(e)}
              style={{
                width: 32, height: 32, fontSize: 16, borderRadius: 7, cursor: 'pointer',
                border: `1.5px solid ${icon === e ? `${T.indigo}80` : T.cardBorder}`,
                background: icon === e ? T.indigoSoft : T.card,
              }}
            >
              {e}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="premium-input"
            placeholder={t('settings.behaviorTags.namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            className="premium-input"
            type="number"
            placeholder={t('settings.behaviorTags.pricePlaceholder')}
            value={price}
            onChange={e => setPrice(e.target.value)}
            style={{ width: 100 }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !name.trim()}
            style={{
              padding: '10px 16px', fontSize: 13, fontWeight: 800, borderRadius: 10, border: 'none',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              background: name.trim() ? T.indigo : T.card,
              color: name.trim() ? T.text : T.faint,
            }}
          >
            {adding ? '…' : t('settings.behaviorTags.addBtn')}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: T.textDim, fontSize: 13 }}>
          {t('common.loading')}
        </div>
      ) : tags.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: T.faint, fontSize: 13 }}>
          <div style={{ fontWeight: 700, color: T.textDim, marginBottom: 4 }}>
            {t('settings.behaviorTags.emptyTitle')}
          </div>
          <div>{t('settings.behaviorTags.emptyBody')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tags.map((tag, idx) => {
            const isLegacy = tag.legacy_key !== null
            return (
              <div
                key={tag.id}
                style={{
                  padding: '8px 16px',
                  background: T.card,
                  border: `1px solid ${T.cardBorderHi}`,
                  borderRadius: 10,
                  opacity: tag.is_active ? 1 : 0.45,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{tag.icon || '🏷️'}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === tag.id ? (
                    <input
                      className="premium-input"
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => saveEdit(tag)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <div
                      onClick={() => startEdit(tag)}
                      style={{ fontSize: 14, fontWeight: 700, color: T.text, cursor: 'pointer' }}
                      title={t('common.edit')}
                    >
                      {tag.name}
                    </div>
                  )}
                  {isLegacy && (
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      {t('settings.behaviorTags.systemTag')}
                    </div>
                  )}
                </div>

                {editingPriceId === tag.id ? (
                  <input
                    className="premium-input"
                    type="number"
                    autoFocus
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    onBlur={() => savePriceEdit(tag)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      if (e.key === 'Escape') setEditingPriceId(null)
                    }}
                    style={{ width: 80, flexShrink: 0 }}
                  />
                ) : (
                  <div
                    onClick={() => startEditPrice(tag)}
                    style={{ flexShrink: 0, cursor: 'pointer' }}
                    title={t('common.edit')}
                  >
                    <Amount value={tag.price} money={true} theme="ink" size="md" signed />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    title={t('common.moveUp')}
                    aria-label={t('common.moveUp')}
                    style={{ ...iconBtn, opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === tags.length - 1}
                    title={t('common.moveDown')}
                    aria-label={t('common.moveDown')}
                    style={{ ...iconBtn, opacity: idx === tags.length - 1 ? 0.3 : 1, cursor: idx === tags.length - 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => toggleActive(tag)}
                    title={tag.is_active ? t('common.disable') : t('common.enable')}
                    aria-label={tag.is_active ? t('common.disable') : t('common.enable')}
                    style={{
                      ...iconBtn,
                      borderColor: tag.is_active ? T.success : T.cardBorder,
                      color: tag.is_active ? T.success : T.muted,
                    }}
                  >
                    {tag.is_active ? '●' : '○'}
                  </button>
                  {!isLegacy && (
                    <button
                      onClick={() => handleDelete(tag)}
                      title={t('common.delete')}
                      aria-label={t('common.delete')}
                      style={{ ...iconBtn, borderColor: T.dangerSoft, color: T.danger }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 26, height: 26, fontSize: 12, borderRadius: 6, cursor: 'pointer',
  border: `1px solid ${T.cardBorderHi}`, background: T.card,
  color: T.textDim, display: 'flex', alignItems: 'center', justifyContent: 'center',
}
