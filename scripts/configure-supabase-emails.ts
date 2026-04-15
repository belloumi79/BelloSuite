/**
 * configure-supabase-emails.ts
 * ====================================
 * Configure les email templates Supabase avec le branding BelloSuite.
 * Utilise l'API Management de Supabase.
 * 
 * Utilisation:
 *   npx tsx scripts/configure-supabase-emails.ts
 * 
 * Prérequis:
 *   SUPABASE_ACCESS_TOKEN=your_token  (https://supabase.com/dashboard/account/tokens)
 *   PROJECT_REF=guhwnihenpqoxcugtkyr
 */

import * as readline from 'readline'

const PROJECT_REF = process.env.PROJECT_REF || 'guhwnihenpqoxcugtkyr'
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || ''

const BELLOSUITE_BRAND = {
  primaryColor: '#0d9488',   // teal-600
  gradientFrom: '#0d9488',    // teal-600
  gradientTo: '#0f766e',      // teal-700
  textLight: '#ffffff',
  textMuted: '#9ca3af',
  bgCard: '#ffffff',
  borderColor: '#e5e7eb',
  successColor: '#10b981',
  errorColor: '#ef4444',
  accentColor: '#14b8a6',     // teal-500
  logoText: 'BelloSuite',
  slogan: 'ERP Modulaire Tunisien',
  website: 'https://bellosuite.vercel.app',
  supportEmail: 'support@bellosuite.tn',
}

function htmlEmailShell(content: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,${BELLOSUITE_BRAND.gradientFrom},${BELLOSUITE_BRAND.gradientTo});padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="color:${BELLOSUITE_BRAND.textLight};margin:0;font-size:28px;font-weight:800;letter-spacing:-0.5px;">
        🏢 ${BELLOSUITE_BRAND.logoText}
      </h1>
      <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">
        ${BELLOSUITE_BRAND.slogan}
      </p>
    </div>
    <!-- Content -->
    <div style="background:${BELLOSUITE_BRAND.bgCard};padding:40px 32px;border:1px solid ${BELLOSUITE_BRAND.borderColor};border-top:none;border-radius:0 0 16px 16px;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
      ${content}
    </div>
    <!-- Footer -->
    <div style="text-align:center;padding:20px;color:${BELLOSUITE_BRAND.textMuted};font-size:12px;">
      <hr style="border:none;border-top:1px solid ${BELLOSUITE_BRAND.borderColor};margin:0 0 16px;">
      <p style="margin:0 0 4px;">
        <strong style="color:${BELLOSUITE_BRAND.primaryColor};">${BELLOSUITE_BRAND.logoText}</strong> — ${BELLOSUITE_BRAND.slogan}
      </p>
      <p style="margin:0 0 4px;">
        <a href="${BELLOSUITE_BRAND.website}" style="color:${BELLOSUITE_BRAND.primaryColor};text-decoration:none;">${BELLOSUITE_BRAND.website}</a>
      </p>
      <p style="margin:0;color:#9ca3af;">
        Vous recevez cet email car vous avez iniciado une inscription sur ${BELLOSUITE_BRAND.logoText}.
      </p>
    </div>
  </div>
</body>
</html>`
}

// ─── Template: Confirm Sign Up ─────────────────────────────────
const confirmSignUpContent = htmlEmailShell(`
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
  Bonjour,
</p>
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
  Merci de votre inscription sur <strong style="color:${BELLOSUITE_BRAND.primaryColor};">${BELLOSUITE_BRAND.logoText}</strong> !<br>
  Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.
</p>
<div style="text-align:center;margin:32px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:${BELLOSUITE_BRAND.primaryColor};color:${BELLOSUITE_BRAND.textLight};padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 16px rgba(13,148,136,0.3);">
    ✓ Confirmer mon email
  </a>
</div>
<p style="margin:0 0 16px;color:#6b7280;font-size:13px;line-height:1.6;">
  Ce lien expire dans <strong>24 heures</strong>. Si vous n'avez pas demandé cette inscription, ignorez ce message.
