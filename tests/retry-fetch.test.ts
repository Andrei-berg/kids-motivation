import { describe, it, expect, vi } from 'vitest'
import { withRetryFetch } from '@/lib/net/retryFetch'

// Regression test for the incident where a flaky connection (e.g. through a
// VPN) truncated a Supabase REST response mid-download, surfacing as
// "SyntaxError: JSON Parse error: Expected '}'" with no way for the UI to
// recover. withRetryFetch validates the body before handing it back and
// silently retries GETs — see vpn-required-fonts-bug-sept-2026 in memory.

function jsonResponse(body: string) {
  return new Response(body, { headers: { 'content-type': 'application/json' } })
}

describe('withRetryFetch', () => {
  it('passes through a healthy GET JSON response untouched', async () => {
    const inner = vi.fn().mockResolvedValue(jsonResponse('{"ok":true}'))
    const wrapped = withRetryFetch(inner)
    const res = await wrapped('https://x', { method: 'GET' })
    expect(await res.json()).toEqual({ ok: true })
    expect(inner).toHaveBeenCalledTimes(1)
  })

  it('retries a GET whose body is truncated JSON, and returns the good retry', async () => {
    const inner = vi.fn()
      .mockResolvedValueOnce(jsonResponse('{"ok":tr')) // truncated mid-stream
      .mockResolvedValueOnce(jsonResponse('{"ok":true}'))
    const wrapped = withRetryFetch(inner, 2, 1)
    const res = await wrapped('https://x', { method: 'GET' })
    expect(await res.json()).toEqual({ ok: true })
    expect(inner).toHaveBeenCalledTimes(2)
  })

  it('gives up and returns the last bad response after exhausting retries', async () => {
    const inner = vi.fn().mockResolvedValue(jsonResponse('{"ok":tr'))
    const wrapped = withRetryFetch(inner, 2, 1)
    const res = await wrapped('https://x', { method: 'GET' })
    await expect(res.clone().json()).rejects.toThrow()
    expect(inner).toHaveBeenCalledTimes(3) // initial attempt + 2 retries
  })

  it('never retries a non-GET request, even if its body looks truncated', async () => {
    // A write's response getting cut off doesn't mean the write didn't apply —
    // resending it could double it up (e.g. insert a section twice).
    const inner = vi.fn().mockResolvedValue(jsonResponse('{"ok":tr'))
    const wrapped = withRetryFetch(inner, 2, 1)
    await wrapped('https://x', { method: 'POST' })
    expect(inner).toHaveBeenCalledTimes(1)
  })

  it('leaves a non-JSON response alone', async () => {
    const inner = vi.fn().mockResolvedValue(new Response('plain text', { headers: { 'content-type': 'text/plain' } }))
    const wrapped = withRetryFetch(inner, 2, 1)
    await wrapped('https://x', { method: 'GET' })
    expect(inner).toHaveBeenCalledTimes(1)
  })
})
