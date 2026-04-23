import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import { cache } from 'react'

const SESSION_COOKIE_NAME = 'bello_session'
const SESSION_DURATION = 60 * 60 * 24 * 7 // 7 days

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'fallback-secret-change-in-production'
  return new TextEncoder().encode(secret.slice(0, 32).padEnd(32, '!'))
}

export interface SessionPayload {
  id: string
  email: string
  role: string
  tenantId: string | null
  firstName: string
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .setSubject(payload.id)
    .sign(getSecretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { clockTolerance: 60 })
    return {
      id: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
      tenantId: (payload.tenantId as string | null) || null,
      firstName: (payload.firstName as string) || '',
    }
  } catch {
    return null
  }
}

export async function createSessionCookie(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies()
  const token = await signSession(payload)
  const isProd = process.env.NODE_ENV === 'production'
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true, secure: isProd, sameSite: 'strict',
    maxAge: SESSION_DURATION, path: '/',
  })
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
})

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

export function requireTenantAccess(session: SessionPayload, tenantId: string): void {
  if (session.role === 'SUPER_ADMIN') return
  if (session.tenantId !== tenantId) throw new Error('Forbidden')
}