</p>
<div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin:24px 0;">
  <p style="margin:0;color:#9ca3af;font-size:12px;">
    💡 <strong>Astuce :</strong> Ajoutez <strong>support@bellosuite.tn</strong> à vos contacts pour ne pas rater nos emails.
  </p>
</div>
`, 'Confirmez votre inscription — BelloSuite')

// ─── Template: Reset Password ──────────────────────────────────
const resetPasswordContent = htmlEmailShell(`
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
  Bonjour,
</p>
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
  Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte <strong style="color:${BELLOSUITE_BRAND.primaryColor};">${BELLOSUITE_BRAND.logoText}</strong>.
</p>
<div style="text-align:center;margin:32px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:${BELLOSUITE_BRAND.primaryColor};color:${BELLOSUITE_BRAND.textLight};padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 16px rgba(13,148,136,0.3);">
    🔒 Réinitialiser mon mot de passe
  </a>
</div>
<p style="margin:0 0 16px;color:#ef4444;font-size:13px;">
  ⚠️ Ce lien expire dans <strong>1 heure</strong>.
</p>
<p style="margin:0;color:#9ca3af;font-size:13px;">
  Si vous n'avez pas demandé cette réinitialisation, ignorez ce message. Votre mot de passe reste inchangé.
</p>
`, 'Réinitialisation de mot de passe — BelloSuite')

// ─── Template: Invite User ──────────────────────────────────────
const inviteUserContent = htmlEmailShell(`
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
  Bonjour,
</p>
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
  Vous êtes invité(e) à rejoindre <strong style="color:${BELLOSUITE_BRAND.primaryColor};">${BELLOSUITE_BRAND.logoText}</strong> — l'ERP modulaire tunisien.
</p>
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
  Cliquez sur le bouton ci-dessous pour accepter l'invitation et créer votre compte.
</p>
<div style="text-align:center;margin:32px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:${BELLOSUITE_BRAND.primaryColor};color:${BELLOSUITE_BRAND.textLight};padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 16px rgba(13,148,136,0.3);">
    ✓ Accepter l'invitation
  </a>
</div>
<p style="margin:0;color:#9ca3af;font-size:13px;">
  Ce lien expire dans <strong>7 jours</strong>.
</p>
`, 'Invitation à rejoindre BelloSuite')

// ─── Template: Magic Link ───────────────────────────────────────
const magicLinkContent = htmlEmailShell(`
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
  Bonjour,
</p>
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
  Cliquez sur le bouton ci-dessous pour vous connecter instantanément à <strong style="color:${BELLOSUITE_BRAND.primaryColor};">${BELLOSUITE_BRAND.logoText}</strong>.
</p>
<div style="text-align:center;margin:32px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:${BELLOSUITE_BRAND.primaryColor};color:${BELLOSUITE_BRAND.textLight};padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 16px rgba(13,148,136,0.3);">
    🔑 Connexion magique
  </a>
</div>
<p style="margin:0;color:#9ca3af;font-size:13px;">
  Ce lien expire dans <strong>1 heure</strong> et ne peut être utilisé qu'une seule fois.
</p>
`, 'Votre lien de connexion — BelloSuite')

// ─── Template: Email Change ─────────────────────────────────────
const emailChangeContent = htmlEmailShell(`
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
  Bonjour,
</p>
<p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.7;">
  Cliquez sur le bouton ci-dessous pour confirmer le changement de votre adresse email sur <strong style="color:${BELLOSUITE_BRAND.primaryColor};">${BELLOSUITE_BRAND.logoText}</strong>.
</p>
<div style="text-align:center;margin:32px 0;">
  <a href="{{ .ConfirmationURL }}"
     style="display:inline-block;background:${BELLOSUITE_BRAND.primaryColor};color:${BELLOSUITE_BRAND.textLight};padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 16px rgba(13,148,136,0.3);">
    ✓ Confirmer cette adresse email
  </a>
