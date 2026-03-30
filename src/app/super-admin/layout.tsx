import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BelloSuite Admin',
  description: 'Tableau de bord administrateur BelloSuite',
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  )
}
