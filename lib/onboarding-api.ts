// lib/onboarding-api.ts
// Typed DB operations for the onboarding wizard and child join flow.
// Browser-safe: uses createClient() from lib/supabase/client.ts (no next/headers imports).
// Import in 'use client' components only.

import { createClient } from '@/lib/supabase/client'
import { seedDefaultCategories } from '@/lib/categories-api'
import { getPresetValues, type PresetId } from '@/lib/presets'
import { updateWalletSettingsApi } from '@/lib/wallet-client'

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

/**
 * Generates a URL-safe text ID for a child row in the children table.
 * Result always matches /^[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$/ (3–20 chars,
 * no leading/trailing underscores).
 * NOT exported — internal use only.
 */
function generateChildId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 12)
  const base = slug || 'child'
  const suffix = Math.random().toString(36).slice(2, 6).padEnd(4, '0')
  return `${base}_${suffix}`.slice(0, 20)
}

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export interface ParentProfile {
  displayName: string
}

export interface FamilyCreateResult {
  familyId: string
  inviteCode: string
}

export interface ChildMember {
  memberId: string
  inviteCode: string
}

export interface FamilyLookup {
  familyId: string
  name: string
}

export interface ChildProfile {
  memberId: string
  displayName: string
  avatarUrl: string | null
  // The children.id (TEXT). Populated by getFamilyPinProfiles (kid PIN login),
  // null for the onboarding claim picker (getFamilyChildren) which doesn't need it.
  childId: string | null
}

// ---------------------------------------------------------------------------
// getOnboardingStep
// ---------------------------------------------------------------------------
// Returns the current onboarding step for a user (0 if profile row is missing).

export async function getOnboardingStep(userId: string): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_profiles')
    .select('onboarding_step')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to get onboarding step: ${error.message}`)
  }

  return data?.onboarding_step ?? 0
}

// ---------------------------------------------------------------------------
// updateOnboardingStep
// ---------------------------------------------------------------------------
// Sets user_profiles.onboarding_step = step for the given user.

export async function updateOnboardingStep(userId: string, step: number): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('user_profiles')
    .update({ onboarding_step: step, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to update onboarding step: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// saveParentProfile
// ---------------------------------------------------------------------------
// Upserts user_profiles.display_name and advances onboarding_step to 1.

export async function saveParentProfile(
  userId: string,
  profile: ParentProfile
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      display_name: profile.displayName,
      onboarding_step: 1,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    throw new Error(`Failed to save parent profile: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// createFamily
// ---------------------------------------------------------------------------
// 1. Inserts a new row into families (name).
// 2. Inserts the authenticated user as a 'parent' member of that family.
// 3. Advances parent's onboarding_step to 2.
// Returns { familyId, inviteCode }.

