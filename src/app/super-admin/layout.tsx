import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'BelloSuite Admin',
  description: 'Administration BelloSuite ERP',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
