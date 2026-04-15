import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/accounting/trial-balance?tenantId=xxx&from=2026-01-01&to=2026-12-31
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId requis' }, { status: 400 })
    }

    const dateFilter: any = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to + 'T23:59:59')

    const accounts = await prisma.accountingAccount.findMany({
      where: { tenantId, isActive: true },
      orderBy: { accountNumber: 'asc' },
    })

    const lines = await prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          tenantId,
          isPosted: true,
          ...(from || to ? { date: dateFilter } : {}),
        },
      },
      include: {
        account: { select: { accountNumber: true, name: true, type: true } },
      },
    })

    const rows = accounts.map(account => {
      const accountLines = lines.filter(l => l.accountId === account.id)
      const totalDebit = accountLines.reduce((s, l) => s + Number(l.debit), 0)
      const totalCredit = accountLines.reduce((s, l) => s + Number(l.credit), 0)

      // For trial balance: debit = assets + expenses, credit = liabilities + equity + revenue
      let debitBalance = 0
      let creditBalance = 0
      const net = totalDebit - totalCredit

      if (account.type === 'ASSET' || account.type === 'EXPENSE') {
        debitBalance = net > 0 ? net : 0
        creditBalance = net < 0 ? Math.abs(net) : 0
      } else {
        creditBalance = net > 0 ? net : 0
        debitBalance = net < 0 ? Math.abs(net) : 0
      }

      return {
        accountNumber: account.accountNumber,
        accountName: account.name,
        type: account.type,
        debit: debitBalance,
        credit: creditBalance,
      }
    })

    const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0)

    return NextResponse.json({
      tenantId,
      from,
      to,
      totalDebit: Math.round(totalDebit * 1000) / 1000,
      totalCredit: Math.round(totalCredit * 1000) / 1000,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      rows,
    })
  } catch (error: any) {
    console.error('Trial balance error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}