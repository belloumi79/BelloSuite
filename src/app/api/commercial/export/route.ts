import { requireTenant } from '@/lib/api-auth'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/commercial/export?tenantId=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const ctx = await requireTenant(req, searchParams.get('tenantId'))
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId
    if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })

    const exports = await prisma.exportInvoice.findMany({
      where: { tenantId },
      include: { invoice: { include: { client: true, items: true } }, tenant: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(exports)
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// POST /api/commercial/export — Body: { tenantId, invoiceId, countryDest, incoterm, hsCode, ... }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tenantId: requestedTenantId, invoiceId, countryDest, incoterm, hsCode, netWeightKg, countryOrigin, exportRegime, customsPort, transportMode } = body
    const ctx = await requireTenant(req, requestedTenantId)
    if (ctx instanceof NextResponse) return ctx
    const tenantId = ctx.tenantId
    if (!tenantId || !invoiceId || !countryDest || !incoterm) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const exp = await prisma.exportInvoice.create({
      data: {
        tenantId, invoiceId, countryDest, incoterm,
        hsCode, netWeightKg: netWeightKg ? Number(netWeightKg) : null,
        countryOrigin: countryOrigin || 'TN', exportRegime, customsPort, transportMode,
      },
      include: { invoice: { include: { client: true } } },
    })
    return NextResponse.json(exp, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
