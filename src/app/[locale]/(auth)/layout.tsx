import type { Metadata } from 'next'
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher'

export const metadata: Metadata = {
  title: 'BelloSuite - Auth',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 relative">
      {/* Choix de la langue aussi sur les pages de connexion / inscription */}
      <div className="absolute top-4 end-4 z-50">
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  )
}
