import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

function verifyJWT(token: string, secret: string): { sub: string; email: string; exp: number } | null {
  try {
    const crypto = require('crypto')
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const [header, body, signature] = parts
    const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
    
    if (signature !== expectedSig) return null
    
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) return null
    
    if (payload.type !== 'password_reset') return null
    
    return payload
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json()
    
    if (!token || !password) {
      return NextResponse.json({ error: 'Token et mot de passe requis' }, { status: 400 })
    }
    
    if (password.length < 8) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
    }

    const resetSecret = process.env.RESET_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-secret-change-me'
    const payload = verifyJWT(token, resetSecret)
    
    if (!payload) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Verify user still exists and is active
    const { data: users } = await supabase
      .from('User')
      .select('id')
      .eq('id', payload.sub)
      .eq('isActive', true)
      .limit(1)

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Update the password
    const { error: updateError } = await supabase
      .from('User')
      .update({ password: hashedPassword })
      .eq('id', payload.sub)

    if (updateError) {
      console.error('Password update error:', updateError)
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Mot de passe mis à jour' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
