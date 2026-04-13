import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/commercial/pipeline?tenantId=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const documents = await prisma.invoice.findMany({
      where: { tenantId, type: { in: ['QUOTE', 'ORDER'] } },
      include: { client: true, items: true },
      orderBy: { date: 'desc' },
    })

    // Funnel stats
    const quotes = documents.filter(d => d.type === 'QUOTE')
    const orders = documents.filter(d => d.type === 'ORDER')

    const quoteStats = {
      total: quotes.length,
      draft: quotes.filter(d => d.status === 'DRAFT').length,
      sent: quotes.filter(d => d.status === 'SENT').length,
      confirmed: quotes.filter(d => d.status === 'CONFIRMED').length,
      expired: quotes.filter(d => d.dueDate && new Date(d.dueDate) < new Date()).length,
      converted: quotes.filter(d => d.convertedFromId !== null).length,
      totalValue: quotes.reduce((s, d) => s + Number(d.totalTTC), 0),
    }

    const orderStats = {
      total: orders.length,
      draft: orders.filter(d => d.status === 'DRAFT').length,
      pending: orders.filter(d => d.status === 'PENDING').length,
      confirmed: orders.filter(d => d.status === 'CONFIRMED').length,
      invoiced: orders.filter(d => d.convertedFromId !== null).length,
      totalValue: orders.reduce((s, d) => s + Number(d.totalTTC), 0),
    }

    const conversionRate = quoteStats.total > 0
      ? Math.round((quoteStats.confirmed / quoteStats.total) * 100)
      : 0

    // Pipeline items
    type PipelineItem = {
      id: string; number: string; clientName: string; date: string; dueDate: string | null
      totalTTC: number; status: string; type: string; daysUntilDue: number | null
    }
    const pipelineItems: PipelineItem[] = documents.map(doc => ({
      id: doc.id,
      number: doc.number,
      clientName: doc.client?.name || '—',
      date: doc.date.toISOString().split('T')[0],
      dueDate: doc.dueDate ? doc.dueDate.toISOString().split('T')[0] : null,
      totalTTC: Number(doc.totalTTC),
      status: doc.status,
      type: doc.type,
      daysUntilDue: doc.dueDate
        ? Math.floor((new Date(doc.dueDate).getTime() - Date.now()) / 86400000)
        : null,
    }))

    return NextResponse.json({ quoteStats, orderStats, conversionRate, pipelineItems })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
