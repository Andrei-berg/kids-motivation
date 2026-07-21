'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import {
  getDayBlocks,
  addDayBlock,
  updateDayBlock,
  setDayBlockActive,
  reorderDayBlocks,
  deleteDayBlock,
} from '@/lib/repositories/day-blocks.repo'
import { getScheduleItems } from '@/lib/repositories/schedule.repo'
import { scheduleDowToBlockDow } from '@/lib/day-blocks'
import type { DayBlock } from '@/lib/models/day-block.types'
import type { ScheduleItem } from '@/lib/models/schedule.types'
import { useT } from '@/lib/i18n'
import { T, CHILD_ACCENTS } from '@/components/parent-center/tokens'
import { Btn, Icon, Avatar } from '@/components/parent-center/ui'
import { StatusChip, Tabs } from '@/components/design/atoms'

const EMOJIS = ['🧩', '🛏️', '🧹', '📖', '🏃', '🎯', '⭐', '📅', '🎒', '🧸', '✨', '🎨']

const DAY_TYPE_OPTS = ['school', 'weekend', 'vacation'] as const

// schedule_items.day_of_week: 1=Mon..7=Sun — reuse the existing calendar-settings
// abbreviated-day i18n keys (settings.calendarSettingsManager.days.*) rather than
// inventing a parallel set for the schedule-link picker.
const DOW_ABBR_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

// Shared child-resolution shape used by both D-02 (schedule-link picker) and
// D-03 (per-child overrides, this plan): id = children.id (matches
// block.child_id), memberId = family_members.id (schedule_items lookups key
// on this), avatar/accent feed the Avatar atom (candidate b) and the
// child-selector Tabs (candidate a).
type ChildOption = { id: string; memberId: string; name: string; avatar: string; accent: string }

