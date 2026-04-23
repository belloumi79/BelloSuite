import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { routing } from '@/i18n/routing'

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return new TextEncoder().encode(secret.slice(0, 32).padEnd(32, '!'))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const pathnameHasLocale = routing.locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    const sessionCookie = request.cookies.get('bello_session')?.value
    const isApi = pathname.startsWith('/api/')
    const isPublicApi = pathname.startsWith('/api/auth/') && (
      pathname.includes('/login') || pathname.includes('/register') ||
      pathname.includes('/forgot-password') || pathname.includes('/reset-password') ||
      pathname.includes('/callback')
    )

    if (!sessionCookie && !isPublicApi) {
      if (isApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (sessionCookie) {
      try {
        await jwtVerify(sessionCookie, getSecretKey(), { clockTolerance: 60 })
      } catch {
        if (isApi) {
          return NextResponse.json({ error: 'Session expired' }, { status: 401 })
        }
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('bello_session')
        return response
      }
    }

    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = `/fr${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!api/auth/callback|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}