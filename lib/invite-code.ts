// lib/invite-code.ts
// Shared normalization for family invite codes.
//
// New codes are drawn from a 31-symbol alphabet that deliberately excludes the
// visually ambiguous glyphs 0 O 1 I L (see 2026-07-05-invite-code-entropy.sql),
// so folding O→0 and I/L→1 on user input is lossless for them. Legacy families
// still carry 6-char md5-hex codes (e.g. "0B83B3") which DO contain real 0/1 but
// never the letters O/I/L, so the same fold turns a mistyped letter into the
// right digit without ever changing a stored code. The DB-side counterpart is
// public.canonical_invite_code() in 2026-09-09-invite-code-tolerant-lookup.sql.

export const INVITE_CODE_LENGTH = 6

/**
 * Canonicalizes raw invite-code input for display in the entry fields:
 * uppercases, drops anything that isn't A–Z/0–9, folds the ambiguous letters
 * O/I/L onto 0/1/1, and caps the result at 6 characters.
 */
export function normalizeInviteInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .slice(0, INVITE_CODE_LENGTH)
}
