import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client with cookie-based session — works with RLS policies.
// Used by lib/api.ts, lib/wallet-api.ts, lib/flexible-api.ts, lib/expenses-api.ts
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
