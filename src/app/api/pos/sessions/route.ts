import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/pos/sessions - List sessions
// POST /api/pos/sessions - Open new session
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  const status = searchParams.get('status')

  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
  }

  const where: any = { tenantId }
  if (status) where.status = status

  const sessions = await prisma.pOSSession.findMany({
    where,
    include: {
      orders: {
        select: {
          id: true,
          totalTTC: true,
          isPaid: true,
          status: true,
        },
      },
    },
    orderBy: { openedAt: 'desc' },
    take: 20,
  })

  // Calculate totals per session
  const sessionsWithTotals = sessions.map(s => ({
    ...s,
    ordersCount: s.orders.length,
    totalSales: s.orders.reduce((sum, o) => sum + (o.isPaid ? Number(o.totalTTC) : 0), 0),
  }))

  return NextResponse.json(sessionsWithTotals)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, userId, userName, openingCash } = body

    if (!tenantId || !userId || !userName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for open session
    const existingOpen = await prisma.pOSSession.findFirst({
      where: { tenantId, status: 'OPEN' },
    })

    if (existingOpen) {
      return NextResponse.json(
        { error: 'Une session est déjà ouverte', session: existingOpen },
        { status: 409 }
      )
    }

    // Create or update cash drawer
    await prisma.cashDrawer.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId, balance: openingCash || 0 },
    })

    const session = await prisma.pOSSession.create({
      data: {
        tenantId,
        userId,
        userName,
        openingCash: openingCash || 0,
        status: 'OPEN',
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (err) {
    console.error('POS session error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
