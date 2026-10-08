import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

/** L'onboarding n'est accessible qu'à un utilisateur connecté, non SUPER_ADMIN, sans entreprise. */
export default async function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await getSession()
  if (!session) redirect(`/${locale}/login`)
  if (session.role === 'SUPER_ADMIN') redirect(`/${locale}/super-admin`)
  if (session.tenantId) redirect(`/${locale}/dashboard`)
  return <>{children}</>
}
