import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSessionCookie } from '@/lib/session'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const limit = rateLimit(`login:${ip}`, 5, 60)
    if (!limit.success) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessayez dans quelques minutes.' }, { status: 429 })
    }

    let email: string, password: string
    try {
      const body = await req.json()
      email = body.email
      password = body.password
    } catch {
      return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 })
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
    }

    let tenantId: string | null = data.user.user_metadata?.tenant_id || null
    let role: string = data.user.user_metadata?.role || 'USER'
    let firstName: string = data.user.user_metadata?.first_name || ''

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
      email: data.user.email!,
      role,
      tenantId,
      firstName: firstName || data.user.email?.split('@')[0] || '',
    }

    await createSessionCookie(session)

    return NextResponse.json({ success: true, role })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