export async function createFamily(
  userId: string,
  family: { name: string; parentDisplayName?: string }
): Promise<FamilyCreateResult> {
  const supabase = createClient()

  // Step 1: create the family row
  const { data: familyRow, error: familyError } = await supabase
    .from('families')
    .insert({ name: family.name })
    .select('id, invite_code')
    .single()

  if (familyError || !familyRow) {
    throw new Error(`Failed to create family: ${familyError?.message ?? 'no data returned'}`)
  }

  // Step 2: resolve display_name — prefer explicit parentDisplayName param,
  // fall back to user_profiles.display_name if available.
  let displayName: string | null = family.parentDisplayName?.trim() || null
  if (!displayName) {
    const { data: profileRow } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
    displayName = profileRow?.display_name ?? null
  }

  // Step 3: upsert parent as family member.
  // UPSERT (not bare INSERT) — safe even if auth callback already pre-created
  // a family_members row for this user (e.g. on conflict for user_id+family_id).
  // Uses ignoreDuplicates:false so display_name is updated if row already exists.
  const { error: memberError } = await supabase
    .from('family_members')
    .upsert(
      {
        family_id: familyRow.id,
        user_id: userId,
        role: 'parent',
        display_name: displayName,
      },
      { onConflict: 'user_id,family_id', ignoreDuplicates: false }
    )

  if (memberError) {
    throw new Error(`Failed to add parent to family: ${memberError.message}`)
  }

  // Step 4: advance parent's onboarding step
  await updateOnboardingStep(userId, 2)

  // Step 5: seed default categories for the new family (Учёба, Дом, Спорт, Распорядок)
  try {
    await seedDefaultCategories(familyRow.id)
  } catch (seedError) {
    // Non-critical: default categories couldn't be seeded; user can add manually
    console.warn('seedDefaultCategories failed (non-fatal):', seedError)
  }

  // Step 5b: seed the 5 default room checklist tasks (Кровать/Пол/Стол/Шкаф/Мусор)
  try {
    const { error: roomSeedError } = await supabase.rpc('seed_default_room_tasks', {
      p_family_id: familyRow.id,
    })
    if (roomSeedError) throw roomSeedError
  } catch (seedError) {
    // Non-critical: family creation must still succeed if room-task seeding
    // hiccups — the migration's idempotent seed function can be re-invoked later.
    console.warn('seedDefaultRoomTasks failed (non-fatal):', seedError)
  }

  // Step 5c: seed the 7 built-in day blocks + 3 "previously-free" custom
  // defaults (Помощь по дому/Домашка на выходных/Доп. чтение)
  try {
    const { error: dayBlocksSeedError } = await supabase.rpc('seed_default_day_blocks', {
      p_family_id: familyRow.id,
    })
    if (dayBlocksSeedError) throw dayBlocksSeedError
  } catch (seedError) {
    // Non-critical: family creation must still succeed if day-blocks seeding
    // hiccups — the migration's idempotent seed function can be re-invoked later.
    console.warn('seedDefaultDayBlocks failed (non-fatal):', seedError)
  }

  return {
    familyId: familyRow.id,
    inviteCode: familyRow.invite_code,
  }
}

// ---------------------------------------------------------------------------
// addChildToFamily
// ---------------------------------------------------------------------------
// Inserts a child member into family_members with role='child'.
// Fetches the family's invite_code to return alongside the new member id.
// Advances the parent's onboarding_step to 3.
//
// NOTE: The child's user account does not exist yet at this point — the parent
// is creating a child profile. userId here is the PARENT's userId (for step tracking).

export async function addChildToFamily(
  familyId: string,
  parentUserId: string,
  child: { displayName: string; birthYear?: number; avatarUrl?: string },
  consentGiven?: boolean | null
): Promise<ChildMember> {
  const supabase = createClient()

  // Insert child member (no user_id yet — child hasn't registered)
  const { data: memberRow, error: memberError } = await supabase
    .from('family_members')
    .insert({
      family_id: familyId,
      user_id: null, // will be linked when child joins via invite code
      role: 'child',
      display_name: child.displayName,
      birth_year: child.birthYear ?? null,
      avatar_url: child.avatarUrl ?? null,
      consent_given: consentGiven ?? null,
    })
    .select('id')
    .single()

  if (memberError || !memberRow) {
    throw new Error(`Failed to add child to family: ${memberError?.message ?? 'no data returned'}`)
  }

  // Fetch the family invite_code
  const { data: familyRow, error: familyError } = await supabase
    .from('families')
    .select('invite_code')
    .eq('id', familyId)
    .single()

  if (familyError || !familyRow) {
    throw new Error(`Failed to fetch family invite code: ${familyError?.message ?? 'no data returned'}`)
  }

  // Advance parent's onboarding step
  await updateOnboardingStep(parentUserId, 3)

  return {
    memberId: memberRow.id,
    inviteCode: familyRow.invite_code,
  }
}

// ---------------------------------------------------------------------------
// lookupFamilyByCode
// ---------------------------------------------------------------------------
// Finds a family by invite_code (case-insensitive).
// Returns { familyId, name } or null if not found.

export async function lookupFamilyByCode(code: string): Promise<FamilyLookup | null> {
  const supabase = createClient()

  const normalizedCode = code.trim().toUpperCase()

  const { data, error } = await supabase
    .rpc('lookup_family_by_invite_code', { p_code: normalizedCode })

  if (error) {
    throw new Error(`Failed to look up family by code: ${error.message}`)
  }

  const row = data?.[0]
  if (!row) return null

  return {
    familyId: row.id,
    name: row.name,
  }
}

