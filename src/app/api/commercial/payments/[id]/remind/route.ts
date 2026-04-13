import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendPaymentReminder } from '@/lib/reminder-service'

// POST /api/commercial/payments/:id/remind
// Body: { tenantId, method: 'EMAIL' | 'SMS' | 'WHATSAPP' }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json()
    const { tenantId, method = 'EMAIL' } = body
    const invoiceId = params.id

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, tenant: true },
    })

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    if (!invoice.dueDate) return NextResponse.json({ error: 'No due date set' }, { status: 400 })

    // Send reminder via provider
    const result = await sendPaymentReminder({
      invoice,
      client: invoice.client,
      tenant: invoice.tenant,
      method,
    })

    // Record reminder in DB
    const reminder = await prisma.paymentReminder.create({
      data: {
        invoiceId,
        method,
        response: result.status, // 'sent' | 'delivered' | 'failed'
        errorMessage: result.error || null,
        sentAt: new Date(),
      },
    })

    // Update invoice's last reminder date
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { lastReminderSentAt: new Date() } as any,
    })

    return NextResponse.json({ success: true, reminder, result })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
