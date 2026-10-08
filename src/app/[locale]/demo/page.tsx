import { redirect } from 'next/navigation'

// /{locale}/demo : ouvre directement l'entreprise de démonstration, sans compte.
// La route API pose le cookie de session démo puis renvoie vers /{locale}/dashboard.
export default async function DemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/api/auth/demo?locale=${encodeURIComponent(locale)}`)
}
