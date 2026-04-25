import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from './lib/session'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/auth/callback', '/confirm']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Determine if we have a locale and what's the path without it
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/)
  const locale = match ? match[1] : null
  const pathnameWithoutLocale = locale ? pathname.replace(/^\/[a-z]{2}/, '') || '/' : pathname

  // 2. Normalize: if locale is missing, redirect to default locale (/fr)
  // This handles the /login -> /fr/login case
  if (!locale && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.includes('.')) {
    return NextResponse.redirect(new URL(`/fr${pathname}`, request.url))
  }

  const isPublicPath = PUBLIC_PATHS.some(path => pathnameWithoutLocale.startsWith(path)) || pathnameWithoutLocale === '/'

  // Get token from cookies
  const token = request.cookies.get('bello_session')?.value
  const session = token ? await verifySessionToken(token) : null

  // 3. Auth and RBAC logic using pathnameWithoutLocale

  if (!session && !isPublicPath) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL(`/${locale || 'fr'}/login`, request.url))
  }

  if (session && isPublicPath && pathnameWithoutLocale !== '/' && !pathname.startsWith('/api')) {
    const target = session.role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard'
    return NextResponse.redirect(new URL(`/${locale || 'fr'}${target}`, request.url))
  }

  if (session) {
    if (pathnameWithoutLocale.startsWith('/super-admin') && session.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(`/${locale || 'fr'}/dashboard`, request.url))
    }
    if (!session.tenantId && pathnameWithoutLocale.startsWith('/dashboard') && !pathnameWithoutLocale.includes('/onboarding')) {
      return NextResponse.redirect(new URL(`/${locale || 'fr'}/onboarding`, request.url))
    }
  }

  // 4. CSRF Protection for mutations
  const mutations = ['POST', 'PUT', 'DELETE', 'PATCH']
  if (mutations.includes(request.method)) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')

    // Check if origin matches host
    if (origin && !origin.includes(host || '')) {
      return NextResponse.json({ error: 'CSRF Protection: Invalid Origin' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
