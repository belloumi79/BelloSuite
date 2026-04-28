import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { generateFromInvoice } from '@/services/withholding-tax'

// POST /api/commercial/retenue-source/from-invoice
// Body: { tenantId, invoiceId }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tenantId, invoiceId } = body

    const ctx = getApiContext(req, tenantId)
    if (ctx instanceof NextResponse) return ctx

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId requis' }, { status: 400 })
    }

    const record = await generateFromInvoice(invoiceId, ctx.tenantId)
    return NextResponse.json(record, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'GENERATE RS from invoice')
  }
}
