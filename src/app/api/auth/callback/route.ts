import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { createSessionCookie } from '@/lib/session'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await supabaseServer()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      let role = 'USER', tenantId: string | null = null, firstName = ''
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
        console.error(e)
      }

      const session = { id: data.user.id, email: data.user.email!, role, tenantId, firstName }
      await createSessionCookie(session)

      const target = (!tenantId) ? '/onboarding' : next
      return NextResponse.redirect(`${origin}${target}`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}