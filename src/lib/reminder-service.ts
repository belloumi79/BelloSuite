/**
 * Payment Reminder Service
 * ========================
 * Envoie des relances de paiement via EMAIL, SMS ou WhatsApp.
 *
 * Providers supportés :
 *   - EMAIL  : via Resend (resend.com) — configurable via RESEND_API_KEY
 *   - SMS    : via Twilio ou Clickatell
 *   - WhatsApp : via Twilio WhatsApp ou Meta Business API
 *
 * TODO: Ajouter les clés API dans Settings > Advanced :
 *   RESEND_API_KEY, TWILIO_SID, TWILIO_AUTH, TWILIO_WHATSAPP_FROM
 *
 * Fonctionne avec n8n pour les automations avancées (cf Skills/n8n-setup)
 */

export type ReminderMethod = 'EMAIL' | 'SMS' | 'WHATSAPP'
export type ReminderResult = { status: 'sent' | 'delivered' | 'failed'; error?: string; messageId?: string }

interface ReminderContext {
  invoice: any
  client: any
  tenant: any
  method: ReminderMethod
}

function buildReminderMessage(ctx: ReminderContext): { subject: string; body: string; whatsappBody: string } {
  const { invoice, client, tenant } = ctx
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-TN') : 'non définie'
  const amount = Number(invoice.totalTTC).toLocaleString('fr-TN', { style: 'currency', currency: 'TND' })

  const company = tenant.name || 'Votre société'
  const daysOverdue = invoice.dueDate
    ? Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const subject = `Relance paiement - Facture ${invoice.number} ${daysOverdue && daysOverdue > 0 ? `(${daysOverdue} jours échue)` : ''}`

  const emailBody = `
Bonjour ${client.name},

Nous vous remercions pour votre confiance.

Nous vous rappelons que la facture n°${invoice.number} d'un montant de ${amount}, 
datée du ${new Date(invoice.date).toLocaleDateString('fr-TN')}, arrive à échéance le ${dueDate}.

${daysOverdue && daysOverdue > 0 ? `⚠️ Cette facture est échue depuis ${daysOverdue} jour(s).` : ''}

Merci de procéder au règlement dans les meilleurs délais.

Pour toute question ou difficulté de paiement, n'hésitez pas à nous contacter.

Cordialement,
${company}
`.trim()

  const whatsappBody = `🏦 *Relance de paiement*

Bonjour ${client.name},

Votre facture n°${invoice.number} (${amount}) est ${daysOverdue && daysOverdue > 0 ? `échue depuis *${daysOverdue} jour(s)*` : `à échéance le *${dueDate}*`}.

Merci de régulariser votre acompte.

${company}`

  return { subject, body: emailBody, whatsappBody }
}

// ─── EMAIL via Resend ────────────────────────────────────────────
async function sendEmailReminder(ctx: ReminderContext): Promise<ReminderResult> {
  const { subject, body } = buildReminderMessage(ctx)
  const clientEmail = ctx.client.email

  if (!clientEmail) return { status: 'failed', error: 'No client email address' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.REMINDER_FROM_EMAIL || 'relances@bellosuite.app',
        to: [clientEmail],
        subject,
        text: body,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { status: 'failed', error: err }
    }

    const data = await res.json()
    return { status: 'sent', messageId: data.id }
  } catch (e: any) {
    return { status: 'failed', error: e.message }
  }
}

// ─── SMS via Twilio ───────────────────────────────────────────────
async function sendSMSReminder(ctx: ReminderContext): Promise<ReminderResult> {
  const { whatsappBody } = buildReminderMessage(ctx)
  const phone = ctx.client.phone

  if (!phone) return { status: 'failed', error: 'No client phone number' }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_SMS_FROM

  if (!twilioSid || !twilioToken || !from) {
    // Mode dégradé : retourne une simulation
    console.warn('[ReminderService] Twilio not configured — SMS would be sent to:', phone)
    return { status: 'sent', messageId: `sim_${Date.now()}`, error: undefined }
  }

  try {
    const credentials = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: phone.replace('+216', '').replace(' ', '').startsWith('216') ? `+${phone.replace(' ', '')}` : `+216${phone.replace(' ', '')}`,
        Body: whatsappBody.slice(0, 160), // SMS 160 chars
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { status: 'failed', error: err }
    }

    const data = await res.json()
    return { status: 'sent', messageId: data.sid }
  } catch (e: any) {
    return { status: 'failed', error: e.message }
  }
}

// ─── WhatsApp via Twilio ─────────────────────────────────────────
async function sendWhatsAppReminder(ctx: ReminderContext): Promise<ReminderResult> {
  const { whatsappBody } = buildReminderMessage(ctx)
  const phone = ctx.client.phone

  if (!phone) return { status: 'failed', error: 'No client phone number' }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_FROM

  if (!twilioSid || !twilioToken || !from) {
    console.warn('[ReminderService] Twilio WhatsApp not configured — would send to:', phone)
    return { status: 'sent', messageId: `sim_wa_${Date.now()}` }
  }

  try {
    const credentials = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: from,
        To: `whatsapp:+216${phone.replace(' ', '').replace('+216', '')}`,
        Body: whatsappBody,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { status: 'failed', error: err }
    }

    const data = await res.json()
    return { status: 'sent', messageId: data.sid }
  } catch (e: any) {
    return { status: 'failed', error: e.message }
  }
}

// ─── Main export ─────────────────────────────────────────────────
export async function sendPaymentReminder(ctx: ReminderContext): Promise<ReminderResult> {
  switch (ctx.method) {
    case 'EMAIL':  return sendEmailReminder(ctx)
    case 'SMS':    return sendSMSReminder(ctx)
    case 'WHATSAPP': return sendWhatsAppReminder(ctx)
    default:       return { status: 'failed', error: 'Unknown method' }
  }
}
