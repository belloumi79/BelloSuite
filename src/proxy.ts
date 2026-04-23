import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { routing } from '@/i18n/routing'

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return new TextEncoder().encode(secret.slice(0, 32).padEnd(32, '!'))
}

// API routes are always accessible (auth handled in route handlers)
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/callback',
  '/api/auth/session',
  '/api/health',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip public API routes
  if (PUBLIC_API_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Handle locale-prefixed routes
  const pathnameHasLocale = routing.locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    const sessionCookie = request.cookies.get('bello_session')?.value
    const isApi = pathname.startsWith('/api/')

    if (!sessionCookie) {
      if (isApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/fr/login', request.url))
    }

    try {
      await jwtVerify(sessionCookie, getSecretKey(), { clockTolerance: 60 })
    } catch {
      if (isApi) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 })
      }
      const response = NextResponse.redirect(new URL('/fr/login', request.url))
      response.cookies.delete('bello_session')
      return response
    }

    return NextResponse.next()
  }

  // No locale prefix — redirect to default locale
  const url = request.nextUrl.clone()
  url.pathname = `/fr${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}