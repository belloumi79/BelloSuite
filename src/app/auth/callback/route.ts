import { createClient } from '@/lib/supabase/client'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return Response.redirect(`${origin}${next}`, 303)
    }
  }

  return Response.redirect(`${origin}/login?error=auth`, 303)
}
