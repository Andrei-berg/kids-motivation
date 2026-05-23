import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// In the browser, route all Supabase traffic through /api/supabase so requests
// go Browser → Vercel → supabase.co instead of directly to supabase.co.
// On the server (SSR), Vercel has direct internet access — skip the proxy.
const proxyFetch = (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  if (typeof window === 'undefined') return fetch(url, init)
  const str = String(url)
  if (!str.startsWith(supabaseUrl)) return fetch(url, init)
  return fetch(str.replace(supabaseUrl, '/api/supabase'), init)
}

// Browser client with cookie-based session — works with RLS policies.
// Used by lib/repositories/, lib/services/, lib/vacation-api.ts, etc.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: proxyFetch },
})
