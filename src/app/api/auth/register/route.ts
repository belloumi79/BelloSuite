import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enforceRateLimits, clientIp } from '@/lib/rate-limit-persistent'

function getUrl() { return process.env.NEXT_PUBLIC_SUPABASE_URL || '' }
function getKey() { return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' }

export async function POST(req: NextRequest) {
  try {
    const limited = await enforceRateLimits([{ key: `register:ip:${clientIp(req)}`, max: 5, windowSeconds: 60 * 60 }])
    if (limited) return limited

    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const supabase = createClient(getUrl(), getKey())
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ user: data.user, session: data.session })
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}