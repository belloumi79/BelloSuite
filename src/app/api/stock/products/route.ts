import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tenantId = searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 })
  const products = await prisma.product.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, code, name } = body
    if (!tenantId || !code || !name) return NextResponse.json({ error: 'tenantId, code, name required' }, { status: 400 })
    const existing = await prisma.product.findUnique({ where: { tenantId_code: { tenantId, code } } })
    if (existing) return NextResponse.json({ error: 'Code déjà utilisé' }, { status: 409 })
    const product = await prisma.product.create({ data: { tenantId, code, name } })
    return NextResponse.json(product, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
