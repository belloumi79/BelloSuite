import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { createSessionCookie } from '@/lib/session'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await supabaseServer()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      let role = 'USER'
      let tenantId: string | null = null
      let firstName = ''

      try {
        const dbUser = await prisma.user.findUnique({ where: { email: data.user.email! } })
        if (dbUser) {
          role = dbUser.role
          tenantId = dbUser.tenantId
          firstName = dbUser.firstName || ''
        } else {
          const newUser = await prisma.user.create({
            data: {
              email: data.user.email!,
              firstName: data.user.user_metadata?.full_name?.split(' ')[0] || data.user.user_metadata?.given_name || '',
              lastName: data.user.user_metadata?.family_name || '',
              password: 'OAUTH_USER',
              role: 'USER',
              isActive: true,
            },
          })
          role = newUser.role
          firstName = newUser.firstName || ''
        }
      } catch (e) {
        console.error('Prisma sync error:', e)
        role = data.user.user_metadata?.role || 'USER'
      }

      const session = {
        id: data.user.id,
        email: data.user.email!,
        role,
        tenantId,
        firstName: firstName || data.user.email?.split('@')[0] || '',
      }

      await createSessionCookie(session)

      const redirectTarget = (!tenantId) ? '/onboarding' : (next === '/' ? '/dashboard' : next)
      return NextResponse.redirect(`${origin}${redirectTarget}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
