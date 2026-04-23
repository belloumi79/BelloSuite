import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { routing, getLocaleFromPathname } from '@/i18n/routing'

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return new TextEncoder().encode(secret.slice(0, 32).padEnd(32, '!'))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const locale = getLocaleFromPathname(pathname)

  const PUBLIC_ROUTES = ['login', 'register', 'forgot-password', 'reset-password', 'onboarding', 'confirm']
  if (PUBLIC_ROUTES.some(p => pathname === `/${p}` || pathname === `/${locale}/${p}`)) {
    return NextResponse.next()
  }

  const PUBLIC_API_PREFIXES = [
    '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password',
    '/api/auth/reset-password', '/api/auth/callback', '/api/auth/session', '/api/health',
  ]
  if (PUBLIC_API_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  if (locale) {
    const sessionCookie = request.cookies.get('bello_session')?.value
    const isApi = pathname.startsWith('/api/')

    if (!sessionCookie) {
      if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }

    try {
      await jwtVerify(sessionCookie, getSecretKey(), { clockTolerance: 60 })
    } catch {
      if (isApi) return NextResponse.json({ error: 'Session expired' }, { status: 401 })
      const resp = NextResponse.redirect(new URL(`/${locale}/login`, request.url))
      resp.cookies.delete('bello_session')
      return resp
    }

    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = `/fr${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}