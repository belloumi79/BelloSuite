import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Check if user exists
    const { data: users } = await supabase
      .from('User')
      .select('id, email')
      .eq('email', email)
      .eq('isActive', true)
      .limit(1)

    // Always return success for security (don't reveal if email exists)
    
    if (!users || users.length === 0) {
      return NextResponse.json({ success: true, message: 'Si un compte existe, vous recevrez un email' })
    }

    const user = users[0]

    // Generate JWT reset token using the user's ID
    // Token valid for 1 hour
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: user.id,
      email: user.email,
      iat: now,
      exp: now + 3600, // 1 hour
      type: 'password_reset'
    }

    const resetSecret = process.env.RESET_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-secret-change-me'
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const signature = Buffer.from(
      `${header}.${body}`
    ).toString('base64url')
    
    // Use HMAC SHA256 - simple implementation
    const crypto = require('crypto')
    const sig = crypto.createHmac('sha256', resetSecret).update(`${header}.${body}`).digest('base64url')
    
    const token = `${header}.${body}.${sig}`

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetUrl = `${appUrl}/reset-password?token=${token}`

    // Try to send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'BelloSuite <noreply@bello-suite.com>',
            to: email,
            subject: 'Réinitialisation de votre mot de passe BelloSuite',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #10b981;">Réinitialisation de mot de passe</h2>
                <p>Bonjour,</p>
                <p>Vous avez demandé la réinitialisation de votre mot de passe BelloSuite.</p>
                <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Réinitialiser mon mot de passe</a>
                <p>Ou copiez ce lien dans votre navigateur :</p>
                <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>
                <p style="color: #999; font-size: 12px;">Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
              </div>
            `
          })
        })
        
        if (!res.ok) {
          console.error('Resend error:', await res.text())
        }
      } catch (emailError) {
        console.error('Failed to send email:', emailError)
      }
    } else {
      // No Resend configured - log token for development
      console.log(`\n========== DEV: Reset token for ${email} ==========`)
      console.log(`Token: ${token}`)
      console.log(`Reset URL: ${resetUrl}`)
      console.log(`===============================================\n`)
    }

    return NextResponse.json({ success: true, message: 'Email envoyé' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
