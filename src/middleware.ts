import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: Request) {
  const response = new NextResponse()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get('cookie') || ''
          return cookieHeader.split(',').map(c => {
            const [name, ...valueParts] = c.trim().split('=')
            return { name, value: valueParts.join('=') }
          })
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Public routes
  const publicRoutes = ['/login', '/register', '/api/auth', '/auth/callback']
  const isPublic = publicRoutes.some(route => pathname.startsWith(route))

  // If not logged in and not public, redirect to login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If logged in and trying to access login, redirect based on role
  if (user && pathname === '/login') {
    const role = user.user_metadata?.role
    return NextResponse.redirect(new URL(role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
