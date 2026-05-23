// lib/supabase/client.ts
// Browser Supabase client — use in 'use client' components only.
// For Server Components and Route Handlers, use lib/supabase/server.ts
// For middleware.ts, use lib/supabase/middleware.ts

import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL!

// In the browser, route all Supabase traffic through /api/supabase so requests
// go Browser → Vercel → supabase.co instead of directly to supabase.co.
// On the server (SSR), Vercel has direct internet access — skip the proxy.
const proxyFetch = (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (typeof window === 'undefined') return fetch(url, init)
  const str = String(url)
  if (!str.startsWith(SUPABASE_ORIGIN)) return fetch(url, init)
  return fetch(str.replace(SUPABASE_ORIGIN, '/api/supabase'), init)
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: proxyFetch } }
  )
}
