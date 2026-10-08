/**
 * Mot de passe oublié → Supabase Auth (resetPasswordForEmail). Plus aucun jeton maison ni écriture
 * de User.password : le mot de passe est géré uniquement par Supabase Auth.
 *
 * Le lien envoyé par Supabase redirige vers /{locale}/reset-password (URL à autoriser dans
 * Supabase → Authentication → URL Configuration → Redirect URLs), où la page appelle
 * supabase.auth.updateUser({ password }).
 *
 * Réponse toujours identique (pas d'énumération des comptes), sauf limitation de débit (429).
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enforceRateLimits, clientIp } from '@/lib/rate-limit-persistent'

export const runtime = 'nodejs'

const LOCALES = ['fr', 'ar', 'en']
const GENERIC_OK = { success: true, message: 'Si un compte existe, vous recevrez un email' }

function appOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '')
  return configured || new URL(request.url).origin
}

export async function POST(request: Request) {
  try {
    const ipLimited = await enforceRateLimits([{ key: `forgot:ip:${clientIp(request)}`, max: 5, windowSeconds: 60 * 60 }])
    if (ipLimited) return ipLimited

    let email = ''
    let locale = 'fr'
    try {
      const body = await request.json()
      email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
      if (typeof body?.locale === 'string' && LOCALES.includes(body.locale)) locale = body.locale
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const emailLimited = await enforceRateLimits([{ key: `forgot:email:${email}`, max: 3, windowSeconds: 60 * 60 }])
    if (emailLimited) return emailLimited

    // Client sans stockage : flux « implicit » (le lien revient avec les jetons dans le fragment #),
    // le seul utilisable quand la demande part du serveur (pas de code_verifier PKCE côté navigateur).
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appOrigin(request)}/${locale}/reset-password`,
    })
    if (error) console.error('[forgot-password] Supabase :', error.message)

    return NextResponse.json(GENERIC_OK)
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(GENERIC_OK)
  }
}
