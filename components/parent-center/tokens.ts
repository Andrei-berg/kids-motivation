import { base, daylight } from '@/lib/design/tokens'

// The Parent Center runs on the `daylight` (light) theme. Every key name below
// is unchanged from the previous dark-theme token set — only the values moved —
// so no screen needs to change to follow the reskin. `success`/`warning`/
// `danger` resolve to the WCAG AA text-safe variants because components use
// them directly as small-text foregrounds (Pill, Coin, Btn); their soft
// backgrounds are the raw tone at low alpha.
export const T = {
  bg0: daylight.bg,
  bg1: daylight.chrome,
  bg2: daylight.bg2,
  card: daylight.card,
  cardHi: daylight.cardHi,
  cardBorder: daylight.line,
  cardBorderHi: daylight.lineHi,
  text: daylight.ink,
  textDim: daylight.ink2,
  muted: daylight.muted,
  faint: daylight.ink3,
  indigo: daylight.accent,
  indigoHi: daylight.accentHi,
  indigoSoft: 'rgba(91,75,212,0.10)',
  cyan: daylight.accent,
  cyanSoft: 'rgba(91,75,212,0.10)',
  success: daylight.successText,
  successSoft: 'rgba(46,158,119,0.13)',
  warning: daylight.warningText,
  warningSoft: 'rgba(224,122,46,0.14)',
  danger: daylight.dangerText,
  dangerSoft: 'rgba(217,85,99,0.13)',
  r: 12,
  rM: 14,
  rL: 16,
  rXL: 20,
  rPill: 999,
  fHead: base.fontDisplay,
  fBody: base.fontBody,
  fMono: base.fontMono,
} as const

export const CHILD_ACCENTS = ['#6C5CE7', '#2E9E77', '#D9548A', '#3C86C6', '#B06AC6']
