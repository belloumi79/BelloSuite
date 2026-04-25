import { redirect } from '@/i18n/routing'
import { getSession } from '@/lib/session'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) redirect('/fr/login')
  if (session.role !== 'SUPER_ADMIN') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-zinc-950">
      {children}
    </div>
  )
}