type FieldEdit = Partial<{
  name: string
  icon: string | null
  price: number | null
  day_types: string[]
  who_fills: 'kid' | 'parent' | 'both'
  multipliers: Record<string, number>
  schedule_link: string | null
  days_of_week: number[]
}>

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

  // D-02 schedule-link picker state.
  const [children, setChildren] = useState<ChildOption[]>([])
  const [scheduleItemsByMember, setScheduleItemsByMember] = useState<Record<string, ScheduleItem[]>>({})
  const [openScheduleLinkFor, setOpenScheduleLinkFor] = useState<string | null>(null)

  // D-03 per-child override state. `overridesByChild[childId]` is the
  // RESOLVED list from getDayBlocks(familyId, { childId }) — family defaults
  // with this child's active built-in overrides merged in (deduped by
  // legacy_key). Feeds both candidate (a)'s child tab and candidate (b)'s
  // "Override for…" expander.
  const [layout, setLayout] = useState<'byChild' | 'byBlock'>('byChild')
  const [selectedChildTab, setSelectedChildTab] = useState<string>('family')
  const [overridesByChild, setOverridesByChild] = useState<Record<string, DayBlock[]>>({})
  const [openOverrideFor, setOpenOverrideFor] = useState<string | null>(null)

  useEffect(() => {
    if (familyId) {
      load()
      loadChildrenAndSchedule(familyId)
    }
  }, [familyId])

  async function load() {
    if (!familyId) return
    setLoading(true)
    try {
      const data = await getDayBlocks(familyId, { activeOnly: false })
      setBlocks(data.slice().sort((a, b) => a.sort_order - b.sort_order))
      await loadOverrides(children)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Resolved list per child (family defaults + this child's active built-in
  // overrides, deduped by legacy_key). Loaded once children resolve, and
  // refreshed after any override write/removal.
  async function loadOverrides(childList: ChildOption[]) {
    if (!familyId || childList.length === 0) {
      setOverridesByChild({})
      return
    }
    try {
      const entries = await Promise.all(
        childList.map(async c => {
          try {
            const list = await getDayBlocks(familyId, { childId: c.id })
            return [c.id, list] as const
          } catch {
            return [c.id, [] as DayBlock[]] as const
          }
        })
      )
      setOverridesByChild(Object.fromEntries(entries))
    } catch {
      // Non-fatal — override views simply show nothing extra if this fails.
    }
  }

  // Child-id resolution — reused verbatim from PeriodsManager.tsx:71-83 (the
  // onboarding-api helper that filters to unclaimed profiles only is the
  // wrong tool here). Both children.id (matches block.child_id / days.child_id)
  // and family_members.id (the childMemberId getScheduleItems needs) are kept
  // so the schedule-link picker can resolve either direction. avatar/accent
  // added (Phase 5.8 D-03) from the `children` table — accent index mirrors
  // ParentCenter.tsx:116-147's children-array-order convention.
  async function loadChildrenAndSchedule(fid: string) {
    try {
      const db = createClient()
      const [{ data: memberRows }, { data: childRows }] = await Promise.all([
        db.from('family_members').select('id, child_id, display_name').eq('family_id', fid).eq('role', 'child').order('created_at'),
        db.from('children').select('id, emoji').eq('family_id', fid).order('created_at'),
      ])

      const avatarById = new Map<string, string>()
      const accentById = new Map<string, string>()
      ;(childRows || []).forEach((c: any, idx: number) => {
        avatarById.set(c.id, c.emoji || '🙂')
        accentById.set(c.id, CHILD_ACCENTS[idx % CHILD_ACCENTS.length])
      })

      const resolved: ChildOption[] = (memberRows || [])
        .filter((c: any) => c.child_id)
        .map((c: any) => ({
          id: c.child_id as string,
          memberId: c.id as string,
          name: c.display_name || 'Child',
          avatar: avatarById.get(c.child_id) || '🙂',
          accent: accentById.get(c.child_id) || CHILD_ACCENTS[0],
        }))
      setChildren(resolved)

      const entries = await Promise.all(
        resolved.map(async (c) => {
          try {
            const items = await getScheduleItems(fid, c.memberId)
            return [c.memberId, items] as const
          } catch {
            return [c.memberId, [] as ScheduleItem[]] as const
          }
        })
      )
      setScheduleItemsByMember(Object.fromEntries(entries))
      await loadOverrides(resolved)
    } catch {
      // Non-fatal: the schedule-link picker simply has no items to offer if
      // this fails — the rest of the manager (recolor, CRUD) still works.
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
      // WR-04: build the map explicitly and DELETE the key when clearing —
      // spreading the existing multipliers alone kept the old vacation value
      // in the DB, so a "removed" multiplier stayed active in every award.
      const next = { ...(block.multipliers ?? {}) }
      if (nextValue === undefined || !Number.isFinite(nextValue)) delete next.vacation
      else next.vacation = nextValue
      await updateDayBlock(block.id, { multipliers: next })
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

  // D-02 — denormalize-on-write: copy the picked schedule_item's weekdays
  // straight into the block's days_of_week (converted 1..7 to 0..6) so
  // assembleDayBlocks/`/api/wallet/award` need zero changes. item === null
  // clears the link.
  async function pickScheduleLink(block: DayBlock, item: ScheduleItem | null) {
    setOpenScheduleLinkFor(null)
    try {
      if (item) {
        await updateDayBlock(block.id, {
          schedule_link: item.id,
          days_of_week: scheduleDowToBlockDow(item.day_of_week),
        })
      } else {
        await updateDayBlock(block.id, { schedule_link: null, days_of_week: [] })
      }
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  // Manual re-copy (not a live join) — re-runs the same denormalize write in
  // case the linked schedule_items row's days changed since the last sync.
  async function resyncScheduleLink(block: DayBlock, item: ScheduleItem) {
    try {
      await updateDayBlock(block.id, {
        schedule_link: item.id,
        days_of_week: scheduleDowToBlockDow(item.day_of_week),
      })
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  function abbreviateDays(days: number[]): string {
    return days
      .slice()
      .sort((a, b) => a - b)
      .map(d => t(`settings.calendarSettingsManager.days.${DOW_ABBR_KEYS[d - 1]}`))
      .filter(Boolean)
      .join(', ')
  }

  // ==========================================================================
  // D-03 — per-child override (built-in blocks only), shared write path.
  // ==========================================================================

  function childName(childId: string): string {
    return children.find(c => c.id === childId)?.name || ''
  }

  // SHARED copy-on-write handler for both candidate (a) and candidate (b).
  // legacyKey identifies the built-in family default to override; fieldEdit
  // is the single field (or fields) being changed. See RESEARCH Pitfall 2 /
  // UI-SPEC D-03: first edit creates a new override row carrying the family
  // default's legacy_key (so getDayBlocks dedupes it, never duplicates) plus
  // its days_of_week/multipliers/schedule_link, with fieldEdit applied on
  // top — all in a SINGLE addDayBlock insert (WR-07 fix: this used to be a
  // create-then-update two-write sequence; if the second write failed after
  // the first succeeded, the new override row was left permanently active
  // with the carry-over fields silently dropped, and no retry path restored
  // them). Later edits (or reactivation of a previously-removed override)
  // update that same row.
  async function writeChildOverride(childId: string, legacyKey: string, fieldEdit: FieldEdit) {
    if (!familyId) return
    const familyDefault = blocks.find(b => b.legacy_key === legacyKey && b.child_id === null)
    if (!familyDefault) return
    try {
      const existingRows = await getDayBlocks(familyId, { childId, activeOnly: false })
      const existing = existingRows.find(r => r.child_id === childId && r.legacy_key === legacyKey)

      if (!existing) {
        await addDayBlock({
          familyId,
          childId,
          legacyKey: familyDefault.legacy_key,
          name: fieldEdit.name ?? familyDefault.name,
          icon: fieldEdit.icon !== undefined ? fieldEdit.icon : familyDefault.icon,
          price: fieldEdit.price !== undefined ? fieldEdit.price : familyDefault.price,
          dayTypes: fieldEdit.day_types ?? familyDefault.day_types,
          whoFills: fieldEdit.who_fills ?? familyDefault.who_fills,
          sortOrder: familyDefault.sort_order,
          daysOfWeek: fieldEdit.days_of_week ?? familyDefault.days_of_week,
          multipliers: fieldEdit.multipliers ?? familyDefault.multipliers,
          scheduleLink: fieldEdit.schedule_link !== undefined ? fieldEdit.schedule_link : familyDefault.schedule_link,
        })
      } else if (!existing.is_active) {
        await setDayBlockActive(existing.id, true)
        await updateDayBlock(existing.id, fieldEdit)
      } else {
        await updateDayBlock(existing.id, fieldEdit)
      }
      await loadOverrides(children)
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleChildPriceEdit(childId: string, row: DayBlock, value: string) {
    if (!row.legacy_key) return
    const trimmed = value.trim()
    const nextPrice = trimmed === '' ? null : Number(trimmed)
    // WR-06 fix: Number('abc') is NaN, and `NaN === row.price` is always
    // false (NaN never equals anything), so the guard below never
    // short-circuited on bad input — {price: NaN} was sent to
    // writeChildOverride, and Supabase-js's JSON.stringify(NaN) silently
    // serializes to null, clearing the override's price. Reject non-numeric
    // input with an inline error instead (Number.isFinite convention
    // already used by saveVacationMultiplier above).
    if (nextPrice !== null && !Number.isFinite(nextPrice)) {
      setError(t('settings.dayBlocksManager.invalidPrice'))
      return
    }
    if (nextPrice === row.price) return
    await writeChildOverride(childId, row.legacy_key, { price: nextPrice })
  }

  async function handleChildWhoFillsEdit(childId: string, row: DayBlock, whoFills: 'kid' | 'parent' | 'both') {
    if (!row.legacy_key || whoFills === row.who_fills) return
    await writeChildOverride(childId, row.legacy_key, { who_fills: whoFills })
  }

  // CR-01 fix — D-02 schedule-link picker, wired into the D-03 per-child
  // resolved view (renderChildResolvedList) instead of renderFamilyDefaultList,
  // whose `blocks` always have child_id === null (getDayBlocks without a
  // childId only ever returns family-default rows, so the picker there was
  // unreachable dead code). Goes through the shared writeChildOverride
  // copy-on-write path — same as handleChildPriceEdit/handleChildWhoFillsEdit
  // above — so picking a link creates the per-child override row on first
  // use, and updates it thereafter.
  async function pickChildScheduleLink(childId: string, row: DayBlock, item: ScheduleItem | null) {
    if (!row.legacy_key) return
    setOpenScheduleLinkFor(null)
    await writeChildOverride(childId, row.legacy_key, {
      schedule_link: item ? item.id : null,
      days_of_week: item ? scheduleDowToBlockDow(item.day_of_week) : [],
    })
  }

  // Manual re-copy (not a live join) — re-runs the same denormalize write in
  // case the linked schedule_items row's days changed since the last sync.
  async function resyncChildScheduleLink(childId: string, row: DayBlock, item: ScheduleItem) {
    if (!row.legacy_key) return
    await writeChildOverride(childId, row.legacy_key, {
      schedule_link: item.id,
      days_of_week: scheduleDowToBlockDow(item.day_of_week),
    })
  }

  function confirmRemoveOverride(childId: string, overrideRow: DayBlock) {
    if (!confirm(t('settings.dayBlocksManager.removeOverrideConfirm', { name: childName(childId) }))) return
    removeOverride(overrideRow.id)
  }

  async function removeOverride(overrideId: string) {
    try {
      // Deactivate, NOT delete — the legacy-delete DB trigger rejects direct
      // deletes of legacy_key-carrying rows (built-in overrides carry one).
      // getDayBlocks(activeOnly:true) then falls back to the family default;
      // a later re-override reactivates this same row (see writeChildOverride).
      await setDayBlockActive(overrideId, false)
      await loadOverrides(children)
    } catch (e: any) {
      setError(e.message)
    }
  }

  // Family-default block list — the existing (unchanged) CRUD editor.
  // Rendered as the "Family default" tab in candidate (a) (showOverrideExpander
  // = false, exactly as today) and as the primary list in the 'byBlock' layout
  // (showOverrideExpander = true, adds the candidate-b inline expander).
  function renderFamilyDefaultList(showOverrideExpander: boolean) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {blocks.map((block, idx) => {
          const isBuiltin = block.legacy_key !== null
          const childMemberId = block.child_id
            ? children.find(c => c.id === block.child_id)?.memberId
            : undefined
          const linkedItem = childMemberId
            ? (scheduleItemsByMember[childMemberId] ?? []).find(i => i.id === block.schedule_link)
            : undefined
          return (
            <div
              key={block.id}
              style={{
                padding: '12px 12px',
                background: T.card,
                border: `1px solid ${T.cardBorder}`,
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
                      style={{ fontSize: 14, fontWeight: 700, color: T.text, cursor: isBuiltin ? 'default' : 'pointer' }}
                      title={isBuiltin ? undefined : t('common.edit')}
                    >
                      {block.name}
                    </div>
                  )}
                  {isBuiltin && (
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
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
                    aria-label={t('settings.dayBlocksManager.ariaMoveUp')}
                    style={{ ...iconBtn, opacity: idx === 0 ? 0.3 : 1, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === blocks.length - 1}
                    title={t('common.moveDown')}
                    aria-label={t('settings.dayBlocksManager.ariaMoveDown')}
                    style={{ ...iconBtn, opacity: idx === blocks.length - 1 ? 0.3 : 1, cursor: idx === blocks.length - 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => toggleActive(block)}
                    title={block.is_active ? t('common.disable') : t('common.enable')}
                    aria-label={t(block.is_active ? 'settings.dayBlocksManager.ariaDisable' : 'settings.dayBlocksManager.ariaEnable')}
                    style={{
                      ...iconBtn,
                      borderColor: block.is_active ? T.success : T.cardBorder,
                      color: block.is_active ? T.success : T.muted,
                    }}
                  >
                    {block.is_active ? '●' : '○'}
                  </button>
                  {!isBuiltin && (
                    <button
                      onClick={() => handleDelete(block)}
                      title={t('common.delete')}
                      aria-label={t('settings.dayBlocksManager.ariaDelete')}
                      style={{ ...iconBtn, borderColor: `${T.danger}55`, color: T.danger }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {isBuiltin ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 28 }}>
                    <span style={{ fontSize: 11, color: T.muted }}>
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

                  {/* D-03 candidate (b) — "Override for…" expander, built-in
                      rows only, only in the 'byBlock' layout. Stacked after
                      who-fills/day-types + schedule-link (this block has
                      neither since it's built-in — vacation multiplier plays
                      that role here). */}
                  {showOverrideExpander && (
                    <div style={{ paddingLeft: 28 }}>
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpenOverrideFor(openOverrideFor === block.id ? null : block.id)}
                      >
                        {t('settings.dayBlocksManager.overrideFor')}
                        <Icon name="chevD" size={14} />
                      </Btn>

                      {openOverrideFor === block.id && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6, padding: 8, background: T.cardHi, border: `1px solid ${T.cardBorderHi}`, borderRadius: 8 }}>
                          {children.map(c => {
                            const override = (overridesByChild[c.id] ?? []).find(
                              r => r.child_id === c.id && r.legacy_key === block.legacy_key
                            )
                            const rowForEdit = override ?? block
                            return (
                              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Avatar child={{ avatar: c.avatar, accent: c.accent }} size={24} />
                                <span style={{ fontSize: 12, color: T.text, flex: 1, minWidth: 0 }}>{c.name}</span>
                                <input
                                  className="premium-input"
                                  type="number"
                                  defaultValue={rowForEdit.price ?? ''}
                                  placeholder={t('settings.dayBlocksManager.pricePlaceholder')}
                                  onBlur={e => handleChildPriceEdit(c.id, rowForEdit, e.target.value)}
                                  style={{ width: 70 }}
                                />
                                <select
                                  className="premium-input"
                                  value={rowForEdit.who_fills}
                                  onChange={e => handleChildWhoFillsEdit(c.id, rowForEdit, e.target.value as 'kid' | 'parent' | 'both')}
                                  style={{ fontSize: 11, padding: '4px 6px' }}
                                >
                                  <option value="kid">{t('settings.dayBlocksManager.whoFills.kid')}</option>
                                  <option value="parent">{t('settings.dayBlocksManager.whoFills.parent')}</option>
                                  <option value="both">{t('settings.dayBlocksManager.whoFills.both')}</option>
                                </select>
                                {override && (
                                  <button
                                    onClick={() => confirmRemoveOverride(c.id, override)}
                                    aria-label={t('settings.dayBlocksManager.ariaRemoveOverride', { name: c.name })}
                                    style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                                  >
                                    <StatusChip tone="success" theme="ink">{t('settings.dayBlocksManager.custom')} ✕</StatusChip>
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingLeft: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: T.muted }}>
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
                      <span style={{ fontSize: 11, color: T.muted }}>
                        {t('settings.dayBlocksManager.dayTypes.label')}
                      </span>
                      {DAY_TYPE_OPTS.map(dt => {
                        const checked = (block.day_types ?? []).includes(dt)
                        return (
                          <label key={dt} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: T.textDim, cursor: 'pointer' }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleDayType(block, dt)} />
                            {t(`settings.dayBlocksManager.dayTypes.${dt}`)}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* D-02 schedule-link picker — only for a per-child block whose
                      child_id resolves to a family_members id. Family-default
                      rows (child_id null) have no single schedule to link to. */}
                  {childMemberId && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 28 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() => setOpenScheduleLinkFor(openScheduleLinkFor === block.id ? null : block.id)}
                          style={{ color: linkedItem ? T.text : T.indigo }}
                        >
                          🔗 {linkedItem
                            ? t('settings.dayBlocksManager.scheduleLink.synced', { title: linkedItem.title })
                            : t('settings.dayBlocksManager.scheduleLink.none')}
                          <Icon name="chevD" size={14} />
                        </Btn>
                        {linkedItem && (
                          <>
                            <StatusChip tone="success" theme="ink">
                              {t('settings.dayBlocksManager.scheduleLink.synced', { title: linkedItem.title })}
                            </StatusChip>
                            <button
                              onClick={() => resyncScheduleLink(block, linkedItem)}
                              aria-label={t('settings.dayBlocksManager.resync')}
                              title={t('settings.dayBlocksManager.resync')}
                              style={iconBtn}
                            >
                              ↻
                            </button>
                          </>
                        )}
                      </div>

                      {openScheduleLinkFor === block.id && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8, background: T.cardHi, border: `1px solid ${T.cardBorderHi}`, borderRadius: 8 }}>
                          <button
                            onClick={() => pickScheduleLink(block, null)}
                            style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: T.muted, fontSize: 12, cursor: 'pointer' }}
                          >
                            {t('settings.dayBlocksManager.scheduleLink.none')}
                          </button>
                          {(scheduleItemsByMember[childMemberId] ?? []).map(item => (
                            <button
                              key={item.id}
                              onClick={() => pickScheduleLink(block, item)}
                              style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: T.text, fontSize: 12, cursor: 'pointer' }}
                            >
                              {item.title} — {abbreviateDays(item.day_of_week)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // D-03 candidate (a) — resolved list for a selected child's tab. Rows are
  // the getDayBlocks(familyId, { childId }) RESOLVED list: family defaults +
  // this child's active overrides merged in by legacy_key. Custom rows
  // (legacy_key null) render read-only, no override affordance.
  function renderChildResolvedList(childId: string, rows: DayBlock[]) {
    const childMemberId = children.find(c => c.id === childId)?.memberId
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(row => {
          const isBuiltIn = row.legacy_key !== null
          const isOverride = row.child_id === childId
          const linkedItem = childMemberId
            ? (scheduleItemsByMember[childMemberId] ?? []).find(i => i.id === row.schedule_link)
            : undefined
          return (
            <div
              key={row.id}
              style={{
                padding: '12px 12px',
                background: T.card,
                border: `1px solid ${T.cardBorder}`,
                borderRadius: 10,
                opacity: row.is_active ? 1 : 0.45,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{row.icon || '🧩'}</span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{row.name}</span>
                  {isOverride && (
                    <button
                      onClick={() => confirmRemoveOverride(childId, row)}
                      aria-label={t('settings.dayBlocksManager.ariaRemoveOverride', { name: childName(childId) })}
                      style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
                    >
                      <StatusChip tone="success" theme="ink">{t('settings.dayBlocksManager.custom')}</StatusChip>
                    </button>
                  )}
                </div>
                {isBuiltIn ? (
                  <input
                    className="premium-input"
                    type="number"
                    defaultValue={row.price ?? ''}
                    placeholder={t('settings.dayBlocksManager.pricePlaceholder')}
                    onBlur={e => handleChildPriceEdit(childId, row, e.target.value)}
                    style={{ width: 80, flexShrink: 0 }}
                  />
                ) : (
                  <span style={{ fontSize: 13, color: T.muted, fontFamily: T.fMono, flexShrink: 0 }}>
                    {row.price != null ? `${row.price}🪙` : '—'}
                  </span>
                )}
              </div>

              {/* CR-01 fix — D-02 schedule-link picker, reachable here (not
                  renderFamilyDefaultList) because this resolved row is the
                  first place a built-in block is actually associated with a
                  real child. Picking a link creates/updates this child's
                  override via writeChildOverride (pickChildScheduleLink). */}
              {isBuiltIn && childMemberId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenScheduleLinkFor(openScheduleLinkFor === row.id ? null : row.id)}
                      style={{ color: linkedItem ? T.text : T.indigo }}
                    >
                      🔗 {linkedItem
                        ? t('settings.dayBlocksManager.scheduleLink.synced', { title: linkedItem.title })
                        : t('settings.dayBlocksManager.scheduleLink.none')}
                      <Icon name="chevD" size={14} />
                    </Btn>
                    {linkedItem && (
                      <>
                        <StatusChip tone="success" theme="ink">
                          {t('settings.dayBlocksManager.scheduleLink.synced', { title: linkedItem.title })}
                        </StatusChip>
                        <button
                          onClick={() => resyncChildScheduleLink(childId, row, linkedItem)}
                          aria-label={t('settings.dayBlocksManager.resync')}
                          title={t('settings.dayBlocksManager.resync')}
                          style={iconBtn}
                        >
                          ↻
                        </button>
                      </>
                    )}
                  </div>

                  {openScheduleLinkFor === row.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 8, background: T.cardHi, border: `1px solid ${T.cardBorderHi}`, borderRadius: 8 }}>
                      <button
                        onClick={() => pickChildScheduleLink(childId, row, null)}
                        style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: T.muted, fontSize: 12, cursor: 'pointer' }}
                      >
                        {t('settings.dayBlocksManager.scheduleLink.none')}
                      </button>
                      {(scheduleItemsByMember[childMemberId] ?? []).map(item => (
                        <button
                          key={item.id}
                          onClick={() => pickChildScheduleLink(childId, row, item)}
                          style={{ textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', color: T.text, fontSize: 12, cursor: 'pointer' }}
                        >
                          {item.title} — {abbreviateDays(item.day_of_week)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, marginBottom: 4 }}>
          🧩 {t('settings.dayBlocksManager.title')}
        </div>
        <div style={{ fontSize: 13, color: T.muted }}>
          {t('settings.dayBlocksManager.subtitle')}
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
                border: `1.5px solid ${icon === e ? T.indigo : T.cardBorder}`,
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
              background: name.trim() ? T.indigo : T.card,
              color: name.trim() ? T.text : T.muted,
            }}
          >
            {adding ? '…' : t('settings.dayBlocksManager.addBlock')}
          </button>
        </div>
      </div>

      {/* D-03 — top-of-screen layout toggle */}
      <div style={{ marginBottom: 16 }}>
        <Tabs
          theme="ink"
          value={layout}
          onChange={v => setLayout(v as 'byChild' | 'byBlock')}
          tabs={[
            { id: 'byChild', label: t('settings.dayBlocksManager.byChild') },
            { id: 'byBlock', label: t('settings.dayBlocksManager.byBlock') },
          ]}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: T.muted, fontSize: 13 }}>
          {t('common.loading')}
        </div>
      ) : blocks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: T.faint, fontSize: 13 }}>
          {t('settings.dayBlocksManager.empty')}
        </div>
      ) : layout === 'byBlock' ? (
        renderFamilyDefaultList(true)
      ) : (
        <div>
          <div style={{ marginBottom: 12 }}>
            <Tabs
              theme="ink"
              scroll
              value={selectedChildTab}
              onChange={setSelectedChildTab}
              tabs={[
                { id: 'family', label: t('settings.dayBlocksManager.familyDefault') },
                ...children.map(c => ({ id: c.id, label: c.name, icon: c.avatar })),
              ]}
            />
          </div>
          {selectedChildTab === 'family'
            ? renderFamilyDefaultList(false)
            : renderChildResolvedList(selectedChildTab, overridesByChild[selectedChildTab] ?? [])}
        </div>
      )}
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 26, height: 26, fontSize: 12, borderRadius: 6, cursor: 'pointer',
  border: `1px solid ${T.cardBorder}`, background: T.card,
  color: T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center',
}
