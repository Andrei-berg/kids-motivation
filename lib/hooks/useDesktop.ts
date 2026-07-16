'use client'

// Shared desktop-breakpoint hook (>=1024px), extracted verbatim from the
// duplicated implementations in app/kid/{wallet,achievements,shop,day}/page.tsx
// (phase 05.7-01). Kid screens should import this instead of re-declaring it.

import { useEffect, useState } from 'react'

export function useDesktop(): boolean {
  const [is, setIs] = useState(false)
  useEffect(() => {
    const check = () => setIs(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return is
}
