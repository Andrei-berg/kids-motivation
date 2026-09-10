// Resolves a child's avatar into props the <Avatar> atom can render directly.
//
// Precedence: an uploaded onboarding photo (`avatar_url`) always wins; then the
// child's chosen kind (`avatar_kind` + `avatar_config`); finally the legacy
// single `emoji` column, then a default.

import { K } from '@/components/kid/design/kidTheme'
import type { AvatarAccessory } from '@/components/kid/design/atoms'

export type AvatarKind = 'emoji' | 'character'

export interface EmojiAvatarConfig {
  emoji: string
  bg?: string
}

export interface CharacterAvatarConfig {
  skin?: string
  hair?: string
  hairColor?: string
  shirt?: string
  accessory?: AvatarAccessory
}

export type AvatarConfig = EmojiAvatarConfig | CharacterAvatarConfig

export interface ChildAvatarFields {
  emoji?: string | null
  avatar_url?: string | null
  avatar_kind?: AvatarKind | null
  avatar_config?: AvatarConfig | null
}

export interface ResolvedAvatar {
  url?: string | null
  emoji?: string | null
  bg?: string
  skin?: string
  hair?: string
  hairColor?: string
  shirt?: string
  accessory?: AvatarAccessory
}

export const DEFAULT_CHARACTER: Required<Omit<CharacterAvatarConfig, 'accessory'>> & { accessory: AvatarAccessory } = {
  skin: '#F5C9A1',
  hair: 'short',
  hairColor: '#2B1810',
  shirt: K.sky,
  accessory: 'none',
}

export function resolveAvatar(child: ChildAvatarFields | null | undefined): ResolvedAvatar {
  if (!child) return { emoji: '🙂', bg: K.skySoft }

  if (child.avatar_url) return { url: child.avatar_url }

  if (child.avatar_kind === 'character') {
    const c = (child.avatar_config ?? {}) as CharacterAvatarConfig
    return {
      skin: c.skin ?? DEFAULT_CHARACTER.skin,
      hair: c.hair ?? DEFAULT_CHARACTER.hair,
      hairColor: c.hairColor ?? DEFAULT_CHARACTER.hairColor,
      shirt: c.shirt ?? DEFAULT_CHARACTER.shirt,
      accessory: c.accessory ?? DEFAULT_CHARACTER.accessory,
    }
  }

  if (child.avatar_kind === 'emoji') {
    const c = (child.avatar_config ?? {}) as EmojiAvatarConfig
    return { emoji: c.emoji || child.emoji || '🙂', bg: c.bg || K.skySoft }
  }

  // Legacy: no kind chosen yet — fall back to the single emoji column.
  return { emoji: child.emoji || '🙂', bg: K.skySoft }
}
