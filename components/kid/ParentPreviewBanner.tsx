'use client'

import { useRouter } from 'next/navigation'

export default function ParentPreviewBanner() {
  const router = useRouter()

  function exitPreview() {
    document.cookie = 'kid_preview=; path=/; max-age=0'
    router.push('/parent/dashboard')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-indigo-600 text-white text-sm flex items-center justify-between px-4 py-2">
      <span>👁 Просмотр от имени ребёнка</span>
      <button
        onClick={exitPreview}
        className="bg-white text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-indigo-50 transition-colors"
      >
        Выйти из просмотра
      </button>
    </div>
  )
}
