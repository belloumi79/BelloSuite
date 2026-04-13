import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { submitToTTN, testASPConnection } from '@/lib/ttn-asp'

// POST /api/commercial/invoices/:id/ttn-submit
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json().catch(() => ({}))
    const tenantId = body.tenantId

    // Fetch invoice with relations
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, ...(tenantId ? { tenantId } : {}) },
      include: { client: true, items: true, tenant: true },
    })

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    if (invoice.ttnStatus === 'ACCEPTED') {
      return NextResponse.json({ error: 'Invoice already accepted by TTN' }, { status: 400 })
    }

    // Load ASP config for this tenant
    const aspConfig = await prisma.aSPConfiguration.findUnique({
      where: { tenantId: invoice.tenantId },
    })

    if (!aspConfig?.isActive) {
      return NextResponse.json(
        { error: 'ASP not configured. Go to Settings > TTN to configure your provider.' },
        { status: 400 }
      )
    }

    const config = {
      provider: aspConfig.provider as 'ttnhub' | 'efacturetn',
      apiKey: aspConfig.apiKey,
      apiSecret: aspConfig.apiSecret || '',
      sftpUsername: aspConfig.sftpUsername || undefined,
      sftpPassword: aspConfig.sftpPassword || undefined,
      sftpEndpoint: aspConfig.sftpEndpoint || undefined,
      webhookSecret: aspConfig.webhookSecret || undefined,
      isActive: aspConfig.isActive,
    }

    // Submit to TTN
    const result = await submitToTTN(invoice, config)

    if (result.success) {
      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          ttnStatus: 'ACCEPTED',
          ttnReference: result.ttnReference,
          ttnQRCode: result.ttnQRCode,
          ttnPDFUrl: result.ttnPDFUrl,
          ttnXMLSignedUrl: result.ttnXMLSignedUrl,
          ttnSubmittedAt: new Date(),
          ttnAcceptedAt: result.acceptedAt ? new Date(result.acceptedAt) : new Date(),
        },
        include: { client: true, items: true, tenant: true },
      })
      return NextResponse.json(updated)
    } else {
      // Mark as rejected
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          ttnStatus: 'REJECTED',
          ttnErrorCode: result.errorCode,
          ttnErrorMessage: result.errorMessage,
        },
      })
      return NextResponse.json(
        { error: result.errorMessage, errorCode: result.errorCode },
        { status: 422 }
      )
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
