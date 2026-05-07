import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { routing } from '@/i18n/routing'
import { rateLimit } from './lib/rate-limit'

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return new TextEncoder().encode(secret.slice(0, 32).padEnd(32, '!'))
}

function stripLocale(pathname: string): string {
  const locale = routing.locales.find(
    l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  )
  return locale ? pathname.replace(`/${locale}`, '') || '/' : pathname
}

const PUBLIC_AUTH = ['/login', '/register', '/forgot-password', '/reset-password', '/onboarding']
const PUBLIC_API_PATTERNS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/callback',
  '/api/auth/session',
  '/api/health',
]
const STRICT_RATE_LIMIT_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const cleanPath = stripLocale(pathname)

  const locale = routing.locales.find(
    l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  ) || 'fr'

  if (cleanPath.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const isStrict = STRICT_RATE_LIMIT_ROUTES.some(r => cleanPath.startsWith(r))
    const maxRequests = isStrict ? 10 : 100
    const result = rateLimit(`${ip}:${cleanPath}`, maxRequests, 60)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer.' },
        { status: 429 }
      )
    }
  }

  const isPublicPage = PUBLIC_AUTH.some(p => cleanPath === p || cleanPath.startsWith(`${p}/`))
  const isPublicApi = PUBLIC_API_PATTERNS.some(p => cleanPath.startsWith(p))
  const sessionCookie = request.cookies.get('bello_session')?.value

  if (!sessionCookie && !isPublicPage && !isPublicApi) {
    if (cleanPath.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  if (sessionCookie) {
    try {
      await jwtVerify(sessionCookie, getSecretKey(), { clockTolerance: 60 })
    } catch {
      if (cleanPath.startsWith('/api/')) {
        return NextResponse.json({ error: 'Session expirée' }, { status: 401 })
      }
      const resp = NextResponse.redirect(new URL(`/${locale}/login`, request.url))
      resp.cookies.delete('bello_session')
      return resp
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
