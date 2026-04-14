export interface Sticker {
  id: string
  emoji: string
  label: string
}

export const STICKERS: Sticker[] = [
  { id: 'great', emoji: '🎉', label: 'Ура' },
  { id: 'fire', emoji: '🔥', label: 'Огонь' },
  { id: 'heart', emoji: '❤️', label: 'Любовь' },
  { id: 'trophy', emoji: '🏆', label: 'Победа' },
  { id: 'star', emoji: '⭐', label: 'Звезда' },
  { id: 'muscle', emoji: '💪', label: 'Молодец' },
  { id: 'laugh', emoji: '😂', label: 'Смешно' },
  { id: 'cry', emoji: '😢', label: 'Грустно' },
  { id: 'thumbsup', emoji: '👍', label: 'Отлично' },
  { id: 'clap', emoji: '👏', label: 'Аплодисменты' },
  { id: 'rocket', emoji: '🚀', label: 'Вперёд' },
  { id: 'cool', emoji: '😎', label: 'Крутой' },
]
