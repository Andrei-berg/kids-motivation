# Phase 05.5 — Deferred Items

Out-of-scope discoveries logged during execution. Not fixed (scope boundary).

## From 05.5-02 (2026-07-13)

- `components/DailyModal.tsx.backup` is git-tracked and contains a stale 2-arg
  `updateStreaks(childId, date)` call. It is NOT type-checked (`.backup`
  extension, outside tsconfig's `**/*.tsx`), so it cannot break the build —
  but it is dead weight analogous to the deleted `DailyModal-old.tsx` and
  should be removed in a future cleanup.
