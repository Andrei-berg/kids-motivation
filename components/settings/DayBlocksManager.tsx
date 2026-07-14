'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import {
  getDayBlocks,
  addDayBlock,
  updateDayBlock,
  setDayBlockActive,
  reorderDayBlocks,
  deleteDayBlock,
} from '@/lib/repositories/day-blocks.repo'
import type { DayBlock } from '@/lib/models/day-block.types'
import { useT } from '@/lib/i18n'

const EMOJIS = ['🧩', '🛏️', '🧹', '📖', '🏃', '🎯', '⭐', '📅', '🎒', '🧸', '✨', '🎨']

const DAY_TYPE_OPTS = ['school', 'weekend', 'vacation'] as const

export default function DayBlocksManager() {
  const t = useT()
  const { familyId } = useAppStore()

  const [blocks, setBlocks] = useState<DayBlock[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [icon, setIcon] = useState(EMOJIS[0])
  const [price, setPrice] = useState('')
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    if (familyId) load()
  }, [familyId])

  async function load() {
    if (!familyId) return
    setLoading(true)
    try {
      const data = await getDayBlocks(familyId, { activeOnly: false })
      setBlocks(data.slice().sort((a, b) => a.sort_order - b.sort_order))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!familyId || !name.trim()) return
    setAdding(true)
    setError('')
    try {
      await addDayBlock({
        familyId,
        name: name.trim(),
        icon,
        price: price.trim() ? Number(price) : null,
        whoFills: 'both',
        sortOrder: blocks.length,
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

  function startEdit(block: DayBlock) {
    setEditingId(block.id)
    setEditName(block.name)
    setError('')
  }

  async function saveEdit(block: DayBlock) {
    const trimmed = editName.trim()
    setEditingId(null)
    if (!trimmed || trimmed === block.name) return
    try {
      await updateDayBlock(block.id, { name: trimmed })
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function savePrice(block: DayBlock, value: string) {
    const trimmed = value.trim()
    const nextPrice = trimmed === '' ? null : Number(trimmed)
    if (nextPrice === block.price) return
    try {
      await updateDayBlock(block.id, { price: nextPrice })
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function saveVacationMultiplier(block: DayBlock, value: string) {
    const trimmed = value.trim()
    const nextValue = trimmed === '' ? undefined : Number(trimmed)
    const current = block.multipliers?.vacation
    if (nextValue === current) return
    try {
      await updateDayBlock(block.id, {
        multipliers: { ...(block.multipliers ?? {}), ...(nextValue !== undefined ? { vacation: nextValue } : {}) },
      })
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function saveWhoFills(block: DayBlock, whoFills: 'kid' | 'parent' | 'both') {
    try {
      await updateDayBlock(block.id, { who_fills: whoFills })
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function toggleDayType(block: DayBlock, dayType: string) {
    const current = block.day_types ?? []
    const next = current.includes(dayType)
      ? current.filter(d => d !== dayType)
      : [...current, dayType]
    try {
      await updateDayBlock(block.id, { day_types: next })
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function toggleActive(block: DayBlock) {
    try {
      await setDayBlockActive(block.id, !block.is_active)
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= blocks.length) return
    const next = blocks.slice()
    const tmp = next[index]
    next[index] = next[target]
    next[target] = tmp
    setBlocks(next)
    try {
      await reorderDayBlocks(next.map(b => b.id))
      await load()
    } catch (e: any) {
      setError(e.message)
      await load()
    }
  }

  async function handleDelete(block: DayBlock) {
    if (block.legacy_key !== null) return
    if (!confirm(t('settings.dayBlocksManager.deleteConfirm'))) return
    try {
      await deleteDayBlock(block.id)
      await load()
    } catch (e: any) {
      // DB legacy-delete guard rejects built-in deletes even if somehow
      // triggered — surface the "deactivate instead" message.
      setError(t('settings.dayBlocksManager.cannotDeleteBuiltin'))
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
          🧩 {t('settings.dayBlocksManager.title')}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(238,238,255,0.5)' }}>
          {t('settings.dayBlocksManager.subtitle')}
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 8, color: '#F43F5E', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Add form */}
      <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {EMOJIS.map(e => (
            <button
              key={e}
              onClick={() => setIcon(e)}
              style={{
                width: 32, height: 32, fontSize: 16, borderRadius: 7, cursor: 'pointer',
                border: `1.5px solid ${icon === e ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                background: icon === e ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
              }}
            >
              {e}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="premium-input"
            placeholder={t('settings.dayBlocksManager.namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            className="premium-input"
            type="number"
            placeholder={t('settings.dayBlocksManager.pricePlaceholder')}
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
              background: name.trim() ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.07)',
              color: name.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
            }}
          >
            {adding ? '…' : `+ ${t('common.add')}`}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: 'rgba(238,238,255,0.4)', fontSize: 13 }}>
          {t('common.loading')}
        </div>
      ) : blocks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'rgba(238,238,255,0.3)', fontSize: 13 }}>
          {t('settings.dayBlocksManager.empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {blocks.map((block, idx) => {
            const isBuiltin = block.legacy_key !== null
            return (
              <div
                key={block.id}
                style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  opacity: block.is_active ? 1 : 0.45,
                  display: 'flex', flexDirection: 'column', gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{block.icon || '🧩'}</span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {!isBuiltin && editingId === block.id ? (
                      <input
                        className="premium-input"
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onBlur={() => saveEdit(block)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <div
                        onClick={() => !isBuiltin && startEdit(block)}
                        style={{ fontSize: 14, fontWeight: 700, color: '#fff', cursor: isBuiltin ? 'default' : 'pointer' }}
                        title={isBuiltin ? undefined : t('common.edit')}
                      >
                        {block.name}
                      </div>
                    )}
                    {isBuiltin && (
                      <div style={{ fontSize: 11, color: 'rgba(238,238,255,0.35)', marginTop: 2 }}>
                        🔒 {t('settings.dayBlocksManager.systemBlock')}
                      </div>
                    )}
                  </div>

                  <input
                    className="premium-input"
                    type="number"
                    defaultValue={block.price ?? ''}
                    placeholder={t('settings.dayBlocksManager.pricePlaceholder')}
                    onBlur={e => savePrice(block, e.target.value)}
                    style={{ width: 80, flexShrink: 0 }}
                  />

                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => move(idx, -1)}
                      disabled={idx === 0}
                      title={t('common.moveUp')}
                      style={{ ...iconBtn, opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => move(idx, 1)}
                      disabled={idx === blocks.length - 1}
                      title={t('common.moveDown')}
                      style={{ ...iconBtn, opacity: idx === blocks.length - 1 ? 0.3 : 1, cursor: idx === blocks.length - 1 ? 'not-allowed' : 'pointer' }}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => toggleActive(block)}
                      title={block.is_active ? t('common.disable') : t('common.enable')}
                      style={{
                        ...iconBtn,
                        borderColor: block.is_active ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)',
                        color: block.is_active ? '#34d399' : 'rgba(238,238,255,0.35)',
                      }}
                    >
                      {block.is_active ? '●' : '○'}
                    </button>
                    {!isBuiltin && (
                      <button
                        onClick={() => handleDelete(block)}
                        title={t('common.delete')}
                        style={{ ...iconBtn, borderColor: 'rgba(244,63,94,0.25)', color: '#f43f5e' }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                {isBuiltin ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 28 }}>
                    <span style={{ fontSize: 11, color: 'rgba(238,238,255,0.4)' }}>
                      {t('settings.dayBlocksManager.vacationMultiplier')}
                    </span>
                    <input
                      className="premium-input"
                      type="number"
                      step="0.1"
                      defaultValue={block.multipliers?.vacation ?? ''}
                      onBlur={e => saveVacationMultiplier(block, e.target.value)}
                      style={{ width: 64 }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingLeft: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: 'rgba(238,238,255,0.4)' }}>
                        {t('settings.dayBlocksManager.whoFills.label')}
                      </span>
                      <select
                        className="premium-input"
                        value={block.who_fills}
                        onChange={e => saveWhoFills(block, e.target.value as 'kid' | 'parent' | 'both')}
                        style={{ fontSize: 12, padding: '4px 6px' }}
                      >
                        <option value="kid">{t('settings.dayBlocksManager.whoFills.kid')}</option>
                        <option value="parent">{t('settings.dayBlocksManager.whoFills.parent')}</option>
                        <option value="both">{t('settings.dayBlocksManager.whoFills.both')}</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'rgba(238,238,255,0.4)' }}>
                        {t('settings.dayBlocksManager.dayTypes.label')}
                      </span>
                      {DAY_TYPE_OPTS.map(dt => {
                        const checked = (block.day_types ?? []).includes(dt)
                        return (
                          <label key={dt} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'rgba(238,238,255,0.6)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleDayType(block, dt)} />
                            {t(`settings.dayBlocksManager.dayTypes.${dt}`)}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
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
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
  color: 'rgba(238,238,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
