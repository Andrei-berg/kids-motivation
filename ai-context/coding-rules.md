# Coding Rules

## Forbidden
- `localStorage.getItem('v4_selected_kid')` or any hardcoded child key
- `'adam'` or `'alim'` as string literals in TypeScript
- `import { supabase } from '@/lib/supabase'` in new files
- `window.location.reload()` in NavBar

## Required Patterns
```ts
// Global state
const { activeMemberId, familyId } = useAppStore()

// Supabase (new files)
const supabase = createClient()  // from lib/supabase/client.ts

// API calls — pass familyId explicitly
await getCategories(familyId)
await getScheduleItems(familyId, activeMemberId)
```

## File Rules
- All pages: `'use client'` at top
- NavBar: inside page, not layout
- lib/models/ — types only, no supabase imports
- lib/repositories/ — supabase queries, import types from models/
- lib/services/ — business logic, import from repositories/

## No Hardcodes
- Coin rules: read from `wallet_settings` table, not from inline constants
- Family members: query from DB, not from store
- Dates: use `normalizeDate()` from `@/utils/helpers`
