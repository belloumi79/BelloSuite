interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: EmailPayload) {
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY is not configured. Email not sent.')
    console.log('--- Email Content ---')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body: ${html}`)
    console.log('--------------------')
    return { success: false, error: 'No API key' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: from || process.env.RESEND_FROM || 'BelloSuite <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      })
    })

    const data = await res.json()
    
    if (!res.ok) {
      console.error('Resend error:', data)
      return { success: false, error: data }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error }
  }
}
