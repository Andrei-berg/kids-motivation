// Single source of design truth for the "family bank" design system.
// Both components/kid/design/tokens.ts and components/parent-center/tokens.ts
// re-export their existing `T` (and CHILD_ACCENTS) keys with values sourced
// from here. Do NOT introduce a fourth theme or a raw hex outside this file —
// consumers must only ever see the already-existing key names.

export const base = {
  indigo: '#6C5CE7',
  indigoDeep: '#5B4BD4',
  indigoSoft: '#E9E5FB',
  gold: '#E9A83C',
  goldDeep: '#C6871E',
  goldSoft: '#FBEFD6',
  success: '#2E9E77',
  successDeep: '#24805F',
  warning: '#E07A2E',
  danger: '#D95563',
  fontDisplay: "var(--font-display), 'Bitter', Georgia, serif",
  fontBody: "var(--font-body), 'Golos Text', system-ui, sans-serif",
  fontMono: "var(--font-mono), 'JetBrains Mono', ui-monospace, monospace",
} as const

// paper — the kid (light) theme ground colors.
export const paper = {
  bg: '#FAF3E9',
  card: '#FFFFFF',
  ink: '#241E38',
  ink2: '#4A4363',
  ink3: '#837C99',
  line: '#EBE2D2',
  lineSoft: '#F3ECDF',
  accent: '#5B4BD4',
  goldText: '#9C6B10',
  success: '#2E9E77',
  warning: '#E07A2E',
  danger: '#D95563',
  // Text-safe tone variants (mirrors goldText): darkened for WCAG AA ≥4.5:1 as
  // small-text foregrounds on paper grounds — including the 14%-alpha soft-chip
  // surfaces StatusChip uses. Computed 2026-07-07 (WCAG 2.x relative luminance):
  //   successText #1D7355 → 5.78 on #FFFFFF, 5.24 on #FAF3E9, 4.96/4.54 on 14% chips
  //   warningText #A05111 → 5.71 on #FFFFFF, 5.18 on #FAF3E9, 4.95/4.54 on 14% chips
  //   dangerText  #B33846 → 5.88 on #FFFFFF, 5.34 on #FAF3E9, 4.95/4.54 on 14% chips
  // (raw success/warning/danger above fail AA on white: 3.35/3.00/3.87 — keep them
  //  for fills/borders only, never small text.) The ink theme's success/warning/
  // danger are already on-dark-legible (≥6.4:1 on all ink grounds) and serve as
  // its text-safe set.
  successText: '#1D7355',
  warningText: '#A05111',
  dangerText: '#B33846',
} as const

// ink — the parent (dark) theme ground colors.
// Lightened 2026-07-23 per user feedback (2026-07-21 checkpoint: theme read as
// too dark/gloomy, text hard to read). Same hue family, raised lightness across
// all grounds + muted text; contrast re-checked against text/textDim/muted (all
// ≥4.8:1 on the lightest surface, cardHi).
export const ink = {
  bg: '#2A2244',
  bg2: '#322B50',
  card: '#322B50',
  cardHi: '#35305A',
  text: '#EFEBFA',
  textDim: '#C9C3DE',
  muted: '#A4A0BB',
  accent: '#8B7BF5',
  goldText: '#F0BE6A',
  success: '#3FBF92',
  warning: '#E8934A',
  danger: '#FF8A96',
} as const
