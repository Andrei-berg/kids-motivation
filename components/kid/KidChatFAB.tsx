'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { T } from './design/tokens'

export default function KidChatFAB() {
  const pathname = usePathname()
  // Don't show on the chat page itself
  if (pathname === '/kid/chat') return null

  return (
    <Link href="/kid/chat" style={{
      position: 'fixed', right: 16, bottom: 90, zIndex: 35,
      width: 56, height: 56, borderRadius: 28,
      background: `linear-gradient(135deg, ${T.coral}, #FF9547)`,
      boxShadow: `0 8px 22px ${T.coral}66, 0 2px 6px rgba(0,0,0,0.1)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      textDecoration: 'none',
    }} className="md:hidden" aria-label="Семейный чат">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M4 6a3 3 0 013-3h10a3 3 0 013 3v8a3 3 0 01-3 3h-4l-4 4v-4H7a3 3 0 01-3-3V6z"
          fill="#fff" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"/>
        <circle cx="9" cy="10" r="1.2" fill={T.coral}/>
        <circle cx="12" cy="10" r="1.2" fill={T.coral}/>
        <circle cx="15" cy="10" r="1.2" fill={T.coral}/>
      </svg>
    </Link>
  )
}
