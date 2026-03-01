// lib/supabase/client.ts
// Browser Supabase client — use in 'use client' components only.
// For Server Components and Route Handlers, use lib/supabase/server.ts
// For middleware.ts, use lib/supabase/middleware.ts

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
