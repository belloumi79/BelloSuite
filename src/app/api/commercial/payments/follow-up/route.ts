import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/commercial/payments/follow-up?tenantId=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] },
      },
      include: {
        client: true,
        reminders: {
          orderBy: { sentAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    const now = new Date()
    const followUps = invoices.map(inv => {
      const dueDate = inv.dueDate ? new Date(inv.dueDate) : null
      const daysOverdue = dueDate ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : null

      return {
        id: inv.id,
        invoiceNumber: inv.number,
        client: inv.client,
        totalTTC: Number(inv.totalTTC),
        dueDate: inv.dueDate,
        daysOverdue,
        status: !dueDate ? 'NO_DUE' : daysOverdue === null ? 'UNKNOWN' : daysOverdue < 0 ? 'DUE_FUTURE' : daysOverdue === 0 ? 'DUE_TODAY' : daysOverdue <= 30 ? 'OVERDUE_30' : daysOverdue <= 60 ? 'OVERDUE_60' : 'OVERDUE_90PLUS',
        lastReminder: inv.reminders?.[0] ?? null,
        reminderCount: (inv.reminders as any[])?.length || 0,
      }
    })

    const stats = {
      totalDue: followUps.filter(f => ['DUE_TODAY', 'DUE_FUTURE'].includes(f.status)).reduce((s, f) => s + f.totalTTC, 0),
      totalOverdue: followUps.filter(f => f.status.startsWith('OVERDUE')).reduce((s, f) => s + f.totalTTC, 0),
      overdue30: followUps.filter(f => f.status === 'OVERDUE_30').reduce((s, f) => s + f.totalTTC, 0),
      overdue60: followUps.filter(f => f.status === 'OVERDUE_60').reduce((s, f) => s + f.totalTTC, 0),
      overdue90plus: followUps.filter(f => f.status === 'OVERDUE_90PLUS').reduce((s, f) => s + f.totalTTC, 0),
      count: followUps.length,
    }

    return NextResponse.json({ followUps, stats })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
