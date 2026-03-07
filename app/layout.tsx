import './globals.css'
import type { Metadata } from 'next'
import { PushInit } from '@/components/PushInit'

export const metadata: Metadata = {
  title: 'Clean MAX v4.2 - Kids Motivation',
  description: 'Система мотивации детей - Silicon Valley Edition',
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
