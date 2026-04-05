'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/kid/day',          label: 'Мой день',   icon: '☀️',  activeColor: 'text-violet-500', activeBg: 'bg-violet-50'  },
  { href: '/kid/wallet',       label: 'Кошелёк',    icon: '💰',  activeColor: 'text-amber-500',  activeBg: 'bg-amber-50'   },
  { href: '/kid/achievements', label: 'Достижения', icon: '🏆',  activeColor: 'text-emerald-500', activeBg: 'bg-emerald-50' },
  { href: '/kid/shop',         label: 'Магазин',    icon: '🛍️',  activeColor: 'text-rose-500',   activeBg: 'bg-rose-50'    },
  { href: '/kid/leaderboard',  label: 'Рейтинг',    icon: '👑',  activeColor: 'text-cyan-500',   activeBg: 'bg-cyan-50'    },
]

export default function KidNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile bottom bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-gray-100 kid-nav-bottom"
        style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Kid navigation"
      >
        <div className="flex items-start justify-around pt-2" style={{ height: '64px' }}>
          {TABS.map(tab => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={tab.label}
                className="flex flex-col items-center gap-0.5 min-w-0 flex-1"
              >
                <span
                  className={`text-2xl rounded-xl p-1 transition-all ${
                    isActive ? tab.activeBg : ''
                  }`}
                >
                  {tab.icon}
                </span>
                <span
                  className={`text-xs font-medium transition-colors ${
                    isActive ? tab.activeColor : 'text-gray-400'
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop top bar */}
      <nav
        className="hidden md:flex items-center sticky top-0 z-50 bg-white border-b border-gray-100 px-6 h-16"
        aria-label="Kid navigation"
      >
        {/* Left: profile placeholder */}
        <span className="text-sm font-medium text-gray-600 mr-8 whitespace-nowrap">
          👦 Мой профиль
        </span>

        {/* Center: tabs */}
        <div className="flex items-center gap-1">
          {TABS.map(tab => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={tab.label}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? tab.activeColor : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
