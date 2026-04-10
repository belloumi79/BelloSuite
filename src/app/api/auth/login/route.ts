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

    // 1. From Supabase Auth metadata
    let tenantId: string | null = data.user.user_metadata?.tenant_id || null
    let role: string = data.user.user_metadata?.role || 'USER'
    let firstName: string = data.user.user_metadata?.first_name || ''

    // 2. Fallback: fetch from custom User table (uppercase User)
    if (!tenantId) {
      const { data: userRow } = await supabase
        .from('User')
        .select('tenantId, role, firstName')
        .eq('email', email)
        .maybeSingle()
      if (userRow) {
        tenantId = userRow.tenantId || tenantId
        role = userRow.role || role
        firstName = userRow.firstName || firstName
      }
    }

    // 3. Last resort: pick first active tenant
    if (!tenantId) {
      const { data: tenants } = await supabase
        .from('Tenant')
        .select('id')
        .eq('isActive', true)
        .limit(1)
        .maybeSingle()
      tenantId = tenants?.id ?? null
    }

    const session = {
      id: data.user.id,
      email: data.user.email,
      role,
      tenantId,
      firstName: firstName || data.user.email?.split('@')[0] || '',
    }

    return NextResponse.json({ session })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
