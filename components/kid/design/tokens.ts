import { base, paper } from '@/lib/design/tokens'

export const T = {
  // Brand
  coral:     base.indigo,
  coralDeep: base.indigoDeep,
  coralSoft: base.indigoSoft,
  teal:      base.success,
  tealDeep:  base.successDeep,
  tealSoft:  '#D7EFE5',
  sun:       base.gold,
  sunDeep:   base.goldDeep,
  sunSoft:   base.goldSoft,
  // Support
  plum:     base.indigo,
  plumSoft: base.indigoSoft,
  pink:     '#C48CA8',
  pinkSoft: '#F0E2EA',
  mint:     '#9CC7B3',
  // Neutrals
  ink:      paper.ink,
  ink2:     paper.ink2,
  ink3:     paper.ink3,
  line:     paper.line,
  lineSoft: paper.lineSoft,
  bg:       paper.bg,
  card:     paper.card,
  // Status
  success: paper.success,
  warn:    base.warning,
  // Fonts
  fDisp: base.fontDisplay,
  fBody: base.fontBody,
  fNum:  base.fontMono,
} as const
