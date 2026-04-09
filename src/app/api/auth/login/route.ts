import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
    }

    // Fetch tenant automatically from tenants table if user has no tenant_id
    let tenantId: string | null = data.user.user_metadata?.tenant_id || null
    if (!tenantId) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
        .maybeSingle()
      tenantId = tenants?.id ?? null
    }

    const session = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.user_metadata?.role || 'USER',
      tenantId,
      firstName: data.user.user_metadata?.first_name || data.user.email?.split('@')[0] || '',
    }

    return NextResponse.json({ session })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
