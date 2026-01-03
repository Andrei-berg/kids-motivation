import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Clean MAX v4 - Kids Motivation',
  description: 'Система мотивации детей для Адама и Алима',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
