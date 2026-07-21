'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import {
  getRoomTasks,
  addRoomTask,
  updateRoomTask,
  setRoomTaskActive,
  reorderRoomTasks,
  deleteRoomTask,
} from '@/lib/repositories/room.repo'
import type { RoomTask } from '@/lib/models/room.types'
import { useT } from '@/lib/i18n'
import { T } from '@/components/parent-center/tokens'

const EMOJIS = ['🛏️', '🧹', '🧺', '📚', '🚪', '🗑️', '🧸', '🪟', '🧦', '👕', '🧼', '✨']

export default function RoomTasksManager() {
  const t = useT()
  const { familyId } = useAppStore()

  const [tasks, setTasks] = useState<RoomTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [icon, setIcon] = useState(EMOJIS[0])
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
      const data = await getRoomTasks(familyId, { activeOnly: false })
      setTasks(data.slice().sort((a, b) => a.sort_order - b.sort_order))
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
      await addRoomTask({
        familyId,
        name: name.trim(),
        icon,
        sortOrder: tasks.length,
      })
      setName('')
      setIcon(EMOJIS[0])
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAdding(false)
    }
  }

  function startEdit(task: RoomTask) {
    setEditingId(task.id)
    setEditName(task.name)
    setError('')
  }

  async function saveEdit(task: RoomTask) {
    const trimmed = editName.trim()
    setEditingId(null)
    if (!trimmed || trimmed === task.name) return
    try {
      await updateRoomTask(task.id, { name: trimmed })
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function toggleActive(task: RoomTask) {
    try {
      await setRoomTaskActive(task.id, !task.is_active)
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= tasks.length) return
    const next = tasks.slice()
    const tmp = next[index]
    next[index] = next[target]
    next[target] = tmp
    setTasks(next)
    try {
      await reorderRoomTasks(next.map(t => t.id))
      await load()
    } catch (e: any) {
      setError(e.message)
      await load()
    }
  }

  async function handleDelete(task: RoomTask) {
    if (task.legacy_key !== null) return
    if (!confirm(t('settings.roomTasksManager.deleteConfirm'))) return
    try {
      await deleteRoomTask(task.id)
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          🏠 {t('settings.roomTasksManager.title')}
        </div>
        <div style={{ fontSize: 13, color: T.textDim }}>
          {t('settings.roomTasksManager.subtitle')}
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
            placeholder={t('settings.roomTasksManager.namePlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ flex: 1 }}
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
            {adding ? '…' : `+ ${t('common.add')}`}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: T.textDim, fontSize: 13 }}>
          {t('common.loading')}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: T.faint, fontSize: 13 }}>
          {t('settings.roomTasksManager.empty')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map((task, idx) => {
            const isLegacy = task.legacy_key !== null
            return (
              <div
                key={task.id}
                style={{
                  padding: '10px 12px',
                  background: T.card,
                  border: `1px solid ${T.cardBorderHi}`,
                  borderRadius: 10,
                  opacity: task.is_active ? 1 : 0.45,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{task.icon || '🏠'}</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === task.id ? (
                    <input
                      className="premium-input"
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => saveEdit(task)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      style={{ width: '100%' }}
                    />
                  ) : (
                    <div
                      onClick={() => startEdit(task)}
                      style={{ fontSize: 14, fontWeight: 700, color: T.text, cursor: 'pointer' }}
                      title={t('common.edit')}
                    >
                      {task.name}
                    </div>
                  )}
                  {isLegacy && (
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                      🔒 {t('settings.roomTasksManager.systemTask')}
                    </div>
                  )}
                </div>

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
                    disabled={idx === tasks.length - 1}
                    title={t('common.moveDown')}
                    style={{ ...iconBtn, opacity: idx === tasks.length - 1 ? 0.3 : 1, cursor: idx === tasks.length - 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => toggleActive(task)}
                    title={task.is_active ? t('common.disable') : t('common.enable')}
                    style={{
                      ...iconBtn,
                      borderColor: task.is_active ? T.success : T.cardBorder,
                      color: task.is_active ? T.success : T.muted,
                    }}
                  >
                    {task.is_active ? '●' : '○'}
                  </button>
                  {!isLegacy && (
                    <button
                      onClick={() => handleDelete(task)}
                      title={t('common.delete')}
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
