import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/accounting/ledger?tenantId=xxx&periodId=yyy&from=2026-01-01&to=2026-12-31
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const periodId = searchParams.get('periodId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })
    }

    // Build date filter
    const dateFilter: any = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to + 'T23:59:59')

    // Build period filter
    let periodFilter: any = {}
    if (periodId) {
      periodFilter = { periodId }
    } else if (from || to) {
      // Find periods that overlap with the date range
      const periods = await prisma.accountingPeriod.findMany({
        where: { tenantId },
        orderBy: { startDate: 'asc' },
      })
      const overlapping = periods.filter(p => {
        const pStart = new Date(p.startDate)
        const pEnd = new Date(p.endDate)
        const f = from ? new Date(from) : new Date('1900-01-01')
        const t = to ? new Date(to + 'T23:59:59') : new Date('2100-01-01')
        return pStart <= t && pEnd >= f
      })
      if (overlapping.length > 0) {
        periodFilter = { periodId: { in: overlapping.map(p => p.id) } }
      }
    }

    // Get all accounts for the tenant
    const accounts = await prisma.accountingAccount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { accountNumber: 'asc' },
    })

    // Get all journal entry lines for the period
    const lines = await prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          tenantId,
          isPosted: true,
          date: from || to ? dateFilter : undefined,
          ...(periodId ? { periodId } : {}),
        },
      },
      include: {
        journalEntry: { select: { date: true, description: true, entryNumber: true } },
        account: { select: { accountNumber: true, name: true, type: true } },
      },
      orderBy: { journalEntry: { date: 'asc' } },
    })

    // Group by account
    const ledgerEntries = accounts.map(account => {
      const accountLines = lines.filter(l => l.accountId === account.id)
      const totalDebit = accountLines.reduce((sum, l) => sum + Number(l.debit), 0)
      const totalCredit = accountLines.reduce((sum, l) => sum + Number(l.credit), 0)

      return {
        account: {
          id: account.id,
          accountNumber: account.accountNumber,
          name: account.name,
          type: account.type,
        },
        openingDebit: 0,
        openingCredit: 0,
        movements: accountLines.map(l => ({
          date: l.journalEntry.date,
          entryNumber: l.journalEntry.entryNumber,
          description: l.journalEntry.description,
          debit: Number(l.debit),
          credit: Number(l.credit),
        })),
        closingDebit: totalDebit,
        closingCredit: totalCredit,
        balance: totalDebit - totalCredit,
        balanceType: totalDebit >= totalCredit ? 'DEBIT' : 'CREDIT',
      }
    })

    // Calculate totals
    const totalDebit = ledgerEntries.reduce((s, e) => s + e.closingDebit, 0)
    const totalCredit = ledgerEntries.reduce((s, e) => s + e.closingCredit, 0)

    return NextResponse.json({
      tenantId,
      periodId,
      from,
      to,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      accounts: ledgerEntries,
    })
  } catch (error: any) {
    console.error('Ledger error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}