import { NextRequest, NextResponse } from 'next/server'
import { createSessionCookie } from '@/lib/session'
import { prisma } from '@/lib/db'
import { routing } from '@/i18n/routing'

export const runtime = 'nodejs'

const DEMO_EMAIL = 'admin@demo.tn'

export async function GET(req: NextRequest) {
  const requested = req.nextUrl.searchParams.get('locale') || routing.defaultLocale
  const locale = (routing.locales as readonly string[]).includes(requested) ? requested : routing.defaultLocale

  try {
    // Lecture seule : ne jamais créer de compte ici (le compte démo vient de prisma/seed-demo.ts).
    const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } })
    if (!user || !user.isActive || !user.tenantId) {
      return NextResponse.json(
        { error: 'Démo non disponible : lancez npm run db:seed-demo' },
        { status: 503 }
      )
    }

    await createSessionCookie({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      firstName: user.firstName || 'Démo',
    })

    return NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url))
  } catch (err) {
    console.error('Demo login error:', err)
    return NextResponse.json({ error: 'Erreur lors de la connexion démo' }, { status: 500 })
  }
}
