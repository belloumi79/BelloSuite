import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/commercial/bank/accounts?tenantId=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
    const accounts = await prisma.bankAccount.findMany({
      where: { tenantId, isActive: true },
      include: { accountingAccount: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(accounts)
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/commercial/bank/accounts
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tenantId, label, bankName, accountNumber, rib, currency, accountingAccountId } = body
    if (!tenantId || !label || !bankName || !accountNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const account = await prisma.bankAccount.create({
      data: { tenantId, label, bankName, accountNumber, rib, currency: currency || 'TND', accountingAccountId },
      include: { accountingAccount: true },
    })
    return NextResponse.json(account, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
