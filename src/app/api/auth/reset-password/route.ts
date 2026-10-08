import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getResetSecret } from '@/lib/reset-secret'
import { timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'

function verifyJWT(token: string, secret: string): { sub: string; email: string; exp: number } | null {
  try {
    const crypto = require('crypto')
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const [header, body, signature] = parts
    const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')
    
    const a = Buffer.from(signature)
    const b = Buffer.from(expectedSig)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    
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

    const resetSecret = getResetSecret()
    const payload = verifyJWT(token, resetSecret)
    
    if (!payload) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 })
    }

    // Lecture/écriture côté serveur via Prisma (plus d'accès à la table User avec la clé anon)
    const user = await prisma.user.findFirst({ where: { id: payload.sub, isActive: true }, select: { id: true } })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } })

    return NextResponse.json({ success: true, message: 'Mot de passe mis à jour' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
