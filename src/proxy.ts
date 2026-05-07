import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { routing } from '@/i18n/routing'
import { rateLimit } from './lib/rate-limit'

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!secret) throw new Error('SESSION_SECRET is required')
  return new TextEncoder().encode(secret.slice(0, 32).padEnd(32, '!'))
}

// Strip locale prefix from pathname for route matching
function stripLocale(pathname: string): string {
  const locale = routing.locales.find(
    l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  )
  return locale ? pathname.replace(`/${locale}`, '') || '/' : pathname
}

// Get locale from pathname
function getLocale(pathname: string): string {
  return routing.locales.find(
    l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  ) || routing.defaultLocale
}

// Public page paths (no session required)
const PUBLIC_PAGES = [
  '/', '/login', '/register', '/forgot-password', '/reset-password', '/onboarding',
]

// Public API routes (no session required)
const PUBLIC_API = [
  '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password',
  '/api/auth/reset-password', '/api/auth/callback', '/api/auth/session',
  '/api/health',
]

// Strict rate-limit routes (10 req/min)
const STRICT_ROUTES = [
  '/api/auth/login', '/api/auth/register', '/api/auth/forgot-password',
]

// Security headers applied to all responses
const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─── Rate Limiting ───────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const cleanPath = stripLocale(pathname)
    const isStrict = STRICT_ROUTES.some(r => cleanPath.startsWith(r))
    const result = rateLimit(`${ip}:${cleanPath}`, isStrict ? 10 : 100, 60)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
            ...SECURITY_HEADERS,
          },
        }
      )
    }
  }

  // ─── Auth Check ─────────────────────────────────────────────
  const cleanPath = stripLocale(pathname)
  const locale = getLocale(pathname)

  const isPublicPage = PUBLIC_PAGES.some(p => cleanPath === p || cleanPath.startsWith(`${p}/`))
  const isPublicApi = PUBLIC_API.some(p => cleanPath.startsWith(p))
  const sessionCookie = request.cookies.get('bello_session')?.value

  // No session + not public → redirect or 401
  if (!sessionCookie && !isPublicPage && !isPublicApi) {
    const response = cleanPath.startsWith('/api/')
      ? NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      : NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    // Apply security headers
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v))
    return response
  }

  // Session present → verify JWT
  if (sessionCookie) {
    try {
      const { payload } = await jwtVerify(sessionCookie, getSecretKey(), { clockTolerance: 60 })

      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', payload.sub as string)
      requestHeaders.set('x-user-email', (payload.email as string) || '')
      requestHeaders.set('x-user-role', (payload.role as string) || '')
      requestHeaders.set('x-tenant-id', (payload.tenantId as string) || '')

      const response = NextResponse.next({ request: { headers: requestHeaders } })
      Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v))
      return response
    } catch {
      // Expired/invalid session
      const response = cleanPath.startsWith('/api/')
        ? NextResponse.json({ error: 'Session expirée. Veuillez vous reconnecter.' }, { status: 401 })
        : NextResponse.redirect(new URL(`/${locale}/login`, request.url))
      response.cookies.delete('bello_session')
      Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v))
      return response
    }
  }

  // Public routes without session
  const response = NextResponse.next()
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v))
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}