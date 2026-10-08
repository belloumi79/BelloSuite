import { requireTenant } from '@/lib/api-auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/pos/sessions/[id] - Get single session
// PATCH /api/pos/sessions/[id] - Close session
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant(req)
  if (ctx instanceof NextResponse) return ctx
  const { id } = await params

  const session = await prisma.pOSSession.findFirst({
    where: { id, tenantId: ctx.tenantId },
    include: {
      orders: {
        include: {
          items: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      // cashDrawer removed during merge
    },
  })

  if (!session) {
    return NextResponse.json({ error: { code: 'not_found', message: 'Session non trouvée' } }, { status: 404 })
  }

  return NextResponse.json({ data: session })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireTenant(req)
  if (ctx instanceof NextResponse) return ctx
  try {
    const { id } = await params
    const body = await req.json()
    const { closingCash, notes, status } = body

    const session = await prisma.pOSSession.findFirst({ where: { id, tenantId: ctx.tenantId } })
    if (!session) {
      return NextResponse.json({ error: { code: 'not_found', message: 'Session non trouvée' } }, { status: 404 })
    }

    if (session.status === 'CLOSED') {
      return NextResponse.json({ error: { code: 'conflict', message: 'Session déjà fermée' } }, { status: 409 })
    }

    const totalSales = await prisma.pOSOrder.aggregate({
      where: { sessionId: id, isPaid: true },
      _sum: { totalTTC: true },
    })

    const updatedSession = await prisma.pOSSession.update({
      where: { id, tenantId: ctx.tenantId },
      data: {
        closingCash: closingCash ?? Number(session.openingCash) + Number(totalSales._sum.totalTTC ?? 0),
        status: status ?? 'CLOSED',
        closedAt: new Date(),
        notes,
      },
    })

    // Update cash drawer balance
    await prisma.cashDrawer.update({
      where: { tenantId: session.tenantId },
      data: {
        balance: closingCash ?? Number(session.openingCash) + Number(totalSales._sum.totalTTC ?? 0),
      },
    })

    return NextResponse.json({ data: updatedSession })
  } catch (err) {
    console.error('POS session close error:', err)
    return NextResponse.json({ error: { code: 'internal_error', message: 'Erreur interne' } }, { status: 500 })
  }
}
