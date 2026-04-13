import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/commercial/bank/reconcile?tenantId=&bankAccountId=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    const bankAccountId = searchParams.get('bankAccountId')
    const bankAccountFilter = bankAccountId ? { bankAccountId } : {}
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    // Fetch unreconciled bank statement lines
    const statementLines = await prisma.bankStatementLine.findMany({
      where: {
        statement: { tenantId, ...bankAccountFilter },
        status: 'OPEN',
      },
      include: { statement: true },
      orderBy: { lineDate: 'asc' },
    })

    // Fetch unreconciled journal entry lines for bank/cash journals
    const journalLines = await prisma.journalEntryLine.findMany({
      where: {
        journalEntry: { tenantId, isPosted: true, journal: { type: { in: ['BANK', 'CASH'] } } },
        reconciliations: { none: {} },
      },
      include: { journalEntry: true, account: true },
      orderBy: { journalEntry: { date: 'asc' } },
    })

    return NextResponse.json({ statementLines, journalLines })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/commercial/bank/reconcile
// Body: { tenantId, bankAccountId, statementLineId, journalEntryLineId, amount }
export async function POST(req: Request) {
  try {
    const { tenantId, statementLineId, journalEntryLineId, amount, notes } = await req.json()
    if (!tenantId || !statementLineId || !journalEntryLineId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Derive bankAccountId from the statement line
    const line = await prisma.bankStatementLine.findUnique({
      where: { id: statementLineId },
      include: { statement: { include: { bankAccount: true } } },
    })
    const bankAccountId = line?.statement.bankAccount.id

    const reconciliation = await prisma.bankReconciliation.create({
      data: {
        tenantId,
        statementLineId,
        journalEntryLineId,
        bankStatementId: line?.statementId || '',
        bankAccountId: bankAccountId || '',
        amount,
        notes,
      },
    })

    await prisma.bankStatementLine.update({
      where: { id: statementLineId },
      data: { status: 'MATCHED', matchedEntryLineId: journalEntryLineId },
    })

    return NextResponse.json(reconciliation, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
