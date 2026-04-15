import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`, 303)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (!error) {
    // Redirect to dashboard — the client-side callback page handles the UI
    return NextResponse.redirect(`${origin}/auth/callback?confirmed=1`, 303)
  }

  return NextResponse.redirect(`${origin}/auth/callback?error=${encodeURIComponent(error.message)}`, 303)
}
