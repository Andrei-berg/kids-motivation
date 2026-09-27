// lib/net/retryFetch.ts
// Wraps a `fetch` implementation so a response body that gets cut off mid-download
// (a flaky connection — e.g. through a VPN — dropping a Supabase REST response
// partway through) gets a silent retry instead of surfacing as a raw
// "SyntaxError: JSON Parse error: Expected '}'" / "Unterminated string" that the
// UI has no way to recover from (see vpn-required-fonts-bug-sept-2026 in memory
// for the incident this was found from).
//
// Only GET requests are retried — a write (POST/PATCH/DELETE) whose response
// got truncated may still have applied server-side, so re-sending it could
// double it up (insert twice, etc). For those we just hand back whatever came
// back; the caller's existing error handling still applies.

type FetchFn = (url: RequestInfo | URL, init?: RequestInit) => Promise<Response>

async function looksLikeCompleteJson(res: Response): Promise<boolean> {
  const type = res.headers.get('content-type') || ''
  if (!type.includes('json')) return true // not JSON — nothing to validate
  try {
    const text = await res.clone().text()
    if (!text) return true // e.g. 204 No Content
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

export function withRetryFetch(fetchFn: FetchFn, retries = 2, delayMs = 300): FetchFn {
  return async (url, init) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    const res = await fetchFn(url, init)
    if (method !== 'GET' || !res.ok) return res

    if (await looksLikeCompleteJson(res)) return res

    let lastRes = res
    for (let attempt = 1; attempt <= retries; attempt++) {
      await new Promise(r => setTimeout(r, delayMs * attempt))
      const retryRes = await fetchFn(url, init)
      if (!retryRes.ok || (await looksLikeCompleteJson(retryRes))) return retryRes
      lastRes = retryRes
    }
    return lastRes
  }
}
