import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { routing } from '@/i18n/routing'

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return new TextEncoder().encode(secret.slice(0, 32).padEnd(32, '!'))
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const pathnameHasLocale = routing.locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    // Extract locale-prefixed path for public page check
    const locale = routing.locales.find(
      l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
    ) || 'fr'
    const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/'

    const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/onboarding']
    const isPublicPage = PUBLIC_PATHS.some(p => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`))

    // Public API paths (auth endpoints)
    const isPublicApi = pathname.startsWith('/api/auth/') && (
      pathname.includes('/login') || pathname.includes('/register') ||
      pathname.includes('/forgot-password') || pathname.includes('/reset-password') ||
      pathname.includes('/callback')
    )

    const sessionCookie = request.cookies.get('bello_session')?.value

    if (!sessionCookie && !isPublicPage && !isPublicApi) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (sessionCookie) {
      try {
        await jwtVerify(sessionCookie, getSecretKey(), { clockTolerance: 60 })
      } catch {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Session expired' }, { status: 401 })
        }
        const resp = NextResponse.redirect(new URL('/login', request.url))
        resp.cookies.delete('bello_session')
        return resp
      }
    }

    return NextResponse.next()
  }

  // No locale → add default locale
  const url = request.nextUrl.clone()
  url.pathname = `/fr${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}