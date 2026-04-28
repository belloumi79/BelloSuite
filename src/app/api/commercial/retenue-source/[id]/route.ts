import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { getWithholdingTaxById, updateWithholdingTax, deleteWithholdingTax } from '@/services/withholding-tax'

// GET /api/commercial/retenue-source/[id]?tenantId=
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    const record = await getWithholdingTaxById(id, ctx.tenantId)
    return NextResponse.json(record)
  } catch (err) {
    return handleApiError(err, 'GET withholding tax by id')
  }
}

// PATCH /api/commercial/retenue-source/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json()
    const ctx = getApiContext(req, body?.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    const updated = await updateWithholdingTax(id, ctx.tenantId, body)
    return NextResponse.json(updated)
  } catch (err) {
    return handleApiError(err, 'PATCH withholding tax')
  }
}

// DELETE /api/commercial/retenue-source/[id]?tenantId=
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    await deleteWithholdingTax(id, ctx.tenantId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err, 'DELETE withholding tax')
  }
}
