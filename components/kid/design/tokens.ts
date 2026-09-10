// Legacy `T` shape for kid components — now sourced from the new kid palette
// (components/kid/design/kidTheme.ts), NOT the parent "family bank" tokens.
// Kept so not-yet-migrated consumers keep compiling during the redesign sweep;
// new code should import `K` from './kidTheme' directly.

import { K } from './kidTheme'

export { K } from './kidTheme'

export const T = {
  // Brand / primary action (was indigo → now sky)
  coral:     K.sky,
  coralDeep: K.skyDeep,
  coralSoft: K.skySoft,
  // "done / earned" (was teal → now mint)
  teal:      K.mint,
  tealDeep:  K.mintDeep,
  tealSoft:  K.mintSoft,
  // Coins / heat (was sun → now mango)
  sun:       K.mango,
  sunDeep:   K.mangoDeep,
  sunSoft:   K.mangoSoft,
  // Level / XP (was plum → now grape)
  plum:     K.grape,
  plumSoft: K.grapeSoft,
  // Highlight (was pink → now berry)
  pink:     K.berry,
  pinkSoft: K.berrySoft,
  mint:     K.mint,
  // Neutrals
  ink:      K.ink,
  ink2:     K.ink2,
  ink3:     K.ink3,
  line:     K.line,
  lineSoft: K.lineSoft,
  bg:       K.cream,
  card:     K.card,
  // Status
  success: K.success,
  warn:    K.warn,
  // Fonts
  fDisp: K.fDisp,
  fBody: K.fBody,
  fNum:  K.fNum,
} as const
