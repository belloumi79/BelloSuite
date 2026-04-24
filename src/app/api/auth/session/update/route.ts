import { NextResponse } from 'next/server'
import { getSession, signSession } from '@/lib/session'
import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = 'bello_session'
const SESSION_DURATION = 60 * 60 * 24 * 7 // 7 days

export async function POST(request: Request) {
  try {
    const currentSession = await getSession()
    if (!currentSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenantId, role } = await request.json()

    const newSession = {
      ...currentSession,
      tenantId: tenantId ?? currentSession.tenantId,
      role: role ?? currentSession.role,
    }

    const token = await signSession(newSession)
    const cookieStore = await cookies()
    const isProd = process.env.NODE_ENV === 'production'

    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true, secure: isProd, sameSite: 'strict',
      maxAge: SESSION_DURATION, path: '/',
    })

    return NextResponse.json({ success: true, session: newSession })
  } catch (error) {
    console.error('Session update error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
