import { NextRequest, NextResponse } from 'next/server'
import { getApiContext } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import { convertDocument } from '@/services/invoices'
import { z } from 'zod'

const convertSchema = z.object({
  tenantId: z.string().min(1),
  targetType: z.string().min(1),
})

// POST /api/commercial/documents/convert/:id
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await req.json()
    const validated = convertSchema.safeParse(body)
    
    if (!validated.success) {
      return NextResponse.json({ error: 'Données invalides', details: validated.error.issues }, { status: 400 })
    }

    const ctx = getApiContext(req, validated.data.tenantId)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    const converted = await convertDocument(id, ctx.tenantId, validated.data.targetType)

    return NextResponse.json(converted, { status: 201 })
  } catch (err) {
    return handleApiError(err, 'CONVERT document')
  }
}
