import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Bitter, Golos_Text, JetBrains_Mono } from 'next/font/google'
import { PushInit } from '@/components/PushInit'
import { InstallPrompt } from '@/components/InstallPrompt'
import { OfflineBanner } from '@/components/OfflineBanner'
import { PageTransition } from '@/components/PageTransition'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { LanguageProvider } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'FamilyCoins',
  description: 'FamilyCoins — a family motivation app where kids earn coins for real effort and spend them on real rewards.',
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

const bitter = Bitter({
  weight: ['600', '700', '800'],
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-display',
})

const golosText = Golos_Text({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-body',
})

const jetBrainsMono = JetBrains_Mono({
  weight: ['500', '600', '700'],
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-mono',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${bitter.variable} ${golosText.variable} ${jetBrainsMono.variable}`}>
      <body>
        <LanguageProvider>
          <AnalyticsProvider />
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
