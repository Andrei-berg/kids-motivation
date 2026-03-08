# API Rules

## Calling lib/ Functions

### New multi-tenant API (Phase 1.3+)
```ts
// Always pass familyId explicitly — never read from global store inside lib/
import { getCategories } from '@/lib/categories-api'
const categories = await getCategories(familyId)  // ✓

// Use activeMemberId (UUID) not childId (TEXT)
import { getScheduleItems } from '@/lib/schedule-api'
const items = await getScheduleItems(familyId, activeMemberId)  // ✓
```

### Legacy API (api.ts, wallet-api.ts, expenses-api.ts)
```ts
// Uses TEXT child IDs — still works, backward compat
import { saveDay } from '@/lib/api'
await saveDay({ childId: 'adam', date: '2026-03-08', ... })  // legacy
```

## Supabase Client Rules
```ts
// In lib/repositories/ or lib/services/ (new files): create per call
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// In legacy files (api.ts, wallet-api.ts, etc.): use singleton
import { supabase } from '@/lib/supabase'
```

## activeMemberId vs childId

| | activeMemberId | childId |
|---|---|---|
| Type | UUID string | TEXT ('adam'/'alim') |
| Table | family_members.id | children.id |
| New code | ✓ Use this | ✗ Never |
| Legacy code | ✗ Doesn't exist | ✓ Still used |

## Store Access Pattern
```ts
// In React components only (not in lib/ files)
const { activeMemberId, familyId } = useAppStore()

// Pass down as props or function args to lib/ calls
```

## Error Handling
```ts
// Supabase pattern
const { data, error } = await supabase.from('table').select()
if (error) throw new Error(`functionName: ${error.message}`)
return data ?? []
```

## DailyModal Save Pattern
```ts
await Promise.all([
  saveDay({ childId, date, ... }),
  saveSubjectGrade({ childId, date, ... }),
  saveHomeSport({ childId, date, ... }),
])
await updateStreaks(childId, date)
await checkAndAwardBadges(childId, date)
```
