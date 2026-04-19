import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // i18n support: we might want to preserve the locale if passed in state/next
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await supabaseServer()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Sync user with Prisma
      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: data.user.email! }
        })

        if (!existingUser) {
          // Create new user in Prisma
          await prisma.user.create({
            data: {
              email: data.user.email!,
              firstName: data.user.user_metadata.full_name?.split(' ')[0] || '',
              lastName: data.user.user_metadata.full_name?.split(' ').slice(1).join(' ') || '',
              password: 'OAUTH_USER', // Placeholder as password is required in schema
              role: 'USER',
              isActive: true,
            }
          })
        }
      } catch (prismaError) {
        console.error('Error syncing user with Prisma:', prismaError)
      }

      const forwardedHost = request.headers.get('x-forwarded-host') // useful for Vercel
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
