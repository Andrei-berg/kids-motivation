// lib/onboarding-api.ts
// Typed DB operations for the onboarding wizard and child join flow.
// Browser-safe: uses createClient() from lib/supabase/client.ts (no next/headers imports).
// Import in 'use client' components only.

import { createClient } from '@/lib/supabase/client'

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
    .upsert({ id: userId, onboarding_step: step, updated_at: new Date().toISOString() })
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
  family: { name: string }
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

  // Step 2: fetch parent's display_name to use in family_members
  const { data: profileRow } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle()

  const displayName = profileRow?.display_name ?? null

  // Step 3: insert parent as family member
  const { error: memberError } = await supabase
    .from('family_members')
    .insert({
      family_id: familyRow.id,
      user_id: userId,
      role: 'parent',
      display_name: displayName,
    })

  if (memberError) {
    throw new Error(`Failed to add parent to family: ${memberError.message}`)
  }

  // Step 4: advance parent's onboarding step
  await updateOnboardingStep(userId, 2)

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
  child: { displayName: string; birthYear?: number; avatarUrl?: string }
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
    .from('families')
    .select('id, name')
    .eq('invite_code', normalizedCode)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to look up family by code: ${error.message}`)
  }

  if (!data) return null

  return {
    familyId: data.id,
    name: data.name,
  }
}

// ---------------------------------------------------------------------------
// getFamilyChildren
// ---------------------------------------------------------------------------
// Fetches all family_members with role='child' for a given family.
// Used in the child join flow to show "Is this you?" profile list.

export async function getFamilyChildren(familyId: string): Promise<ChildProfile[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('family_members')
    .select('id, display_name, avatar_url')
    .eq('family_id', familyId)
    .eq('role', 'child')

  if (error) throw new Error(error.message)

  return (data || []).map((row) => ({
    memberId: row.id,
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

  // Update the pre-registered child row (user_id IS NULL) with the authenticated user's ID.
  // Requires family_members_claim_child RLS policy: UPDATE where user_id IS NULL → auth.uid().
  const { error: memberError } = await supabase
    .from('family_members')
    .update({ user_id: userId })
    .eq('id', child.memberId)
    .eq('family_id', familyId)

  if (memberError) {
    throw new Error(`Failed to join family as child: ${memberError.message}`)
  }

  // Mark onboarding complete for this child user
  await updateOnboardingStep(userId, 6)
}
