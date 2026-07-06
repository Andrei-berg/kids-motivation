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
} as const

// ink — the parent (dark) theme ground colors.
export const ink = {
  bg: '#141021',
  bg2: '#1D1830',
  card: '#1D1830',
  cardHi: '#232040',
  text: '#EFEBFA',
  textDim: '#C9C3DE',
  muted: '#8F89AB',
  accent: '#8B7BF5',
  goldText: '#F0BE6A',
  success: '#3FBF92',
  warning: '#E8934A',
  danger: '#FF8A96',
} as const
