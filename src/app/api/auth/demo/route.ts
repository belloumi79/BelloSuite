import { NextRequest, NextResponse } from 'next/server'
import { createSessionCookie } from '@/lib/session'
import { resolveIdentityFromDb } from '@/lib/user-identity'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    // Résoudre l'identité du user demo depuis la DB
    const identity = await resolveIdentityFromDb('admin@demo.tn')
    
    if (!identity || !identity.isActive) {
      return NextResponse.json({ error: 'Compte demo non disponible' }, { status: 404 })
    }

    const session = {
      id: 'demo-user-id',
      email: 'admin@demo.tn',
      role: 'ADMIN',
      tenantId: identity.tenantId,
      firstName: 'Demo',
    }

    // Créer le cookie de session
    await createSessionCookie(session)

    // Rediriger vers le dashboard (sans locale car middleware gère)
    const locale = req.nextUrl.pathname.split('/')[1] || 'fr'
    const redirectUrl = new URL(`/${locale}/dashboard`, req.url)
    
    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error('Demo login error:', err)
    return NextResponse.json({ error: 'Erreur lors de la connexion démo' }, { status: 500 })
  }
}