</div>
`, 'Confirmation de changement d\'email — BelloSuite')

async function updateTemplates() {
  if (!ACCESS_TOKEN) {
    console.error('❌  SUPABASE_ACCESS_TOKEN non configuré.')
    console.error('   Obtenez-le sur: https://supabase.com/dashboard/account/tokens')
    console.error('   puis exécutez:')
    console.error('   SUPABASE_ACCESS_TOKEN=votre_token PROJECT_REF=guhwnihenpqoxcugtkyr npx tsx scripts/configure-supabase-emails.ts')
    process.exit(1)
  }

  console.log(`\n📧 Configuration des templates email — ${BELLOSUITE_BRAND.logoText}`)
  console.log(`   Projet: ${PROJECT_REF}`)
  console.log('   ─────────────────────────────────────────────')

  const endpoint = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`
  const headers = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }

  const templates = {
    mailer_subjects_confirmation: 'Confirmez votre inscription — BelloSuite',
    mailer_templates_confirmation_content: confirmSignUpContent,
    mailer_subjects_recovery: 'Réinitialisation de mot de passe — BelloSuite',
    mailer_templates_recovery_content: resetPasswordContent,
    mailer_subjects_invite: 'Invitation à rejoindre BelloSuite',
    mailer_templates_invite_content: inviteUserContent,
    mailer_subjects_magic_link: 'Votre lien de connexion — BelloSuite',
    mailer_templates_magic_link_content: magicLinkContent,
    mailer_subjects_email_change: "Confirmation de changement d'email — BelloSuite",
    mailer_templates_email_change_content: emailChangeContent,
  }

  console.log('\n📤 Envoi des templates vers Supabase...')

  try {
    const resp = await fetch(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(templates),
    })

    if (!resp.ok) {
      const err = await resp.text()
      console.error(`\n❌ Erreur HTTP ${resp.status}: ${err}`)
      process.exit(1)
    }

    const data = await resp.json()
    console.log('\n✅ Templates mis à jour avec succès !')
    console.log('   ─────────────────────────────────────────────')
    console.log('   ✓ Confirmation signup    — email stylé BelloSuite')
    console.log('   ✓ Reset password         — email stylé BelloSuite')
    console.log('   ✓ Invite user            — email stylé BelloSuite')
    console.log('   ✓ Magic link            — email stylé BelloSuite')
    console.log('   ✓ Email change           — email stylé BelloSuite')
    console.log('\n🌐 Vérifiez sur: https://supabase.com/dashboard/project/guhwnihenpqoxcugtkyr/auth/templates')
    console.log('\n⚠️  Important: Configurez aussi le Site URL dans:')
    console.log('   Authentication > URL Configuration > Site URL')
    console.log(`   → https://bellosuite.vercel.app`)

  } catch (e: any) {
    console.error('\n❌ Erreur:', e.message)
    process.exit(1)
  }
}

// ─── Also configure Site URL ───────────────────────────────────
async function configureSiteUrl() {
  console.log('\n🌐 Configuration du Site URL...')

  const endpoint = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`
  const headers = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }

  const config = {
    site_url: 'https://bellosuite.vercel.app',
    redirect_domains: [
      'bellosuite.vercel.app',
      'bellosuite-he8nvzdvq.vercel.app',
      'localhost',
    ],
    email_confirm: true,
    phone_confirm: false,
  }

  try {
    const resp = await fetch(endpoint, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(config),
    })
    if (!resp.ok) {
      const err = await resp.text()
      console.error(`❌ Erreur HTTP ${resp.status}: ${err}`)
    } else {
      console.log('✅ Site URL configuré: https://bellosuite.vercel.app')
    }
  } catch (e: any) {
    console.error('❌ Erreur:', e.message)
  }
}

async function main() {
  await updateTemplates()
  await configureSiteUrl()
}

main()
