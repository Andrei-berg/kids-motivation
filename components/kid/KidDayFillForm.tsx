'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useCoinAnimation, CoinFlyup } from '@/components/kid/CoinAnimation'
import type { DayData, SubjectGrade } from '@/lib/models/child.types'
import type { Subject, ExerciseType } from '@/lib/models/flexible.types'
import type { ExtraActivity, Section, SectionVisit } from '@/lib/models/expense.types'
import type { WalletSettings } from '@/lib/models/wallet.types'
import { saveDay, getChild } from '@/lib/repositories/children.repo'
import { getExtraActivities, getActivityLogs, saveActivityLogs, getSectionsForDate, markSectionVisit } from '@/lib/repositories/expenses.repo'
import { getActiveSubjects, getExerciseTypes, saveHomeExercise, getHomeExercises } from '@/lib/repositories/schedule.repo'
import { getSubjectGradesForDate, saveSubjectGrade } from '@/lib/repositories/grades.repo'
import { getWalletSettings } from '@/lib/repositories/wallet.repo'
import { getRoomTasks, getRoomChecks, saveRoomChecks } from '@/lib/repositories/room.repo'
import type { RoomTask, RoomLegacyKey } from '@/lib/models/room.types'
import { assembleDayBlocks } from '@/lib/day-blocks'
import { getDayBlockEntries, saveDayBlockEntries } from '@/lib/repositories/day-blocks.repo'
import type { DayBlock } from '@/lib/models/day-block.types'
import { checkAndAwardBadges } from '@/lib/badges'
import { detectAward } from '@/lib/kid/awardResult'
import { computeLevelUp } from '@/lib/kid/level'
import { compressImage, uploadPhoto, getSignedPhotoUrl } from '@/lib/photo-upload'
import { supabase } from '@/lib/supabase'
import { getReadingLog, saveReadingLog } from '@/lib/vacation-api'
import { T } from '@/components/kid/design/tokens'
import { AnimatedNum } from '@/components/kid/design/atoms'
import { base, paper } from '@/lib/design/tokens'
import BlockCard from '@/components/kid/day-blocks/BlockCard'
import RoomBlock from '@/components/kid/day-blocks/RoomBlock'
import ActivitiesBlock from '@/components/kid/day-blocks/ActivitiesBlock'
import BookBlock from '@/components/kid/day-blocks/BookBlock'
import CustomBlock from '@/components/kid/day-blocks/CustomBlock'
import { useT, useLanguage } from '@/lib/i18n'
import { localDateString } from '@/utils/helpers'
import { track } from '@/lib/analytics'

// Pre-load fallback only — mirrors SETTINGS_DEFAULTS in app/api/wallet/_lib.ts.
// The live preview uses the loaded per-family wallet_settings (WR-05).
const GRADE_COINS: Record<number, number> = { 5: 10, 4: 5, 3: -3, 2: -5, 1: -10 }

// ============================================================================
// TYPES
// ============================================================================

// Per-item detail for a single credited award, mirroring the award route's
// appliedItems entries (05.7-11) — used to render day-summary LedgerRows.
export interface AwardedItem {
  sourceType: string
  coins: number
  description: string
  icon: string
}

// Server-confirmed save result (05.7-11, D-17): everything the day/page
// stamp+count-up+confetti orchestration needs. NEVER built from coinsPreview —
// creditedCoins/hasStreak come from detectAward(awardResponse); leveledUp from
// comparing the child's xp before/after checkAndAwardBadges.
export interface DaySaveResult {
  creditedCoins: number
  hasStreak: boolean
  leveledUp: boolean
  appliedItems: AwardedItem[]
}

export interface KidDayFillFormProps {
  childId: string
  date: string         // YYYY-MM-DD
  fillMode: 1 | 2 | 3 // from child.kid_fill_mode
  dayType: 'school' | 'weekend' | 'vacation'
  existingDay: DayData | null   // pre-filled if parent already saved
  onSaved: (result: DaySaveResult) => void // callback after successful save — server-confirmed numbers only (D-17)
  dayBlocksEnabled: boolean    // family flag (Phase 5.6) — flag-off keeps the hardcoded sections below
  dayBlocks: DayBlock[]        // family's active block config (empty when flag-off)
}

// ============================================================================
// MOOD OPTIONS
// ============================================================================

const MOOD_OPTIONS_STATIC = [
  { key: 'happy',   emoji: '😄', labelKey: 'kidFillForm.moodFire',  color: '#FF6B35' },
  { key: 'neutral', emoji: '🙂', labelKey: 'kidFillForm.moodGood',  color: '#4ECDC4' },
  { key: 'meh',     emoji: '😐', labelKey: 'kidFillForm.moodOk',    color: '#F5A623' },
  { key: 'sad',     emoji: '😔', labelKey: 'kidFillForm.moodSad',   color: '#6C5CE7' },
  { key: 'tired',   emoji: '😴', labelKey: 'kidFillForm.moodTired', color: '#FF8FB1' },
]

// Card wrapper: BlockCard (components/kid/day-blocks/BlockCard.tsx) — the
// family-bank receipt card that replaced the old FillSection helper (05.7-04).

// ============================================================================
// COMPONENT
// ============================================================================

