'use client'

import { useEffect, useRef } from 'react'
import { STICKERS } from '@/lib/chat-stickers'
import type { Sticker } from '@/lib/chat-stickers'

interface StickerPickerProps {
  onSelect: (sticker: Sticker) => void
  onClose: () => void
}

export default function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid triggering on the button click that opened the picker
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full mb-2 left-0 z-50 bg-white rounded-xl shadow-xl p-3 border border-gray-100"
      style={{ width: '220px' }}
    >
      <div className="grid grid-cols-4 gap-1">
        {STICKERS.map((sticker) => (
          <button
            key={sticker.id}
            onClick={() => {
              onSelect(sticker)
              onClose()
            }}
            className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-3xl leading-none">{sticker.emoji}</span>
            <span className="text-xs text-gray-500 mt-1 truncate w-full text-center">
              {sticker.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
