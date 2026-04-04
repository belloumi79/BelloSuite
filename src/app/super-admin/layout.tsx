import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'BelloSuite Admin',
  description: 'Administration BelloSuite ERP',
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      {children}
    </div>
  )
}