// ---------------------------------------------------------------------------
// getFamilyChildren
// ---------------------------------------------------------------------------
// Fetches all family_members with role='child' for a given family.
// Used in the child join flow to show "Is this you?" profile list.

export async function getFamilyChildren(familyId: string): Promise<ChildProfile[]> {
  const supabase = createClient()

  // Only return unlinked children (user_id IS NULL) — these are the profiles
  // a child can claim. Already-linked profiles belong to existing accounts.
  const { data, error } = await supabase
    .rpc('get_family_children', { p_family_id: familyId })

  if (error) throw new Error(error.message)

  return (data || []).map((row: { id: string; display_name: string | null; avatar_url: string | null }) => ({
    memberId: row.id,
    displayName: row.display_name || 'Ребёнок',
    avatarUrl: row.avatar_url,
    childId: null, // onboarding claim picker doesn't need child_id
  }))
}

// ---------------------------------------------------------------------------
// getFamilyPinProfiles
// ---------------------------------------------------------------------------
// Pre-auth picker for the /kid/login PIN flow. Unlike getFamilyChildren, this
// returns PIN-enabled profiles (linked or not) AND the child_id, so the login
// page can build the synthetic email without an (RLS-blocked) family_members read.

export async function getFamilyPinProfiles(familyId: string): Promise<ChildProfile[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('get_family_pin_profiles', { p_family_id: familyId })

  if (error) throw new Error(error.message)

  return (data || []).map((row: { member_id: string; child_id: string; display_name: string | null; avatar_url: string | null }) => ({
    memberId: row.member_id,
    childId: row.child_id,
    displayName: row.display_name || 'Ребёнок',
    avatarUrl: row.avatar_url,
  }))
}

// ---------------------------------------------------------------------------
// joinFamilyAsChild
// ---------------------------------------------------------------------------
// Links an authenticated child user to an existing family_members row
// (or inserts a new row if none exists for this child profile).
// Sets user_profiles.onboarding_step = 6 (complete) for the child user.

