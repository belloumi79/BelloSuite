import { prisma } from '@/lib/db'
import { InvoiceStatus, ReminderMethod } from '@prisma/client'

// ─── Helpers ────────────────────────────────────────────────

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function addMonths(date: Date, m: number): Date {
  const r = new Date(date)
  r.setMonth(r.getMonth() + m)
  return r
}

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

// ─── Service Functions ──────────────────────────────────────

export async function getTreasuryDashboard(tenantId: string) {
  const now = new Date()
  const startCurrentMonth = startOfMonth(now)
  const endCurrentMonth = endOfMonth(now)

  // Fetch all unpaid invoices (PENDING, CONFIRMED, SENT) for tenant
  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: { in: [InvoiceStatus.PENDING, InvoiceStatus.CONFIRMED, InvoiceStatus.SENT] },
    },
    include: { client: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
  })

  // Fetch paid invoices of current month for collection rate
  const paidThisMonth = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: InvoiceStatus.PAID,
      updatedAt: { gte: startCurrentMonth, lte: endCurrentMonth },
    },
  })

  // KPIs Calculation
  let totalReceivable = 0
  let totalOverdue = 0
  let totalDueFuture = 0
  let totalDueToday = 0
  let overdue30 = 0, overdue60 = 0, overdue90plus = 0
  let overdueCount = 0

  const debtorMap: Record<string, { name: string; total: number; oldestDays: number; count: number }> = {}

  for (const inv of unpaidInvoices) {
    const ttc = Number(inv.totalTTC)
    totalReceivable += ttc
    const days = calcDaysOverdue(inv.dueDate)

    // Overdue logic
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

    // Debtor mapping
    const key = inv.clientId || 'unknown'
    if (!debtorMap[key]) debtorMap[key] = { name: inv.client?.name || '—', total: 0, oldestDays: 0, count: 0 }
    debtorMap[key].total += ttc
    debtorMap[key].count++
    if (days !== null && days > debtorMap[key].oldestDays) debtorMap[key].oldestDays = days
  }

  // DMP Calculation (6 months)
  const sixMonthsAgo = addMonths(now, -6)
  const historicalInvoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      date: { gte: sixMonthsAgo },
      status: InvoiceStatus.PAID,
    },
    select: { date: true, dueDate: true, totalTTC: true, updatedAt: true },
  })

  let dmp = 0
  if (historicalInvoices.length > 0) {
    let totalPaymentDays = 0
    let validCount = 0
    for (const inv of historicalInvoices) {
      if (inv.date && inv.updatedAt) {
        const paymentDays = Math.max(0, Math.floor(
          (new Date(inv.updatedAt).getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24)
        ))
        totalPaymentDays += paymentDays
        validCount++
      }
    }
    dmp = validCount > 0 ? Math.round(totalPaymentDays / validCount) : 0
  }

  // Collection Rate
  const totalInvoicedThisMonth = [...unpaidInvoices, ...paidThisMonth].reduce(
    (s, i) => s + Number(i.totalTTC), 0
  )
  const totalPaidThisMonth = paidThisMonth.reduce((s, i) => s + Number(i.totalTTC), 0)
  const collectionRate = totalInvoicedThisMonth > 0
    ? Math.round((totalPaidThisMonth / totalInvoicedThisMonth) * 100)
    : 0

  // Top Debtors
  const topDebtors = Object.entries(debtorMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([id, d]) => ({ 
      clientId: id, 
      clientName: d.name, 
      totalDue: Math.round(d.total * 1000) / 1000, 
      daysOverdue: d.oldestDays, 
      invoiceCount: d.count 
    }))

  // Projections (3 months)
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

    cashFlowProjection.push({ 
      month: monthLabel, 
      receivables: Math.round(receivables * 1000) / 1000, 
      payables: 0, 
      net: Math.round(receivables * 1000) / 1000 
    })
  }

  // Trends (6 months)
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
      where: { tenantId, status: InvoiceStatus.PAID, updatedAt: { gte: monthStart, lte: monthEnd } },
      _sum: { totalTTC: true },
    })
    const overdueInv = await prisma.invoice.aggregate({
      where: {
        tenantId,
        dueDate: { lte: monthEnd },
        status: { in: [InvoiceStatus.PENDING, InvoiceStatus.CONFIRMED, InvoiceStatus.SENT] },
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

  return {
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
  }
}

export async function getPaymentFollowUp(tenantId: string) {
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT] },
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
      status: getStatusLabel(daysOverdue),
      lastReminder: inv.reminders?.[0] ?? null,
      reminderCount: inv.reminders.length,
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

  return { followUps, stats }
}

export async function sendReminder(invoiceId: string, tenantId: string, method: ReminderMethod) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, tenant: true },
  })

  if (!invoice || invoice.tenantId !== tenantId) {
    throw new Error('Facture introuvable')
  }

  // Import service on demand to avoid circular deps if any
  const { sendPaymentReminder } = await import('@/lib/reminder-service')

  const result = await sendPaymentReminder({
    invoice: invoice as any,
    client: invoice.client as any,
    tenant: invoice.tenant as any,
    method,
  })

  return prisma.$transaction(async (tx) => {
    const reminder = await tx.paymentReminder.create({
      data: {
        invoiceId,
        method,
        response: result.status,
        errorMessage: result.error || null,
        sentAt: new Date(),
      },
    })

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { lastReminderSentAt: new Date() } as any,
    })

    return { reminder, result }
  })
}
