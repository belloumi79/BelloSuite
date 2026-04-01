import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Get user role
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: userData } = await supabase
          .from('user')
          .select('role')
          .eq('id', user.id)
          .single()
        
        const role = userData?.role || 'USER'
        
        // Redirect based on role
        if (role === 'SUPER_ADMIN') {
          return NextResponse.redirect(`${origin}/super-admin`, 303)
        } else if (role === 'ADMIN') {
          return NextResponse.redirect(`${origin}/dashboard`, 303)
        } else {
          return NextResponse.redirect(`${origin}/stock`, 303)
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`, 303)
}
