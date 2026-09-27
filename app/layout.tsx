import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Bitter, Golos_Text, JetBrains_Mono, Rubik, Nunito, Inter } from 'next/font/google'
import { PushInit } from '@/components/PushInit'
import { InstallPrompt } from '@/components/InstallPrompt'
import { OfflineBanner } from '@/components/OfflineBanner'
import { PageTransition } from '@/components/PageTransition'
import { AnalyticsProvider } from '@/components/AnalyticsProvider'
import { LanguageProvider } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'FamilyCoins',
  description: 'FamilyCoins — семейное приложение мотивации: дети зарабатывают монеты за реальные усилия и тратят их на реальные награды.',
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
  themeColor: '#6C5CE7',
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

// Kid UI only (components/kid/design/kidTheme.ts). Friendly, high x-height,
// full Cyrillic — deliberately not the parent Bitter serif. Parent screens
// never reference these variables.
const kidDisplay = Rubik({
  weight: ['500', '600', '700', '800'],
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-kid-display',
})

const nunito = Nunito({
  weight: ['400', '600', '700', '800'],
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-kid-body',
})

// Legacy pages (app/globals.css `body` rule) used a runtime
// `@import url('https://fonts.googleapis.com/...Inter...')` — a render-blocking
// cross-origin request that hangs when fonts.googleapis.com is blocked/throttled
// (e.g. without a VPN from Russia). Self-hosting it via next/font removes that
// dependency entirely while keeping the same font.
const inter = Inter({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-legacy-body',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${bitter.variable} ${golosText.variable} ${jetBrainsMono.variable} ${kidDisplay.variable} ${nunito.variable} ${inter.variable}`}>
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
