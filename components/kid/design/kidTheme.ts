// Kid UI design tokens — "Progress you can see".
//
// A bright activity companion, NOT the parent "family bank". Kid screens
// (`app/kid/*`, `components/kid/*`) source colour and type from here only —
// never from `lib/design/tokens` (`paper`/`base`), which stays parent-owned.
//
// components/kid/design/tokens.ts re-exports the legacy `T` shape mapped onto
// these values so any not-yet-migrated consumer keeps compiling during the
// redesign sweep. New code should import `K` from this file directly.

export const K = {
  // ── Accents — each one carries meaning, never decoration ──────────────────
  sky:      '#2F7FE4', // primary action, focus ring, selected state
  skyDeep:  '#1E63C4',
  skySoft:  '#E4EFFC',
  grape:    '#7A5AF0', // level / XP / achievements
  grapeDeep:'#5F3FD6',
  grapeSoft:'#ECE7FD',
  mint:     '#12B886', // done / earned / positive
  mintDeep: '#0E9E74',
  mintSoft: '#DCF5EC',
  mango:    '#FF9F2E', // coins, streak heat, weekly-boost meter
  mangoDeep:'#E07E00',
  mangoSoft:'#FFEED8',
  berry:    '#FF6B8A', // celebration / highlight
  berryDeep:'#E84C6E',
  berrySoft:'#FFE3EA',

  // ── Grounds ──────────────────────────────────────────────────────────────
  cream:    '#FFFDF7', // page ground
  card:     '#FFFFFF', // surfaces
  line:     '#E9ECF3',
  lineSoft: '#F2F4F9',

  // ── Text ─────────────────────────────────────────────────────────────────
  ink:      '#21314A',
  ink2:     '#54637E',
  ink3:     '#8A97AC',

  // ── Status (WCAG AA on cream/white for small text) ────────────────────────
  success:  '#0E9E74',
  warn:     '#C77A16',
  danger:   '#D84C5E',

  // ── Type ─────────────────────────────────────────────────────────────────
  fDisp: "var(--font-kid-display), 'Rubik', system-ui, sans-serif",
  fBody: "var(--font-kid-body), 'Nunito', system-ui, sans-serif",
  // Numbers ride the display face — no separate mono.
  fNum:  "var(--font-kid-display), 'Rubik', ui-monospace, monospace",
} as const

export type KidToken = keyof typeof K

// ── Back-compat shims ──────────────────────────────────────────────────────
// Kid files that still reference the parent token names (`paper.*` / `base.*`)
// can import these from HERE instead of '@/lib/design/tokens' to pick up the
// kid palette with zero body changes. New code should use `K` directly.
export const paper = {
  bg: K.cream, card: K.card,
  ink: K.ink, ink2: K.ink2, ink3: K.ink3,
  line: K.line, lineSoft: K.lineSoft,
  accent: K.sky,
  success: K.success, successText: K.success,
  warning: K.warn, warningText: K.warn,
  danger: K.danger, dangerText: K.danger,
  goldText: K.mangoDeep,
} as const

export const base = {
  fontDisplay: K.fDisp, fontBody: K.fBody, fontMono: K.fNum,
  indigo: K.grape, indigoDeep: K.grapeDeep, indigoSoft: K.grapeSoft,
  gold: K.mango, goldDeep: K.mangoDeep, goldSoft: K.mangoSoft,
  success: K.success, successDeep: K.mintDeep,
  warning: K.warn, danger: K.danger,
} as const
