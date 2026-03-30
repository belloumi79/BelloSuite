import type { Metadata } from 'next'
import '../globals.css'

export const metadata: Metadata = {
  title: 'BelloSuite',
  description: 'ERP Modulaire Tunisien',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
