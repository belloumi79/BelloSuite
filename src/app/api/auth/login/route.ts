import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  if (!url) return ''
  return url.startsWith('http') ? url : `https://${url}`
}

function getSupabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const supabaseUrl = getSupabaseUrl()
    const supabaseKey = getSupabaseKey()

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase config missing:', { url: supabaseUrl ? '[SET]' : '[MISSING]', key: supabaseKey ? '[SET]' : '[MISSING]' })
      return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      return NextResponse.json({ error: error?.message || 'Identifiants incorrects' }, { status: 401 })
    }

    const role = data.user.user_metadata?.role || 'USER'
    const tenantId = data.user.user_metadata?.tenant_id || null
    const firstName = data.user.user_metadata?.first_name || data.user.email?.split('@')[0] || ''

    const session = {
      id: data.user.id,
      email: data.user.email,
      role,
      tenantId,
      firstName,
    }

    return NextResponse.json({ session })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}