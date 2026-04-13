import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { JOURNALIZATION_RULES, buildEntryDescription } from '@/lib/accounting-auto'

// POST /api/commercial/accounting/generate-entries
export async function POST(req: Request) {
  try {
    const { invoiceId, tenantId } = await req.json()
    if (!invoiceId || !tenantId) {
      return NextResponse.json({ error: 'invoiceId and tenantId required' }, { status: 400 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { client: true, items: true, tenant: true },
    })
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    const accounts = await prisma.accountingAccount.findMany({
      where: { tenantId, isActive: true },
    })

    let journal = await prisma.accountingJournal.findFirst({
      where: { tenantId, type: 'SALES' },
    })
    if (!journal) {
      journal = await prisma.accountingJournal.create({
        data: { tenantId, code: 'VTE', name: 'Journal des Ventes', type: 'SALES' },
      })
    }

    const now = new Date()
    let period = await prisma.accountingPeriod.findFirst({
      where: { tenantId, startDate: { lte: now }, endDate: { gte: now } },
    })
    if (!period) {
      const year = now.getFullYear()
      period = await prisma.accountingPeriod.create({
        data: {
          tenantId,
          name: `${year}`,
          startDate: new Date(`${year}-01-01`),
          endDate: new Date(`${year}-12-31`),
        },
      })
    }

    const rule = JOURNALIZATION_RULES[invoice.type]
    if (!rule || rule.lines.length === 0) {
      return NextResponse.json({ message: 'No journal entries for this document type (e.g. QUOTE)' })
    }

    const description = buildEntryDescription(invoice)

    const lines: any[] = [
      {
        accountId: accounts.find(a => a.accountNumber.startsWith('4111'))?.id || '',
        debit: Number(invoice.totalTTC),
        credit: 0,
        description: `Client ${invoice.client?.name || ''}`,
      },
      {
        accountId: accounts.find(a => a.accountNumber.startsWith('707'))?.id || '',
        debit: 0,
        credit: Number(invoice.subtotalHT),
        description: 'Ventes HT',
      },
    ]
    if (Number(invoice.totalVAT) > 0) {
      lines.push({
        accountId: accounts.find(a => a.accountNumber.startsWith('4457'))?.id || '',
        debit: 0,
        credit: Number(invoice.totalVAT),
        description: 'TVA collectée',
      })
    }
    if (Number(invoice.timbreFiscal) > 0) {
      lines.push({
        accountId: accounts.find(a => a.accountNumber.startsWith('341'))?.id || '',
        debit: 0,
        credit: Number(invoice.timbreFiscal),
        description: 'Timbre fiscal',
      })
    }
    if (Number(invoice.totalFodec) > 0) {
      lines.push({
        accountId: accounts.find(a => a.accountNumber.startsWith('611'))?.id || '',
        debit: 0,
        credit: Number(invoice.totalFodec),
        description: 'FODEC',
      })
    }

    const journalEntry = await prisma.journalEntry.create({
      data: {
        tenantId,
        journalId: journal.id,
        periodId: period.id,
        entryNumber: `AUTO-${invoice.number}-${Date.now().toString(36).toUpperCase()}`,
        date: invoice.date,
        description,
        isPosted: false,
        lines: { create: lines },
      },
      include: { lines: { include: { account: true } } },
    })

    return NextResponse.json(journalEntry)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
