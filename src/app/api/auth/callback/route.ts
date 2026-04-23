import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { createSessionCookie } from '@/lib/session'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/fr/dashboard'

  if (code) {
    const supabase = await supabaseServer()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      let role = 'USER'
      let tenantId: string | null = null
      let firstName = ''

      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: data.user.email! }
        })

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
            }
          })
          role = newUser.role
          firstName = newUser.firstName || ''
        }
      } catch (prismaError) {
        console.error('Error syncing user with Prisma:', prismaError)
        role = data.user.user_metadata?.role || 'USER'
      }

      const session = { id: data.user.id, email: data.user.email!, role, tenantId, firstName }
      await createSessionCookie(session)

      // Preserve locale prefix in redirect
      const locale = next.startsWith('/') ? next.split('/')[1] : 'fr'
      const target = (!tenantId || tenantId === null) ? `/${locale}/onboarding` : next

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      let redirectUrl: string
      if (isLocalEnv) {
        redirectUrl = `${origin}${target}`
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${target}`
      } else {
        redirectUrl = `${origin}${target}`
      }

      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(`${origin}/fr/login?error=auth_failed`)
}
