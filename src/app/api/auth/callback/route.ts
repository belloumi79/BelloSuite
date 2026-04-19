import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

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

      // Sync user with Prisma and get role
      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: data.user.email! }
        })

        if (dbUser) {
          role = dbUser.role
          tenantId = dbUser.tenantId
          firstName = dbUser.firstName || ''
        } else {
          // Create new user in Prisma with default role
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
        // Fallback to metadata
        role = data.user.user_metadata?.role || 'USER'
      }

      // If no tenant, redirect to onboarding
      const redirectTarget = (!tenantId || tenantId === null) ? '/onboarding' : (next === '/' ? '/dashboard' : next)

      // Build session object to pass via URL params
      const session = {
        id: data.user.id,
        email: data.user.email,
        role,
        tenantId,
        firstName: firstName || data.user.email?.split('@')[0] || ''
      }

      // Encode session as base64 to pass in URL
      const sessionBase64 = Buffer.from(JSON.stringify(session)).toString('base64url')
      
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      let redirectUrl: string
      if (isLocalEnv) {
        redirectUrl = `${origin}${redirectTarget}?session=${sessionBase64}`
      } else if (forwardedHost) {
        redirectUrl = `https://${forwardedHost}${redirectTarget}?session=${sessionBase64}`
      } else {
        redirectUrl = `${origin}${redirectTarget}?session=${sessionBase64}`
      }
      
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
