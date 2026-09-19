// tests/fill-style-validation.test.ts
// Phase 9.4, threat T-094-13 (Tampering: updateChildFillStyle(style) arrives
// over the wire from an untrusted client — the FillStyle TypeScript type is
// compile-time only). Proves the runtime whitelist check in
// app/kid/actions/fill-style.ts runs as the FIRST statement, before
// requireFamilyMember() and before createAdminClient() ever run — so a
// malformed value never reaches an authenticated service-role code path.
//
// Also locks in the Phase-9.3 -> Phase-9.4 regression: the scope guard that
// used to reject 'tile-sheet'/'story-stepper' is gone, and both now get PAST
// validation (proven by requireFamilyMember being called for them).

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireFamilyMember, mockCreateAdminClient, mockAuthorizeChildAction } = vi.hoisted(() => ({
  mockRequireFamilyMember: vi.fn(),
  mockCreateAdminClient: vi.fn(),
  mockAuthorizeChildAction: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    requireFamilyMember: () => mockRequireFamilyMember(),
    createAdminClient: () => mockCreateAdminClient(),
  }
})

vi.mock('@/app/api/wallet/_lib', () => ({
  authorizeChildAction: (...args: unknown[]) => mockAuthorizeChildAction(...args),
}))

import { updateChildFillStyle } from '@/app/kid/actions/fill-style'

describe('updateChildFillStyle validation boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // A benign resolved shape for the happy-path assertions — these tests
    // only care whether requireFamilyMember/createAdminClient were CALLED,
    // not the full downstream write, so the admin client stub never needs
    // to fully implement `.from().update().eq()`.
    mockRequireFamilyMember.mockResolvedValue({
      userId: 'u1', familyId: 'f1', role: 'child', childId: 'child-1',
    })
    mockCreateAdminClient.mockReturnValue({
      from: () => ({
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      }),
    })
    mockAuthorizeChildAction.mockResolvedValue(undefined)
  })

  it('rejects a non-whitelisted style', async () => {
    await expect(
      updateChildFillStyle('child-1', 'evil-style' as never),
    ).rejects.toThrow('Bad fill style')
  })

  it('never reaches auth or the service-role client for a bad style', async () => {
    await expect(
      updateChildFillStyle('child-1', 'evil-style' as never),
    ).rejects.toThrow()

    expect(mockRequireFamilyMember).not.toHaveBeenCalled()
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('lets tile-sheet past validation (Phase-9.3 guard regression)', async () => {
    await updateChildFillStyle('child-1', 'tile-sheet')
    expect(mockRequireFamilyMember).toHaveBeenCalled()
  })

  it('lets story-stepper past validation (Phase-9.3 guard regression)', async () => {
    await updateChildFillStyle('child-1', 'story-stepper')
    expect(mockRequireFamilyMember).toHaveBeenCalled()
  })

  it('still lets sticky-summary past validation', async () => {
    await updateChildFillStyle('child-1', 'sticky-summary')
    expect(mockRequireFamilyMember).toHaveBeenCalled()
  })
})
