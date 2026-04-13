import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'PAID' | 'CANCELLED' | 'SENT' | 'DRAFT'

function calcDaysOverdue(dueDate: Date | null): number | null {
  if (!dueDate) return null
  const now = new Date()
  const diff = now.getTime() - new Date(dueDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getStatusLabel(days: number | null): string {
  if (days === null) return 'NO_DUE'
  if (days < 0) return 'DUE_FUTURE'
  if (days === 0) return 'DUE_TODAY'
  if (days <= 30) return 'OVERDUE_30'
  if (days <= 60) return 'OVERDUE_60'
  return 'OVERDUE_90PLUS'
}

function addMonths(date: Date, m: number): Date {
  const r = new Date(date)
  r.setMonth(r.getMonth() + m)
  return r
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

// GET /api/commercial/treasury?tenantId=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const now = new Date()
    const startCurrentMonth = startOfMonth(now)
    const endCurrentMonth = endOfMonth(now)

    // Fetch all unpaid invoices (PENDING, CONFIRMED, SENT) for tenant
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['PENDING', 'CONFIRMED', 'SENT'] as PaymentStatus[] },
      },
      include: { client: true },
      orderBy: { dueDate: 'asc' },
    })

    // Fetch paid invoices of current month for collection rate
    const paidThisMonth = await prisma.invoice.findMany({
      where: {
        tenantId,
        status: 'PAID',
        updatedAt: { gte: startCurrentMonth, lte: endCurrentMonth },
      },
    })

    // Fetch all invoices of past 6 months for DMP calculation
    const sixMonthsAgo = addMonths(now, -6)
    const historicalInvoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        date: { gte: sixMonthsAgo },
        status: 'PAID',
      },
      select: { date: true, dueDate: true, totalTTC: true, updatedAt: true },
    })

    // ── KPIs ───────────────────────────────────────────────
    let totalReceivable = 0
    let totalOverdue = 0
    let totalDueFuture = 0
    let totalDueToday = 0
    let overdue30 = 0, overdue60 = 0, overdue90plus = 0
    let overdueCount = 0

    for (const inv of unpaidInvoices) {
      const ttc = Number(inv.totalTTC)
      totalReceivable += ttc
      const days = calcDaysOverdue(inv.dueDate)

      if (days !== null && days > 0) {
        totalOverdue += ttc
        overdueCount++
        if (days <= 30) overdue30 += ttc
        else if (days <= 60) overdue60 += ttc
        else overdue90plus += ttc
      } else if (days !== null && days < 0) {
        totalDueFuture += ttc
      } else if (days === 0) {
        totalDueToday += ttc
      }
    }

    // DMP (Délai Moyen de Paiement) — sur les factures payées des 6 derniers mois
    let dmp = 0
    if (historicalInvoices.length > 0) {
      let totalPaymentDays = 0
      let validCount = 0
      for (const inv of historicalInvoices) {
        if (inv.dueDate) {
          const paymentDays = Math.max(0, Math.floor(
            (new Date(inv.updatedAt).getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24)
          ))
          totalPaymentDays += paymentDays
          validCount++
        }
      }
      dmp = validCount > 0 ? Math.round(totalPaymentDays / validCount) : 0
    }

    // Collection rate = paid this month / total due this month (paid + unpaid)
    const totalInvoicedThisMonth = [...unpaidInvoices, ...paidThisMonth].reduce(
      (s, i) => s + Number(i.totalTTC), 0
    )
    const totalPaidThisMonth = paidThisMonth.reduce((s, i) => s + Number(i.totalTTC), 0)
    const collectionRate = totalInvoicedThisMonth > 0
      ? Math.round((totalPaidThisMonth / totalInvoicedThisMonth) * 100)
      : 0

    // ── Top 10 Debtors ────────────────────────────────────
    const debtorMap: Record<string, { name: string; total: number; oldestDays: number; count: number }> = {}
    for (const inv of unpaidInvoices) {
      const days = calcDaysOverdue(inv.dueDate)
      const key = inv.clientId || 'unknown'
      if (!debtorMap[key]) debtorMap[key] = { name: inv.client?.name || '—', total: 0, oldestDays: 0, count: 0 }
      debtorMap[key].total += Number(inv.totalTTC)
      debtorMap[key].count++
      if (days !== null && days > debtorMap[key].oldestDays) debtorMap[key].oldestDays = days
    }
    const topDebtors = Object.entries(debtorMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([id, d]) => ({ clientId: id, clientName: d.name, totalDue: Math.round(d.total * 1000) / 1000, daysOverdue: d.oldestDays, invoiceCount: d.count }))

    // ── Cash Flow Projection (3 months) ───────────────────
    const cashFlowProjection = []
    for (let m = 0; m < 3; m++) {
      const monthStart = startOfMonth(addMonths(now, m))
      const monthEnd = endOfMonth(addMonths(now, m))
      const monthLabel = monthStart.toLocaleDateString('fr-TN', { month: 'short', year: 'numeric' })

      const receivables = unpaidInvoices
        .filter(inv => {
          if (!inv.dueDate) return false
          const dd = new Date(inv.dueDate)
          return dd >= monthStart && dd <= monthEnd
        })
        .reduce((s, inv) => s + Number(inv.totalTTC), 0)

      cashFlowProjection.push({ month: monthLabel, receivables: Math.round(receivables * 1000) / 1000, payables: 0, net: Math.round(receivables * 1000) / 1000 })
    }

    // ── Monthly Trend (6 months) ──────────────────────────
    const monthlyTrend = []
    for (let m = 5; m >= 0; m--) {
      const monthStart = startOfMonth(addMonths(now, -m))
      const monthEnd = endOfMonth(addMonths(now, -m))
      const monthLabel = monthStart.toLocaleDateString('fr-TN', { month: 'short', year: 'numeric' })

      const invoiced = await prisma.invoice.aggregate({
        where: { tenantId, date: { gte: monthStart, lte: monthEnd } },
        _sum: { totalTTC: true },
      })
      const collected = await prisma.invoice.aggregate({
        where: { tenantId, status: 'PAID', updatedAt: { gte: monthStart, lte: monthEnd } },
        _sum: { totalTTC: true },
      })
      const overdueInv = await prisma.invoice.aggregate({
        where: {
          tenantId,
          dueDate: { lte: monthEnd },
          status: { in: ['PENDING', 'CONFIRMED', 'SENT'] as PaymentStatus[] },
        },
        _sum: { totalTTC: true },
      })

      monthlyTrend.push({
        month: monthLabel,
        invoiced: Number(invoiced._sum.totalTTC || 0),
        collected: Number(collected._sum.totalTTC || 0),
        overdue: Number(overdueInv._sum.totalTTC || 0),
      })
    }

    return NextResponse.json({
      kpis: {
        totalReceivable: Math.round(totalReceivable * 1000) / 1000,
        totalOverdue: Math.round(totalOverdue * 1000) / 1000,
        totalDue: Math.round((totalDueFuture + totalDueToday) * 1000) / 1000,
        overdue30: Math.round(overdue30 * 1000) / 1000,
        overdue60: Math.round(overdue60 * 1000) / 1000,
        overdue90plus: Math.round(overdue90plus * 1000) / 1000,
        dmp,
        collectionRate,
        overdueCount,
        totalReceivableCount: unpaidInvoices.length,
      },
      topDebtors,
      cashFlowProjection,
      monthlyTrend,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