export function KidDayFillForm({
  childId,
  date,
  dayType,
  existingDay,
  onSaved,
  dayBlocksEnabled,
  dayBlocks,
}: KidDayFillFormProps) {
  const t = useT()
  const { language } = useLanguage()
  const MOOD_OPTIONS = MOOD_OPTIONS_STATIC.map(m => ({ ...m, label: t(m.labelKey) }))

  // ── Coin animation ───────────────────────────────────────────────────────
  const { flyups, trigger: triggerCoinFlyup } = useCoinAnimation()

  // ── State ────────────────────────────────────────────────────────────────
  const isChildFilled = existingDay?.filled_by === 'child'

  const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([])
  const [exercises, setExercises] = useState<Array<{ exercise_type_id: string; quantity: number | null; unit: string }>>([])
  const [sections, setSections] = useState<Array<Section & { visit?: SectionVisit }>>([])
  const [sectionNotes, setSectionNotes] = useState<Record<string, { progress: string; coachRating: number | null }>>({})

  // Room checklist — rendered from the family's room_tasks (active, ordered);
  // roomChecked is keyed by task id. Pre-filled from room_checks when the day
  // was already child-filled (mirrors the old existingDay?.room_* pre-fill).
  const [roomTasks, setRoomTasks] = useState<RoomTask[]>([])
  const [roomChecked, setRoomChecked] = useState<Record<string, boolean>>({})

  const [mood, setMood] = useState<string | null>(existingDay?.mood ?? null)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofLocalUrl, setProofLocalUrl] = useState<string | null>(null)
  const proofInputRef = useRef<HTMLInputElement>(null)
  const [checkedActivities, setCheckedActivities] = useState<Set<string>>(new Set())
  const [activities, setActivities] = useState<ExtraActivity[]>([])
  const [settings, setSettings] = useState<WalletSettings | null>(null)
  // When on (default), a finished-book bonus waits for parent confirmation instead
  // of crediting on save. Fetched per child.
  const [requireReadingCheck, setRequireReadingCheck] = useState(true)
  const [saving, setSaving] = useState(false)
  // True when the day's rows saved but /api/wallet/award failed — the form
  // stays visible with a retry (D-17: never stamp/confetti on an unconfirmed
  // award; retrying only re-runs the award step, not the already-persisted
  // row saves, since several of those writes are insert-only, not upsert).
  const [saveError, setSaveError] = useState(false)
  const [noteChild, setNoteChild] = useState<string>(existingDay?.note_child ?? '')
  // Grades (mode 3 only)
  // saved=true means already in DB — skip on submit to avoid duplicates
  type GradeEntry = { grade: number | null; isDigital: boolean; saved: boolean }
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [kidGrades, setKidGrades] = useState<Record<string, GradeEntry[]>>({})

  // IDs of activities already awarded on a previous save — used to prevent
  // double-awarding coins when the child edits and re-saves the form.
  const [prevAwardedActivityIds, setPrevAwardedActivityIds] = useState<Set<string>>(new Set())
  // Which sections already had an attended visit recorded before this edit.
  const [prevAttendedSectionIds, setPrevAttendedSectionIds] = useState<Set<string>>(new Set())
  // Whether the book-finish bonus was already awarded before this edit.
  const [prevBookFinished, setPrevBookFinished] = useState(false)

  // ── Reading state ────────────────────────────────────────────────────────
  const [reading, setReading] = useState({
    bookTitle: '',
    pagesRead: '',
    minutesRead: '',
    currentPage: '',
    bookFinished: false,
    note: '',
  })
  const [readingActive, setReadingActive] = useState(false) // toggle "читал сегодня"

  // ── Day-blocks (Phase 5.6) — custom-block completion toggles ────────────
  // Keyed by block id; pre-filled from day_block_entries. Built-in blocks
  // (legacy_key non-null) persist through their existing tables (room_checks,
  // grades, activity logs, section visits, reading log, home exercises) —
  // this map is only for custom blocks (legacy_key null).
  const [customBlockDone, setCustomBlockDone] = useState<Record<string, boolean>>({})

  // Visible/ordered block list for today — the SAME shared assembler the
  // parent's DailyModal calls, so the two forms can never diverge (D-06).
  const visibleBlocks = useMemo(() => {
    if (!dayBlocksEnabled || dayBlocks.length === 0) return []
    return assembleDayBlocks(dayBlocks, dayType, date)
  }, [dayBlocksEnabled, dayBlocks, dayType, date])

  // ── Lock logic ───────────────────────────────────────────────────────────
  const isLocked = useMemo(() => {
    const today = localDateString()
    return date < today
  }, [date])

  // ── Load data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const promises: Promise<any>[] = [
        getExtraActivities(childId, dayType),
        getWalletSettings(),
        getActivityLogs(childId, date),
        getExerciseTypes(),
        getHomeExercises(childId, date),
        getSectionsForDate(childId, date),
      ]
      if (dayType === 'school') {
        promises.push(getActiveSubjects(childId), getSubjectGradesForDate(childId, date))
      }
      const [acts, ws, existingLogs, exTypes, existingExercises, sectionsData, subs, gradesData] = await Promise.all(promises)
      setActivities(acts)
      setSettings(ws)

      // Pre-fill exercises
      setExerciseTypes(exTypes)
      setExercises((existingExercises ?? []).map((ex: any) => ({
        exercise_type_id: ex.exercise_type_id,
        quantity: ex.quantity,
        unit: ex.exercise_type?.unit ?? t('kidDayFill.unit'),
      })))

      // Pre-fill sections
      setSections(sectionsData ?? [])
      const notes: Record<string, { progress: string; coachRating: number | null }> = {}
      ;(sectionsData ?? []).forEach((s: Section & { visit?: SectionVisit }) => {
        if (s.visit) {
          notes[s.id] = { progress: s.visit.progress_note ?? '', coachRating: null }
        }
      })
      setSectionNotes(notes)

      // Whether this child's reading needs parent confirmation + family_id
      // (needed to load the family's room checklist).
      const { data: childPrefs } = await supabase
        .from('children')
        .select('require_reading_check, family_id')
        .eq('id', childId)
        .maybeSingle()
      setRequireReadingCheck((childPrefs as any)?.require_reading_check ?? true)

      // Load the family's active room checklist (data-driven, replaces the
      // hardcoded 5-item array) and pre-fill from room_checks when this day
      // was already child-filled.
      const familyId = (childPrefs as any)?.family_id as string | undefined
      if (familyId) {
        const tasks = await getRoomTasks(familyId)
        setRoomTasks(tasks)
        const initialChecked: Record<string, boolean> = {}
        tasks.forEach(task => { initialChecked[task.id] = false })
        if (isChildFilled) {
          const checks = await getRoomChecks(childId, date)
          checks.forEach(c => { initialChecked[c.task_id] = c.done })
        }
        setRoomChecked(initialChecked)
      }

      // Pre-fill reading log
      const existingReading = await getReadingLog(childId, date)
      if (existingReading) {
        setReadingActive(true)
        setReading({
          bookTitle: existingReading.book_title ?? '',
          pagesRead: String(existingReading.pages_read ?? ''),
          minutesRead: String(existingReading.minutes_read ?? ''),
          currentPage: String((existingReading as any).current_page ?? ''),
          bookFinished: existingReading.book_finished ?? false,
          note: existingReading.note ?? '',
        })
        if (existingReading.book_finished) setPrevBookFinished(true)
      }

      // Pre-fill custom-block toggle states (Phase 5.6, flag-on only) — only
      // custom blocks (legacy_key null) persist here; built-ins keep using
      // their existing tables loaded above.
      if (dayBlocksEnabled) {
        try {
          const entries = await getDayBlockEntries(childId, date)
          const doneMap: Record<string, boolean> = {}
          entries.forEach(e => { doneMap[e.block_id] = e.done })
          setCustomBlockDone(doneMap)
        } catch {
          setCustomBlockDone({})
        }
      }

      // Pre-check activities that were previously saved
      if (existingLogs.length > 0) {
        const doneIds = new Set<string>(
          existingLogs
            .filter((l: any) => l.done)
            .map((l: any) => l.activity_id as string)
        )
        setCheckedActivities(doneIds)
        setPrevAwardedActivityIds(doneIds)
      }

      // Track sections that already had an attended visit (to skip coin re-award)
      const alreadyAttended = new Set<string>(
        (sectionsData ?? []).filter((s: any) => s.visit?.attended).map((s: any) => s.id as string)
      )
      setPrevAttendedSectionIds(alreadyAttended)

      // Pre-fill grades for school days
      if (subs) {
        setSubjects(subs)
        const grades: SubjectGrade[] = gradesData ?? []
        // Group existing grades by subject — pre-fill as saved entries
        const bySubject: Record<string, Array<{ grade: number | null; isDigital: boolean; saved: boolean }>> = {}
        grades.forEach((g: SubjectGrade) => {
          if (!bySubject[g.subject]) bySubject[g.subject] = []
          bySubject[g.subject].push({ grade: g.grade, isDigital: g.note === 'цифровое задание', saved: true })
        })
        // Ensure every active subject has at least one empty entry for new input
        ;(subs as Subject[]).forEach((s: Subject) => {
          if (!bySubject[s.name]) bySubject[s.name] = []
          bySubject[s.name].push({ grade: null, isDigital: false, saved: false })
        })
        setKidGrades(bySubject)
      }
    }
    load()
  }, [childId, dayType, date, dayBlocksEnabled])

  // ── Live coin calculation (no state — pure compute) ──────────────────────
  const coinsPreview = useMemo(() => {
    let total = 0
    // WR-02: under flag-on only count sources whose built-in block is visible
    // today — the server's flag-on award path credits nothing for hidden
    // blocks, so the preview must not promise those coins. Flag-off keeps the
    // pre-5.6 behavior (every source counts).
    const legacyVisible = (key: string) =>
      !dayBlocksEnabled || visibleBlocks.some(b => b.legacy_key === key)
    // Preview only — the server (/api/wallet/award) recomputes from room_checks
    // with the same threshold rule: max(1, ceil(0.6 * activeTaskCount)).
    const roomDoneCount = Object.values(roomChecked).filter(Boolean).length
    const roomTaskCount = roomTasks.length
    if (legacyVisible('room') && roomTaskCount > 0 && roomDoneCount >= Math.max(1, Math.ceil(0.6 * roomTaskCount))) {
      total += settings?.coins_per_room_task ?? 3
    }
    if (legacyVisible('activity')) {
      checkedActivities.forEach(id => {
        const act = activities.find(a => a.id === id)
        if (act) total += act.coins
      })
    }
    // Grade coins (mode 3) — only unsaved (new) entries. Use wallet_settings so
    // the preview matches what /api/wallet/award credits server-side; GRADE_COINS
    // is only a fallback before settings load.
    if (legacyVisible('grade')) {
      Object.values(kidGrades).flat().forEach(e => {
        if (e.saved || e.grade === null) return
        const g = e.grade
        if (settings) {
          if (g === 5) total += settings.coins_per_grade_5
          else if (g === 4) total += settings.coins_per_grade_4
          else if (g === 3) total += settings.coins_per_grade_3
          else if (g === 2) total += settings.coins_per_grade_2
          else if (g === 1) total += settings.coins_per_grade_1
        } else {
          total += GRADE_COINS[g] ?? 0
        }
      })
    }
    // Coach rating coins for attended sections. coins_per_coach_2/_1 are already
    // negative (penalties), so always add — matching the server's award logic.
    if (settings && legacyVisible('sport')) {
      sections.forEach(s => {
        const note = sectionNotes[s.id]
        if (!note?.coachRating) return
        const r = note.coachRating
        if (r === 5) total += settings.coins_per_coach_5
        else if (r === 4) total += settings.coins_per_coach_4
        else if (r === 3) total += settings.coins_per_coach_3 // usually 0
        else if (r === 2) total += settings.coins_per_coach_2
        else if (r === 1) total += settings.coins_per_coach_1
      })
    }
    // Book finished bonus — only counted in the preview when it credits on save.
    // If parent verification is required, it stays pending, so don't promise coins.
    if (legacyVisible('book') && readingActive && reading.bookFinished && !requireReadingCheck) {
      total += (settings as any)?.coins_per_book ?? 20
    }
    // Custom day-blocks (flag-on only) — flat block.price for each toggled-on
    // custom block, mirroring resolveBlockPrice's explicit-price case. Preview
    // only; /api/wallet/award recomputes server-side from day_block_entries.
    if (dayBlocksEnabled) {
      visibleBlocks.forEach(b => {
        if (!b.legacy_key && customBlockDone[b.id] && b.price) total += b.price
      })
    }
    return total
  }, [roomTasks, roomChecked, checkedActivities, activities, settings, kidGrades, sections, sectionNotes, reading, readingActive, requireReadingCheck, dayBlocksEnabled, visibleBlocks, customBlockDone])

  // ── Handlers ─────────────────────────────────────────────────────────────
  function toggleRoomTask(taskId: string) {
    if (isLocked) return
    setRoomChecked(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  function handleProofCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Revoke previous preview URL to avoid memory leak
    if (proofLocalUrl) URL.revokeObjectURL(proofLocalUrl)
    const url = URL.createObjectURL(file)
    setProofFile(file)
    setProofLocalUrl(url)
    // Reset input so the same file can trigger onChange again (retake)
    e.target.value = ''
  }

  function handleProofRetake() {
    if (proofLocalUrl) URL.revokeObjectURL(proofLocalUrl)
    setProofFile(null)
    setProofLocalUrl(null)
    // Re-open camera
    setTimeout(() => proofInputRef.current?.click(), 50)
  }

  function toggleActivity(id: string) {
    if (isLocked) return
    setCheckedActivities(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // T-056-12 (UI-level, defense-in-depth): who_fills==='parent' blocks are not
  // kid-toggleable here — the award route is the authoritative backstop since
  // day_block_entries RLS is family-wide.
  function toggleCustomBlock(block: DayBlock) {
    if (isLocked || block.who_fills === 'parent') return
    setCustomBlockDone(prev => ({ ...prev, [block.id]: !prev[block.id] }))
  }

  function toggleExercise(exerciseTypeId: string) {
    if (isLocked) return
    setExercises(prev => {
      const exists = prev.find(e => e.exercise_type_id === exerciseTypeId)
      if (exists) return prev.filter(e => e.exercise_type_id !== exerciseTypeId)
      const et = exerciseTypes.find(t => t.id === exerciseTypeId)
      return [...prev, { exercise_type_id: exerciseTypeId, quantity: null, unit: et?.unit ?? t('kidDayFill.unit') }]
    })
  }

  function updateExerciseQuantity(exerciseTypeId: string, quantity: number | null) {
    setExercises(prev => prev.map(e => e.exercise_type_id === exerciseTypeId ? { ...e, quantity } : e))
  }

  function toggleSectionAttended(sectionId: string) {
    if (isLocked) return
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      if (s.visit) {
        return { ...s, visit: { ...s.visit, attended: !s.visit.attended } }
      }
      return { ...s, visit: { id: '', section_id: sectionId, date, attended: true, progress_note: null, trainer_feedback: null, created_at: '' } as SectionVisit }
    }))
  }

  function updateSectionCoachRating(sectionId: string, rating: number | null) {
    setSectionNotes(prev => ({ ...prev, [sectionId]: { ...(prev[sectionId] ?? { progress: '' }), coachRating: rating } }))
  }

  // Credits today's coin awards server-side and reports the server-confirmed
  // result to the caller (05.7-11, D-17). Split out from handleSubmit so a
  // retry after an award-fetch failure re-runs ONLY this step — the day's
  // rows (grades, room checks, activity logs…) are already persisted by then
  // and several of those writes are insert-only, not upsert, so re-running
  // them on retry would create duplicates.
  async function creditAwardAndFinish() {
    setSaveError(false)

    let prevXp: number | null = null
    try {
      const childBefore = await getChild(childId)
      prevXp = childBefore.xp
    } catch (e) {
      console.warn('[KidDayFillForm] could not read xp before award:', e)
    }

    let awardOk = false
    let creditedCoins = 0
    let hasStreak = false
    let appliedItems: AwardedItem[] = []

    try {
      const res = await fetch('/api/wallet/award', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, date }),
      })
      if (!res.ok) {
        console.warn('[KidDayFillForm] award failed:', res.status)
      } else {
        awardOk = true
        track('day_saved', { role: 'kid' })
        const data = await res.json().catch(() => ({}))
        const parsed = detectAward(data)
        creditedCoins = parsed.creditedCoins
        hasStreak = parsed.hasStreak
        appliedItems = Array.isArray(data?.appliedItems) ? data.appliedItems : []
        // Fire-and-forget: don't block save completion on push delivery
        import('@/app/actions/push-streaks').then(({ notifyStreakEvents }) => {
          notifyStreakEvents(childId, '', data?.streakEvents ?? { broken: [], records: [] }).catch(() => {})
        })
      }
    } catch (e) {
      console.warn('[KidDayFillForm] award request failed:', e)
    }

    if (!awardOk) {
      setSaveError(true)
      return
    }

    await checkAndAwardBadges(childId, date)

    let leveledUp = false
    if (prevXp !== null) {
      try {
        const childAfter = await getChild(childId)
        leveledUp = computeLevelUp(prevXp, childAfter.xp)
      } catch (e) {
        console.warn('[KidDayFillForm] could not read xp after award:', e)
      }
    }

    if (proofLocalUrl) URL.revokeObjectURL(proofLocalUrl)
    onSaved({ creditedCoins, hasStreak, leveledUp, appliedItems })
  }

  async function handleRetryAward() {
    if (saving) return
    setSaving(true)
    try {
      await creditAwardAndFinish()
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (isLocked || saving) return
    setSaving(true)
    setSaveError(false)

    try {
      // Dual-write (CONTEXT decision 3): every rendered task gets a room_checks
      // row; tasks with a legacy_key ALSO drive the matching days.room_* column
      // so the room_score trigger/room_ok/analytics/wallboard keep working.
      // Any legacy-mapped task not currently rendered (e.g. deactivated) writes
      // false rather than leaving the column untouched.
      const legacyDone: Record<RoomLegacyKey, boolean> = {
        bed: false, floor: false, desk: false, closet: false, trash: false,
      }
      roomTasks.forEach(task => {
        if (task.legacy_key) legacyDone[task.legacy_key] = roomChecked[task.id] ?? false
      })

      // Build saveDay params based on fillMode
      const dayParams: Parameters<typeof saveDay>[0] = {
        childId,
        date,
        filledBy: 'child',
        mood: mood ?? undefined,
        noteChild: noteChild.trim() || undefined,
      }

      dayParams.roomBed = legacyDone.bed
      dayParams.roomFloor = legacyDone.floor
      dayParams.roomDesk = legacyDone.desk
      dayParams.roomCloset = legacyDone.closet
      dayParams.roomTrash = legacyDone.trash

      // Upload room proof photo if captured
      let roomProofSignedUrl: string | undefined
      if (proofFile) {
        try {
          // Fetch family_id for the storage path
          const { data: childRow } = await supabase
            .from('children')
            .select('family_id')
            .eq('id', childId)
            .single()
          const familyId = childRow?.family_id ?? childId
          const compressed = await compressImage(proofFile)
          const path = `${familyId}/proof/${childId}/${date}.jpg`
          await uploadPhoto(compressed, path)
          roomProofSignedUrl = await getSignedPhotoUrl(path)
        } catch (err) {
          console.warn('[KidDayFillForm] proof upload failed (continuing without proof):', err)
        }
      }

      await saveDay({ ...dayParams, roomProofUrl: roomProofSignedUrl })

      // Dual-write (a): room_checks — one row per rendered task, done/not-done.
      if (roomTasks.length > 0) {
        await saveRoomChecks(childId, date, roomTasks.map(task => ({
          taskId: task.id,
          done: roomChecked[task.id] ?? false,
        })))
      }

      // Coin awards (room, activities, grades, sport, book, streak) are no
      // longer credited from the client. After all of today's rows are saved,
      // a single call to /api/wallet/award recomputes them server-side from the
      // saved data (idempotent — safe to call on every save). See below.

      // Save extra activities
      if (activities.length > 0) {
        const logs = activities.map(act => ({
          activityId: act.id,
          done: checkedActivities.has(act.id),
        }))
        await saveActivityLogs(childId, date, logs)
      }

      // Save grades — only new (unsaved) entries with a grade set
      if (dayType === 'school') {
        for (const [subject, entries] of Object.entries(kidGrades)) {
          const sub = subjects.find(s => s.name === subject)
          for (const entry of entries) {
            if (entry.saved || entry.grade === null) continue
            await saveSubjectGrade({
              childId,
              date,
              subject,
              subjectId: sub?.id,
              grade: entry.grade,
              note: entry.isDigital ? 'цифровое задание' : undefined,
            })
          }
        }
      }

      // Save home exercises
      for (const ex of exercises) {
        await saveHomeExercise(childId, date, ex.exercise_type_id, ex.quantity, undefined)
      }

      // Save section visits + award coach rating coins
      for (const section of sections) {
        if (section.visit) {
          const note = sectionNotes[section.id] ?? { progress: '', coachRating: null }
          // Persist the coach rating so /api/wallet/award can credit sport coins
          // server-side from the saved visit row.
          await markSectionVisit(section.id, date, section.visit.attended, note.progress || undefined, undefined, note.coachRating)
        }
      }

      // Save reading log
      if (readingActive && reading.bookTitle.trim()) {
        await saveReadingLog({
          child_id: childId,
          date,
          book_title: reading.bookTitle.trim(),
          pages_read: Number(reading.pagesRead) || 0,
          minutes_read: Number(reading.minutesRead) || 0,
          book_finished: reading.bookFinished,
          note: reading.note.trim(),
          // current_page added via migration
          ...(reading.currentPage ? { current_page: Number(reading.currentPage) } : {}),
        } as any)
      }

      // Save custom-block completions (Phase 5.6, flag-on only). Built-in
      // blocks already persist through the saves above (room_checks, grades,
      // activity logs, section visits, reading log, home exercises) — this
      // covers ONLY custom blocks (legacy_key null), writing ALL of them
      // (done true/false) so unchecking persists.
      if (dayBlocksEnabled) {
        const customBlocks = visibleBlocks.filter(b => !b.legacy_key)
        if (customBlocks.length > 0) {
          await saveDayBlockEntries(childId, date, customBlocks.map(b => ({
            blockId: b.id,
            done: customBlockDone[b.id] ?? false,
          })))
        }
      }

      triggerCoinFlyup(coinsPreview)

      // Credit all of today's coin awards server-side (idempotent). The server
      // recomputes amounts from the saved rows — grades, room, behavior, sport,
      // activities, book, streak bonus — so the client never grants coins.
      // It also updates the streak counts server-side (admin client) and
      // returns streakEvents — the client no longer writes streaks directly.
      // See creditAwardAndFinish — parses the response via detectAward and
      // hands the server-confirmed result (never coinsPreview) to onSaved.
      await creditAwardAndFinish()
    } catch (err) {
      console.error('KidDayFillForm submit error:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Day-blocks (Phase 5.6) — shared content bodies ──────────────────────
  // Flag-off renders these wrapped in a static BlockCard. Flag-on renders
  // the SAME bodies wrapped in a BlockCard driven by the assembled block's
  // own name/icon (D-06) — no inner content is duplicated between the two
  // branches. Room/activities/book/custom render through the decomposed
  // family-bank renderers in components/kid/day-blocks/ (05.7-04, D-09) —
  // toggle callbacks pass down unchanged; micro-tick, no confetti (D-18).
  const roomBody = (
    <RoomBlock
      tasks={roomTasks}
      checked={roomChecked}
      onToggle={toggleRoomTask}
      isLocked={isLocked}
      proofLocalUrl={proofLocalUrl}
      proofInputRef={proofInputRef}
      onProofCapture={handleProofCapture}
      onProofRetake={handleProofRetake}
    />
  )

  const extraActivitiesBody = (
    <ActivitiesBlock
      activities={activities}
      checked={checkedActivities}
      onToggle={toggleActivity}
      isLocked={isLocked}
    />
  )

  const gradesBody = (
    <>
      <div style={{ fontFamily: T.fBody, fontSize: 12, color: T.ink3, marginBottom: 10, lineHeight: 1.4 }}>
        <b style={{ color: T.coral }}>📱 Digital</b>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {subjects.map(sub => {
          const entries = kidGrades[sub.name] ?? []
          const gradeEntries = entries.filter(e => e.grade !== null)
          return (
            <div key={sub.id} style={{
              background: '#fff', borderRadius: 20, padding: 14,
              border: `1.5px solid ${T.line}`, boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: T.plumSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📝</div>
                <span style={{ flex: 1, fontFamily: T.fDisp, fontSize: 14, fontWeight: 800, color: T.ink }}>{sub.name}</span>
                {gradeEntries.length > 0 && (
                  <span style={{ padding: '2px 8px', borderRadius: 999, background: T.coralSoft, fontFamily: T.fNum, fontSize: 11, fontWeight: 800, color: T.coralDeep }}>
                    {t('kidFillForm.gradePill', { count: gradeEntries.length })}
                  </span>
                )}
              </div>
              {/* Grade picker for each unsaved entry */}
              {entries.map((entry, idx) => (
                <div key={idx}>
                  {!entry.saved && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                      {[2, 3, 4, 5].map(g => {
                        const colors: Record<number, string> = { 5: T.teal, 4: '#95E1B4', 3: T.sunDeep, 2: '#FF8FB1' }
                        const c = colors[g]
                        const on = entry.grade === g
                        return (
                          <button key={g} disabled={isLocked} onClick={() => setKidGrades(prev => ({ ...prev, [sub.name]: prev[sub.name].map((e, i) => i === idx ? { ...e, grade: e.grade === g ? null : g } : e) }))} style={{
                            width: 38, height: 38, borderRadius: 19, cursor: isLocked ? 'not-allowed' : 'pointer',
                            background: on ? c : '#fff', border: on ? `2px solid ${c}` : `1.5px solid ${T.line}`,
                            fontFamily: T.fDisp, fontSize: 16, fontWeight: 900, color: on ? '#fff' : T.ink, padding: 0,
                            boxShadow: on ? `0 3px 10px ${c}55` : 'none', transition: 'all 0.15s',
                          }}>{g}</button>
                        )
                      })}
                      <button disabled={isLocked} onClick={() => setKidGrades(prev => ({ ...prev, [sub.name]: prev[sub.name].map((e, i) => i === idx ? { ...e, isDigital: !e.isDigital } : e) }))} style={{
                        height: 30, padding: '0 10px', borderRadius: 15, border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
                        background: entry.isDigital ? T.coral : T.lineSoft,
                        color: entry.isDigital ? '#fff' : T.ink3,
                        fontFamily: T.fDisp, fontSize: 11, fontWeight: 800,
                      }}>📱 {language === 'en' ? 'Dig.' : 'Цифр'}</button>
                      {entries.filter(e => !e.saved).length > 1 && (
                        <button onClick={() => setKidGrades(prev => ({ ...prev, [sub.name]: prev[sub.name].filter((_, i) => i !== idx) }))} style={{
                          width: 26, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                          background: 'transparent', color: T.ink3, fontSize: 16, lineHeight: '1', padding: 0,
                        }}>×</button>
                      )}
                    </div>
                  )}
                  {entry.saved && entry.grade !== null && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: T.lineSoft, marginRight: 6, marginBottom: 4 }}>
                      <span style={{ fontFamily: T.fDisp, fontSize: 13, fontWeight: 900, color: entry.grade >= 4 ? T.tealDeep : entry.grade === 3 ? T.sunDeep : T.coral }}>{entry.grade}</span>
                      {entry.isDigital && <span style={{ fontFamily: T.fBody, fontSize: 10, color: T.ink3 }}>📱</span>}
                      <span style={{ fontFamily: T.fBody, fontSize: 10, color: T.teal, fontWeight: 700 }}>✓</span>
                    </div>
                  )}
                </div>
              ))}
              {!isLocked && (
                <button onClick={() => setKidGrades(prev => ({ ...prev, [sub.name]: [...(prev[sub.name] ?? []), { grade: null, isDigital: false, saved: false }] }))} style={{
                  height: 30, padding: '0 14px', borderRadius: 15, border: `1.5px dashed ${T.line}`,
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: T.fBody, fontSize: 12, color: T.coral, fontWeight: 700,
                }}>{t('kidFillForm.moreGrade')}</button>
              )}
            </div>
          )
        })}
      </div>
    </>
  )

  const exercisesBody = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {exerciseTypes.map(et => {
        const active = exercises.find(e => e.exercise_type_id === et.id)
        return (
          <div key={et.id} style={{
            background: '#fff', borderRadius: 20, padding: '12px 14px',
            border: active ? `2px solid ${T.teal}` : `1.5px solid ${T.line}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 12, background: active ? T.tealSoft : T.lineSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💪</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.fDisp, fontSize: 14, fontWeight: 800, color: T.ink }}>{et.name}</div>
                <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 600 }}>{et.unit}</div>
              </div>
              <button onClick={() => { if (!isLocked && active && (active.quantity ?? 0) > 0) updateExerciseQuantity(et.id, (active.quantity ?? 1) - 1) }} style={{
                width: 32, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer',
                background: T.lineSoft, fontSize: 18, fontWeight: 900, color: T.ink, padding: 0, lineHeight: '1',
              }}>−</button>
              <button onClick={() => {
                if (isLocked) return
                if (!active) {
                  toggleExercise(et.id)
                  setTimeout(() => updateExerciseQuantity(et.id, 1), 0)
                } else {
                  updateExerciseQuantity(et.id, (active.quantity ?? 0) + 1)
                }
              }} style={{
                width: 32, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer',
                background: T.coral, color: '#fff', fontSize: 18, fontWeight: 900, padding: 0, lineHeight: '1',
              }}>+</button>
              <div style={{
                minWidth: 52, height: 32, borderRadius: 16,
                background: active ? T.teal : T.lineSoft, color: active ? '#fff' : T.ink,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: T.fNum, fontSize: 14, fontWeight: 800, padding: '0 8px',
              }}>{active?.quantity ?? 0}</div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const sectionsBody = sections.length === 0 ? (
    <div style={{ textAlign: 'center', padding: '12px 0', fontFamily: T.fBody, fontSize: 13, color: T.ink3 }}>
      {t('kidFillForm.noSections')}
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sections.map(section => {
        const attended = section.visit?.attended ?? false
        const note = sectionNotes[section.id] ?? { progress: '', coachRating: null }
        return (
          <div key={section.id} style={{
            background: '#fff', borderRadius: 22, padding: 14,
            border: attended ? `2px solid ${T.coral}` : `1.5px solid ${T.line}`,
            boxShadow: attended ? `0 6px 18px ${T.coral}20` : '0 2px 8px rgba(0,0,0,0.03)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: T.coralSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏅</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.fDisp, fontSize: 15, fontWeight: 900, color: T.ink }}>{section.name}</div>
              </div>
              <button onClick={() => !isLocked && toggleSectionAttended(section.id)} style={{
                height: 36, padding: '0 14px', borderRadius: 18, border: 'none', cursor: isLocked ? 'not-allowed' : 'pointer',
                background: attended ? T.coral : T.lineSoft, color: attended ? '#fff' : T.ink,
                fontFamily: T.fDisp, fontSize: 12, fontWeight: 800,
              }}>{attended ? t('kidFillForm.attended') : t('kidFillForm.notAttended')}</button>
            </div>
            {attended && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 16, background: T.lineSoft, border: `1px solid ${T.line}` }}>
                <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.ink3, fontWeight: 700, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>{t('kidFillForm.coachRatingLabel')}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[1, 2, 3, 4, 5].map(s => {
                    const on = s <= (note.coachRating ?? 0)
                    return (
                      <button key={s} onClick={() => !isLocked && updateSectionCoachRating(section.id, note.coachRating === s ? null : s)} style={{
                        flex: 1, height: 38, borderRadius: 12, border: on ? 'none' : `1.5px solid ${T.line}`,
                        background: on ? T.coral : '#fff', cursor: isLocked ? 'not-allowed' : 'pointer',
                        fontSize: 20, padding: 0, transition: 'all 0.15s',
                      }}>{on ? '⭐' : '☆'}</button>
                    )
                  })}
                </div>
                {note.coachRating && (() => {
                  // WR-05: hint from per-family wallet_settings (fallbacks
                  // mirror SETTINGS_DEFAULTS), matching what the server credits.
                  const r = note.coachRating
                  const c = r === 5 ? (settings?.coins_per_coach_5 ?? 10)
                    : r === 4 ? (settings?.coins_per_coach_4 ?? 5)
                    : r === 3 ? (settings?.coins_per_coach_3 ?? 0)
                    : r === 2 ? (settings?.coins_per_coach_2 ?? -3)
                    : (settings?.coins_per_coach_1 ?? -10)
                  return (
                    <div style={{ fontFamily: T.fBody, fontSize: 11, color: T.coral, fontWeight: 700, marginTop: 6, textAlign: 'center' }}>
                      {c > 0 ? `+${c}🪙` : `${c}🪙`}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const readingBody = (
    <BookBlock
      reading={reading}
      setReading={setReading}
      readingActive={readingActive}
      setReadingActive={setReadingActive}
      isLocked={isLocked}
      requireReadingCheck={requireReadingCheck}
    />
  )

  // Flag-on: one BlockCard per assembled block, titled/iconed from the
  // block's own config (parent-editable — Plan 05). Built-in blocks
  // (legacy_key non-null) reuse the exact bodies above; 'behavior' has no
  // kid-side widget today (good-behavior has always been a parent-only
  // assessment — see DailyModal) so it renders nothing here, unchanged from
  // before this feature existed. Custom blocks render a generic toggle.
  function renderBuiltinBlock(block: DayBlock) {
    switch (block.legacy_key) {
      case 'room':
        return (
          <BlockCard key={block.id} title={block.name} icon={block.icon ?? '🏠'} sub={`${Object.values(roomChecked).filter(Boolean).length}/${roomTasks.length}`}>
            {roomBody}
          </BlockCard>
        )
      case 'activity':
        return activities.length > 0 ? (
          <BlockCard key={block.id} title={block.name} icon={block.icon ?? '⭐'}>
            {extraActivitiesBody}
          </BlockCard>
        ) : null
      case 'grade':
        return (dayType === 'school' && subjects.length > 0) ? (
          <BlockCard key={block.id} title={block.name} icon={block.icon ?? '📚'} sub={t('kidFillForm.schoolSub')}>
            {gradesBody}
          </BlockCard>
        ) : null
      case 'exercise':
        return exerciseTypes.length > 0 ? (
          <BlockCard key={block.id} title={block.name} icon={block.icon ?? '💪'} sub={t('kidFillForm.homeSub')}>
            {exercisesBody}
          </BlockCard>
        ) : null
      case 'sport':
        return (
          <BlockCard key={block.id} title={block.name} icon={block.icon ?? '🏆'} sub={t('kidFillForm.trainerSub')}>
            {sectionsBody}
          </BlockCard>
        )
      case 'book':
        return (
          <BlockCard key={block.id} title={block.name} icon={block.icon ?? '📖'} sub={t('kidFillForm.everyDay')}>
            {readingBody}
          </BlockCard>
        )
      case 'behavior':
      default:
        return null
    }
  }

  function renderCustomBlock(block: DayBlock) {
    return (
      <BlockCard key={block.id} title={block.name} icon={block.icon ?? '⭐'}>
        <CustomBlock
          block={block}
          done={customBlockDone[block.id] ?? false}
          onToggle={toggleCustomBlock}
          isLocked={isLocked}
        />
      </BlockCard>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: 130, position: 'relative' }}>
      {/* CoinFlyup keeps working */}
      <CoinFlyup flyups={flyups} />

      {/* ─── Hero: today's estimate (client preview only — never stamped, D-17) ─── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: paper.card,
          border: `1px solid ${paper.line}`,
          borderRadius: 16, padding: 16,
          display: 'flex', alignItems: 'baseline', gap: 8,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: base.fontBody, fontSize: 12, fontWeight: 600,
              color: paper.ink3, letterSpacing: 0.5, textTransform: 'uppercase',
            }}>{t('kidFillForm.coinsToday')}</div>
            <div style={{
              fontFamily: base.fontMono, fontVariantNumeric: 'tabular-nums',
              fontSize: 24, fontWeight: 800, color: paper.goldText, lineHeight: 1.15, marginTop: 4,
            }}>
              ≈ +<AnimatedNum value={coinsPreview} duration={500}/>
            </div>
          </div>
          {isLocked && (
            <div style={{
              padding: '4px 10px', borderRadius: 999, background: paper.lineSoft,
              color: paper.ink2, fontFamily: base.fontBody, fontSize: 11, fontWeight: 600,
            }}>{t('kidFillForm.locked')}</div>
          )}
        </div>
      </div>

      {/* ─── Mood (always shown — not part of the day-blocks model) ─── */}
      <BlockCard title={t('kidFillForm.moodSection')} icon="✨">
        <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between' }}>
          {MOOD_OPTIONS.map(m => {
            const on = mood === m.key
            return (
              <button key={m.key} onClick={() => !isLocked && setMood(prev => prev === m.key ? null : m.key)} disabled={isLocked} style={{
                flex: 1, minHeight: 64, borderRadius: 12, cursor: isLocked ? 'not-allowed' : 'pointer',
                background: paper.card,
                border: on ? `1.5px solid ${paper.accent}` : `1px solid ${paper.line}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              }}>
                <div style={{ fontSize: 24 }}>{m.emoji}</div>
                <div style={{ fontFamily: base.fontBody, fontSize: 10, fontWeight: 600, color: on ? paper.accent : paper.ink3 }}>{m.label}</div>
              </button>
            )
          })}
        </div>
      </BlockCard>

      {dayBlocksEnabled ? (
        // WR-02: flag-on is AUTHORITATIVE — even with zero visible blocks the
        // legacy form must NOT render, because the server's flag-on award path
        // (/api/wallet/award) credits nothing for hidden blocks; the legacy
        // form would promise coins that never arrive. Matches DailyModal,
        // which renders no block sections in the same state.
        visibleBlocks.length > 0 ? (
          <>
            {visibleBlocks.map(block => block.legacy_key ? renderBuiltinBlock(block) : renderCustomBlock(block))}
          </>
        ) : (
          <BlockCard title={t('kidFillForm.nothingTodaySection')} icon="🌤️">
            <div style={{ textAlign: 'center', padding: '12px 0', fontFamily: base.fontBody, fontSize: 14, fontWeight: 500, color: paper.ink3 }}>
              {t('kidFillForm.nothingToday')}
            </div>
          </BlockCard>
        )
      ) : (
        <>
      {/* ─── Room checklist (pre-5.6 parity, CR-01: rendered here since
           flag-on covers it via renderBuiltinBlock('room')) ─── */}
      <BlockCard title={t('kidFillForm.roomSection')} icon="🏠" sub={`${Object.values(roomChecked).filter(Boolean).length}/${roomTasks.length}`}>
        {roomBody}
      </BlockCard>

      {/* ─── Extra activities (same renderer as flag-on — 05.7-04 dedupe) ─── */}
      {activities.length > 0 && (
        <BlockCard title={t('kidFillForm.extraSection')} icon="⭐">
          {extraActivitiesBody}
        </BlockCard>
      )}

      {/* ─── Grades (same body as flag-on — 05.7-04 dedupe) ─── */}
      {dayType === 'school' && subjects.length > 0 && (
        <BlockCard title={t('kidFillForm.gradesSection')} icon="📚" sub={t('kidFillForm.schoolSub')}>
          {gradesBody}
        </BlockCard>
      )}

      {/* ─── Exercises (same body as flag-on — 05.7-04 dedupe) ─── */}
      {exerciseTypes.length > 0 && (
        <BlockCard title={t('kidFillForm.exercisesSection')} icon="💪" sub={t('kidFillForm.homeSub')}>
          {exercisesBody}
        </BlockCard>
      )}

      {/* ─── Clubs / Sections ─── */}
      <BlockCard title={t('kidFillForm.sectionsSection')} icon="🏆" sub={t('kidFillForm.trainerSub')}>
        {sectionsBody}
      </BlockCard>

      {/* ─── Reading (same renderer as flag-on — 05.7-04 dedupe) ─── */}
      <BlockCard title={t('kidFillForm.readingSection')} icon="📖" sub={t('kidFillForm.everyDay')}>
        {readingBody}
      </BlockCard>
        </>
      )}

      {/* ─── Save button (indigo primary CTA — accent = interactive) ─── */}
      <div style={{ padding: '24px 16px 0' }}>
        <div style={{ textAlign: 'center', fontFamily: base.fontBody, fontSize: 12, fontWeight: 500, color: paper.ink3, marginBottom: 8 }}>
          {t('kidFillForm.trustNote')}
        </div>
        {saveError && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '10px 14px', borderRadius: 12, marginBottom: 10,
            background: `${paper.dangerText}14`, border: `1.5px solid ${paper.dangerText}40`,
          }}>
            <span style={{ fontFamily: base.fontBody, fontSize: 13, fontWeight: 600, color: paper.dangerText }}>
              {t('kidDay.saveError')}
            </span>
            <button onClick={handleRetryAward} disabled={saving} style={{
              flexShrink: 0, minHeight: 32, padding: '0 14px', borderRadius: 10, border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer', background: paper.dangerText, color: '#fff',
              fontFamily: base.fontBody, fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1,
            }}>
              {t('kidDay.retryBtn')}
            </button>
          </div>
        )}
        {isLocked ? (
          <div style={{ textAlign: 'center', fontFamily: base.fontBody, fontSize: 14, fontWeight: 500, color: paper.ink3, padding: '16px 0' }}>{t('kidFillForm.dayLocked')}</div>
        ) : (
          <button onClick={handleSubmit} disabled={saving} style={{
            width: '100%', minHeight: 52, borderRadius: 14, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            background: paper.accent,
            color: '#fff', fontFamily: base.fontBody, fontSize: 16, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? (
              <>
                <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
                {t('kidFillForm.saving')}
              </>
            ) : (
              t('kidFillForm.saveBtn', { coins: coinsPreview })
            )}
          </button>
        )}
      </div>
    </div>
  )
}
