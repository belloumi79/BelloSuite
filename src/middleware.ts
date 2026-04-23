import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { routing } from '@/i18n/routing'

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return new TextEncoder().encode(secret.slice(0, 32).padEnd(32, '!'))
}

const PUBLIC_PATHS = [
  '/login', '/register', '/forgot-password', '/reset-password',
  '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/callback', '/api/auth/logout', '/api/auth/session',
  '/auth/callback',
  '/fr/login', '/fr/register', '/en/login', '/ar/login',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some(p => pathname.includes(p)) || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('bello_session')?.value

  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const locale = routing.defaultLocale
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  try {
    await jwtVerify(sessionCookie, getSecretKey(), { clockTolerance: 60 })
  } catch {
    const response = pathname.startsWith('/api/')
      ? NextResponse.json({ error: 'Session expired' }, { status: 401 })
      : NextResponse.redirect(new URL(`/${routing.defaultLocale}/login`, request.url))
    response.cookies.delete('bello_session')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}