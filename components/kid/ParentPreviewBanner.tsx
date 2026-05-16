'use client'

import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n'

export default function ParentPreviewBanner() {
  const t = useT()
  const router = useRouter()

  function exitPreview() {
    document.cookie = 'kid_preview=; path=/; max-age=0'
    router.push('/parent/dashboard')
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-indigo-600 text-white text-sm flex items-center justify-between px-4 py-2">
      <span>👁 {t('parentPreview.banner')}</span>
      <button
        onClick={exitPreview}
        className="bg-white text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full hover:bg-indigo-50 transition-colors"
      >
        {t('parentPreview.exitButton')}
      </button>
    </div>
  )
}
