import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { routing } from '@/i18n/routing'

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  return new TextEncoder().encode(secret.slice(0, 32).padEnd(32, '!'))
}

// Strip locale prefix from pathname for route matching
function stripLocale(pathname: string): string {
  const locale = routing.locales.find(
    l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  )
  return locale ? pathname.replace(`/${locale}`, '') || '/' : pathname
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const cleanPath = stripLocale(pathname)

  // Detect locale for redirects
  const locale = routing.locales.find(
    l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  ) || 'fr'

  // Auth public paths (no session required)
  const PUBLIC_AUTH = ['/login', '/register', '/forgot-password', '/reset-password', '/onboarding']
  const isPublicPage = PUBLIC_AUTH.some(p => cleanPath === p || cleanPath.startsWith(`${p}/`))

  // Public API routes (no session required)
  const isPublicApi = cleanPath.startsWith('/api/auth/') && (
    cleanPath.includes('/login') || cleanPath.includes('/register') ||
    cleanPath.includes('/forgot-password') || cleanPath.includes('/reset-password') ||
    cleanPath.includes('/callback') || cleanPath.includes('/session')
  )

  const sessionCookie = request.cookies.get('bello_session')?.value

  if (!sessionCookie && !isPublicPage && !isPublicApi) {
    if (cleanPath.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  if (sessionCookie) {
    try {
      await jwtVerify(sessionCookie, getSecretKey(), { clockTolerance: 60 })
    } catch {
      if (cleanPath.startsWith('/api/')) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 })
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
