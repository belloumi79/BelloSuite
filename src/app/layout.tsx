import type { Metadata } from 'next'
import './globals.css'
import { Cairo, Inter } from 'next/font/google'
import { CookieConsentBanner } from '@/components/ui/CookieConsentBanner'
import { NotificationCenter } from '@/components/ui/NotificationCenter'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BelloSuite - ERP Modulaire Tunisien',
  description: 'Système ERP modulaire pour les entreprises tunisiennes. Gérez votre stock, commerciaux, comptabilité et plus.',
  keywords: 'ERP, Tunisia,企业管理, stock management, facturation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" dir="ltr" className={`${cairo.variable} ${inter.variable}`}>
      <body className="font-sans antialiased bg-zinc-950 text-zinc-100">
        {children}
        <CookieConsentBanner />
        <NotificationCenter />
      </body>
    </html>
  )
}
