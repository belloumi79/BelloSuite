import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { routing } from '@/i18n/routing'
import { rateLimit } from './lib/rate-limit'

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return new TextEncoder().encode(secret.slice(0, 32).padEnd(32, '!'))
}

function getLocale(pathname: string): string {
  return routing.locales.find(l => pathname.startsWith(`/${l}`)) || 'fr'
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const locale = getLocale(pathname)

  // Redirect root to locale-prefixed path
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  // Allow /login without locale prefix (Vercel often strips it)
  if (pathname === '/login') {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  // Let next-intl handle locale-prefixed routes freely
  const sessionCookie = request.cookies.get('bello_session')?.value

  // Public paths
  const cleanPath = pathname.replace(`/${locale}`, '') || '/'
  const PUBLIC_AUTH = ['/login', '/register', '/forgot-password', '/reset-password', '/onboarding']
  const PUBLIC_API = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/callback', '/api/auth/session', '/api/health']

  const isPublicPage = PUBLIC_AUTH.some(p => cleanPath === p || cleanPath.startsWith(`${p}/`))
  const isPublicApi = PUBLIC_API.some(p => cleanPath.startsWith(p))

  // Rate limiting for sensitive API routes
  if (cleanPath.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const isStrict = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password'].some(r => cleanPath.startsWith(r))
    const result = rateLimit(`auth:${ip}`, isStrict ? 10 : 100, 60)
    if (!result.success) {
      return NextResponse.json({ error: 'Trop de requêtes. Réessayez plus tard.' }, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
        },
      })
    }
  }

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

  // Security headers
  const resp = NextResponse.next()
  resp.headers.set('X-Frame-Options', 'DENY')
  resp.headers.set('X-Content-Type-Options', 'nosniff')
  resp.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  resp.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return resp
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
