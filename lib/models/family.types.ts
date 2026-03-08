// Types for family/auth entities — from onboarding-api.ts and push-api.ts

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

export interface PushSubscriptionRecord {
  id: string
  family_id: string
  member_id: string
  subscription: Record<string, unknown>  // full PushSubscription JSON
  user_agent: string | null
  created_at: string
}
