import './globals.css'
import type { Metadata, Viewport } from 'next'
import { PushInit } from '@/components/PushInit'
import { InstallPrompt } from '@/components/InstallPrompt'
import { OfflineBanner } from '@/components/OfflineBanner'
import { PageTransition } from '@/components/PageTransition'
import { LanguageProvider } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'FamilyCoins — Kids Motivation',
  description: 'Family motivation system for children',
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
    <html lang="en">
      <body>
        <LanguageProvider>
          <OfflineBanner />
          <PushInit />
          <InstallPrompt />
          <PageTransition>
            {children}
          </PageTransition>
        </LanguageProvider>
      </body>
    </html>
  )
}
