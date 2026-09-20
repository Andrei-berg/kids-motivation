// tests/boost-style-validation.test.ts
// Phase 9.5, threat T-095-01 (Tampering: updateChildBoostStyle(style) arrives
// over the wire from an untrusted client — the BoostStyle TypeScript type is
// compile-time only). Proves the runtime whitelist check in
// app/kid/actions/boost-style.ts runs as the FIRST statement, before
// requireFamilyMember() and before createAdminClient() ever run — so a
// malformed value never reaches an authenticated service-role code path.
// Locks in the whitelist-runs-before-auth ordering.

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

import { updateChildBoostStyle } from '@/app/kid/actions/boost-style'

describe('updateChildBoostStyle validation boundary', () => {
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
      updateChildBoostStyle('child-1', 'evil-style' as never),
    ).rejects.toThrow('Bad boost style')
  })

  it('never reaches auth or the service-role client for a bad style', async () => {
    await expect(
      updateChildBoostStyle('child-1', 'evil-style' as never),
    ).rejects.toThrow()

    expect(mockRequireFamilyMember).not.toHaveBeenCalled()
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('rejects a non-string argument before any auth work', async () => {
    await expect(
      updateChildBoostStyle('child-1', undefined as never),
    ).rejects.toThrow('Bad boost style')

    expect(mockRequireFamilyMember).not.toHaveBeenCalled()
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('rejects an object argument before any auth work', async () => {
    await expect(
      updateChildBoostStyle('child-1', { style: 'segmented-bar' } as never),
    ).rejects.toThrow('Bad boost style')

    expect(mockRequireFamilyMember).not.toHaveBeenCalled()
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('lets segmented-bar past validation', async () => {
    await updateChildBoostStyle('child-1', 'segmented-bar')
    expect(mockRequireFamilyMember).toHaveBeenCalled()
  })

  it('lets quest-checklist past validation', async () => {
    await updateChildBoostStyle('child-1', 'quest-checklist')
    expect(mockRequireFamilyMember).toHaveBeenCalled()
  })

  it('lets ring-badges past validation', async () => {
    await updateChildBoostStyle('child-1', 'ring-badges')
    expect(mockRequireFamilyMember).toHaveBeenCalled()
  })
})