export async function joinFamilyAsChild(
  familyId: string,
  userId: string,
  child: { memberId: string; displayName: string }
): Promise<void> {
  const supabase = createClient()

  // claim_child_profile (SECURITY DEFINER):
  // - if user already has a row in this family → just marks onboarding complete
  // - otherwise → updates the pre-registered child row (user_id IS NULL) with auth.uid()
  const { error } = await supabase.rpc('claim_child_profile', {
    p_member_id: child.memberId,
    p_family_id: familyId,
  })

  if (error) {
    throw new Error(`Failed to join family as child: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// joinFamilyAsAdult
// ---------------------------------------------------------------------------
// Inserts an authenticated adult (parent or extended family) into family_members.
// If already a member (duplicate key), silently skips — treats as re-join.
// Sets user_profiles.onboarding_step = 6 (complete).

export async function joinFamilyAsAdult(
  familyId: string,
  userId: string,
  role: 'parent' | 'extended',
  displayName: string | null
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('family_members')
    .insert({
      family_id: familyId,
      user_id: userId,
      role,
      display_name: displayName,
    })

  // 23505 = unique_violation — user is already in this family, treat as success
  if (error && error.code !== '23505') {
    throw new Error(`Failed to join family: ${error.message}`)
  }

  await updateOnboardingStep(userId, 6)
}

// ---------------------------------------------------------------------------
// ChildInput / ChildCreateResult
// ---------------------------------------------------------------------------

export interface ChildInput {
  name: string
}

export interface ChildCreateResult {
  childId: string   // TEXT id in children table e.g. 'sofia_a1b2'
  memberId: string  // UUID id in family_members table
}

// ---------------------------------------------------------------------------
// createChildWithWallet
// ---------------------------------------------------------------------------
// Creates a child record in three tables atomically:
//   1. children (id=generatedSlug, name, family_id, active, xp, level, kid_fill_mode)
//   2. family_members (family_id, user_id=null, role='child', display_name, child_id)
//   3. wallets (child_id, family_id, coins=0, total_earned=0)
// Retries once on children id collision (23505 unique violation).

export async function createChildWithWallet(
  familyId: string,
  child: ChildInput
): Promise<ChildCreateResult> {
  const supabase = createClient()

  // --- Insert into children (with one retry on id collision) ---
  let childId = generateChildId(child.name)
  let childrenError: { code?: string; message: string } | null = null

  const { error: err1 } = await supabase
    .from('children')
    .insert({
      id: childId,
      name: child.name,
      family_id: familyId,
      active: true,
      xp: 0,
      level: 1,
      kid_fill_mode: 1,
    })
  childrenError = err1

  if (childrenError) {
    if (childrenError.code === '23505') {
      // Retry once with a fresh id
      childId = generateChildId(child.name)
      const { error: err2 } = await supabase
        .from('children')
        .insert({
          id: childId,
          name: child.name,
          family_id: familyId,
          active: true,
          xp: 0,
          level: 1,
          kid_fill_mode: 1,
        })
      if (err2) {
        throw new Error(`Failed to create child (retry): ${err2.message}`)
      }
    } else {
      throw new Error(`Failed to create child: ${childrenError.message}`)
    }
  }

  // --- Insert into family_members ---
  const { data: memberRow, error: memberError } = await supabase
    .from('family_members')
    .insert({
      family_id: familyId,
      user_id: null,
      role: 'child',
      display_name: child.name,
      child_id: childId,
    })
    .select('id')
    .single()

  if (memberError || !memberRow) {
    throw new Error(`Failed to add child to family_members: ${memberError?.message ?? 'no data returned'}`)
  }

  // --- Insert into wallets ---
  const { error: walletError } = await supabase
    .from('wallets')
    .insert({
      child_id: childId,
      family_id: familyId,
      coins: 0,
      total_earned: 0,
    })

  if (walletError) {
    throw new Error(`Failed to create wallet: ${walletError.message}`)
  }

  return {
    childId,
    memberId: memberRow.id,
  }
}

// ---------------------------------------------------------------------------
// completeOnboarding
// ---------------------------------------------------------------------------
// Writes the family's wallet_settings coin-rule preset (D-04). Resolves the
// preset's fixed value patch via getPresetValues(presetId) — the SAME lookup
// CoinsRulesTab's "Apply preset" flow uses (05.9-PATTERNS.md Pattern 1) — and
// writes it server-side through PATCH /api/wallet/settings (requireParent +
// service-role), since the money tables are RLS SELECT-only for clients
// (migration 04.4-03). The previous browser-client direct wallet_settings
// write (createClient() dot-from dot-upsert) was RLS-denied and blocked
// onboarding completion (05.9-RESEARCH.md Pitfall 3) — do NOT reintroduce
// a client-side wallet_settings write.
// Safe to call multiple times — the PATCH route upserts, so it's idempotent.

export async function completeOnboarding(
  familyId: string,
  presetId: PresetId
): Promise<void> {
  const patch = getPresetValues(presetId)

  try {
    await updateWalletSettingsApi(patch)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to complete onboarding (wallet_settings): ${message}`)
  }

  void familyId // familyId kept in signature for future per-family settings support; the PATCH route derives family from the authenticated parent's own membership (requireParent), never from a client-supplied id
}

// ---------------------------------------------------------------------------
// setChildPin
// ---------------------------------------------------------------------------
// Set or update a 4-6 digit PIN for a child, as an additional (not exclusive)
// login method — it never disturbs a real Google/email account already linked
// to the child; it only ever creates a synthetic bootstrap account when no
// account is linked yet at all. Calls /api/set-child-pin (service-role).
// Safe to call from client components.

export async function setChildPin(childId: string, pin: string): Promise<void> {
  const res = await fetch('/api/set-child-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childId, pin }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(body?.error || 'Failed to set PIN')
  }
}

// ---------------------------------------------------------------------------
// getUserDisplayName
// ---------------------------------------------------------------------------
// Returns the current user's display_name from user_profiles, or null.

export async function getUserDisplayName(userId: string): Promise<string | null> {
  const supabase = createClient()

  const { data } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle()

  return data?.display_name ?? null
}
