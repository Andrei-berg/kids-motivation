'use client'

import { useState, FormEvent } from 'react'

interface SendBoxProps {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function SendBox({ onSend, disabled = false }: SendBoxProps) {
  const [text, setText] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 bg-white border-t border-gray-200"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Написать сообщение…"
        disabled={disabled}
        className="flex-1 rounded-full px-4 py-2 text-sm bg-gray-100 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="rounded-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Отправить
      </button>
    </form>
  )
}
