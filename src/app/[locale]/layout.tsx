import type { Metadata } from 'next'
import '../globals.css'
import { Cairo, Inter, IBM_Plex_Sans_Arabic } from 'next/font/google'
import { CookieConsentBanner } from '@/components/ui/CookieConsentBanner'
import { NotificationCenter } from '@/components/ui/NotificationCenter'
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

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

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  weight: ['100', '200', '300', '400', '500', '600', '700'],
  subsets: ['arabic'],
  variable: '--font-ibm-plex-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BelloSuite - ERP Modulaire Tunisien',
  description: 'Système ERP modulaire pour les entreprises tunisiennes. Gérez votre stock, commerciaux, comptabilité et plus.',
  keywords: 'ERP, Tunisia, 企业管理, stock management, facturation',
}

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();
  
  const isRtl = locale === 'ar';

  return (
    <html lang={locale} dir={isRtl ? 'rtl' : 'ltr'} className={`${cairo.variable} ${inter.variable} ${ibmPlexArabic.variable} h-full`}>
      <body className={`h-full antialiased bg-zinc-50 text-zinc-900 ${isRtl ? 'font-arabic' : 'font-sans'}`}>
        <NextIntlClientProvider messages={messages}>
          {children}
          <CookieConsentBanner />
          <NotificationCenter />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
