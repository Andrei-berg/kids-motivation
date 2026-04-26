import './globals.css'
import type { Metadata, Viewport } from 'next'
import { PushInit } from '@/components/PushInit'

export const metadata: Metadata = {
  title: 'FamilyCoins — Мотивация для детей',
  description: 'Семейная система мотивации для детей',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FamilyCoins',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>
        <PushInit />
        {children}
      </body>
    </html>
  )
}
